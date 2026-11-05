"""Integration and Unit Tests for Synthesis Serialization & Failover Delivery.

This test suite verifies:
1. Base64 encoding of synthesized MP3 audio for real-time WebSocket transport.
2. In-memory and disk cache hits returning Base64 with engine attribution ("Cache").
3. TTSEngine flexible initialization via config or keyword arguments (api_key, cache_dir, model_id).
4. Dispatch of ALERT WebSocket messages containing Base64 audio payload to connected overlays.
"""

import base64
from pathlib import Path
from unittest.mock import AsyncMock, patch

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
        tiktok_username="@streamer_audio_test",
        fish_audio_api_key="sk-test-audio-key",
    )
    yield session
    session_manager.delete_session(session.session_id)


def test_tts_engine_init_with_kwargs(tmp_path: Path) -> None:
    """Verify TTSEngine accepts keyword arguments when config is None."""
    cache_path = tmp_path / "custom_cache"
    engine = TTSEngine(
        api_key="custom_key_123",
        model_id="custom_model_xyz",
        cache_dir=cache_path,
    )
    assert engine._config.fish_audio_api_key == "custom_key_123"
    assert engine._config.fish_audio_model_id == "custom_model_xyz"
    assert engine._config.cache_dir == cache_path
    assert cache_path.exists()


@pytest.mark.asyncio
async def test_synthesize_base64_output(tmp_path: Path) -> None:
    """Verify synthesize_base64 returns valid Base64 string decoding to original MP3 bytes."""
    engine = TTSEngine(api_key="sk-test", cache_dir=tmp_path / "cache")
    fake_mp3_bytes = b"ID3\x04\x00\x00\x00\x00\x00\x00mock_mp3_payload_data"

    with patch.object(engine, "_synthesize_fish_audio", new_callable=AsyncMock) as mock_fish:
        mock_fish.return_value = fake_mp3_bytes

        b64_result = await engine.synthesize_base64("ทดสอบเสียงสังเคราะห์")
        assert isinstance(b64_result, str)
        decoded = base64.b64decode(b64_result)
        assert decoded == fake_mp3_bytes


@pytest.mark.asyncio
async def test_synthesize_base64_cache_hit(tmp_path: Path) -> None:
    """Verify cache hit returns Base64 audio with last_engine attribution as 'Cache'."""
    engine = TTSEngine(api_key="sk-test", cache_dir=tmp_path / "cache")
    fake_mp3_bytes = b"ID3_CACHED_BYTES"

    with patch.object(engine, "_synthesize_fish_audio", new_callable=AsyncMock) as mock_fish:
        mock_fish.return_value = fake_mp3_bytes

        # First call: misses cache, synthesizes and caches
        b64_first = await engine.synthesize_base64("ข้อความเดิม")
        assert base64.b64decode(b64_first) == fake_mp3_bytes
        assert mock_fish.call_count == 1
        assert "Fish Audio" in engine.last_engine

        # Second call: hits disk cache, no API call
        b64_second = await engine.synthesize_base64("ข้อความเดิม")
        assert base64.b64decode(b64_second) == fake_mp3_bytes
        assert mock_fish.call_count == 1
        assert engine.last_engine == "Cache"


def test_test_voice_endpoint_broadcasts_alert_to_overlay(
    client: TestClient, test_session: SessionInstance
) -> None:
    """Verify POST /api/session/{id}/test_voice synthesizes base64 and broadcasts ALERT payload."""
    fake_audio_bytes = b"MOCK_ALERT_AUDIO_DATA"
    fake_b64 = base64.b64encode(fake_audio_bytes).decode("ascii")

    # Ensure session has a tts_engine attribute
    assert hasattr(test_session, "tts_engine")
    assert isinstance(test_session.tts_engine, TTSEngine)

    with patch.object(
        test_session.tts_engine,
        "synthesize_base64",
        new_callable=AsyncMock,
        return_value=fake_b64,
    ) as mock_synth:
        test_session.tts_engine.last_engine = "Fish Audio (s2.1-pro-free)"

        with client.websocket_connect(
            f"/ws/overlay/{test_session.session_id}?token={test_session.overlay_token}"
        ) as ws_overlay:
            # Trigger voice test
            res = client.post(
                f"/api/session/{test_session.session_id}/test_voice?token={test_session.admin_token}"
            )
            assert res.status_code == 200
            data = res.json()
            assert data["success"] is True
            assert data["engine"] == "Fish Audio (s2.1-pro-free)"

            mock_synth.assert_awaited_once()

            # Verify WebSocket overlay received ALERT payload with Base64 audio
            msg = ws_overlay.receive_json()
            assert msg["type"] == "ALERT"
            assert msg["audio_base64"] == fake_b64
            assert msg["user"] == "System (ระบบ)"
            assert "ทดสอบ" in msg["text"]
            assert msg["engine"] == "Fish Audio (s2.1-pro-free)"
