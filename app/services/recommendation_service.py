import logging

from google import genai
from google.genai.errors import APIError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.game import Game
from app.models.user import User
from app.schemas.recommendation import RecommendationResponse
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

    for recommendation in recommendations.recommendations:
        try:
            games = search_games(recommendation.title)
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
                if game.get("title", "").lower().strip() == recommendation_title
            ),
            None
        )

        game = exact_match or games[0]

        recommendation.rawg_id = game.get("rawg_id")
        recommendation.cover_image = game.get("cover_image")

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

    client = genai.Client(
        api_key=settings.GEMINI_API_KEY
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
            }
        )
    except APIError as error:
        logger.exception("Gemini recommendations request failed (status=%s)", error.code)
        if error.code == 429:
            raise RecommendationProviderError(
                429,
                "O limite de requisições do Gemini foi atingido. Aguarde e tente novamente.",
            ) from error
        raise RecommendationProviderError(
            502,
            "O serviço de recomendações está indisponível no momento. Tente novamente mais tarde.",
        ) from error

    if interaction.output_text is None:
        raise RuntimeError("O Gemini não retornou uma resposta válida.")

    recommendations = RecommendationResponse.model_validate_json(
        interaction.output_text
    )

    recommendations = enrich_recommendations_with_rawg(
        recommendations
    )

    return recommendations.model_dump()
