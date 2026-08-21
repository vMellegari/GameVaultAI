def test_get_statistics(client, create_game, auth_headers):
    # Cria três jogos
    game1 = create_game(
        title="Game 1",
        platform="PC"
    )

    game2 = create_game(
        title="Game 2",
        platform="PC"
    )

    game3 = create_game(
        title="Game 3",
        platform="PC"
    )

    # Atualiza Game 1
    response = client.patch(
        f"/games/{game1['id']}",
        json={
            "status": "PLAYING",
            "hours_played": 30,
            "personal_rating": 9.5
        },
        headers=auth_headers
    )
    assert response.status_code == 200

    # Atualiza Game 2
    response = client.patch(
        f"/games/{game2['id']}",
        json={
            "status": "COMPLETED",
            "hours_played": 20,
            "personal_rating": 8.5
        },
        headers=auth_headers
    )

    assert response.status_code == 200

    # Marca favoritos
    response = client.patch(f"/games/{game1['id']}/toggle-favorite", headers=auth_headers)
    assert response.status_code == 200

    response = client.patch(f"/games/{game3['id']}/toggle-favorite", headers=auth_headers)
    assert response.status_code == 200

    # Busca estatísticas
    response = client.get("/games/stats", headers=auth_headers)

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

def test_get_statistics_empty_database(client, auth_headers):
    response = client.get("/games/stats", headers=auth_headers)

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