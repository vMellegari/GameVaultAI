from datetime import date


def test_start_game_sets_playing_and_clears_completed_at(
    client,
    create_game,
    auth_headers
):
    game = create_game(title="State Game")

    complete_response = client.patch(
        f"/games/{game['id']}/complete",
        headers=auth_headers
    )
    assert complete_response.status_code == 200
    assert complete_response.json()["status"] == "COMPLETED"
    assert complete_response.json()["completed_at"] == (
        date.today().isoformat() + "T00:00:00"
    )

    response = client.patch(
        f"/games/{game['id']}/start",
        headers=auth_headers
    )

    assert response.status_code == 200
    assert response.json()["status"] == "PLAYING"
    assert response.json()["completed_at"] is None


def test_update_completed_status_sets_completed_at(
    client,
    create_game,
    auth_headers
):
    game = create_game(title="Completed Game")

    response = client.patch(
        f"/games/{game['id']}",
        json={"status": "COMPLETED"},
        headers=auth_headers
    )

    assert response.status_code == 200
    assert response.json()["completed_at"] == (
        date.today().isoformat() + "T00:00:00"
    )


def test_update_status_rejects_unknown_value(client, create_game, auth_headers):
    game = create_game(title="Validated Game")

    response = client.patch(
        f"/games/{game['id']}",
        json={"status": "UNKNOWN"},
        headers=auth_headers
    )

    assert response.status_code == 422


def test_list_games_rejects_invalid_pagination(client, auth_headers):
    for query in ("page=0", "page=-1", "limit=0", "limit=-1"):
        response = client.get(f"/games?{query}", headers=auth_headers)
        assert response.status_code == 422
