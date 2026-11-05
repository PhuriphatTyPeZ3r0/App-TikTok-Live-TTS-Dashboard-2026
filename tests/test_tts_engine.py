from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from src.config import AppConfig
from src.tts_engine import TTSEngine


@pytest.fixture
def mock_config(tmp_path: Path) -> AppConfig:
    return AppConfig(
        tiktok_username="@test",
        fish_audio_api_key="valid_fish_key",
        fish_audio_model_id="9c110ffde8bc42709516395dfbcfb4a2",
        fish_audio_tier_model="s2.1-pro-free",
        fallback_voice="th-TH-NiwatNeural",
        audio_output_device_name="CABLE Input",
        max_comment_length=80,
        user_cooldown_seconds=15,
        max_queue_size=10,
        min_gift_coins=1,
        emergency_hotkey="f9",
        cache_dir=tmp_path / "cache",
    )


def _ok_response(content: bytes) -> MagicMock:
    res = MagicMock()
    res.is_success = True
    res.status_code = 200
    res.content = content
    return res


@pytest.mark.asyncio
async def test_fish_audio_sends_free_tier_header_and_caches(mock_config):
    engine = TTSEngine(mock_config)
    fake_audio = b"ID3_MOCK_MP3_DATA"

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = _ok_response(fake_audio)

        assert await engine.synthesize("ข้อความทดสอบ 1") == fake_audio

        kwargs = mock_post.call_args[1]
        assert kwargs["headers"]["model"] == "s2.1-pro-free"
        assert kwargs["headers"]["Authorization"] == "Bearer valid_fish_key"
        assert kwargs["json"]["reference_id"] == "9c110ffde8bc42709516395dfbcfb4a2"
        assert kwargs["json"]["format"] == "mp3"

        # Second call is served from disk cache: zero API calls
        mock_post.reset_mock()
        assert await engine.synthesize("ข้อความทดสอบ 1") == fake_audio
        mock_post.assert_not_called()


@pytest.mark.asyncio
async def test_http_429_falls_back_to_edge_tts_and_does_not_cache_fallback(mock_config):
    engine = TTSEngine(mock_config)
    err = MagicMock()
    err.is_success = False
    err.status_code = 429

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=err), patch.object(
        engine, "_synthesize_edge_tts", new_callable=AsyncMock, return_value=b"EDGE"
    ) as mock_edge:
        assert await engine.synthesize("หลุดโควตา") == b"EDGE"
        mock_edge.assert_awaited_once_with("หลุดโควตา")

    # Fallback audio must not poison the Fish Audio cache for the same text
    assert not engine.get_cache_path("หลุดโควตา", mock_config.fish_audio_model_id).exists()


@pytest.mark.asyncio
async def test_network_exception_falls_back_to_edge_tts(mock_config):
    engine = TTSEngine(mock_config)
    with patch(
        "httpx.AsyncClient.post", new_callable=AsyncMock, side_effect=httpx.ConnectError("down")
    ), patch.object(engine, "_synthesize_edge_tts", new_callable=AsyncMock, return_value=b"EDGE"):
        assert await engine.synthesize("เน็ตหลุด") == b"EDGE"


@pytest.mark.asyncio
async def test_missing_api_key_skips_fish_audio(tmp_path):
    cfg = AppConfig(
        tiktok_username="@t",
        fish_audio_api_key="",
        cache_dir=tmp_path / "cache",
    )
    engine = TTSEngine(cfg)
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post, patch.object(
        engine, "_synthesize_edge_tts", new_callable=AsyncMock, return_value=b"EDGE"
    ):
        assert await engine.synthesize("ไม่มีคีย์") == b"EDGE"
        mock_post.assert_not_called()


@pytest.mark.asyncio
async def test_fallback_disabled_raises_when_fish_fails(mock_config):
    mock_config.enable_fallback_tts = False
    engine = TTSEngine(mock_config)
    err = MagicMock()
    err.is_success = False
    err.status_code = 500
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=err):
        with pytest.raises(RuntimeError):
            await engine.synthesize("ปิดสำรอง")


def test_cache_path_is_stable_and_voice_specific(mock_config):
    engine = TTSEngine(mock_config)
    a = engine.get_cache_path("สวัสดี", "voice_a")
    assert a == engine.get_cache_path("สวัสดี", "voice_a")
    assert a != engine.get_cache_path("สวัสดี", "voice_b")
    assert a.suffix == ".mp3"
    assert a.parent == mock_config.cache_dir


@pytest.mark.asyncio
async def test_synthesize_edge_tts_streams_chunks_in_memory(mock_config):
    """Verify _synthesize_edge_tts consumes audio chunks asynchronously in memory."""
    engine = TTSEngine(mock_config)
    mock_edge = MagicMock()
    mock_comm = MagicMock()

    async def fake_stream():
        yield {"type": "metadata", "data": "meta"}
        yield {"type": "audio", "data": b"chunk1_"}
        yield {"type": "audio", "data": b"chunk2"}

    mock_comm.stream = fake_stream
    mock_edge.Communicate.return_value = mock_comm

    with patch.dict("sys.modules", {"edge_tts": mock_edge}):
        audio = await engine._synthesize_edge_tts("ทดสอบ edge")
        assert audio == b"chunk1_chunk2"
        mock_edge.Communicate.assert_called_once_with("ทดสอบ edge", mock_config.fallback_voice)


@pytest.mark.asyncio
async def test_synthesize_edge_tts_empty_raises(mock_config):
    """Verify empty stream raises RuntimeError."""
    engine = TTSEngine(mock_config)
    mock_edge = MagicMock()
    mock_comm = MagicMock()

    async def fake_empty_stream():
        yield {"type": "metadata", "data": "meta"}

    mock_comm.stream = fake_empty_stream
    mock_edge.Communicate.return_value = mock_comm

    with patch.dict("sys.modules", {"edge_tts": mock_edge}):
        with pytest.raises(RuntimeError, match="edge-tts returned empty audio"):
            await engine._synthesize_edge_tts("ว่างเปล่า")


@pytest.mark.asyncio
async def test_synthesize_blank_or_whitespace_early_return(mock_config):
    """Verify synthesize() returns b'' immediately on empty, None, or whitespace-only text."""
    engine = TTSEngine(mock_config)
    assert await engine.synthesize("") == b""
    assert await engine.synthesize("   ") == b""
    assert await engine.synthesize("\t\n ") == b""
    assert await engine.synthesize(None) == b""
    assert await engine.synthesize_base64("") == ""
    assert await engine.synthesize_base64("   ") == ""
