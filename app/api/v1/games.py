from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.enums import GameStatus, SortField
from app.schemas.game import GameCreate, GameResponse, GameUpdate
from app.schemas.stats import GameStats
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
def list_games(
    db: Session = Depends(get_db),
    status: GameStatus | None = None,
    platform: str | None = None,
    title: str |None = None,
    favorite: bool | None = None,
    sort_by: SortField | None = None,
    page: int = 1,
    limit: int = 10,
):

    return game_service.get_all_games(
        db=db,
        status=status,
        platform=platform,
        title=title,
        sort_by=sort_by,
        page=page,
        limit=limit,
        favorite=favorite
        )

@router.get("/games/stats", response_model=GameStats)
def get_game_stats(db: Session = Depends(get_db)):
    return game_service.get_statistics(db)

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

@router.post("/games/{game_id}/refresh", response_model=GameResponse)
def refresh_game(game_id: int, db: Session = Depends(get_db)):
    game = game_service.refresh_game_from_rawg(db=db, game_id=game_id)

    if not game:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Jogo não encontrado ou sem RAWG ID."
        )

    return game

@router.patch("/games/{game_id}", response_model=GameResponse)
def update_game(game_id: int, game_data: GameUpdate, db: Session = Depends(get_db)):
    game = game_service.update_game(db=db, game_id=game_id, game_data=game_data)
    if not game:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Jogo não encontrado."
        )
    return game

@router.delete("/games/{game_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_game(game_id: int, db: Session = Depends(get_db)):
    deleted = game_service.delete_game(db=db, game_id=game_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Jogo não encontrado."
        )