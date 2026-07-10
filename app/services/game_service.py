from sqlalchemy import func
from sqlalchemy.orm import Session
from datetime import datetime
from app.models.enums import GameStatus, SortField
from app.models.game import Game
from app.schemas.game import GameCreate, GameUpdate
from app.schemas.rawg import RawgGameDetails
from app.services.rawg_service import get_game_details

def create_game(db: Session, game_data: GameCreate) -> Game:
    """Cria um novo jogo no banco de dados."""
    db_game = Game(
        title=game_data.title,
        platform=game_data.platform,
        status=GameStatus.BACKLOG
    )
    db.add(db_game)
    db.commit()
    db.refresh(db_game)
    return db_game

def get_all_games(
        db: Session,
        status: GameStatus | None = None,
        platform: str | None = None,
        title: str | None = None,
        sort_by: SortField | None = None,
        favorite: bool | None = None,
        page: int = 1,
        limit: int = 10
        ):
    """Retorna todos os jogos cadastrados."""
    query = db.query(Game)

    if status:
        query = query.filter(Game.status == status)

    if platform:
        query = query.filter(Game.platform == platform)

    if title:
        query = query.filter(Game.title.ilike(f"%{title}%"))

    if favorite is not None:
        query = query.filter(Game.favorite == favorite)

    if sort_by:
        query = query.order_by(getattr(Game, sort_by.value))

    offset = (page - 1) * limit

    query = query.offset(offset).limit(limit)

    return query.all()

def get_game_by_id(db: Session, game_id: int):
    """Busca um jogo específico pelo ID."""
    return db.query(Game).filter(Game.id == game_id).first()

def parse_release_date(released: str | None):
    if not released:
        return None

    return datetime.strptime(
        released,
        "%Y-%m-%d"
    ).date()

def apply_rawg_data(game: Game, game_details: RawgGameDetails):
    game.title = game_details.title
    game.platform = game_details.platform
    game.rawg_id = game_details.rawg_id
    game.cover_image = game_details.cover_image
    game.release_date = parse_release_date(game_details.released)
    game.genres = game_details.genres
    game.metacritic_score = game_details.metacritic_score

def import_game_from_rawg(db: Session, rawg_id: int):
    """Importa um jogo com os dados da RAWG para o banco de dados."""
    game_details = get_game_details(rawg_id)

    if not game_details:
        return None
    
    existing_game = db.query(Game).filter(
        Game.rawg_id == rawg_id
    ).first()

    if existing_game:
        return existing_game
    
    db_game = Game(
        status=GameStatus.BACKLOG
    )

    apply_rawg_data(db_game, game_details)

    db.add(db_game)
    db.commit()
    db.refresh(db_game)

    return db_game

def refresh_game_from_rawg(db: Session, game_id: int):
    """Atualiza um jogo do banco utilizando os dados mais recentes da RAWG."""
    db_game = get_game_by_id(db, game_id)

    if not db_game:
        return None

    if not db_game.rawg_id:
        return None

    game_details = get_game_details(db_game.rawg_id)

    if not game_details:
        return None

    apply_rawg_data(db_game, game_details)

    db.commit()
    db.refresh(db_game)

    return db_game


def update_game(db: Session, game_id: int, game_data: GameUpdate):
    """Atualiza os dados de um jogo existente."""
    db_game = get_game_by_id(db, game_id)

    if not db_game:
        return None

    update_data = game_data.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(db_game, key, value)

    db.commit()
    db.refresh(db_game)

    return db_game

def delete_game(db: Session, game_id: int):
    """Remove um jogo do banco de dados."""
    db_game = get_game_by_id(db, game_id)

    if not db_game:
        return False

    db.delete(db_game)
    db.commit()

    return True

def get_statistics(db: Session):
    """Retorna estatísticas da biblioteca."""

    total_games = db.query(Game).count()

    backlog = db.query(Game).filter(
        Game.status == GameStatus.BACKLOG
    ).count()

    playing = db.query(Game).filter(
        Game.status == GameStatus.PLAYING
    ).count()

    completed = db.query(Game).filter(
        Game.status == GameStatus.COMPLETED
    ).count()

    dropped = db.query(Game).filter(
        Game.status == GameStatus.DROPPED
    ).count()

    wishlist = db.query(Game).filter(
        Game.status == GameStatus.WISHLIST
    ).count()

    favorite_games = db.query(Game).filter(
        Game.favorite == True
    ).count()

    total_hours = db.query(
        func.sum(Game.hours_played)
    ).scalar() or 0

    average_rating = db.query(
        func.avg(Game.personal_rating)
    ).scalar()

    return {
        "total_games": total_games,
        "backlog": backlog,
        "playing": playing,
        "completed": completed,
        "dropped": dropped,
        "wishlist": wishlist,
        "favorite_games": favorite_games,
        "total_hours": total_hours,
        "average_rating": average_rating
    }