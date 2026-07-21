def test_list_games(client):
    response = client.get("/games")

    assert response.status_code == 200

def test_create_game(create_game):
    game = create_game(
        title="Portal 2",
        platform="PC"
    )

    assert game["title"] == "Portal 2"
    assert game["platform"] == "PC"
    assert game["status"] == "BACKLOG"
    assert game["favorite"] is False
    assert game["id"] > 0

def test_delete_game(client, create_game):
    # Cria um jogo
    game = create_game(
        title="The Witcher 3",
        platform="PC"
    )

    game_id = game["id"]

    # Deleta o jogo
    response = client.delete(f"/games/{game_id}")

    assert response.status_code == 204

    # Tenta buscar o jogo deletado
    response = client.get(f"/games/{game_id}")

    assert response.status_code == 404
    assert response.json()["detail"] == "Jogo não encontrado."