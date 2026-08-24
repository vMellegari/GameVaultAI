from datetime import timedelta

from app.core.security import create_access_token


def test_create_user_does_not_expose_password_hash(client):
    response = client.post(
        "/users",
        json={
            "username": "newuser",
            "email": "newuser@email.com",
            "password": "123456"
        }
    )

    assert response.status_code == 201
    user_response = response.json()
    assert user_response == {
        "id": user_response["id"],
        "username": "newuser",
        "email": "newuser@email.com"
    }
    assert "password_hash" not in user_response


def test_create_user_rejects_duplicate_username(client):
    user = {
        "username": "duplicate",
        "email": "duplicate1@email.com",
        "password": "123456"
    }
    assert client.post("/users", json=user).status_code == 201

    response = client.post(
        "/users",
        json={**user, "email": "duplicate2@email.com"}
    )

    assert response.status_code == 409
    assert response.json()["detail"] == "Nome de usuário já está em uso."


def test_create_user_rejects_duplicate_email(client):
    user = {
        "username": "firstuser",
        "email": "same@email.com",
        "password": "123456"
    }
    assert client.post("/users", json=user).status_code == 201

    response = client.post(
        "/users",
        json={**user, "username": "seconduser"}
    )

    assert response.status_code == 409
    assert response.json()["detail"] == "E-mail já cadastrado."


def test_create_user_rejects_invalid_email(client):
    response = client.post(
        "/users",
        json={
            "username": "invalidemail",
            "email": "not-an-email",
            "password": "123456"
        }
    )

    assert response.status_code == 422


def test_login_rejects_invalid_password(client):
    client.post(
        "/users",
        json={
            "username": "loginuser",
            "email": "loginuser@email.com",
            "password": "123456"
        }
    )

    response = client.post(
        "/login",
        json={"username": "loginuser", "password": "wrong-password"}
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Usuário ou senha inválidos."


def test_protected_endpoint_rejects_invalid_token(client):
    response = client.get(
        "/auth-test",
        headers={"Authorization": "Bearer invalid-token"}
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Token inválido."


def test_protected_endpoint_rejects_expired_token(client):
    token = create_access_token(
        {"sub": "testuser"},
        expires_delta=timedelta(seconds=-1)
    )

    response = client.get(
        "/auth-test",
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Token inválido."


def test_protected_endpoint_rejects_token_without_subject(client):
    token = create_access_token({})

    response = client.get(
        "/auth-test",
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Token inválido."


def test_protected_endpoint_rejects_missing_token(client):
    response = client.get("/auth-test")

    assert response.status_code == 401


def test_auth_test_returns_authenticated_user(client, auth_headers):
    response = client.get("/auth-test", headers=auth_headers)

    assert response.status_code == 200
    assert response.json() == {
        "message": "Autenticado com sucesso",
        "username": "testuser"
    }
