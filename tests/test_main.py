def test_list_games(client):
    response = client.get("/games")

    assert response.status_code == 200

def test_create_game(client):
    response = client.post(
        "/games",
        json={
            "title": "Portal 2",
            "platform": "PC"
        }
    )

    assert response.status_code == 201

    data = response.json()

    assert data["title"] == "Portal 2"
    assert data["platform"] == "PC"
    assert data["status"] == "BACKLOG"

def test_get_nonexistent_game(client):
    response = client.get("/games/999999")

    assert response.status_code == 404
    assert response.json()["detail"] == "Jogo não encontrado."

def test_update_game_status(client):
    # Cria um jogo
    response = client.post(
        "/games",
        json={
            "title": "Celeste",
            "platform": "PC"
        }
    )

    game = response.json()
    game_id = game["id"]

    # Atualiza apenas o status
    response = client.patch(
        f"/games/{game_id}",
        json={
            "status": "PLAYING"
        }
    )

    assert response.status_code == 200

    updated_game = response.json()

    assert updated_game["status"] == "PLAYING"
    assert updated_game["title"] == "Celeste"
    assert updated_game["platform"] == "PC"

def test_toggle_favorite(client):
    # Cria um jogo
    response = client.post(
        "/games",
        json={
            "title": "Hollow Knight",
            "platform": "PC"
        }
    )

    assert response.status_code == 201

    game = response.json()
    game_id = game["id"]

    # Verifica estado inicial
    assert game["favorite"] is False

    # Marca como favorito
    response = client.patch(f"/games/{game_id}/toggle-favorite")
    assert response.status_code == 200
    updated_game = response.json()
    assert updated_game["favorite"] is True

    # Desmarca como favorito
    response = client.patch(f"/games/{game_id}/toggle-favorite")
    assert response.status_code == 200
    updated_game = response.json()
    assert updated_game["favorite"] is False

def test_filter_games_by_status(client):
    # Cria o primeiro jogo
    response = client.post(
        "/games",
        json={
            "title": "Hades",
            "platform": "PC"
        }
    )

    game_id = response.json()["id"]

    # Cria o segundo jogo
    client.post(
        "/games",
        json={
            "title": "Celeste",
            "platform": "PC"
        }
    )

    # Coloca apenas o primeiro como PLAYING
    client.patch(
        f"/games/{game_id}",
        json={
            "status": "PLAYING"
        }
    )

    # Busca somente jogos PLAYING
    response = client.get("/games?status=PLAYING")

    assert response.status_code == 200

    games = response.json()

    assert len(games) == 1
    assert games[0]["title"] == "Hades"
    assert games[0]["status"] == "PLAYING"