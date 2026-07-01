from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.schemas.game import GameCreate, GameResponse 
from app.schemas.rawg import RawgGame
from app.services import game_service, rawg_service

router = APIRouter()

@router.post("/games", response_model=GameResponse, status_code=status.HTTP_201_CREATED)
def create_game(game: GameCreate, db: Session = Depends(get_db)):
    return game_service.create_game(db=db, game_data=game)


@router.get("/games/search", response_model=list[RawgGame])
def search_games(query: str):
    return rawg_service.search_games(query)


@router.get("/games", response_model=List[GameResponse])
def list_games(db: Session = Depends(get_db)):
    return game_service.get_all_games(db=db)


@router.get("/games/{game_id}", response_model=GameResponse)
def get_game(game_id: int, db: Session = Depends(get_db)):
    game = game_service.get_game_by_id(db=db, game_id=game_id)
    if not game:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Jogo não encontrado."
        )
    return game

@router.post("/games/import/{rawg_id}", response_model=GameResponse)
def import_game(rawg_id: int, db: Session = Depends(get_db)):
    return game_service.import_game_from_rawg(db=db, rawg_id=rawg_id)