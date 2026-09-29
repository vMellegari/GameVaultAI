import logging

import requests

from app.core.config import settings
from app.schemas.rawg import RawgGameDetails

BASE_URL = "https://api.rawg.io/api"
logger = logging.getLogger(__name__)


class RawgProviderError(Exception):
    def __init__(self, status_code: int, message: str):
        self.status_code = status_code
        self.message = message
        super().__init__(message)


def _request_json(url: str, params: dict) -> dict:
    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.Timeout as error:
        logger.warning("RAWG request timed out (%s)", type(error).__name__)
        raise RawgProviderError(
            504,
            "A RAWG demorou para responder. Tente novamente em instantes.",
        ) from error
    except requests.exceptions.RequestException as error:
        logger.warning("RAWG request failed (%s)", type(error).__name__)
        raise RawgProviderError(
            502,
            "Não foi possível acessar a RAWG no momento. Tente novamente mais tarde.",
        ) from error
    except ValueError as error:
        logger.warning("RAWG returned invalid JSON (%s)", type(error).__name__)
        raise RawgProviderError(
            502,
            "A RAWG retornou uma resposta inválida.",
        ) from error


def search_games(query: str) -> list[dict]:
    """Busca jogos na API da RAWG com base na query fornecida e retorna uma lista de dicionários contendo informações sobre os jogos encontrados."""

    url = f"{BASE_URL}/games"

    params = {
        "key": settings.RAWG_API_KEY,
        "search": query
    }

    data = _request_json(url, params)
    return [
        {
            "rawg_id": game.get("id"),
            "title": game.get("name"),
            "cover_image": game.get("background_image"),
            "released": game.get("released"),
        }
        for game in data.get("results", [])
    ]
    

def get_game_details(rawg_id: int) -> RawgGameDetails | None:

    url = f"{BASE_URL}/games/{rawg_id}"

    params = {
        "key": settings.RAWG_API_KEY,
    }

    game = _request_json(url, params)
    genres = ", ".join(
        genre["name"]
        for genre in game.get("genres", [])
    )

    platform = ", ".join(
        platform["platform"]["name"]
        for platform in game.get("platforms", [])
    )

    return RawgGameDetails(
        rawg_id=game.get("id"),
        title=game.get("name"),
        platform=platform,
        cover_image=game.get("background_image"),
        released=game.get("released"),
        description=game.get("description_raw") or game.get("description"),
        genres=genres,
        metacritic_score=game.get("metacritic"),
    )
    
