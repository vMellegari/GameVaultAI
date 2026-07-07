from sqlalchemy.orm import Session
from datetime import datetime
from app.models.enums import GameStatus
from app.models.game import Game
from app.schemas.game import GameCreate, GameUpdate
from app.services.rawg_service import get_game_details

def create_game(db: Session, game_data: GameCreate) -> Game:
    """Cria um novo jogo no banco de dados."""
    db_game = Game(
        title=game_data.title,
        platform=game_data.platform,
        status="BACKLOG"
    )
    db.add(db_game)
    db.commit()
    db.refresh(db_game)
    return db_game

def get_all_games(
        db: Session,
        status: GameStatus | None = None,
        platform: str | None = None,
        title: str | None = None):
    """Retorna todos os jogos cadastrados."""
    query = db.query(Game)

    if status:
        query = query.filter(Game.status == status)

    if platform:
        query = query.filter(Game.platform == platform)

    if title:
        query = query.filter(Game.title.ilike(f"%{title}%"))

    return query.all()

def get_game_by_id(db: Session, game_id: int):
    """Busca um jogo específico pelo ID."""
    return db.query(Game).filter(Game.id == game_id).first()

def import_game_from_rawg(db: Session, rawg_id: int):
    """Importa um jogo da RAWG e salva no banco de dados."""
    game_details = get_game_details(rawg_id)
    if not game_details:
        return None
    
    existing_game = db.query(Game).filter(
        Game.rawg_id == rawg_id
    ).first()

    if existing_game:
        return existing_game
    
    release_date = None

    if game_details["released"]:
        release_date = datetime.strptime(
            game_details["released"],
            "%Y-%m-%d"
        ).date()

    db_game = Game(
        title=game_details["title"],
        platform="PC",  # alterar depois para pegar da Rawg
        status="BACKLOG",
        rawg_id=game_details["rawg_id"],
        cover_image=game_details.get("cover_image"),
        release_date=release_date,
        genres=game_details.get("genres"),
        metacritic_score=game_details.get("metacritic_score")
    )
    db.add(db_game)
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