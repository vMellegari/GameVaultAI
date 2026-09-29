from datetime import datetime, timezone

from sqlalchemy import desc, extract, func
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models.game import Game
from app.models.game_session import GameSession
from app.models.user import User
from app.services.game_session_image_service import image_file_path, remove_files


def get_game_sessions(
    db: Session,
    game_id: int,
    owner: User,
) -> list[GameSession] | None:
    game = db.query(Game).filter(
        Game.id == game_id,
        Game.owner_id == owner.id,
    ).first()

    if not game:
        return None

    return (
        db.query(GameSession)
        .filter(GameSession.game_id == game.id)
        .order_by(GameSession.played_at.desc(), GameSession.id.desc())
        .all()
    )


def get_recent_game_sessions(
    db: Session,
    owner: User,
    limit: int = 20,
    offset: int = 0,
    game_title: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    min_duration: int | None = None,
    max_duration: int | None = None,
) -> list[GameSession]:
    query = (
        db.query(GameSession)
        .join(Game, Game.id == GameSession.game_id)
        .options(
            joinedload(GameSession.game),
            selectinload(GameSession.images),
        )
        .filter(Game.owner_id == owner.id)
    )

    if game_title:
        query = query.filter(Game.title.ilike(f"%{game_title.strip()}%"))
    if date_from:
        query = query.filter(GameSession.played_at >= date_from)
    if date_to:
        query = query.filter(GameSession.played_at < date_to)
    if min_duration is not None:
        query = query.filter(GameSession.duration_minutes >= min_duration)
    if max_duration is not None:
        query = query.filter(GameSession.duration_minutes <= max_duration)

    return (
        query.order_by(GameSession.played_at.desc(), GameSession.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


def update_game_session(
    db: Session,
    game_id: int,
    session_id: int,
    owner: User,
    update_data: dict,
) -> GameSession | None:
    game = db.query(Game).filter(
        Game.id == game_id,
        Game.owner_id == owner.id,
    ).first()
    if game is None:
        return None

    game_session = db.query(GameSession).filter(
        GameSession.id == session_id,
        GameSession.game_id == game.id,
    ).first()
    if game_session is None:
        return None

    new_duration = update_data.get("duration_minutes")
    if new_duration is not None:
        duration_delta = new_duration - game_session.duration_minutes
        game_session.duration_minutes = new_duration
        game.hours_played = max(
            0,
            round(game.hours_played + duration_delta / 60, 2),
        )

    played_at = update_data.get("played_at")
    if played_at is not None:
        game_session.played_at = played_at
    if "notes" in update_data:
        game_session.notes = update_data["notes"]

    db.commit()
    db.refresh(game_session)
    return game_session


def get_game_session_stats(db: Session, owner: User) -> dict:
    now = datetime.now(timezone.utc)
    month_now = now.date().replace(day=1)
    start_year = month_now.year
    start_month = month_now.month - 11
    while start_month <= 0:
        start_month += 12
        start_year -= 1
    start_month_date = month_now.replace(year=start_year, month=start_month)
    start_date = datetime(
        start_month_date.year,
        start_month_date.month,
        1,
        tzinfo=timezone.utc,
    )

    total_sessions, total_minutes = (
        db.query(
            func.count(GameSession.id),
            func.coalesce(func.sum(GameSession.duration_minutes), 0),
        )
        .join(Game, Game.id == GameSession.game_id)
        .filter(Game.owner_id == owner.id)
        .first()
    )

    monthly_rows = (
        db.query(
            extract("year", GameSession.played_at).label("year"),
            extract("month", GameSession.played_at).label("month"),
            func.sum(GameSession.duration_minutes).label("minutes"),
        )
        .join(Game, Game.id == GameSession.game_id)
        .filter(
            Game.owner_id == owner.id,
            GameSession.played_at >= start_date,
            GameSession.played_at <= now,
        )
        .group_by(
            extract("year", GameSession.played_at),
            extract("month", GameSession.played_at),
        )
        .all()
    )
    monthly_totals = {
        (int(year), int(month)): int(minutes)
        for year, month, minutes in monthly_rows
    }

    monthly_hours = []
    year, month = start_year, start_month
    for _ in range(12):
        minutes = monthly_totals.get((year, month), 0)
        monthly_hours.append(
            {
                "month": f"{year:04d}-{month:02d}",
                "hours": round(minutes / 60, 2),
            }
        )
        month += 1
        if month == 13:
            month = 1
            year += 1

    most_played_rows = (
        db.query(
            Game.id,
            Game.title,
            func.sum(GameSession.duration_minutes).label("minutes"),
            func.count(GameSession.id).label("sessions"),
        )
        .join(GameSession, GameSession.game_id == Game.id)
        .filter(Game.owner_id == owner.id)
        .group_by(Game.id, Game.title)
        .order_by(desc("minutes"), Game.title)
        .limit(5)
        .all()
    )

    return {
        "total_sessions": int(total_sessions or 0),
        "total_hours": round(int(total_minutes or 0) / 60, 2),
        "monthly_hours": monthly_hours,
        "most_played_games": [
            {
                "game_id": game_id,
                "title": title,
                "minutes": int(minutes),
                "sessions": int(sessions),
            }
            for game_id, title, minutes, sessions in most_played_rows
        ],
    }


def create_game_session(
    db: Session,
    game_id: int,
    owner: User,
    duration_minutes: int,
    played_at,
    notes: str | None,
) -> GameSession | None:
    game = db.query(Game).filter(
        Game.id == game_id,
        Game.owner_id == owner.id,
    ).first()

    if not game:
        return None

    game_session = GameSession(
        game_id=game.id,
        duration_minutes=duration_minutes,
        played_at=played_at,
        notes=notes,
    )
    game.hours_played = round(
        game.hours_played + duration_minutes / 60,
        2,
    )

    db.add(game_session)
    db.commit()
    db.refresh(game_session)
    return game_session


def delete_game_session(
    db: Session,
    game_id: int,
    session_id: int,
    owner: User,
) -> int | None:
    game = db.query(Game).filter(
        Game.id == game_id,
        Game.owner_id == owner.id,
    ).first()

    if not game:
        return None

    game_session = db.query(GameSession).filter(
        GameSession.id == session_id,
        GameSession.game_id == game.id,
    ).first()

    if not game_session:
        return None

    duration_minutes = game_session.duration_minutes
    image_paths = [image_file_path(image) for image in game_session.images]
    game.hours_played = max(
        0,
        round(game.hours_played - duration_minutes / 60, 2),
    )

    db.delete(game_session)
    db.commit()
    remove_files(image_paths)
    return duration_minutes
