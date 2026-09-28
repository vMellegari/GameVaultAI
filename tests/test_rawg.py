from unittest.mock import Mock
import requests

from app.schemas.rawg import RawgGameDetails


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


def test_search_games_returns_empty_list_on_rawg_timeout(client, monkeypatch):
    monkeypatch.setattr(
        "app.services.rawg_service.requests.get",
        Mock(side_effect=requests.exceptions.Timeout)
    )

    response = client.get("/games/search?query=timeout")

    assert response.status_code == 200
    assert response.json() == []


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
