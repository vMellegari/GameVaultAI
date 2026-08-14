from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.enums import GameStatus, SortField
from app.schemas.game import GameCreate, GameResponse, GameUpdate
from app.schemas.stats import GameStats
from app.schemas.rawg import RawgGame
from app.services import game_service, rawg_service

router = APIRouter()

@router.post(
        "/games",
        response_model=GameResponse, 
        status_code=status.HTTP_201_CREATED,
        summary="Cadastrar um novo jogo",
        description="Permite cadastrar um novo jogo no banco de dados com base nas informações fornecidas."
        )
def create_game(
    game: GameCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    ):
    return game_service.create_game(db=db, game_data=game, owner=current_user)


@router.get(
        "/games/search",
        response_model=list[RawgGame],
        summary="Pesquisar jogos na RAWG",
        description="Permite pesquisar jogos na API da RAWG com base no titulo do jogo."
        )
def search_games(query: str):
    return rawg_service.search_games(query)


@router.get(
        "/games",
        response_model=List[GameResponse],
        summary="Listar os jogos",
        description="Retorna uma lista de jogos cadastrados no banco de dados com base nos filtros selecionados."
        )
def list_games(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
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
        owner=current_user,
        status=status,
        platform=platform,
        title=title,
        sort_by=sort_by,
        page=page,
        limit=limit,
        favorite=favorite
        )

@router.get(
        "/games/stats", 
        response_model=GameStats, 
        summary="Obter estatísticas dos seus jogos cadastrados", 
        description="Retorna estatísticas gerais sobre os jogos cadastrados no banco de dados."
        )
def get_game_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return game_service.get_statistics(db=db, owner=current_user)

@router.get(
        "/games/{game_id}", 
        response_model=GameResponse,
        summary="Obter detalhes de um jogo específico",
        description="Retorna os detalhes de um jogo específico com base no ID do Banco de Dados fornecido."
        )
def get_game(game_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    game = game_service.get_game_by_id(db=db, game_id=game_id, owner=current_user)
    if not game:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Jogo não encontrado."
        )
    return game

@router.post(
        "/games/import/{rawg_id}",
        response_model=GameResponse,
        summary="Importar um jogo da RAWG",
        description="Permite importar um jogo da API da RAWG para o banco de dados com base no ID da RAWG fornecido."
        )
def import_game(rawg_id: int, db: Session = Depends(get_db)):
    return game_service.import_game_from_rawg(db=db, rawg_id=rawg_id)

@router.post(
        "/games/{game_id}/refresh",
        response_model=GameResponse,
        summary="Atualizar informações de um jogo com dados da RAWG",
        description="Permite atualizar as informações de um jogo cadastrado no banco de dados com base no ID do jogo com dados da RAWG."
        )
def refresh_game(game_id: int, db: Session = Depends(get_db)):
    game = game_service.refresh_game_from_rawg(db=db, game_id=game_id)

    if not game:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Jogo não encontrado ou sem RAWG ID."
        )

    return game

@router.patch(
        "/games/{game_id}",
        response_model=GameResponse,
        summary="Atualizar informações proprias de um jogo",
        description="Permite atualizar as informações de um jogo cadastrado no banco de dados com base no ID do jogo."
        )
def update_game(game_id: int, game_data: GameUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    game = game_service.update_game(db=db, game_id=game_id, game_data=game_data, owner=current_user)
    if not game:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Jogo não encontrado."
        )
    return game

@router.patch(
        "/games/{game_id}/start",
        response_model=GameResponse,
        summary="Iniciar um jogo, toggle",
        description="Toggle para iniciar um jogo cadastrado no banco de dados com base no ID do jogo."
        )
def start_game(game_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    game = game_service.start_game(db=db, game_id=game_id, owner=current_user)

    if not game:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Jogo não encontrado."
        )

    return game

@router.patch(
        "/games/{game_id}/complete",
        response_model=GameResponse,
        summary="Completar um jogo, toggle",
        description="Toggle para marcar um jogo como completo no banco de dados com base no ID do jogo."
        )
def complete_game(game_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    game = game_service.complete_game(db=db, game_id=game_id, owner=current_user)

    if not game:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Jogo não encontrado."
        )

    return game

@router.patch(
        "/games/{game_id}/toggle-favorite",
        response_model=GameResponse,
        summary="Marcar/desmarcar um jogo como favorito, toggle",
        description="Toggle para marcar um jogo como favorito no banco de dados com base no ID do jogo."
        )
def toggle_favorite(game_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    game = game_service.toggle_favorite(db=db, game_id=game_id, owner=current_user)

    if not game:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Jogo não encontrado."
        )

    return game

@router.delete(
        "/games/{game_id}",
        status_code=status.HTTP_204_NO_CONTENT,
        summary="Excluir um jogo",
        description="Permite excluir um jogo cadastrado no banco de dados com base no ID do jogo."
        )
def delete_game(game_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    deleted = game_service.delete_game(db=db, game_id=game_id, owner=current_user)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Jogo não encontrado."
        )

@router.get("/auth-test")
def auth_test(
    current_user: User = Depends(get_current_user)
):
    return {
        "message": "Autenticado com sucesso",
        "username": current_user.username
    }




