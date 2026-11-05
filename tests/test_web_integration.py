"""End-to-End Web Integration and Deployment Tests for TikTok Live TTS Cloud Platform.

This test module verifies the complete cloud web lifecycle:
1. Session provisioning via REST Application Programming Interface (API) with dual-token issuance.
2. Status retrieval validating role-based authorization for admin and overlay tokens.
3. Server-side Hypertext Markup Language (HTML) template rendering for transparent overlay and control dashboard.
4. Real-time WebSocket event pipeline delivering ALERT Base64 audio payloads and CONTROL_FLUSH emergency mutes.
5. Command-Line Interface (CLI) entrypoint argument parsing supporting --web, --host, and --port flags.
"""

from __future__ import annotations

import base64
import os
import sys
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from src.session_manager import SessionInstance
from src.web_server import app, session_manager


@pytest.fixture
def client() -> TestClient:
    """Create a FastAPI TestClient instance for end-to-end integration testing."""
    return TestClient(app)


def test_end_to_end_web_session_and_websocket_lifecycle(client: TestClient) -> None:
    """Validate full end-to-end session creation, HTML pages, WebSocket alert, and emergency flush."""
    # 1. Start session via POST /api/session/start with target streamer handle
    start_payload = {
        "tiktok_username": "@fb.jachamch",
        "fish_audio_api_key": "sk-fish-integration-test-key",
        "enable_comments": True,
        "enable_gifts": True,
        "user_cooldown": 5,
        "max_comment_length": 80,
    }
    start_res = client.post("/api/session/start", json=start_payload)
    assert start_res.status_code == 200, f"Session start failed: {start_res.text}"
    session_data = start_res.json()

    assert "session_id" in session_data
    assert "admin_token" in session_data
    assert "overlay_token" in session_data
    session_id = session_data["session_id"]
    admin_token = session_data["admin_token"]
    overlay_token = session_data["overlay_token"]
    assert admin_token != overlay_token

    try:
        # 2. Verify status endpoint under both admin and overlay tokens
        admin_status_res = client.get(f"/api/session/{session_id}/status?token={admin_token}")
        assert admin_status_res.status_code == 200
        admin_status = admin_status_res.json()
        assert admin_status["session_id"] == session_id
        assert admin_status["tiktok_username"] == "@fb.jachamch"
        assert admin_status["enable_comments"] is True
        assert admin_status["enable_gifts"] is True

        overlay_status_res = client.get(f"/api/session/{session_id}/status?token={overlay_token}")
        assert overlay_status_res.status_code == 200
        assert overlay_status_res.json()["session_id"] == session_id

        # 3. Verify HTML rendering for overlay and dashboard pages
        overlay_html_res = client.get(f"/overlay/{session_id}?token={overlay_token}")
        assert overlay_html_res.status_code == 200
        assert "text/html" in overlay_html_res.headers["content-type"]
        assert session_id in overlay_html_res.text
        assert "audioContext" in overlay_html_res.text or "AudioContext" in overlay_html_res.text

        dashboard_html_res = client.get(f"/dashboard/{session_id}?token={admin_token}")
        assert dashboard_html_res.status_code == 200
        assert "text/html" in dashboard_html_res.headers["content-type"]
        assert session_id in dashboard_html_res.text
        assert overlay_token in dashboard_html_res.text

        # 4. Connect WebSocket overlay client and test live audio dispatch
        session: SessionInstance = session_manager.get_session(session_id)
        assert session is not None
        assert session.tts_engine is not None

        mock_audio_b64 = base64.b64encode(b"MOCK_INTEGRATION_MP3_STREAM").decode("ascii")

        with patch.object(
            session.tts_engine,
            "synthesize_base64",
            new_callable=AsyncMock,
            return_value=mock_audio_b64,
        ):
            session.tts_engine.last_engine = "Fish Audio (s2.1-pro-free)"

            with client.websocket_connect(
                f"/ws/overlay/{session_id}?token={overlay_token}"
            ) as ws_overlay:
                # 5. Trigger voice test via POST /api/session/{id}/test_voice?token={admin_token}
                voice_test_res = client.post(
                    f"/api/session/{session_id}/test_voice?token={admin_token}"
                )
                assert voice_test_res.status_code == 200
                voice_data = voice_test_res.json()
                assert voice_data["success"] is True

                # Verify overlay WebSocket receives ALERT message containing Base64 audio
                alert_msg = ws_overlay.receive_json()
                assert alert_msg["type"] == "ALERT"
                assert alert_msg["audio_base64"] == mock_audio_b64
                assert "text" in alert_msg
                assert alert_msg["user"] == "System (ระบบ)"

                # 6. Trigger emergency flush via POST /api/session/{id}/flush?token={admin_token}
                flush_res = client.post(
                    f"/api/session/{session_id}/flush?token={admin_token}"
                )
                assert flush_res.status_code == 200
                assert flush_res.json()["flushed"] is True

                # Verify overlay WebSocket receives CONTROL_FLUSH message
                flush_msg = ws_overlay.receive_json()
                assert flush_msg["type"] == "CONTROL_FLUSH"

    finally:
        # Cleanup session
        session_manager.delete_session(session_id)


def test_main_cli_argument_parsing_web_mode() -> None:
    """Verify main.py parses --web, --host, and --port flags and invokes uvicorn.run."""
    import main

    # Test 1: Explicit --web flag with custom host and port
    with patch("sys.argv", ["main.py", "--web", "--host", "127.0.0.1", "--port", "8000"]), \
         patch("uvicorn.run") as mock_uvicorn:
        main.main()
        mock_uvicorn.assert_called_once_with(
            "src.web_server:app",
            host="127.0.0.1",
            port=8000,
            log_level="info",
        )

    # Test 2: Environment variable PORT triggers web server default
    with patch("sys.argv", ["main.py"]), \
         patch.dict(os.environ, {"PORT": "7860"}), \
         patch("uvicorn.run") as mock_uvicorn:
        main.main()
        mock_uvicorn.assert_called_once_with(
            "src.web_server:app",
            host="0.0.0.0",
            port=7860,
            log_level="info",
        )

    # Test 3: Environment variable MODE=web triggers web server
    with patch("sys.argv", ["main.py"]), \
         patch.dict(os.environ, {"MODE": "web"}, clear=False), \
         patch("uvicorn.run") as mock_uvicorn:
        main.main()
        mock_uvicorn.assert_called_once_with(
            "src.web_server:app",
            host="0.0.0.0",
            port=7860,
            log_level="info",
        )
