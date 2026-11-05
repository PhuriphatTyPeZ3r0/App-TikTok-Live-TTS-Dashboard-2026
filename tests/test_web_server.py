"""Integration and Unit Tests for Web Server Control Broadcasts.

Verifies remote control broadcasts (control_skip, control_pause, control_resume, control_clear)
between streamer dashboard and Open Broadcaster Software (OBS) Studio overlay WebSocket (WS) clients
in the TikTok Live Text-to-Speech (TTS) Cloud Web Platform running on Asynchronous Server Gateway Interface (ASGI).

Academic Rigor & Voice Attribution:
Voice actor attribution: พิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)
"""

import time
import pytest
from fastapi.testclient import TestClient

from src.queue_manager import TTSItem
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
        tiktok_username="@streamer_test_control",
        fish_audio_api_key="sk-test-control-key-12345",
        enable_comments=True,
        enable_gifts=True,
    )
    yield session
    session_manager.delete_session(session.session_id)


def test_dashboard_control_skip_broadcast(client: TestClient, test_session: SessionInstance) -> None:
    """Verify that control_skip clears the queue and broadcasts STOP_AUDIO with action=control_skip to overlay and dashboard."""
    test_session.queue_manager.put(TTSItem(text="Queue item 1", user_id="user1", event_type="comment"))
    test_session.queue_manager.put(TTSItem(text="Queue item 2", user_id="user2", event_type="comment"))
    assert test_session.queue_manager.get_queue_size() == 2

    with client.websocket_connect(f"/ws/overlay/{test_session.session_id}?token={test_session.overlay_token}") as overlay_ws:
        with client.websocket_connect(f"/ws/dashboard/{test_session.session_id}?token={test_session.admin_token}") as dash_ws:
            dash_ws.send_json({"action": "control_skip"})
            time.sleep(0.05)

            # Queue must be cleared
            assert test_session.queue_manager.get_queue_size() == 0

            # Overlay must receive STOP_AUDIO
            overlay_msg = overlay_ws.receive_json()
            assert overlay_msg == {"type": "STOP_AUDIO", "action": "control_skip"}

            # Dashboard must also receive STOP_AUDIO
            dash_msg = dash_ws.receive_json()
            assert dash_msg == {"type": "STOP_AUDIO", "action": "control_skip"}


def test_dashboard_control_clear_broadcast(client: TestClient, test_session: SessionInstance) -> None:
    """Verify that control_clear clears the queue and broadcasts STOP_AUDIO with action=control_clear to overlay and dashboard."""
    test_session.queue_manager.put(TTSItem(text="Clear item 1", user_id="user1", event_type="comment"))
    assert test_session.queue_manager.get_queue_size() == 1

    with client.websocket_connect(f"/ws/overlay/{test_session.session_id}?token={test_session.overlay_token}") as overlay_ws:
        with client.websocket_connect(f"/ws/dashboard/{test_session.session_id}?token={test_session.admin_token}") as dash_ws:
            dash_ws.send_json({"action": "control_clear"})
            time.sleep(0.05)

            # Queue must be cleared
            assert test_session.queue_manager.get_queue_size() == 0

            # Overlay must receive STOP_AUDIO
            overlay_msg = overlay_ws.receive_json()
            assert overlay_msg == {"type": "STOP_AUDIO", "action": "control_clear"}

            # Dashboard must also receive STOP_AUDIO
            dash_msg = dash_ws.receive_json()
            assert dash_msg == {"type": "STOP_AUDIO", "action": "control_clear"}


def test_dashboard_control_pause_and_resume_broadcast(client: TestClient, test_session: SessionInstance) -> None:
    """Verify that control_pause and control_resume broadcast PAUSE_AUDIO and RESUME_AUDIO to overlays."""
    with client.websocket_connect(f"/ws/overlay/{test_session.session_id}?token={test_session.overlay_token}") as overlay_ws:
        with client.websocket_connect(f"/ws/dashboard/{test_session.session_id}?token={test_session.admin_token}") as dash_ws:
            # Send control_pause
            dash_ws.send_json({"action": "control_pause"})
            time.sleep(0.05)

            overlay_msg = overlay_ws.receive_json()
            assert overlay_msg == {"type": "PAUSE_AUDIO"}

            # Send control_resume
            dash_ws.send_json({"action": "control_resume"})
            time.sleep(0.05)

            overlay_msg = overlay_ws.receive_json()
            assert overlay_msg == {"type": "RESUME_AUDIO"}
