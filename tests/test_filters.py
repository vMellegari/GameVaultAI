def test_filter_games_by_status(client, create_game, auth_headers):
    # Cria o primeiro jogo
    game = create_game(
        title="Hades",
        platform="PC"
    )

    game_id = game["id"]

    # Cria o segundo jogo
    game2 = create_game(
        title="Celeste",
        platform="PC"
    )

    # Coloca apenas o primeiro como PLAYING
    response = client.patch(
        f"/games/{game_id}",
        json={
            "status": "PLAYING"
        },
        headers=auth_headers
    )
    assert response.status_code == 200

    # Busca somente jogos PLAYING
    response = client.get("/games?status=PLAYING", headers=auth_headers)

    assert response.status_code == 200

    games = response.json()

    assert len(games) == 1
    assert games[0]["title"] == "Hades"
    assert games[0]["status"] == "PLAYING"

def test_filter_games_by_platform(client, create_game, auth_headers):
    # Cria jogos em diferentes plataformas
    game1 = create_game(
        title="Game A",
        platform="PC"
    )
    game2 = create_game(
        title="Game B",
        platform="PS5"
    )
    game3 = create_game(
        title="Game C",
        platform="PC"
    )

    # Filtra por plataforma PC
    response = client.get("/games?platform=PC", headers=auth_headers)

    assert response.status_code == 200

    games = response.json()

    assert len(games) == 2
    assert all(game["platform"] == "PC" for game in games)

def test_filter_games_by_title(client, create_game, auth_headers):
    # Cria jogos com diferentes títulos
    game1 = create_game(
        title="The Legend of Zelda: Breath of the Wild",
        platform="Switch"
    )
    game2 = create_game(
        title="The Legend of Zelda: Ocarina of Time",
        platform="N64"
    )
    game3 = create_game(
        title="Super Mario Odyssey",
        platform="Switch"
    )

    # Filtra por título contendo 'Zelda'
    response = client.get("/games?title=Zelda", headers=auth_headers)

    assert response.status_code == 200

    games = response.json()

    assert len(games) == 2
    assert all("Zelda" in game["title"] for game in games)

def test_filter_games_by_favorite(client, create_game, auth_headers):
    # Cria jogos
    game1 = create_game(
        title="Game 1",
        platform="PC"
    )
    game2 = create_game(
        title="Game 2",
        platform="PC"
    )

    # Marca o primeiro jogo como favorito
    response = client.patch(f"/games/{game1['id']}/toggle-favorite", headers=auth_headers)
    assert response.status_code == 200

    # Filtra por jogos favoritos
    response = client.get("/games?favorite=true", headers=auth_headers)

    assert response.status_code == 200

    games = response.json()

    assert len(games) == 1
    assert games[0]["id"] == game1["id"]

def test_sort_games_by_title(client, create_game, auth_headers):
    # Cria jogos com diferentes títulos
    game1 = create_game(
        title="Zelda",
        platform="Switch"
    )
    game2 = create_game(
        title="Mario",
        platform="Switch"
    )
    game3 = create_game(
        title="Sonic",
        platform="Genesis"
    )

    # Ordena por título ascendente
    response = client.get("/games?sort_by=title&order=asc", headers=auth_headers)

    assert response.status_code == 200

    games = response.json()

    titles = [game["title"] for game in games]
    assert titles == sorted(titles)

def test_pagination(client, create_game, auth_headers):
    # Cria 15 jogos
    for i in range(15):
        create_game(
            title=f"Game {i+1}",
            platform="PC"
        )

    # Pega a primeira página com limite de 10
    response = client.get("/games?page=1&limit=10", headers=auth_headers)
    assert response.status_code == 200
    games_page_1 = response.json()
    assert len(games_page_1) == 10

    # Pega a segunda página com limite de 10
    response = client.get("/games?page=2&limit=10", headers=auth_headers)
    assert response.status_code == 200
    games_page_2 = response.json()
    assert len(games_page_2) == 5  # Restante dos jogos

def test_filter_games_only_returns_current_users_games(
    client,
    create_game,
    auth_headers,
    second_auth_headers
):
    # Jogo pertencente ao primeiro usuário
    game_user_1 = create_game(
        title="Game User 1",
        platform="PC"
    )

    # Cria um jogo pertencente ao segundo usuário
    response = client.post(
        "/games",
        json={
            "title": "Game User 2",
            "platform": "PC"
        },
        headers=second_auth_headers
    )

    assert response.status_code == 201

    # Primeiro usuário filtra por PC
    response = client.get(
        "/games?platform=PC",
        headers=auth_headers
    )

    assert response.status_code == 200

    games = response.json()

    assert len(games) == 1
    assert games[0]["id"] == game_user_1["id"]
    assert games[0]["title"] == "Game User 1"