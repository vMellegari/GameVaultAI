def test_get_nonexistent_game(client, auth_headers):
    response = client.get("/games/999999", headers=auth_headers)

    assert response.status_code == 404
    assert response.json()["detail"] == "Jogo não encontrado."

def test_update_nonexistent_game(client, auth_headers):
    response = client.patch(
        "/games/999999",
        json={
            "status": "PLAYING"
        }, headers=auth_headers
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Jogo não encontrado."

def test_delete_nonexistent_game(client, auth_headers):
    response = client.delete("/games/999999", headers=auth_headers)

    assert response.status_code == 404
    assert response.json()["detail"] == "Jogo não encontrado."

def test_toggle_favorite_nonexistent_game(client, auth_headers):
    response = client.patch("/games/999999/toggle-favorite", headers=auth_headers)

    assert response.status_code == 404
    assert response.json()["detail"] == "Jogo não encontrado."

def test_complete_nonexistent_game(client, auth_headers):
    response = client.patch("/games/999999/complete", headers=auth_headers)

    assert response.status_code == 404
    assert response.json()["detail"] == "Jogo não encontrado."

def test_user_cannot_access_another_users_game(
    client,
    create_game,
    second_auth_headers
):
    # O jogo é criado pelo primeiro usuário
    game = create_game(
        title="The Witcher 3",
        platform="PC"
    )

    game_id = game["id"]

    # O segundo usuário tenta acessar o jogo
    response = client.get(
        f"/games/{game_id}",
        headers=second_auth_headers
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Jogo não encontrado."