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

def test_delete_game(client):
    # Cria um jogo
    response = client.post(
        "/games",
        json={
            "title": "The Witcher 3",
            "platform": "PC"
        }
    )

    game_id = response.json()["id"]

    # Deleta o jogo
    response = client.delete(f"/games/{game_id}")

    assert response.status_code == 204

    # Tenta buscar o jogo deletado
    response = client.get(f"/games/{game_id}")

    assert response.status_code == 404
    assert response.json()["detail"] == "Jogo não encontrado."

def test_get_statistics(client):
    # Cria três jogos
    game1 = client.post(
        "/games",
        json={
            "title": "Game 1",
            "platform": "PC",
        }
    ).json()

    client.patch(
        f"/games/{game1['id']}",
        json={
            "status": "PLAYING",
            "hours_played": 30,
            "personal_rating": 9.5
        }
    )

    game2 = client.post(
        "/games",
        json={
            "title": "Game 2",
            "platform": "PC"
        }
    ).json()

    client.patch(
        f"/games/{game2['id']}",
        json={
            "status": "COMPLETED",
            "hours_played": 20,
            "personal_rating": 8.5
        }
    )

    game3 = client.post(
        "/games",
        json={
            "title": "Game 3",
            "platform": "PC"
        }
    ).json()

    # Altera os status
    client.patch(
        f"/games/{game1['id']}",
        json={"status": "PLAYING"}
    )

    client.patch(
        f"/games/{game2['id']}",
        json={"status": "COMPLETED"}
    )

    # Marca favoritos
    client.patch(f"/games/{game1['id']}/toggle-favorite")
    client.patch(f"/games/{game3['id']}/toggle-favorite")

    # Busca estatísticas
    response = client.get("/games/stats")

    assert response.status_code == 200

    stats = response.json()

    assert stats["total_games"] == 3
    assert stats["backlog"] == 1
    assert stats["playing"] == 1
    assert stats["completed"] == 1
    assert stats["dropped"] == 0
    assert stats["wishlist"] == 0
    assert stats["favorite_games"] == 2
    assert stats["total_hours"] == 50
    assert stats["average_rating"] == 9.0

def test_filter_games_by_platform(client):
    # Cria jogos em diferentes plataformas
    client.post(
        "/games",
        json={
            "title": "Game A",
            "platform": "PC"
        }
    )

    client.post(
        "/games",
        json={
            "title": "Game B",
            "platform": "PS5"
        }
    )

    client.post(
        "/games",
        json={
            "title": "Game C",
            "platform": "PC"
        }
    )

    # Filtra por plataforma PC
    response = client.get("/games?platform=PC")

    assert response.status_code == 200

    games = response.json()

    assert len(games) == 2
    assert all(game["platform"] == "PC" for game in games)

def test_filter_games_by_title(client):
    # Cria jogos com diferentes títulos
    client.post(
        "/games",
        json={
            "title": "The Legend of Zelda: Breath of the Wild",
            "platform": "Switch"
        }
    )

    client.post(
        "/games",
        json={
            "title": "The Legend of Zelda: Ocarina of Time",
            "platform": "N64"
        }
    )

    client.post(
        "/games",
        json={
            "title": "Super Mario Odyssey",
            "platform": "Switch"
        }
    )

    # Filtra por título contendo 'Zelda'
    response = client.get("/games?title=Zelda")

    assert response.status_code == 200

    games = response.json()

    assert len(games) == 2
    assert all("Zelda" in game["title"] for game in games)

def test_filter_games_by_favorite(client):
    # Cria jogos
    game1 = client.post(
        "/games",
        json={
            "title": "Game 1",
            "platform": "PC"
        }
    ).json()

    game2 = client.post(
        "/games",
        json={
            "title": "Game 2",
            "platform": "PC"
        }
    ).json()

    # Marca o primeiro jogo como favorito
    client.patch(f"/games/{game1['id']}/toggle-favorite")

    # Filtra por jogos favoritos
    response = client.get("/games?favorite=true")

    assert response.status_code == 200

    games = response.json()

    assert len(games) == 1
    assert games[0]["id"] == game1["id"]

def test_sort_games_by_title(client):
    # Cria jogos com diferentes títulos
    client.post(
        "/games",
        json={
            "title": "Zelda",
            "platform": "Switch"
        }
    )

    client.post(
        "/games",
        json={
            "title": "Mario",
            "platform": "Switch"
        }
    )

    client.post(
        "/games",
        json={
            "title": "Sonic",
            "platform": "Genesis"
        }
    )

    # Ordena por título ascendente
    response = client.get("/games?sort_by=title&order=asc")

    assert response.status_code == 200

    games = response.json()

    titles = [game["title"] for game in games]
    assert titles == sorted(titles)

def test_pagination(client):
    # Cria 15 jogos
    for i in range(15):
        client.post(
            "/games",
            json={
                "title": f"Game {i+1}",
                "platform": "PC"
            }
        )

    # Pega a primeira página com limite de 10
    response = client.get("/games?page=1&limit=10")
    assert response.status_code == 200
    games_page_1 = response.json()
    assert len(games_page_1) == 10

    # Pega a segunda página com limite de 10
    response = client.get("/games?page=2&limit=10")
    assert response.status_code == 200
    games_page_2 = response.json()
    assert len(games_page_2) == 5  # Restante dos jogos

def test_update_hours_played_and_rating(client):
    # Cria um jogo
    response = client.post(
        "/games",
        json={
            "title": "Game X",
            "platform": "PC"
        }
    )

    game_id = response.json()["id"]

    # Atualiza horas jogadas e avaliação pessoal
    response = client.patch(
        f"/games/{game_id}",
        json={
            "hours_played": 50,
            "personal_rating": 8.5
        }
    )

    assert response.status_code == 200

    updated_game = response.json()

    assert updated_game["hours_played"] == 50
    assert updated_game["personal_rating"] == 8.5

def test_update_notes(client):
    # Cria um jogo
    response = client.post(
        "/games",
        json={
            "title": "Game Y",
            "platform": "PC"
        }
    )

    game_id = response.json()["id"]

    # Atualiza notas
    response = client.patch(
        f"/games/{game_id}",
        json={
            "notes": "Isso é uma nota de Teste."
        }
    )

    assert response.status_code == 200

    updated_game = response.json()

    assert updated_game["notes"] == "Isso é uma nota de Teste."

def test_update_multiple_fields(client):
    # Cria um jogo
    response = client.post(
        "/games",
        json={
            "title": "Game Z",
            "platform": "PC"
        }
    )

    game_id = response.json()["id"]

    # Atualiza múltiplos campos
    response = client.patch(
        f"/games/{game_id}",
        json={
            "status": "COMPLETED",
            "hours_played": 100,
            "personal_rating": 9.0,
            "notes": "Jogo finalizado com sucesso.",
            "favorite": True
        }
    )

    assert response.status_code == 200

    updated_game = response.json()

    assert updated_game["status"] == "COMPLETED"
    assert updated_game["hours_played"] == 100
    assert updated_game["personal_rating"] == 9.0
    assert updated_game["notes"] == "Jogo finalizado com sucesso."
    assert updated_game["favorite"] is True

def test_delete_nonexistent_game(client):
    response = client.delete("/games/999999")

    assert response.status_code == 404
    assert response.json()["detail"] == "Jogo não encontrado."

def test_update_nonexistent_game(client):
    response = client.patch(
        "/games/999999",
        json={
            "status": "PLAYING"
        }
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Jogo não encontrado."

def test_complete_nonexistent_game(client):
    response = client.patch("/games/999999/complete")

    assert response.status_code == 404
    assert response.json()["detail"] == "Jogo não encontrado."

def test_toggle_favorite_nonexistent_game(client):
    response = client.patch("/games/999999/toggle-favorite")

    assert response.status_code == 404
    assert response.json()["detail"] == "Jogo não encontrado."

def test_get_statistics_empty_database(client):
    response = client.get("/games/stats")

    assert response.status_code == 200

    stats = response.json()

    assert stats["total_games"] == 0
    assert stats["backlog"] == 0
    assert stats["playing"] == 0
    assert stats["completed"] == 0
    assert stats["dropped"] == 0
    assert stats["wishlist"] == 0
    assert stats["favorite_games"] == 0
    assert stats["total_hours"] == 0
    assert stats["average_rating"] is None
    