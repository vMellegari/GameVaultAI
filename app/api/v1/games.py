from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.game import Game
from app.schemas.game import GameCreate

router = APIRouter()


@router.post("/games")
def create_game(game: GameCreate, db: Session = Depends(get_db)):
    db_game = Game(
    title=game.title,
    platform=game.platform,
    status="BACKLOG"
)
    db.add(db_game)
    db.commit()
    db.refresh(db_game)

    return db_game

@router.get("/games")
def list_games(db: Session = Depends(get_db)):
    games = db.query(Game).all()
    return games

@router.get("/games/{game_id}")
def get_game(game_id: int, db: Session = Depends(get_db)):
    game = db.query(Game).filter(Game.id == game_id).first()

    if not game:
        return {"error": "Jogo não encontrado."}

    return game