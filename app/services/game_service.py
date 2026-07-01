from sqlalchemy.orm import Session
from datetime import datetime
from app.models.game import Game
from app.schemas.game import GameCreate
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

def get_all_games(db: Session):
    """Retorna todos os jogos cadastrados."""
    return db.query(Game).all()

def get_game_by_id(db: Session, game_id: int):
    """Busca um jogo específico pelo ID."""
    return db.query(Game).filter(Game.id == game_id).first()

def import_game_from_rawg(db: Session, rawg_id: int):
    """
    Importa um jogo da RAWG e salva no banco de dados.
    """
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