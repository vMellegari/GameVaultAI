def test_get_nonexistent_game(client):
    response = client.get("/games/999999")

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

def test_delete_nonexistent_game(client):
    response = client.delete("/games/999999")

    assert response.status_code == 404
    assert response.json()["detail"] == "Jogo não encontrado."

def test_toggle_favorite_nonexistent_game(client):
    response = client.patch("/games/999999/toggle-favorite")

    assert response.status_code == 404
    assert response.json()["detail"] == "Jogo não encontrado."

def test_complete_nonexistent_game(client):
    response = client.patch("/games/999999/complete")

    assert response.status_code == 404
    assert response.json()["detail"] == "Jogo não encontrado."