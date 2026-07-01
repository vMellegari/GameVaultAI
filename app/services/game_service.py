from sqlalchemy.orm import Session
from app.models.game import Game
from app.schemas.game import GameCreate

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