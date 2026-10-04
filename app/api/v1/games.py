from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.enums import GameStatus, GameType, SortField
from app.schemas.game import GameCreate, GameResponse, GameUpdate
from app.schemas.game_session import (
    GameSessionCreate,
    GameSessionInsightsResponse,
    GameSessionImageResponse,
    GameSessionResponse,
    GameSessionUpdate,
    RecentGameSessionResponse,
)
from app.schemas.stats import GameStats
from app.schemas.session_stats import GameSessionStats
from app.schemas.rawg import RawgGame
from app.schemas.recommendation import RecommendationResponse
from app.services import (
    game_service,
    game_session_service,
    game_session_image_service,
    rawg_service,
    recommendation_service,
    session_insight_service,
)

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
    query = query.strip()

    if len(query) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A busca deve conter pelo menos 2 caracteres."
        )

    try:
        return rawg_service.search_games(query)
    except rawg_service.RawgProviderError as error:
        raise HTTPException(
            status_code=error.status_code,
            detail=error.message,
        ) from error


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
    game_type: GameType | None = None,
    platform: str | None = None,
    title: str | None = None,
    favorite: bool | None = None,
    sort_by: SortField | None = None,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
):

    return game_service.get_all_games(
        db=db,
        owner=current_user,
        status=status,
        game_type=game_type,
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
    "/games/recommendations",
    response_model=RecommendationResponse,
    summary="Gerar recomendações de jogos",
    description="Analisa a biblioteca do usuário e gera recomendações personalizadas utilizando IA."
)
def get_recommendations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        return recommendation_service.generate_recommendations(
            db=db,
            owner=current_user
        )
    except recommendation_service.RecommendationProviderError as error:
        raise HTTPException(
            status_code=error.status_code,
            detail=error.message,
        ) from error


@router.get(
    "/games/sessions/recent",
    response_model=list[RecentGameSessionResponse],
    summary="Listar sessões recentes da biblioteca",
)
def list_recent_game_sessions(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    game_title: str | None = Query(default=None, max_length=100),
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    min_duration: int | None = Query(default=None, ge=1, le=1440),
    max_duration: int | None = Query(default=None, ge=1, le=1440),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if date_from and date_to and date_from >= date_to:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="A data inicial deve ser anterior à data final.",
        )
    if (
        min_duration is not None
        and max_duration is not None
        and min_duration > max_duration
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="A duração mínima não pode superar a duração máxima.",
        )

    return game_session_service.get_recent_game_sessions(
        db=db,
        owner=current_user,
        limit=limit,
        offset=(page - 1) * limit,
        game_title=game_title,
        date_from=date_from,
        date_to=date_to,
        min_duration=min_duration,
        max_duration=max_duration,
    )


@router.get(
    "/games/sessions/stats",
    response_model=GameSessionStats,
    summary="Obter estatísticas das sessões de jogo",
)
def get_game_session_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return game_session_service.get_game_session_stats(db, current_user)


@router.post(
    "/games/sessions/insights",
    response_model=GameSessionInsightsResponse,
    summary="Analisar observações das sessões com IA",
)
def get_game_session_insights(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return session_insight_service.analyze_session_notes(db, current_user)
    except session_insight_service.SessionInsightProviderError as error:
        raise HTTPException(
            status_code=error.status_code,
            detail=error.message,
        ) from error


@router.get(
    "/games/{game_id}",
    response_model=GameResponse,
    summary="Obter detalhes de um jogo específico",
    description="Retorna os detalhes de um jogo específico com base no ID do Banco de Dados fornecido."
)
def get_game(game_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    game = game_service.get_game_by_id(
        db=db, game_id=game_id, owner=current_user)
    if not game:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Jogo não encontrado."
        )
    return game


@router.get(
    "/games/{game_id}/sessions",
    response_model=list[GameSessionResponse],
    summary="Listar sessões de um jogo",
)
def list_game_sessions(
    game_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sessions = game_session_service.get_game_sessions(
        db=db,
        game_id=game_id,
        owner=current_user,
    )

    if sessions is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Jogo não encontrado.",
        )

    return sessions


@router.post(
    "/games/{game_id}/sessions",
    response_model=GameSessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar uma sessão de jogo",
)
def create_game_session(
    game_id: int,
    session_data: GameSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    game_session = game_session_service.create_game_session(
        db=db,
        game_id=game_id,
        owner=current_user,
        duration_minutes=session_data.duration_minutes,
        played_at=session_data.played_at,
        notes=session_data.notes,
    )

    if not game_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Jogo não encontrado.",
        )

    return game_session


@router.patch(
    "/games/{game_id}/sessions/{session_id}",
    response_model=GameSessionResponse,
    summary="Editar uma sessão de jogo",
)
def update_game_session(
    game_id: int,
    session_id: int,
    session_data: GameSessionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    game_session = game_session_service.update_game_session(
        db=db,
        game_id=game_id,
        session_id=session_id,
        owner=current_user,
        update_data=session_data.model_dump(exclude_unset=True),
    )
    if game_session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sessão de jogo não encontrada.",
        )
    return game_session


@router.delete(
    "/games/{game_id}/sessions/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Excluir uma sessão de jogo",
)
def delete_game_session(
    game_id: int,
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    deleted_minutes = game_session_service.delete_game_session(
        db=db,
        game_id=game_id,
        session_id=session_id,
        owner=current_user,
    )

    if deleted_minutes is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sessão de jogo não encontrada.",
        )


@router.post(
    "/games/{game_id}/sessions/{session_id}/images",
    response_model=list[GameSessionImageResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Anexar imagens a uma sessão",
)
async def upload_game_session_images(
    game_id: int,
    session_id: int,
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = game_session_image_service.get_owned_session(
        db=db,
        game_id=game_id,
        session_id=session_id,
        owner=current_user,
    )
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sessão de jogo não encontrada.",
        )
    if len(files) > game_session_image_service.MAX_IMAGES_PER_SESSION:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Envie no máximo 5 imagens por vez.",
        )

    uploads = []
    for upload in files:
        data = await upload.read(game_session_image_service.MAX_IMAGE_SIZE + 1)
        uploads.append((upload.filename or "screenshot", data))
        await upload.close()

    try:
        return game_session_image_service.store_session_images(
            db=db,
            session=session,
            uploads=uploads,
        )
    except game_session_image_service.SessionImageError as error:
        raise HTTPException(
            status_code=error.status_code,
            detail=error.message,
        ) from error


@router.get(
    "/games/{game_id}/sessions/{session_id}/images/{image_id}",
    summary="Obter uma imagem anexada à sessão",
)
def get_game_session_image(
    game_id: int,
    session_id: int,
    image_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    image = game_session_image_service.get_owned_image(
        db=db,
        game_id=game_id,
        session_id=session_id,
        image_id=image_id,
        owner=current_user,
    )
    if image is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Imagem não encontrada.",
        )

    if game_session_image_service.uses_remote_storage():
        try:
            image_bytes = game_session_image_service.get_image_bytes(image)
        except game_session_image_service.SessionImageError as error:
            raise HTTPException(
                status_code=error.status_code,
                detail=error.message,
            ) from error
        return Response(content=image_bytes, media_type=image.content_type)

    path = game_session_image_service.image_file_path(image)
    if not path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Arquivo de imagem não encontrado.",
        )
    return FileResponse(path, media_type=image.content_type)


@router.delete(
    "/games/{game_id}/sessions/{session_id}/images/{image_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Excluir uma imagem da sessão",
)
def delete_game_session_image(
    game_id: int,
    session_id: int,
    image_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    image = game_session_image_service.get_owned_image(
        db=db,
        game_id=game_id,
        session_id=session_id,
        image_id=image_id,
        owner=current_user,
    )
    if image is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Imagem não encontrada.",
        )
    game_session_image_service.delete_image(db, image)


@router.post(
    "/games/import/{rawg_id}",
    response_model=GameResponse,
    summary="Importar um jogo da RAWG",
    description="Permite importar um jogo da API da RAWG para o banco de dados com base no ID da RAWG fornecido."
)
def import_game(
    rawg_id: int,
    game_type: GameType = Query(default=GameType.STANDARD),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        game = game_service.import_game_from_rawg(
            db=db,
            rawg_id=rawg_id,
            owner=current_user,
            game_type=game_type,
        )
    except game_service.GameRuleViolation as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(error),
        ) from error
    except rawg_service.RawgProviderError as error:
        raise HTTPException(
            status_code=error.status_code,
            detail=error.message,
        ) from error

    if not game:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Jogo não encontrado na RAWG."
        )

    return game


@router.post(
    "/games/{game_id}/refresh",
    response_model=GameResponse,
    summary="Atualizar informações de um jogo com dados da RAWG",
    description="Permite atualizar as informações de um jogo cadastrado no banco de dados com base no ID do jogo com dados da RAWG."
)
def refresh_game(game_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        game = game_service.refresh_game_from_rawg(
            db=db, game_id=game_id, owner=current_user)
    except rawg_service.RawgProviderError as error:
        raise HTTPException(
            status_code=error.status_code,
            detail=error.message,
        ) from error

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
    try:
        game = game_service.update_game(
            db=db, game_id=game_id, game_data=game_data, owner=current_user)
    except game_service.GameRuleViolation as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(error),
        ) from error

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
    try:
        game = game_service.complete_game(
            db=db, game_id=game_id, owner=current_user)
    except game_service.GameRuleViolation as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(error),
        ) from error

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
    game = game_service.toggle_favorite(
        db=db, game_id=game_id, owner=current_user)

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
    deleted = game_service.delete_game(
        db=db, game_id=game_id, owner=current_user)

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
