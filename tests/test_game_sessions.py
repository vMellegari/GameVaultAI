import pytest
import json
from datetime import datetime, timezone
from types import SimpleNamespace

from app.core.config import settings


PNG_BYTES = b"\x89PNG\r\n\x1a\n" + b"test-image-content"


@pytest.fixture
def media_dir(tmp_path, monkeypatch):
    directory = tmp_path / "media"
    monkeypatch.setattr(settings, "MEDIA_DIR", str(directory))
    return directory


def create_session(client, game_id, auth_headers, **overrides):
    payload = {
        "played_at": "2026-09-29T12:00:00Z",
        "duration_minutes": 90,
        "notes": "Boss fight progress",
        **overrides,
    }
    response = client.post(
        f"/games/{game_id}/sessions",
        json=payload,
        headers=auth_headers,
    )
    assert response.status_code == 201, response.text
    return response.json()


def upload_images(client, game_id, session_id, auth_headers, files):
    return client.post(
        f"/games/{game_id}/sessions/{session_id}/images",
        files=files,
        headers=auth_headers,
    )


def image_file(name="screenshot.png", content=PNG_BYTES, content_type="image/png"):
    return ("files", (name, content, content_type))


def test_create_session_updates_hours_and_lists_session(
    client,
    create_game,
    auth_headers,
):
    game = create_game(title="Session Game")

    session = create_session(client, game["id"], auth_headers)

    assert session["duration_minutes"] == 90
    assert session["notes"] == "Boss fight progress"
    assert session["images"] == []

    game_response = client.get(f"/games/{game['id']}", headers=auth_headers)
    sessions_response = client.get(
        f"/games/{game['id']}/sessions",
        headers=auth_headers,
    )

    assert game_response.status_code == 200
    assert game_response.json()["hours_played"] == 1.5
    assert sessions_response.status_code == 200
    assert [item["id"] for item in sessions_response.json()] == [session["id"]]


def test_rejects_invalid_session_duration(client, create_game, auth_headers):
    game = create_game()
    response = client.post(
        f"/games/{game['id']}/sessions",
        json={"duration_minutes": 0},
        headers=auth_headers,
    )

    assert response.status_code == 422


def test_edit_session_keeps_hours_in_sync_and_is_owner_scoped(
    client,
    create_game,
    auth_headers,
    second_auth_headers,
):
    game = create_game(title="Session to Edit")
    session = create_session(client, game["id"], auth_headers)
    response = client.patch(
        f"/games/{game['id']}/sessions/{session['id']}",
        json={
            "duration_minutes": 120,
            "played_at": "2026-09-30T15:30:00Z",
            "notes": None,
        },
        headers=auth_headers,
    )

    assert response.status_code == 200, response.text
    assert response.json()["duration_minutes"] == 120
    assert response.json()["notes"] is None
    updated_game = client.get(f"/games/{game['id']}", headers=auth_headers)
    assert updated_game.json()["hours_played"] == 2

    other_owner_update = client.patch(
        f"/games/{game['id']}/sessions/{session['id']}",
        json={"duration_minutes": 60},
        headers=second_auth_headers,
    )
    assert other_owner_update.status_code == 404


def test_activity_filters_by_game_date_and_duration(
    client,
    create_game,
    auth_headers,
):
    hades = create_game(title="Hades")
    celeste = create_game(title="Celeste")
    create_session(
        client,
        hades["id"],
        auth_headers,
        played_at="2026-09-29T12:00:00Z",
        duration_minutes=45,
    )
    create_session(
        client,
        hades["id"],
        auth_headers,
        played_at="2026-09-27T12:00:00Z",
        duration_minutes=90,
    )
    create_session(
        client,
        celeste["id"],
        auth_headers,
        played_at="2026-09-29T12:30:00Z",
        duration_minutes=45,
    )

    response = client.get(
        "/games/sessions/recent",
        params={
            "game_title": "hades",
            "date_from": "2026-09-29T00:00:00+00:00",
            "date_to": "2026-09-30T00:00:00+00:00",
            "min_duration": 30,
            "max_duration": 60,
        },
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["game"]["title"] == "Hades"
    assert response.json()[0]["duration_minutes"] == 45


def test_activity_rejects_invalid_duration_filter(client, auth_headers):
    response = client.get(
        "/games/sessions/recent?min_duration=90&max_duration=30",
        headers=auth_headers,
    )

    assert response.status_code == 422


def test_session_stats_include_monthly_totals_and_top_games(
    client,
    create_game,
    auth_headers,
):
    first_game = create_game(title="Long Sessions")
    second_game = create_game(title="Short Sessions")
    today = datetime.now(timezone.utc)
    date_value = today.isoformat()

    create_session(
        client,
        first_game["id"],
        auth_headers,
        played_at=date_value,
        duration_minutes=90,
    )
    create_session(
        client,
        first_game["id"],
        auth_headers,
        played_at=date_value,
        duration_minutes=60,
    )
    create_session(
        client,
        second_game["id"],
        auth_headers,
        played_at=date_value,
        duration_minutes=30,
    )

    response = client.get("/games/sessions/stats", headers=auth_headers)

    assert response.status_code == 200, response.text
    stats = response.json()
    assert stats["total_sessions"] == 3
    assert stats["total_hours"] == 3
    assert stats["monthly_hours"][-1]["hours"] == 3
    assert stats["most_played_games"][0]["title"] == "Long Sessions"
    assert stats["most_played_games"][0]["sessions"] == 2


def test_session_insights_use_gemini_on_request_and_report_notes(
    client,
    create_game,
    auth_headers,
    monkeypatch,
):
    game = create_game(title="Notes Game")
    create_session(
        client,
        game["id"],
        auth_headers,
        notes="Tentei uma rota alternativa e encontrei um segredo.",
    )
    calls = []

    def fake_create(**kwargs):
        calls.append(kwargs)
        return SimpleNamespace(
            output_text=json.dumps(
                {
                    "summary": "Você explorou rotas alternativas.",
                    "highlights": ["Encontrou um segredo."],
                }
            )
        )

    fake_client = SimpleNamespace(
        interactions=SimpleNamespace(create=fake_create),
    )
    monkeypatch.setattr(
        "app.services.session_insight_service.genai.Client",
        lambda **kwargs: fake_client,
    )

    response = client.post("/games/sessions/insights", headers=auth_headers)

    assert response.status_code == 200, response.text
    assert response.json()["summary"] == "Você explorou rotas alternativas."
    assert response.json()["sessions_analyzed"] == 1
    assert len(calls) == 1
    assert game["title"] in calls[0]["input"]


def test_session_insights_without_notes_does_not_call_gemini(
    client,
    create_game,
    auth_headers,
    monkeypatch,
):
    game = create_game()
    create_session(client, game["id"], auth_headers, notes=None)

    def fail_if_called(**kwargs):
        raise AssertionError("Gemini should not be called without session notes")

    monkeypatch.setattr(
        "app.services.session_insight_service.genai.Client",
        lambda **kwargs: SimpleNamespace(
            interactions=SimpleNamespace(create=fail_if_called),
        ),
    )

    response = client.post("/games/sessions/insights", headers=auth_headers)

    assert response.status_code == 200
    assert response.json()["sessions_analyzed"] == 0


def test_recent_activity_is_sorted_paginated_and_scoped_to_owner(
    client,
    create_game,
    auth_headers,
    second_auth_headers,
    media_dir,
):
    older_game = create_game(title="Older Activity Game")
    newer_game = create_game(title="Newer Activity Game")
    create_session(
        client,
        older_game["id"],
        auth_headers,
        played_at="2026-09-28T12:00:00Z",
    )
    newer_session = create_session(
        client,
        newer_game["id"],
        auth_headers,
        played_at="2026-09-29T12:00:00Z",
    )
    upload_response = upload_images(
        client,
        newer_game["id"],
        newer_session["id"],
        auth_headers,
        [image_file()],
    )
    assert upload_response.status_code == 201

    first_page = client.get(
        "/games/sessions/recent?page=1&limit=1",
        headers=auth_headers,
    )
    second_page = client.get(
        "/games/sessions/recent?page=2&limit=1",
        headers=auth_headers,
    )
    other_user_activity = client.get(
        "/games/sessions/recent",
        headers=second_auth_headers,
    )

    assert first_page.status_code == 200
    assert first_page.json()[0]["game"]["title"] == "Newer Activity Game"
    assert len(first_page.json()[0]["images"]) == 1
    assert second_page.status_code == 200
    assert second_page.json()[0]["game"]["title"] == "Older Activity Game"
    assert other_user_activity.status_code == 200
    assert other_user_activity.json() == []


def test_uploads_valid_image_and_serves_it_only_to_game_owner(
    client,
    create_game,
    auth_headers,
    second_auth_headers,
    media_dir,
):
    game = create_game(title="Private Screenshot Game")
    session = create_session(client, game["id"], auth_headers)

    upload_response = upload_images(
        client,
        game["id"],
        session["id"],
        auth_headers,
        [image_file()],
    )

    assert upload_response.status_code == 201, upload_response.text
    image = upload_response.json()[0]
    assert image["original_filename"] == "screenshot.png"
    assert image["content_type"] == "image/png"
    assert image["file_size"] == len(PNG_BYTES)

    listed_session = client.get(
        f"/games/{game['id']}/sessions",
        headers=auth_headers,
    ).json()[0]
    assert [item["id"] for item in listed_session["images"]] == [image["id"]]

    image_url = (
        f"/games/{game['id']}/sessions/{session['id']}/images/{image['id']}"
    )
    image_response = client.get(image_url, headers=auth_headers)
    assert image_response.status_code == 200
    assert image_response.content == PNG_BYTES
    assert image_response.headers["content-type"] == "image/png"

    assert client.get(image_url, headers=second_auth_headers).status_code == 404

    stored_images = list((media_dir / "session-images").iterdir())
    assert len(stored_images) == 1


@pytest.mark.parametrize(
    ("filename", "content", "content_type", "expected_status"),
    [
        ("malware.svg", b"<svg></svg>", "image/svg+xml", 415),
        ("spoofed.png", b"not a PNG", "image/png", 415),
        (
            "too-large.png",
            b"\x89PNG\r\n\x1a\n" + b"x" * (5 * 1024 * 1024),
            "image/png",
            413,
        ),
    ],
    ids=["svg-not-allowed", "invalid-png-signature", "image-over-5mb"],
)
def test_rejects_unsupported_or_oversized_images(
    client,
    create_game,
    auth_headers,
    filename,
    content,
    content_type,
    expected_status,
):
    game = create_game()
    session = create_session(client, game["id"], auth_headers)

    response = upload_images(
        client,
        game["id"],
        session["id"],
        auth_headers,
        [image_file(filename, content, content_type)],
    )

    assert response.status_code == expected_status


def test_session_accepts_at_most_five_images(
    client,
    create_game,
    auth_headers,
):
    game = create_game()
    session = create_session(client, game["id"], auth_headers)
    files = [image_file(f"shot-{index}.png") for index in range(6)]

    response = upload_images(
        client,
        game["id"],
        session["id"],
        auth_headers,
        files,
    )

    assert response.status_code == 400
    assert "5 imagens" in response.json()["detail"]


def test_upload_cannot_exceed_five_images_across_multiple_requests(
    client,
    create_game,
    auth_headers,
    media_dir,
):
    game = create_game()
    session = create_session(client, game["id"], auth_headers)
    first_upload = upload_images(
        client,
        game["id"],
        session["id"],
        auth_headers,
        [image_file(f"shot-{index}.png") for index in range(4)],
    )
    assert first_upload.status_code == 201

    second_upload = upload_images(
        client,
        game["id"],
        session["id"],
        auth_headers,
        [image_file("fifth.png"), image_file("sixth.png")],
    )

    assert second_upload.status_code == 400
    assert "5 imagens" in second_upload.json()["detail"]


@pytest.mark.parametrize(
    ("filename", "content", "content_type"),
    [
        ("screenshot.jpg", b"\xff\xd8\xff\xd9", "image/jpeg"),
        (
            "screenshot.webp",
            b"RIFF\x00\x00\x00\x00WEBPimage",
            "image/webp",
        ),
    ],
    ids=["jpeg", "webp"],
)
def test_accepts_supported_image_signatures(
    client,
    create_game,
    auth_headers,
    media_dir,
    filename,
    content,
    content_type,
):
    game = create_game()
    session = create_session(client, game["id"], auth_headers)

    response = upload_images(
        client,
        game["id"],
        session["id"],
        auth_headers,
        [image_file(filename, content, content_type)],
    )

    assert response.status_code == 201, response.text
    assert response.json()[0]["content_type"] == content_type


def test_non_owner_cannot_upload_or_delete_session_images(
    client,
    create_game,
    auth_headers,
    second_auth_headers,
    media_dir,
):
    game = create_game(title="Owned by first user")
    session = create_session(client, game["id"], auth_headers)

    upload_response = upload_images(
        client,
        game["id"],
        session["id"],
        auth_headers,
        [image_file()],
    )
    image_id = upload_response.json()[0]["id"]
    image_url = (
        f"/games/{game['id']}/sessions/{session['id']}/images/{image_id}"
    )

    other_user_upload = upload_images(
        client,
        game["id"],
        session["id"],
        second_auth_headers,
        [image_file("other.png")],
    )
    other_user_delete = client.delete(image_url, headers=second_auth_headers)

    assert other_user_upload.status_code == 404
    assert other_user_delete.status_code == 404
    assert client.get(image_url, headers=auth_headers).status_code == 200


def test_deleting_image_session_or_game_removes_stored_file(
    client,
    create_game,
    auth_headers,
    media_dir,
):
    game = create_game(title="Cleanup Game")
    session = create_session(client, game["id"], auth_headers)
    upload_response = upload_images(
        client,
        game["id"],
        session["id"],
        auth_headers,
        [image_file()],
    )
    image = upload_response.json()[0]
    stored_file = next((media_dir / "session-images").iterdir())
    assert stored_file.is_file()

    delete_image_response = client.delete(
        f"/games/{game['id']}/sessions/{session['id']}/images/{image['id']}",
        headers=auth_headers,
    )
    assert delete_image_response.status_code == 204
    assert not stored_file.exists()

    second_session = create_session(client, game["id"], auth_headers)
    upload_images(
        client,
        game["id"],
        second_session["id"],
        auth_headers,
        [image_file("delete-with-session.png")],
    )
    second_file = next((media_dir / "session-images").iterdir())

    delete_session_response = client.delete(
        f"/games/{game['id']}/sessions/{second_session['id']}",
        headers=auth_headers,
    )
    assert delete_session_response.status_code == 204
    assert not second_file.exists()

    third_session = create_session(client, game["id"], auth_headers)
    upload_images(
        client,
        game["id"],
        third_session["id"],
        auth_headers,
        [image_file("delete-with-game.png")],
    )
    third_file = next((media_dir / "session-images").iterdir())

    delete_game_response = client.delete(
        f"/games/{game['id']}",
        headers=auth_headers,
    )
    assert delete_game_response.status_code == 204
    assert not third_file.exists()
