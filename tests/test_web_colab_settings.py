"""Integration and Unit Tests for Google Colab Tunnel Settings and Dashboard UI.

Verifies GET /api/settings/colab, POST /api/settings/colab, trailing slash stripping,
empty string clearing to None, tts_engine._config synchronization, GET /api/stats,
and Streamer Control Dashboard UI elements for Google Colab TTS.
"""

import pytest
from fastapi.testclient import TestClient

from src.config import AppConfig
from src.session_manager import SessionInstance
from src.tts_engine import TTSEngine
from src.web_server import app, session_manager


@pytest.fixture
def client() -> TestClient:
    """Create a FastAPI TestClient instance."""
    return TestClient(app)


@pytest.fixture
def test_session() -> SessionInstance:
    """Provision a fresh test session instance in SessionManager."""
    session = session_manager.create_session(
        tiktok_username="@streamer_colab_test",
        fish_audio_api_key="sk-colab-test-key-5555",
        enable_comments=True,
        enable_gifts=True,
    )
    yield session
    session_manager.delete_session(session.session_id)


def test_get_colab_settings_default(client: TestClient) -> None:
    """Verify GET /api/settings/colab returns current config values."""
    response = client.get("/api/settings/colab")
    assert response.status_code == 200
    data = response.json()
    assert "colab_tunnel_url" in data
    assert "prefer_colab_tts" in data
    assert "colab_tts_timeout_seconds" in data
    assert isinstance(data["prefer_colab_tts"], bool)


def test_post_colab_settings_update(client: TestClient) -> None:
    """Verify POST /api/settings/colab updates config and strips trailing slash."""
    payload = {
        "colab_tunnel_url": "https://fast-tunnel.trycloudflare.com/  ",
        "prefer_colab_tts": True,
        "colab_tts_timeout_seconds": 3.5,
    }
    response = client.post("/api/settings/colab", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["colab_tunnel_url"] == "https://fast-tunnel.trycloudflare.com"
    assert data["prefer_colab_tts"] is True
    assert data["colab_tts_timeout_seconds"] == 3.5

    # Confirm GET reflects the updated state
    get_res = client.get("/api/settings/colab")
    assert get_res.status_code == 200
    get_data = get_res.json()
    assert get_data["colab_tunnel_url"] == "https://fast-tunnel.trycloudflare.com"
    assert get_data["prefer_colab_tts"] is True
    assert get_data["colab_tts_timeout_seconds"] == 3.5


def test_post_colab_settings_empty_string_clears_to_none(client: TestClient) -> None:
    """Verify POST /api/settings/colab with empty or whitespace string resets URL to None."""
    # First set a valid URL
    client.post("/api/settings/colab", json={"colab_tunnel_url": "https://temp.trycloudflare.com"})

    # Now clear it with whitespace
    response = client.post("/api/settings/colab", json={"colab_tunnel_url": "   "})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["colab_tunnel_url"] is None

    get_res = client.get("/api/settings/colab")
    assert get_res.status_code == 200
    assert get_res.json()["colab_tunnel_url"] is None


def test_post_colab_settings_synchronizes_tts_engine_config(client: TestClient) -> None:
    """Verify updating settings synchronizes request.app.state.tts_engine._config."""
    test_config = AppConfig(
        tiktok_username="@streamer_sync",
        fish_audio_api_key="sk-sync-key",
        colab_tunnel_url=None,
        prefer_colab_tts=False,
    )
    engine = TTSEngine(config=test_config)
    app.state.tts_engine = engine

    payload = {
        "colab_tunnel_url": "https://sync-tunnel.trycloudflare.com/",
        "prefer_colab_tts": True,
        "colab_tts_timeout_seconds": 4.0,
    }
    response = client.post("/api/settings/colab", json=payload)
    assert response.status_code == 200

    # Ensure engine's internal config is synchronized
    assert engine._config.colab_tunnel_url == "https://sync-tunnel.trycloudflare.com"
    assert engine._config.prefer_colab_tts is True
    assert engine._config.colab_tts_timeout_seconds == 4.0


def test_get_stats_endpoint(client: TestClient) -> None:
    """Verify GET /api/stats includes colab_tunnel_url, prefer_colab_tts, and last_engine."""
    response = client.get("/api/stats")
    assert response.status_code == 200
    data = response.json()
    assert "colab_tunnel_url" in data
    assert "prefer_colab_tts" in data
    assert "last_engine" in data
    assert "active_sessions" in data


def test_dashboard_ui_colab_card(client: TestClient, test_session: SessionInstance) -> None:
    """Verify that dashboard HTML includes the Google Colab configuration card."""
    sid = test_session.session_id
    response = client.get(f"/dashboard/{sid}?token={test_session.admin_token}")
    assert response.status_code == 200
    html = response.text
    assert "colab-tunnel-url" in html
    assert "prefer-colab-tts" in html
    assert "Google Colab Unlimited Voice" in html
    assert "บันทึกและเชื่อมต่อ" in html
    assert "saveColabSettings" in html
    assert "'X-Admin-Token': adminToken" in html


def test_post_colab_settings_schemeless_url_normalized(client: TestClient) -> None:
    """Verify POST /api/settings/colab prepends https:// to schemeless URLs and strips slashes."""
    payload = {
        "colab_tunnel_url": "my-quick-tunnel.trycloudflare.com/  ",
    }
    response = client.post("/api/settings/colab", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["colab_tunnel_url"] == "https://my-quick-tunnel.trycloudflare.com"


def test_post_colab_settings_invalid_scheme_rejected(client: TestClient) -> None:
    """Verify POST /api/settings/colab rejects non-http/https URL schemes with 400 Bad Request."""
    payload = {
        "colab_tunnel_url": "ftp://malicious-server.com/test",
    }
    response = client.post("/api/settings/colab", json=payload)
    assert response.status_code == 400
    assert "Invalid URL scheme" in response.json()["detail"]


def test_post_colab_settings_auth_and_session_sync(client: TestClient, test_session: SessionInstance) -> None:
    """Verify POST /api/settings/colab enforces admin auth when sessions are active and synchronizes active session engine."""
    # 1. Active session exists: unauthenticated update should be rejected with 403
    unauth_res = client.post(
        "/api/settings/colab",
        json={"colab_tunnel_url": "https://unauth.trycloudflare.com"}
    )
    assert unauth_res.status_code == 403

    # 2. Invalid token should be rejected with 403
    invalid_res = client.post(
        "/api/settings/colab",
        json={
            "colab_tunnel_url": "https://unauth.trycloudflare.com",
            "admin_token": "wrong_token_abc"
        }
    )
    assert invalid_res.status_code == 403

    # 3. Targeted nonexistent session should return 404
    notfound_res = client.post(
        "/api/settings/colab",
        json={
            "colab_tunnel_url": "https://unauth.trycloudflare.com",
            "session_id": "00000000-0000-0000-0000-000000000000",
            "admin_token": "any_token"
        }
    )
    assert notfound_res.status_code == 404

    # 4. Valid admin token in payload authorizes request and synchronizes active session tts_engine
    auth_payload = {
        "colab_tunnel_url": "https://auth-synced.trycloudflare.com",
        "prefer_colab_tts": True,
        "colab_tts_timeout_seconds": 6.5,
        "session_id": test_session.session_id,
        "admin_token": test_session.admin_token,
    }
    auth_res = client.post("/api/settings/colab", json=auth_payload)
    assert auth_res.status_code == 200
    data = auth_res.json()
    assert data["colab_tunnel_url"] == "https://auth-synced.trycloudflare.com"
    assert data["colab_tts_timeout_seconds"] == 6.5

    # Check active session TTS engine synchronization
    assert test_session.tts_engine._config.colab_tunnel_url == "https://auth-synced.trycloudflare.com"
    assert test_session.tts_engine._config.prefer_colab_tts is True
    assert test_session.tts_engine._config.colab_tts_timeout_seconds == 6.5

    # 5. Header-based token (X-Admin-Token) also works
    header_res = client.post(
        "/api/settings/colab",
        headers={"X-Admin-Token": test_session.admin_token},
        json={"colab_tunnel_url": "https://header-synced.trycloudflare.com"}
    )
    assert header_res.status_code == 200
    assert test_session.tts_engine._config.colab_tunnel_url == "https://header-synced.trycloudflare.com"


def test_start_session_inherits_current_colab_config(client: TestClient) -> None:
    """Verify newly created sessions inherit colab tunnel settings from app.state.config."""
    app.state.config.colab_tunnel_url = "https://inherited.trycloudflare.com"
    app.state.config.prefer_colab_tts = True
    app.state.config.colab_tts_timeout_seconds = 7.0

    payload = {
        "tiktok_username": "@inherited_streamer",
        "fish_audio_api_key": "sk-inherited-test-key",
    }
    res = client.post("/api/session/start", json=payload)
    assert res.status_code == 200
    sid = res.json()["session_id"]

    created_session = session_manager.get_session(sid)
    try:
        assert created_session is not None
        assert created_session.tts_engine._config.colab_tunnel_url == "https://inherited.trycloudflare.com"
        assert created_session.tts_engine._config.prefer_colab_tts is True
        assert created_session.tts_engine._config.colab_tts_timeout_seconds == 7.0
    finally:
        session_manager.delete_session(sid)
