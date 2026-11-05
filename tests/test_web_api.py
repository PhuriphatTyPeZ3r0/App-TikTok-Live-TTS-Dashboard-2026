"""Comprehensive Integration and Unit Tests for FastAPI Web Server & REST Endpoints.

Tests API health check, session initialization, token-based authorization separation,
emergency queue flushing, status inspection, and test voice injection.
"""

import pytest
from fastapi.testclient import TestClient

from src.web_server import app, session_manager
from src.queue_manager import TTSItem


@pytest.fixture
def client() -> TestClient:
    """Create a FastAPI TestClient instance for testing REST endpoints."""
    return TestClient(app)


def test_health_check(client: TestClient) -> None:
    """Verify that GET /health returns operational status and session count."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "active_sessions" in data
    assert isinstance(data["active_sessions"], int)


def test_start_session_and_dual_tokens(client: TestClient) -> None:
    """Verify POST /api/session/start generates unique admin and overlay tokens."""
    payload = {
        "tiktok_username": "@test_streamer",
        "fish_audio_api_key": "sk-fish-test-key-12345",
        "enable_comments": True,
        "enable_gifts": True,
        "user_cooldown": 3,
        "max_comment_length": 60,
        "custom_phonetics": {"gg": "good game"},
        "custom_blacklist": ["badword"],
    }
    response = client.post("/api/session/start", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert "session_id" in data
    assert "admin_token" in data
    assert "overlay_token" in data
    assert data["admin_token"] != data["overlay_token"]

    session_id = data["session_id"]
    admin_token = data["admin_token"]
    overlay_token = data["overlay_token"]

    assert data["overlay_url"] == f"/overlay/{session_id}?token={overlay_token}"
    assert data["dashboard_url"] == f"/dashboard/{session_id}?token={admin_token}"

    # Verify session registered in session_manager
    session = session_manager.get_session(session_id)
    assert session is not None
    assert session.tiktok_username == "@test_streamer"
    assert session.normalizer.max_length == 60
    assert "badword" in session.normalizer.blacklist


def test_session_status_authorization(client: TestClient) -> None:
    """Verify GET /api/session/{session_id}/status validates admin and overlay tokens."""
    payload = {
        "tiktok_username": "@streamer_status",
        "fish_audio_api_key": "sk-test",
    }
    start_res = client.post("/api/session/start", json=payload)
    assert start_res.status_code == 200
    session_data = start_res.json()
    session_id = session_data["session_id"]
    admin_token = session_data["admin_token"]
    overlay_token = session_data["overlay_token"]

    # 1. Valid Admin Token
    admin_res = client.get(f"/api/session/{session_id}/status?token={admin_token}")
    assert admin_res.status_code == 200
    admin_info = admin_res.json()
    assert admin_info["session_id"] == session_id
    assert admin_info["tiktok_username"] == "@streamer_status"
    assert admin_info["enable_comments"] is True
    assert admin_info["enable_gifts"] is True
    assert "queue_size" in admin_info
    assert "connected_overlays_count" in admin_info
    assert "connected_dashboards_count" in admin_info

    # 2. Valid Overlay Token
    overlay_res = client.get(f"/api/session/{session_id}/status?token={overlay_token}")
    assert overlay_res.status_code == 200

    # 3. Invalid Token -> 403 Forbidden
    bad_res = client.get(f"/api/session/{session_id}/status?token=wrong_token")
    assert bad_res.status_code == 403

    # 4. Missing Token -> 422 Unprocessable Entity
    missing_res = client.get(f"/api/session/{session_id}/status")
    assert missing_res.status_code == 422

    # 5. Non-existent Session -> 404 Not Found
    non_existent = client.get("/api/session/00000000-0000-0000-0000-000000000000/status?token=any")
    assert non_existent.status_code == 404


def test_session_emergency_flush(client: TestClient) -> None:
    """Verify POST /api/session/{session_id}/flush purges queued speech tasks."""
    payload = {
        "tiktok_username": "@flush_test",
        "fish_audio_api_key": "sk-flush",
    }
    start_res = client.post("/api/session/start", json=payload)
    session_data = start_res.json()
    session_id = session_data["session_id"]
    admin_token = session_data["admin_token"]
    overlay_token = session_data["overlay_token"]

    # Enqueue items directly into the session queue
    session = session_manager.get_session(session_id)
    assert session is not None
    session.queue_manager.put(TTSItem(text="ข้อความที่ 1", event_type="comment", priority=1))
    session.queue_manager.put(TTSItem(text="ข้อความที่ 2", event_type="comment", priority=1))
    assert session.queue_manager.get_queue_size() == 2

    # Overlay token cannot flush -> 403 Forbidden
    bad_overlay_flush = client.post(f"/api/session/{session_id}/flush?token={overlay_token}")
    assert bad_overlay_flush.status_code == 403

    # Invalid token -> 403 Forbidden
    bad_flush = client.post(f"/api/session/{session_id}/flush?token=invalid_token")
    assert bad_flush.status_code == 403

    # Valid admin token -> 200 OK & queue cleared
    flush_res = client.post(f"/api/session/{session_id}/flush?token={admin_token}")
    assert flush_res.status_code == 200
    flush_data = flush_res.json()
    assert flush_data["flushed"] is True
    assert flush_data["dropped_count"] == 2
    assert session.queue_manager.get_queue_size() == 0

    # Non-existent session -> 404 Not Found
    not_found_flush = client.post("/api/session/non-existent-uuid/flush?token=any")
    assert not_found_flush.status_code == 404


def test_session_test_voice(client: TestClient) -> None:
    """Verify POST /api/session/{session_id}/test_voice enqueues system audio task."""
    payload = {
        "tiktok_username": "@test_voice_streamer",
        "fish_audio_api_key": "sk-voice-test",
    }
    start_res = client.post("/api/session/start", json=payload)
    session_data = start_res.json()
    session_id = session_data["session_id"]
    admin_token = session_data["admin_token"]
    overlay_token = session_data["overlay_token"]

    session = session_manager.get_session(session_id)
    assert session is not None
    assert session.queue_manager.get_queue_size() == 0

    # Overlay token cannot trigger test voice -> 403 Forbidden
    overlay_test = client.post(f"/api/session/{session_id}/test_voice?token={overlay_token}")
    assert overlay_test.status_code == 403

    # Valid admin token -> 200 OK
    res = client.post(f"/api/session/{session_id}/test_voice?token={admin_token}")
    assert res.status_code == 200
    assert res.json()["success"] is True

    # Check item enqueued
    assert session.queue_manager.get_queue_size() == 1
    queued_item = session.queue_manager.get_nowait()
    assert "ทดสอบระบบเสียง" in queued_item.text
    assert queued_item.priority == 0

    # Non-existent session -> 404 Not Found
    not_found_res = client.post("/api/session/unknown-id/test_voice?token=token")
    assert not_found_res.status_code == 404


def test_start_session_validation_error(client: TestClient) -> None:
    """Verify invalid payloads return 422 Unprocessable Entity."""
    # Missing required field fish_audio_api_key
    invalid_payload = {
        "tiktok_username": "@streamer_only",
    }
    res = client.post("/api/session/start", json=invalid_payload)
    assert res.status_code == 422
