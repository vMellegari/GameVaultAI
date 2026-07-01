import requests

from app.core.config import settings

BASE_URL = "https://api.rawg.io/api"


def search_games(query: str) -> list[dict]:
    """
    Busca jogos na API da RAWG com base na query fornecida e retorna uma lista de dicionários contendo informações sobre os jogos encontrados.
    """

    url = f"{BASE_URL}/games"

    params = {
        "key": settings.RAWG_API_KEY,
        "search": query
    }

    try:
        response = requests.get(
            url,
            params=params,
            timeout=10
        )

        response.raise_for_status()

        data = response.json()

        games = []

        for game in data.get("results", []):
            games.append({
                "rawg_id": game.get("id"),
                "title": game.get("name"),
                "cover_image": game.get("background_image"),
                "released": game.get("released")
            })

        return games

    except requests.exceptions.RequestException as e:
        print(f"Erro ao buscar jogos na RAWG: {e}")
        return []