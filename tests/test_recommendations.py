import json
from types import SimpleNamespace

from app.services import recommendation_service


def test_recommendations_skip_gemini_when_library_is_empty(
    client,
    auth_headers,
    monkeypatch,
):
    def unexpected_gemini_call(**kwargs):
        raise AssertionError("Gemini should not be called for an empty library")

    monkeypatch.setattr(
        recommendation_service.genai,
        "Client",
        unexpected_gemini_call,
    )

    response = client.get("/games/recommendations", headers=auth_headers)

    assert response.status_code == 200
    assert response.json() == {"recommendations": []}


def test_recommendations_use_gemini_and_enrich_exact_rawg_match(
    client,
    create_game,
    auth_headers,
    monkeypatch,
):
    create_game(title="Favorite RPG", game_type="STANDARD")
    gemini_result = {
        "recommendations": [
            {
                "title": "Example Adventure",
                "genres": ["RPG"],
                "reason": "Combina com seu interesse em RPGs.",
                "rawg_id": None,
                "cover_image": None,
            }
        ]
    }

    def fake_create(**kwargs):
        assert kwargs["model"] == "gemini-3.6-flash"
        return SimpleNamespace(output_text=json.dumps(gemini_result))

    fake_client = SimpleNamespace(
        interactions=SimpleNamespace(create=fake_create)
    )
    monkeypatch.setattr(
        recommendation_service.genai,
        "Client",
        lambda **kwargs: fake_client,
    )
    monkeypatch.setattr(
        recommendation_service,
        "search_games",
        lambda title: [
            {
                "title": "Example Adventure: Deluxe Edition",
                "rawg_id": 10,
                "cover_image": "https://example.test/wrong.jpg",
            },
            {
                "title": "Example Adventure",
                "rawg_id": 20,
                "cover_image": "https://example.test/cover.jpg",
            },
        ],
    )

    response = client.get("/games/recommendations", headers=auth_headers)

    assert response.status_code == 200
    recommendation = response.json()["recommendations"][0]
    assert recommendation["title"] == "Example Adventure"
    assert recommendation["rawg_id"] == 20
    assert recommendation["cover_image"] == "https://example.test/cover.jpg"
