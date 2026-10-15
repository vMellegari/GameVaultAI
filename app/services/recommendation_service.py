from concurrent.futures import ThreadPoolExecutor, as_completed
import logging
import time

from google import genai
import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.game import Game
from app.models.user import User
from app.schemas.recommendation import RecommendationResponse
from app.services.gemini_error_service import get_gemini_http_status
from app.services.rawg_service import RawgProviderError, search_games

logger = logging.getLogger(__name__)


class RecommendationProviderError(Exception):
    def __init__(self, status_code: int, message: str):
        self.status_code = status_code
        self.message = message
        super().__init__(message)


def get_recommendation_context(db: Session, owner: User):
    """Monta o contexto da biblioteca para o sistema de recomendação."""

    games = db.query(Game).filter(
        Game.owner_id == owner.id
    ).all()

    return [
        {
            "title": game.title,
            "platform": game.platform,
            "status": game.status.value,
            "favorite": game.favorite,
            "personal_rating": game.personal_rating,
            "hours_played": game.hours_played,
            "genres": game.genres,
            "metacritic_score": game.metacritic_score,
        }
        for game in games
    ]


def enrich_recommendations_with_rawg(
    recommendations: RecommendationResponse
) -> RecommendationResponse:
    """Adiciona dados da RAWG às recomendações geradas pelo Gemini."""

    if not recommendations.recommendations:
        return recommendations

    started_at = time.perf_counter()
    worker_count = min(3, len(recommendations.recommendations))
    with ThreadPoolExecutor(max_workers=worker_count) as executor:
        searches = {
            executor.submit(search_games, recommendation.title): recommendation
            for recommendation in recommendations.recommendations
        }

        for future in as_completed(searches):
            recommendation = searches[future]
            try:
                games = future.result()
            except RawgProviderError:
                logger.warning(
                    "Could not enrich recommendation with RAWG: %s",
                    recommendation.title,
                )
                continue

            if not games:
                continue

            recommendation_title = recommendation.title.lower().strip()

            exact_match = next(
                (
                    game
                    for game in games
                    if game.get("title", "").lower().strip()
                    == recommendation_title
                ),
                None,
            )

            game = exact_match or games[0]
            recommendation.rawg_id = game.get("rawg_id")
            recommendation.cover_image = game.get("cover_image")

    logger.info(
        "RAWG recommendation enrichment finished in %.2fs (%d items)",
        time.perf_counter() - started_at,
        len(recommendations.recommendations),
    )
    return recommendations


def generate_recommendations(db: Session, owner: User):
    """Gera recomendações de jogos utilizando o Gemini."""

    games = get_recommendation_context(
        db=db,
        owner=owner
    )

    if not games:
        return {
            "recommendations": []
        }

    if not settings.GEMINI_API_KEY:
        raise RecommendationProviderError(
            503, "Configure GEMINI_API_KEY para gerar recomendações."
        )

    client = genai.Client(
        api_key=settings.GEMINI_API_KEY,
        http_options={"timeout": 45000},
    )

    prompt = f"""
Você é um especialista em jogos eletrônicos.

Analise a biblioteca de jogos abaixo e recomende 5 jogos
que possam combinar com os interesses desse usuário.

Considere principalmente:
- jogos favoritos;
- notas pessoais;
- gêneros;
- jogos já concluídos;
- jogos que o usuário está jogando;
- nota Metacritic quando disponível.

Não recomende jogos que já estejam na biblioteca.

Para cada recomendação, informe:
- title: nome do jogo;
- genres: lista de gêneros;
- reason: explicação breve de por que o jogo combina com o perfil.

Retorne apenas os dados solicitados.

Biblioteca do usuário:
{games}
"""

    gemini_started_at = time.perf_counter()
    try:
        interaction = client.interactions.create(
            model="gemini-3.6-flash",
            input=prompt,
            response_format={
                "type": "text",
                "mime_type": "application/json",
                "schema": RecommendationResponse.model_json_schema(),
            },
            generation_config={
                "thinking_level": "low"
            },
            retries=False,
        )
    except Exception as error:
        status_code = get_gemini_http_status(error)
        logger.exception(
            "Gemini recommendations request failed (status=%s, type=%s)",
            status_code,
            type(error).__name__,
        )
        if status_code == 429:
            raise RecommendationProviderError(
                429,
                "O Gemini informou que a cota do projeto foi excedida. Confira os limites e o uso no Google AI Studio antes de tentar novamente.",
            ) from error
        if status_code == 504 or isinstance(error, httpx.TimeoutException):
            raise RecommendationProviderError(
                504,
                "O Gemini demorou para responder. Aguarde um pouco e tente novamente.",
            ) from error
        if isinstance(error, httpx.HTTPError):
            raise RecommendationProviderError(
                502,
                "Não foi possível conectar ao Gemini. Tente novamente mais tarde.",
            ) from error
        raise RecommendationProviderError(
            502,
            "O serviço de recomendações está indisponível no momento. Tente novamente mais tarde.",
        ) from error

    logger.info(
        "Gemini recommendation generation finished in %.2fs",
        time.perf_counter() - gemini_started_at,
    )

    if interaction.output_text is None:
        raise RecommendationProviderError(
            502, "O Gemini não retornou uma resposta válida. Tente novamente."
        )

    recommendations = RecommendationResponse.model_validate_json(
        interaction.output_text
    )

    recommendations = enrich_recommendations_with_rawg(
        recommendations
    )

    return recommendations.model_dump()
