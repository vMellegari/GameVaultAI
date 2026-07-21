def test_update_game_status(client, create_game):
    # Cria um jogo
    game = create_game(
        title="Celeste",
        platform="PC"
    )

    # Atualiza apenas o status
    response = client.patch(
        f"/games/{game['id']}",
        json={
            "status": "PLAYING"
        }
    )

    assert response.status_code == 200

    updated_game = response.json()

    assert updated_game["status"] == "PLAYING"
    assert updated_game["title"] == "Celeste"
    assert updated_game["platform"] == "PC"

def test_toggle_favorite(client, create_game):
    # Cria um jogo
    game = create_game(
        title="Hollow Knight",
        platform="PC"
    )

    # Verifica estado inicial
    assert game["favorite"] is False

    # Marca como favorito
    response = client.patch(f"/games/{game['id']}/toggle-favorite")
    assert response.status_code == 200
    updated_game = response.json()
    assert updated_game["favorite"] is True

    # Desmarca como favorito
    response = client.patch(f"/games/{game['id']}/toggle-favorite")
    assert response.status_code == 200
    updated_game = response.json()
    assert updated_game["favorite"] is False

def test_update_hours_played_and_rating(client, create_game):
    # Cria um jogo
    game = create_game(
        title="Game X",
        platform="PC"
    )

    # Atualiza horas jogadas e avaliação pessoal
    response = client.patch(
        f"/games/{game['id']}",
        json={
            "hours_played": 50,
            "personal_rating": 8.5
        }
    )

    assert response.status_code == 200

    updated_game = response.json()

    assert updated_game["hours_played"] == 50
    assert updated_game["personal_rating"] == 8.5

def test_update_notes(client, create_game):
    # Cria um jogo
    game = create_game(
        title="Game Y",
        platform="PC"
    )

    # Atualiza notas
    response = client.patch(
        f"/games/{game['id']}",
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

def test_update_multiple_fields(client, create_game):
    # Cria um jogo
    game = create_game(
        title="Game Z",
        platform="PC"
    )

    # Atualiza múltiplos campos
    response = client.patch(
        f"/games/{game['id']}",
        json={
            "platform": "PC"
        }
    )
    assert response.status_code == 200

    game_id = game["id"]

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
