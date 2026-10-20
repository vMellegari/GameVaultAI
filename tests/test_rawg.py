from unittest.mock import Mock
import requests

from app.schemas.rawg import RawgGameDetails
from app.services import rawg_service


def rawg_details(rawg_id=123):
    return RawgGameDetails(
        rawg_id=rawg_id,
        title="Imported Game",
        platform="PC",
        cover_image="https://example.com/cover.jpg",
        released="2020-01-02",
        genres="Action, RPG",
        metacritic_score=88
    )


def test_search_games_returns_normalized_rawg_results(client, monkeypatch):
    response_mock = Mock()
    response_mock.raise_for_status.return_value = None
    response_mock.json.return_value = {
        "results": [
            {
                "id": 123,
                "name": "Imported Game",
                "background_image": "https://example.com/cover.jpg",
                "released": "2020-01-02"
            }
        ]
    }
    monkeypatch.setattr(
        "app.services.rawg_service.requests.get",
        Mock(return_value=response_mock)
    )

    response = client.get("/games/search?query=imported")

    assert response.status_code == 200
    assert response.json() == [
        {
            "rawg_id": 123,
            "title": "Imported Game",
            "cover_image": "https://example.com/cover.jpg",
            "released": "2020-01-02"
        }
    ]


def test_search_games_reports_rawg_timeout(client, monkeypatch):
    monkeypatch.setattr(
        "app.services.rawg_service.requests.get",
        Mock(side_effect=requests.exceptions.Timeout)
    )

    response = client.get("/games/search?query=timeout")

    assert response.status_code == 504
    assert "RAWG demorou" in response.json()["detail"]


def test_import_game_persists_rawg_details(client, auth_headers, monkeypatch):
    monkeypatch.setattr(
        "app.services.game_service.get_game_details",
        lambda rawg_id: rawg_details(rawg_id)
    )

    response = client.post("/games/import/123", headers=auth_headers)

    assert response.status_code == 200
    assert response.json()["rawg_id"] == 123
    assert response.json()["title"] == "Imported Game"
    assert response.json()["release_date"] == "2020-01-02"
    assert response.json()["genres"] == "Action, RPG"
    assert response.json()["game_type"] == "STANDARD"


def test_import_game_accepts_ongoing_type(client, auth_headers, monkeypatch):
    monkeypatch.setattr(
        "app.services.game_service.get_game_details",
        lambda rawg_id: rawg_details(rawg_id)
    )

    response = client.post(
        "/games/import/123?game_type=ONGOING",
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert response.json()["game_type"] == "ONGOING"


def test_import_game_returns_existing_game_for_same_user(
    client,
    auth_headers,
    monkeypatch
):
    monkeypatch.setattr(
        "app.services.game_service.get_game_details",
        lambda rawg_id: rawg_details(rawg_id)
    )

    first = client.post(
        "/games/import/123?game_type=ONGOING",
        headers=auth_headers,
    )
    second = client.post("/games/import/123", headers=auth_headers)

    assert first.status_code == 200
    assert second.status_code == 200
    assert second.json()["id"] == first.json()["id"]
    assert second.json()["game_type"] == "ONGOING"


def test_import_game_enriches_manual_game_and_applies_selected_type(
    client,
    create_game,
    auth_headers,
    monkeypatch,
):
    manual_game = create_game(title="Imported Game")
    monkeypatch.setattr(
        "app.services.game_service.get_game_details",
        lambda rawg_id: rawg_details(rawg_id)
    )

    response = client.post(
        "/games/import/123?game_type=ONGOING",
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert response.json()["id"] == manual_game["id"]
    assert response.json()["rawg_id"] == 123
    assert response.json()["game_type"] == "ONGOING"


def test_import_ongoing_type_rejects_completed_manual_game(
    client,
    create_game,
    auth_headers,
    monkeypatch,
):
    manual_game = create_game(title="Imported Game")
    completed = client.patch(
        f"/games/{manual_game['id']}/complete",
        headers=auth_headers,
    )
    assert completed.status_code == 200

    monkeypatch.setattr(
        "app.services.game_service.get_game_details",
        lambda rawg_id: rawg_details(rawg_id)
    )

    response = client.post(
        "/games/import/123?game_type=ONGOING",
        headers=auth_headers,
    )

    assert response.status_code == 422
    assert response.json()["detail"] == (
        "Um jogo concluído não pode ser importado como experiência contínua."
    )

    unchanged = client.get(
        f"/games/{manual_game['id']}",
        headers=auth_headers,
    )
    assert unchanged.status_code == 200
    assert unchanged.json()["status"] == "COMPLETED"
    assert unchanged.json()["game_type"] == "STANDARD"
    assert unchanged.json()["rawg_id"] is None


def test_import_game_is_not_shared_between_users(
    client,
    auth_headers,
    second_auth_headers,
    monkeypatch
):
    monkeypatch.setattr(
        "app.services.game_service.get_game_details",
        lambda rawg_id: rawg_details(rawg_id)
    )

    first = client.post("/games/import/123", headers=auth_headers)
    second = client.post("/games/import/123", headers=second_auth_headers)

    assert first.status_code == 200
    assert second.status_code == 200
    assert second.json()["id"] != first.json()["id"]


def test_refresh_game_without_rawg_id_returns_not_found(
    client,
    create_game,
    auth_headers
):
    game = create_game(title="Manual Game")

    response = client.post(
        f"/games/{game['id']}/refresh",
        headers=auth_headers
    )

    assert response.status_code == 404


def test_import_game_returns_not_found_when_rawg_has_no_game(
    client,
    auth_headers,
    monkeypatch
):
    monkeypatch.setattr(
        "app.services.game_service.get_game_details",
        lambda rawg_id: None
    )

    response = client.post("/games/import/999", headers=auth_headers)

    assert response.status_code == 404


def test_refresh_game_updates_rawg_details(
    client,
    auth_headers,
    monkeypatch
):
    monkeypatch.setattr(
        "app.services.game_service.get_game_details",
        lambda rawg_id: rawg_details(rawg_id)
    )

    imported = client.post("/games/import/123", headers=auth_headers).json()
    updated_details = rawg_details(123)
    updated_details.title = "Updated Game"
    monkeypatch.setattr(
        "app.services.game_service.get_game_details",
        lambda rawg_id: updated_details
    )

    response = client.post(
        f"/games/{imported['id']}/refresh",
        headers=auth_headers
    )

    assert response.status_code == 200
    assert response.json()["title"] == "Updated Game"


def test_get_game_screenshots_returns_images_for_imported_game(
    client,
    auth_headers,
    monkeypatch,
):
    monkeypatch.setattr(
        "app.services.game_service.get_game_details",
        lambda rawg_id: rawg_details(rawg_id),
    )
    imported = client.post("/games/import/123", headers=auth_headers).json()
    get_screenshots = Mock(
        return_value=[
            "https://example.com/screenshot-1.jpg",
            "https://example.com/screenshot-2.jpg",
        ]
    )
    monkeypatch.setattr(
        "app.api.v1.games.rawg_service.get_game_screenshots",
        get_screenshots,
    )

    response = client.get(
        f"/games/{imported['id']}/screenshots",
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert response.json() == [
        "https://example.com/screenshot-1.jpg",
        "https://example.com/screenshot-2.jpg",
    ]
    get_screenshots.assert_called_once_with(123)


def test_get_game_screenshots_returns_empty_for_manual_game(
    client,
    create_game,
    auth_headers,
    monkeypatch,
):
    game = create_game(title="Manual Game")
    get_screenshots = Mock()
    monkeypatch.setattr(
        "app.api.v1.games.rawg_service.get_game_screenshots",
        get_screenshots,
    )

    response = client.get(
        f"/games/{game['id']}/screenshots",
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert response.json() == []
    get_screenshots.assert_not_called()


def test_user_cannot_get_screenshots_for_another_users_game(
    client,
    auth_headers,
    second_auth_headers,
    monkeypatch,
):
    monkeypatch.setattr(
        "app.services.game_service.get_game_details",
        lambda rawg_id: rawg_details(rawg_id),
    )
    imported = client.post("/games/import/123", headers=auth_headers).json()
    get_screenshots = Mock()
    monkeypatch.setattr(
        "app.api.v1.games.rawg_service.get_game_screenshots",
        get_screenshots,
    )

    response = client.get(
        f"/games/{imported['id']}/screenshots",
        headers=second_auth_headers,
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Jogo não encontrado."
    get_screenshots.assert_not_called()


def test_get_game_screenshots_translates_rawg_provider_error(
    client,
    auth_headers,
    monkeypatch,
):
    monkeypatch.setattr(
        "app.services.game_service.get_game_details",
        lambda rawg_id: rawg_details(rawg_id),
    )
    imported = client.post("/games/import/123", headers=auth_headers).json()
    monkeypatch.setattr(
        "app.api.v1.games.rawg_service.get_game_screenshots",
        Mock(side_effect=rawg_service.RawgProviderError(502, "RAWG indisponível.")),
    )

    response = client.get(
        f"/games/{imported['id']}/screenshots",
        headers=auth_headers,
    )

    assert response.status_code == 502
    assert response.json()["detail"] == "RAWG indisponível."


def test_rawg_screenshots_request_parses_and_caches_results(monkeypatch):
    monkeypatch.setattr(rawg_service, "_screenshot_cache", {})
    monkeypatch.setattr(rawg_service.settings, "RAWG_API_KEY", "test-api-key")
    response_mock = Mock()
    response_mock.raise_for_status.return_value = None
    response_mock.json.return_value = {
        "results": [
            {"image": "https://example.com/screenshot.jpg"},
            {"image": None},
            {},
        ]
    }
    request = Mock(return_value=response_mock)
    monkeypatch.setattr(rawg_service.requests, "get", request)

    first_result = rawg_service.get_game_screenshots(123)
    second_result = rawg_service.get_game_screenshots(123)

    assert first_result == ["https://example.com/screenshot.jpg"]
    assert second_result == first_result
    request.assert_called_once_with(
        "https://api.rawg.io/api/games/123/screenshots",
        params={"key": "test-api-key", "page_size": 10},
        timeout=10,
    )
