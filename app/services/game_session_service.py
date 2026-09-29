from sqlalchemy.orm import Session

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
