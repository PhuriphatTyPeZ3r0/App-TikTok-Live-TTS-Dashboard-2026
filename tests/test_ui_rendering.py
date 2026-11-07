"""Unit and Integration Tests for Web User Interface (UI) Template Rendering.

This test suite verifies the server-side Jinja2 template rendering for the TikTok Live
Text-to-Speech (TTS) Cloud Web Platform, including the landing page, Open Broadcaster Software (OBS)
Studio transparent overlay widget, and streamer remote control dashboard, enforcing dual
token-based authorization and error responses.
"""

import pytest
from fastapi import status
from fastapi.testclient import TestClient

from src.session_manager import SessionInstance
from src.web_server import app, session_manager


@pytest.fixture
def client() -> TestClient:
    """Create a FastAPI TestClient instance."""
    return TestClient(app)


@pytest.fixture
def test_session() -> SessionInstance:
    """Provision a fresh test session instance in SessionManager."""
    session = session_manager.create_session(
        tiktok_username="@streamer_ui_test",
        fish_audio_api_key="sk-ui-test-key-9999",
        enable_comments=True,
        enable_gifts=True,
    )
    yield session
    session_manager.delete_session(session.session_id)


def test_landing_page_rendering(client: TestClient) -> None:
    """Test GET / returns HTTP 200 with HTML content and application branding."""
    response = client.get("/")
    assert response.status_code == status.HTTP_200_OK
    assert "text/html" in response.headers["content-type"]
    text = response.text
    assert "TikTok Live TTS" in text
    assert "@username" in text or "username" in text.lower()


def test_overlay_page_rendering_valid_token(client: TestClient, test_session: SessionInstance) -> None:
    """Test GET /overlay/{session_id}?token={overlay_token} returns HTTP 200 with transparent styling and Web Audio API."""
    sid = test_session.session_id
    response = client.get(f"/overlay/{sid}?token={test_session.overlay_token}")
    assert response.status_code == status.HTTP_200_OK
    assert "text/html" in response.headers["content-type"]
    text = response.text
    # Verify Web Audio API instantiation and transparent styling for Open Broadcaster Software (OBS)
    assert "audioContext" in text or "AudioContext" in text
    assert "transparent" in text.lower()
    assert sid in text


def test_overlay_page_omitted_token_succeeds(client: TestClient, test_session: SessionInstance) -> None:
    """Test GET /overlay/{session_id} without token returns HTTP 200 OK using session credentials."""
    sid = test_session.session_id
    response = client.get(f"/overlay/{sid}?volume=1")
    assert response.status_code == status.HTTP_200_OK
    assert "text/html" in response.headers["content-type"]
    assert sid in response.text
    assert test_session.overlay_token in response.text


def test_overlay_page_head_request_succeeds(client: TestClient, test_session: SessionInstance) -> None:
    """Test HEAD /overlay/{session_id} returns HTTP 200 OK for TikTok LIVE Studio and OBS URL probes."""
    sid = test_session.session_id
    response = client.head(f"/overlay/{sid}?volume=1")
    assert response.status_code == status.HTTP_200_OK
    assert "text/html" in response.headers["content-type"]


def test_overlay_root_redirect(client: TestClient, test_session: SessionInstance) -> None:
    """Test GET /overlay redirects to the active session's overlay URL with token."""
    response = client.get("/overlay", follow_redirects=False)
    assert response.status_code in (status.HTTP_307_TEMPORARY_REDIRECT, status.HTTP_302_FOUND)
    assert "/overlay/" in response.headers["location"]


def test_overlay_page_invalid_token(client: TestClient, test_session: SessionInstance) -> None:
    """Test GET /overlay/{session_id} with invalid token returns HTTP 403 Forbidden."""
    sid = test_session.session_id
    response = client.get(f"/overlay/{sid}?token=invalid_overlay_token")
    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_overlay_page_nonexistent_session(client: TestClient) -> None:
    """Test GET /overlay/{session_id} with non-existent session returns HTTP 404 Not Found."""
    response = client.get("/overlay/non-existent-uuid-12345?token=some_token")
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_dashboard_page_rendering_valid_token(client: TestClient, test_session: SessionInstance) -> None:
    """Test GET /dashboard/{session_id}?token={admin_token} returns HTTP 200 with streamer controls."""
    sid = test_session.session_id
    response = client.get(f"/dashboard/{sid}?token={test_session.admin_token}")
    assert response.status_code == status.HTTP_200_OK
    assert "text/html" in response.headers["content-type"]
    text = response.text
    # Verify action buttons and streamer controls
    assert ("หยุดเสียงทันที" in text or "Emergency Mute" in text or "flush" in text.lower())
    assert ("ทดสอบเสียง" in text or "Test Voice" in text)
    assert sid in text
    assert test_session.overlay_token in text


def test_dashboard_page_invalid_token(client: TestClient, test_session: SessionInstance) -> None:
    """Test GET /dashboard/{session_id} with invalid token returns HTTP 403 Forbidden."""
    sid = test_session.session_id
    # Invalid token
    response = client.get(f"/dashboard/{sid}?token=invalid_admin_token")
    assert response.status_code == status.HTTP_403_FORBIDDEN

    # Overlay token trying to access dashboard should be rejected
    response_overlay_token = client.get(f"/dashboard/{sid}?token={test_session.overlay_token}")
    assert response_overlay_token.status_code == status.HTTP_403_FORBIDDEN


def test_dashboard_page_nonexistent_session(client: TestClient) -> None:
    """Test GET /dashboard/{session_id} with non-existent session returns HTTP 404 Not Found."""
    response = client.get("/dashboard/non-existent-uuid-99999?token=some_token")
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_landing_page_redirect_to_vercel(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    """Test GET / redirects with HTTP 307 to Vercel Frontend when RENDER=true."""
    monkeypatch.setenv("RENDER", "true")
    response = client.get("/", follow_redirects=False)
    assert response.status_code == status.HTTP_307_TEMPORARY_REDIRECT
    assert "tiktok-live-tts-dashboard.vercel.app" in response.headers["location"]


def test_get_active_session_api(client: TestClient, test_session: SessionInstance) -> None:
    """Test GET /api/sessions/active returns current active session metadata for decoupled frontend."""
    response = client.get("/api/sessions/active")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["has_active_session"] is True
    assert data["session_id"] == test_session.session_id
    assert data["tiktok_username"] == test_session.tiktok_username
    assert data["overlay_token"] == test_session.overlay_token

