from urllib.parse import parse_qs, urlparse

import httpx

from app.core.config import settings
from app.models.user import User


def configure_discord(monkeypatch):
    monkeypatch.setattr(settings, "DISCORD_CLIENT_ID", "discord-client-id")
    monkeypatch.setattr(settings, "DISCORD_CLIENT_SECRET", "discord-client-secret")
    monkeypatch.setattr(
        settings,
        "DISCORD_REDIRECT_URI",
        "http://localhost:8000/auth/discord/callback",
    )
    monkeypatch.setattr(settings, "FRONTEND_URL", "http://localhost:5173")


def make_provider_response(url, payload):
    return httpx.Response(200, json=payload, request=httpx.Request("GET", url))


def begin_discord_login(client):
    response = client.get("/auth/discord", follow_redirects=False)
    location = urlparse(response.headers["location"])
    authorization = parse_qs(location.query)

    return response, authorization


def mock_discord_exchange(monkeypatch, profile):
    def fake_post(url, **kwargs):
        assert url == "https://discord.com/api/oauth2/token"
        assert kwargs["data"]["code"] == "authorization-code"
        return make_provider_response(url, {"access_token": "provider-access-token"})

    def fake_get(url, **kwargs):
        assert url == "https://discord.com/api/users/@me"
        assert kwargs["headers"]["Authorization"] == "Bearer provider-access-token"
        return make_provider_response(url, profile)

    monkeypatch.setattr(httpx, "post", fake_post)
    monkeypatch.setattr(httpx, "get", fake_get)


def test_discord_login_redirects_with_email_scope_and_csrf_cookie(client, monkeypatch):
    configure_discord(monkeypatch)

    response, authorization = begin_discord_login(client)

    assert response.status_code == 307
    assert urlparse(response.headers["location"]).hostname == "discord.com"
    assert authorization["client_id"] == ["discord-client-id"]
    assert authorization["redirect_uri"] == [settings.DISCORD_REDIRECT_URI]
    assert set(authorization["scope"][0].split()) == {"identify", "email"}
    assert authorization["state"]
    assert response.cookies.get("discord_oauth_state") == authorization["state"][0]
    assert "httponly" in response.headers["set-cookie"].lower()


def test_discord_login_redirects_back_with_message_when_not_configured(client, monkeypatch):
    monkeypatch.setattr(settings, "DISCORD_CLIENT_ID", "")
    monkeypatch.setattr(settings, "DISCORD_CLIENT_SECRET", "")

    response = client.get("/auth/discord", follow_redirects=False)

    assert response.status_code == 307
    assert response.headers["location"] == (
        "http://localhost:5173/#auth_error=discord_unavailable"
    )


def test_discord_callback_rejects_state_mismatch_without_calling_provider(
    client, monkeypatch
):
    configure_discord(monkeypatch)
    provider_called = False

    def fail_if_called(*args, **kwargs):
        nonlocal provider_called
        provider_called = True
        raise AssertionError("Discord must not be called for an invalid state")

    monkeypatch.setattr(httpx, "post", fail_if_called)
    response, _ = begin_discord_login(client)

    callback = client.get(
        "/auth/discord/callback?code=authorization-code&state=wrong-state",
        follow_redirects=False,
    )

    assert callback.headers["location"] == (
        "http://localhost:5173/#auth_error=discord_failed"
    )
    assert not provider_called


def test_discord_callback_creates_account_from_verified_profile(
    client, monkeypatch, db_session
):
    configure_discord(monkeypatch)
    mock_discord_exchange(
        monkeypatch,
        {
            "id": "discord-123",
            "username": "Player.One",
            "global_name": "Player One",
            "email": "Player@Example.com",
            "verified": True,
        },
    )
    _, authorization = begin_discord_login(client)

    callback = client.get(
        "/auth/discord/callback",
        params={"code": "authorization-code", "state": authorization["state"][0]},
        follow_redirects=False,
    )

    assert callback.status_code == 307
    fragment = urlparse(callback.headers["location"]).fragment
    assert fragment.startswith("access_token=")
    token = parse_qs(fragment)["access_token"][0]
    auth_response = client.get(
        "/auth-test", headers={"Authorization": f"Bearer {token}"}
    )
    assert auth_response.status_code == 200
    assert auth_response.json()["username"] == "player_one"

    user = db_session.query(User).filter(User.discord_id == "discord-123").one()
    assert user.email == "player@example.com"
    assert user.password_hash is None


def test_discord_callback_links_existing_user_by_verified_email(
    client, monkeypatch, db_session
):
    configure_discord(monkeypatch)
    created = client.post(
        "/users",
        json={
            "username": "existing-player",
            "email": "player@example.com",
            "password": "existing-password",
        },
    )
    assert created.status_code == 201
    mock_discord_exchange(
        monkeypatch,
        {
            "id": "discord-existing",
            "username": "different-name",
            "email": "PLAYER@EXAMPLE.COM",
            "verified": True,
        },
    )
    _, authorization = begin_discord_login(client)

    callback = client.get(
        "/auth/discord/callback",
        params={"code": "authorization-code", "state": authorization["state"][0]},
        follow_redirects=False,
    )
    token = parse_qs(urlparse(callback.headers["location"]).fragment)[
        "access_token"
    ][0]
    auth_response = client.get(
        "/auth-test", headers={"Authorization": f"Bearer {token}"}
    )

    assert auth_response.status_code == 200
    assert auth_response.json()["username"] == "existing-player"
    user = db_session.query(User).filter(User.username == "existing-player").one()
    assert user.discord_id == "discord-existing"
    assert user.password_hash


def test_discord_callback_rejects_unverified_email(client, monkeypatch, db_session):
    configure_discord(monkeypatch)
    mock_discord_exchange(
        monkeypatch,
        {
            "id": "discord-unverified",
            "username": "unverified",
            "email": "unverified@example.com",
            "verified": False,
        },
    )
    _, authorization = begin_discord_login(client)

    callback = client.get(
        "/auth/discord/callback",
        params={"code": "authorization-code", "state": authorization["state"][0]},
        follow_redirects=False,
    )

    assert callback.headers["location"].endswith("#auth_error=discord_failed")
    assert db_session.query(User).filter(User.discord_id == "discord-unverified").first() is None


def test_discord_callback_does_not_replace_an_existing_discord_link(
    client, monkeypatch, db_session
):
    configure_discord(monkeypatch)
    created = client.post(
        "/users",
        json={
            "username": "linked-player",
            "email": "linked@example.com",
            "password": "existing-password",
        },
    )
    assert created.status_code == 201
    user = db_session.query(User).filter(User.username == "linked-player").one()
    user.discord_id = "original-discord-id"
    db_session.commit()

    mock_discord_exchange(
        monkeypatch,
        {
            "id": "different-discord-id",
            "username": "intruder",
            "email": "linked@example.com",
            "verified": True,
        },
    )
    _, authorization = begin_discord_login(client)

    callback = client.get(
        "/auth/discord/callback",
        params={"code": "authorization-code", "state": authorization["state"][0]},
        follow_redirects=False,
    )

    assert callback.headers["location"].endswith("#auth_error=discord_failed")
    db_session.expire_all()
    user = db_session.query(User).filter(User.username == "linked-player").one()
    assert user.discord_id == "original-discord-id"
