"""Integration and Unit Tests for Real-Time WebSocket (WS) Hub.

This test suite verifies the Open Broadcaster Software (OBS) Studio overlay WebSocket
and streamer dashboard remote control WebSocket connections, token authorization,
remote command handling (toggle comments, toggle gifts, emergency queue flush),
and broadcast notification delivery in the TikTok Live Text-to-Speech (TTS) Cloud Web Platform.
"""

import time
import pytest
from fastapi import status, WebSocketDisconnect
from fastapi.testclient import TestClient

from src.queue_manager import TTSItem
from src.session_manager import SessionInstance
from src.web_server import (
    app,
    broadcast_flush,
    broadcast_to_dashboards,
    broadcast_to_overlays,
    session_manager,
)


@pytest.fixture
def client() -> TestClient:
    """Create a FastAPI TestClient instance."""
    return TestClient(app)


@pytest.fixture
def test_session() -> SessionInstance:
    """Provision a fresh test session instance in SessionManager."""
    session = session_manager.create_session(
        tiktok_username="@streamer_ws_test",
        fish_audio_api_key="sk-test-ws-key-12345",
        enable_comments=True,
        enable_gifts=True,
    )
    yield session
    session_manager.delete_session(session.session_id)


def test_overlay_websocket_invalid_token(client: TestClient, test_session: SessionInstance) -> None:
    """Verify overlay WebSocket connection is rejected with 1008 policy violation on invalid token."""
    with pytest.raises(WebSocketDisconnect) as exc_info:
        with client.websocket_connect(f"/ws/overlay/{test_session.session_id}?token=invalid_token"):
            pass
    assert exc_info.value.code == status.WS_1008_POLICY_VIOLATION


def test_overlay_websocket_missing_session(client: TestClient) -> None:
    """Verify overlay WebSocket connection is rejected with 1008 policy violation for non-existent session."""
    with pytest.raises(WebSocketDisconnect) as exc_info:
        with client.websocket_connect("/ws/overlay/non-existent-session-id?token=any_token"):
            pass
    assert exc_info.value.code == status.WS_1008_POLICY_VIOLATION


def test_overlay_websocket_connect_and_disconnect(client: TestClient, test_session: SessionInstance) -> None:
    """Verify valid overlay token connects, joins connected_overlays, and cleans up on disconnect."""
    assert len(test_session.connected_overlays) == 0
    initial_last_active = test_session.last_active

    time.sleep(0.01)
    with client.websocket_connect(f"/ws/overlay/{test_session.session_id}?token={test_session.overlay_token}"):
        assert len(test_session.connected_overlays) == 1
        assert test_session.last_active >= initial_last_active

    # Clean disconnection removes socket from connected_overlays and updates last_active
    assert len(test_session.connected_overlays) == 0
    assert test_session.last_active >= initial_last_active


def test_dashboard_websocket_invalid_token(client: TestClient, test_session: SessionInstance) -> None:
    """Verify dashboard WebSocket connection is rejected with 1008 on invalid or overlay token."""
    with pytest.raises(WebSocketDisconnect) as exc_info:
        with client.websocket_connect(f"/ws/dashboard/{test_session.session_id}?token={test_session.overlay_token}"):
            pass
    assert exc_info.value.code == status.WS_1008_POLICY_VIOLATION


def test_dashboard_websocket_missing_session(client: TestClient) -> None:
    """Verify dashboard WebSocket connection is rejected with 1008 for non-existent session."""
    with pytest.raises(WebSocketDisconnect) as exc_info:
        with client.websocket_connect("/ws/dashboard/invalid-uuid-session?token=some_admin_token"):
            pass
    assert exc_info.value.code == status.WS_1008_POLICY_VIOLATION


def test_dashboard_websocket_connect_and_disconnect(client: TestClient, test_session: SessionInstance) -> None:
    """Verify valid admin token connects to dashboard WS and cleans up on disconnect."""
    assert len(test_session.connected_dashboards) == 0
    initial_last_active = test_session.last_active

    time.sleep(0.01)
    with client.websocket_connect(f"/ws/dashboard/{test_session.session_id}?token={test_session.admin_token}"):
        assert len(test_session.connected_dashboards) == 1
        assert test_session.last_active >= initial_last_active

    assert len(test_session.connected_dashboards) == 0
    assert test_session.last_active >= initial_last_active


def test_dashboard_remote_toggle_controls(client: TestClient, test_session: SessionInstance) -> None:
    """Verify dashboard remote actions toggle comments and virtual gifts."""
    assert test_session.enable_comments is True
    assert test_session.enable_gifts is True

    with client.websocket_connect(f"/ws/dashboard/{test_session.session_id}?token={test_session.admin_token}") as ws:
        # Toggle comments off
        ws.send_json({"action": "toggle_comments", "enabled": False})
        time.sleep(0.05)
        assert test_session.enable_comments is False

        # Toggle gifts off
        ws.send_json({"action": "toggle_gifts", "enabled": False})
        time.sleep(0.05)
        assert test_session.enable_gifts is False

        # Toggle comments back on
        ws.send_json({"action": "toggle_comments", "enabled": True})
        time.sleep(0.05)
        assert test_session.enable_comments is True


def test_dashboard_emergency_flush_action(client: TestClient, test_session: SessionInstance) -> None:
    """Verify dashboard remote emergency_flush action clears queue and broadcasts CONTROL_FLUSH."""
    # Populate queue
    test_session.queue_manager.put(TTSItem(text="Comment 1", user_id="user1", event_type="comment"))
    test_session.queue_manager.put(TTSItem(text="Comment 2", user_id="user2", event_type="comment"))
    assert test_session.queue_manager.get_queue_size() == 2

    with client.websocket_connect(f"/ws/overlay/{test_session.session_id}?token={test_session.overlay_token}") as overlay_ws:
        with client.websocket_connect(f"/ws/dashboard/{test_session.session_id}?token={test_session.admin_token}") as dash_ws:
            # Trigger emergency flush from dashboard
            dash_ws.send_json({"action": "emergency_flush"})
            time.sleep(0.05)

            # Check queue is cleared
            assert test_session.queue_manager.get_queue_size() == 0

            # Check overlay received CONTROL_FLUSH
            overlay_msg = overlay_ws.receive_json()
            assert overlay_msg == {"type": "CONTROL_FLUSH"}

            # Check dashboard received CONTROL_FLUSH
            dash_msg = dash_ws.receive_json()
            assert dash_msg == {"type": "CONTROL_FLUSH"}


@pytest.mark.asyncio
async def test_broadcast_helpers_and_stale_cleanup(test_session: SessionInstance) -> None:
    """Verify broadcast_to_overlays, broadcast_to_dashboards, and broadcast_flush prune dead connections."""
    class MockWebSocket:
        def __init__(self, should_fail: bool = False):
            self.should_fail = should_fail
            self.sent_messages = []

        async def send_json(self, message: dict):
            if self.should_fail:
                raise ConnectionResetError("Socket broken")
            self.sent_messages.append(message)

    good_overlay = MockWebSocket(should_fail=False)
    broken_overlay = MockWebSocket(should_fail=True)
    test_session.connected_overlays.add(good_overlay)
    test_session.connected_overlays.add(broken_overlay)

    good_dash = MockWebSocket(should_fail=False)
    broken_dash = MockWebSocket(should_fail=True)
    test_session.connected_dashboards.add(good_dash)
    test_session.connected_dashboards.add(broken_dash)

    test_msg = {"type": "TEST_EVENT", "data": "payload"}
    await broadcast_to_overlays(test_session.session_id, test_msg)
    assert good_overlay.sent_messages == [test_msg]
    assert broken_overlay not in test_session.connected_overlays
    assert good_overlay in test_session.connected_overlays

    await broadcast_to_dashboards(test_session.session_id, test_msg)
    assert good_dash.sent_messages == [test_msg]
    assert broken_dash not in test_session.connected_dashboards
    assert good_dash in test_session.connected_dashboards

    # Test broadcast_flush helper
    await broadcast_flush(test_session.session_id)
    flush_msg = {"type": "CONTROL_FLUSH"}
    assert good_overlay.sent_messages[-1] == flush_msg
    assert good_dash.sent_messages[-1] == flush_msg
