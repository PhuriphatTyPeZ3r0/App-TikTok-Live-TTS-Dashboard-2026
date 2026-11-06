"""Unit and Contract Tests for Backend REST and WebSocket Voice Switching Endpoints.

Verifies the multi-voice Application Programming Interface (API) endpoints and WebSocket (WS)
control actions in the StreamVox Live Asynchronous Server Gateway Interface (ASGI) server:
1. GET /api/voices returns all 5 curated voice profiles (yuta, hana, joker, anchor, niwat).
2. POST /api/session/{session_id}/voice updates session.selected_voice_id and broadcasts VOICE_CHANGED.
3. Unknown voice identifiers safely fall back to the default 'yuta' voice profile.
4. Dashboard WebSocket action 'set_voice' updates session.selected_voice_id in real time.
5. POST /api/session/{session_id}/test-voice forwards explicit or session-selected voice_id to TTSEngine.

Voice Actor Attribution: คุณพิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert) with 'yuta' alias.
"""

import base64
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient
from httpx import ASGITransport, AsyncClient
import pytest

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
        tiktok_username="@streamer_voice_switch",
        fish_audio_api_key="sk-test-voice-key",
    )
    yield session
    session_manager.delete_session(session.session_id)


@pytest.mark.asyncio
async def test_get_available_voices() -> None:
    """Verify GET /api/voices returns all 5 voices (yuta, hana, joker, anchor, niwat)."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as async_client:
        res = await async_client.get("/api/voices")
        assert res.status_code == 200
        data = res.json()
        assert "voices" in data
        voices = data["voices"]
        assert isinstance(voices, list)
        voice_ids = {v["id"] for v in voices}
        assert {"yuta", "hana", "joker", "anchor", "niwat"}.issubset(voice_ids)


@pytest.mark.asyncio
async def test_set_session_voice_rest(test_session: SessionInstance) -> None:
    """Verify POST /api/session/{id}/voice updates session.selected_voice_id and returns voice_id."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as async_client:
        res = await async_client.post(
            f"/api/session/{test_session.session_id}/voice?token={test_session.admin_token}",
            json={"voice_id": "niwat"},
        )
        assert res.status_code == 200
        body = res.json()
        assert body["status"] == "ok"
        assert body["voice_id"] == "niwat"
        assert "voice_name" in body
        assert test_session.selected_voice_id == "niwat"

        # Also verify default_session auto-resolution / auto-bootstrap with admin_token
        session_manager._sessions.clear()
        res_default = await async_client.post(
            "/api/session/default_session/voice?token=admin_token",
            json={"voice_id": "hana"},
        )
        assert res_default.status_code == 200
        assert res_default.json()["voice_id"] == "hana"
        session_manager._sessions.clear()


@pytest.mark.asyncio
async def test_set_session_voice_fallback_unknown(test_session: SessionInstance) -> None:
    """Verify unknown voice ID falls back to 'yuta'."""
    test_session.selected_voice_id = "niwat"
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as async_client:
        res = await async_client.post(
            f"/api/session/{test_session.session_id}/voice?token={test_session.admin_token}",
            json={"voice_id": "non_existent_voice_999"},
        )
        assert res.status_code == 200
        body = res.json()
        assert body["status"] == "ok"
        assert body["voice_id"] == "yuta"
        assert test_session.selected_voice_id == "yuta"


def test_websocket_set_voice_action(client: TestClient, test_session: SessionInstance) -> None:
    """Verify WebSocket message {'action': 'set_voice', 'voice_id': 'niwat'} updates session's selected_voice_id."""
    assert test_session.selected_voice_id == "yuta"

    with client.websocket_connect(
        f"/ws/overlay/{test_session.session_id}?token={test_session.overlay_token}"
    ) as overlay_ws:
        with client.websocket_connect(
            f"/ws/dashboard/{test_session.session_id}?token={test_session.admin_token}"
        ) as dash_ws:
            dash_ws.send_json({"action": "set_voice", "voice_id": "niwat"})

            overlay_msg = overlay_ws.receive_json()
            assert overlay_msg["type"] == "VOICE_CHANGED"
            assert overlay_msg["data"]["voice_id"] == "niwat"

            dash_msg = dash_ws.receive_json()
            assert dash_msg["type"] == "VOICE_CHANGED"
            assert dash_msg["data"]["voice_id"] == "niwat"

            assert test_session.selected_voice_id == "niwat"


def test_voice_endpoint_passes_voice_id(client: TestClient, test_session: SessionInstance) -> None:
    """Verify /test-voice uses voice_id from request body or falls back to session.selected_voice_id."""
    fake_b64 = base64.b64encode(b"MOCK_MP3_BYTES").decode("ascii")
    assert test_session.tts_engine is not None

    with patch.object(
        test_session.tts_engine,
        "synthesize_base64",
        new_callable=AsyncMock,
        return_value=fake_b64,
    ) as mock_synth:
        # 1. Explicit voice_id in request body
        res1 = client.post(
            f"/api/session/{test_session.session_id}/test-voice?token={test_session.admin_token}",
            json={"text": "ทดสอบเสียงฮานะ", "voice_id": "hana"},
        )
        assert res1.status_code == 200
        mock_synth.assert_awaited_with("ทดสอบเสียงฮานะ", voice_id="hana")

        # 2. Fallback to session.selected_voice_id when voice_id omitted in body
        test_session.selected_voice_id = "joker"
        res2 = client.post(
            f"/api/session/{test_session.session_id}/test-voice?token={test_session.admin_token}",
            json={"text": "ทดสอบเสียงดีเจ"},
        )
        assert res2.status_code == 200
        mock_synth.assert_awaited_with("ทดสอบเสียงดีเจ", voice_id="joker")


def test_post_session_voice_with_acoustic_tuning_persists_and_broadcasts(client: TestClient) -> None:
    """Verify POST /api/session/{id}/voice and WebSocket set_voice persist and clamp per-voice tuning."""
    start_resp = client.post(
        "/api/session/start",
        json={"tiktok_username": "@tuning_streamer", "fish_audio_api_key": "test_key"},
    )
    assert start_resp.status_code == 200
    data = start_resp.json()
    session_id = data["session_id"]
    admin_token = data["admin_token"]

    try:
        resp = client.post(
            f"/api/session/{session_id}/voice",
            headers={"X-Admin-Token": admin_token},
            json={"voice_id": "hana", "speed": 1.25, "pitch": 15, "volume": 110},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["voice_id"] == "hana"
        assert body["tuning"] == {"speed": 1.25, "pitch": 15, "volume": 110}

        # Partial update preserves pitch and volume while clamping out-of-range speed
        resp2 = client.post(
            f"/api/session/{session_id}/voice",
            headers={"X-Admin-Token": admin_token},
            json={"voice_id": "hana", "speed": 9.9},
        )
        assert resp2.status_code == 200
        assert resp2.json()["tuning"] == {"speed": 2.0, "pitch": 15, "volume": 110}

        status_resp = client.get(f"/api/session/{session_id}/status?token={admin_token}")
        assert status_resp.status_code == 200
        assert status_resp.json()["voice_tuning"] == {"speed": 2.0, "pitch": 15, "volume": 110}
    finally:
        session_manager.delete_session(session_id)

