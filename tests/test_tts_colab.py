from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from src.config import AppConfig
from src.tts_engine import TTSEngine


@pytest.fixture
def colab_config(tmp_path: Path) -> AppConfig:
    return AppConfig(
        tiktok_username="@streamer",
        fish_audio_api_key="valid_fish_key",
        fish_audio_model_id="yuta_model_id",
        fish_audio_tier_model="s2.1-pro-free",
        fallback_voice="th-TH-NiwatNeural",
        cache_dir=tmp_path / "cache",
        colab_tunnel_url="https://sample-tunnel.loca.lt",
        colab_tts_timeout_seconds=2.0,
        prefer_colab_tts=True,
        enable_fallback_tts=True,
    )


def _mock_response(status_code: int = 200, content: bytes = b"MOCK_MP3_DATA") -> MagicMock:
    res = MagicMock()
    res.is_success = (status_code == 200)
    res.status_code = status_code
    res.content = content
    return res


@pytest.mark.asyncio
async def test_synthesize_colab_success(colab_config: AppConfig):
    """Verifies Colab TTS is called when configured and preferred, caches output, and sets last_engine."""
    engine = TTSEngine(colab_config)
    fake_audio = b"COLAB_YUTA_AUDIO"

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = _mock_response(200, fake_audio)

        result = await engine.synthesize("สวัสดีครับ")

        assert result == fake_audio
        assert engine.last_engine == "Colab Fish Speech (Yuta)"

        mock_post.assert_awaited_once()
        call_url = mock_post.call_args[0][0]
        call_kwargs = mock_post.call_args[1]

        assert call_url == "https://sample-tunnel.loca.lt/v1/tts"
        assert call_kwargs["headers"]["Content-Type"] == "application/json"
        assert call_kwargs["headers"]["User-Agent"] == "TikTok-Live-TTS-Bot/2.0"
        assert call_kwargs["json"] == {
            "text": "สวัสดีครับ",
            "reference_id": "yuta",
            "format": "mp3",
        }

        # Verify disk cache was written
        cache_file = engine.get_cache_path("สวัสดีครับ", colab_config.fish_audio_model_id)
        assert cache_file.exists()
        assert cache_file.read_bytes() == fake_audio

        # Subsequent call is served from cache
        mock_post.reset_mock()
        second_result = await engine.synthesize("สวัสดีครับ")
        assert second_result == fake_audio
        assert engine.last_engine == "Cache"
        mock_post.assert_not_called()


@pytest.mark.asyncio
async def test_synthesize_colab_timeout_falls_back_to_edge(colab_config: AppConfig):
    """Verifies timeout on Colab seamlessly falls back to Edge-TTS when Fish Audio also fails or is omitted."""
    colab_config.fish_audio_api_key = ""  # No Fish Audio key to test direct Colab -> Edge fallback
    engine = TTSEngine(colab_config)

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, side_effect=httpx.TimeoutException("Colab timeout")), \
         patch.object(engine, "_synthesize_edge_tts", new_callable=AsyncMock, return_value=b"EDGE_AUDIO") as mock_edge:
        
        result = await engine.synthesize("รอตอบสนองนานเกินไป")
        assert result == b"EDGE_AUDIO"
        assert engine.last_engine == "edge-tts"
        mock_edge.assert_awaited_once_with("รอตอบสนองนานเกินไป")

    # Fallback output should not be cached
    cache_file = engine.get_cache_path("รอตอบสนองนานเกินไป", colab_config.fish_audio_model_id)
    assert not cache_file.exists()


@pytest.mark.asyncio
async def test_synthesize_colab_http_error_falls_back_to_fish_then_edge(colab_config: AppConfig):
    """Verifies 500 error from Colab tries Fish Audio, and if Fish succeeds, uses Fish Audio."""
    engine = TTSEngine(colab_config)

    colab_500 = _mock_response(500, b"Internal Server Error")
    fish_audio = b"FISH_AUDIO_SUCCESS"
    fish_200 = _mock_response(200, fish_audio)

    # First call Colab fails with 500, Fish Audio succeeds with 200
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, side_effect=[colab_500, fish_200]):
        result = await engine.synthesize("ทดสอบ Colab พังแต่ Fish รอด")
        assert result == fish_audio
        assert engine.last_engine == f"Fish Audio ({colab_config.fish_audio_tier_model})"

    # Now verify if both Colab and Fish Audio fail, it falls back to Edge-TTS
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, side_effect=[colab_500, _mock_response(500, b"Fish Fail")]), \
         patch.object(engine, "_synthesize_edge_tts", new_callable=AsyncMock, return_value=b"EDGE_FALLBACK"):
        result_edge = await engine.synthesize("พังทั้งสอง")
        assert result_edge == b"EDGE_FALLBACK"
        assert engine.last_engine == "edge-tts"


@pytest.mark.asyncio
async def test_synthesize_colab_disabled_if_prefer_colab_false(colab_config: AppConfig):
    """Verifies when prefer_colab_tts=False, Colab is bypassed and Fish Audio is called first."""
    colab_config.prefer_colab_tts = False
    engine = TTSEngine(colab_config)
    fish_audio = b"FISH_PRIMARY_AUDIO"

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=_mock_response(200, fish_audio)) as mock_post:
        result = await engine.synthesize("ข้าม Colab ไป Fish")
        assert result == fish_audio
        assert engine.last_engine == f"Fish Audio ({colab_config.fish_audio_tier_model})"

        # Verify the post was made to Fish Audio, not Colab
        call_url = mock_post.call_args[0][0]
        assert "fish.audio" in call_url


@pytest.mark.asyncio
async def test_synthesize_colab_disabled_if_tunnel_url_none(colab_config: AppConfig):
    """Verifies when colab_tunnel_url is None, Colab is bypassed even if prefer_colab_tts is True."""
    colab_config.colab_tunnel_url = None
    engine = TTSEngine(colab_config)
    fish_audio = b"FISH_AUDIO"

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=_mock_response(200, fish_audio)) as mock_post:
        result = await engine.synthesize("ไม่มี Tunnel URL")
        assert result == fish_audio
        assert engine.last_engine == f"Fish Audio ({colab_config.fish_audio_tier_model})"
        assert "fish.audio" in mock_post.call_args[0][0]


@pytest.mark.asyncio
async def test_synthesize_colab_direct_errors(colab_config: AppConfig):
    """Unit test for _synthesize_colab method error paths."""
    engine = TTSEngine(colab_config)

    # 1. Non-200 status code
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=_mock_response(502, b"Bad Gateway")):
        with pytest.raises(RuntimeError, match="HTTP 502"):
            await engine._synthesize_colab("ทดสอบ error")

    # 2. Empty response content
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=_mock_response(200, b"")):
        with pytest.raises(RuntimeError, match="empty audio"):
            await engine._synthesize_colab("ว่างเปล่า")

    # 3. Connection / request error
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, side_effect=httpx.ConnectError("Failed to connect")):
        with pytest.raises(RuntimeError, match="request failed"):
            await engine._synthesize_colab("ต่อไม่ติด")

    # 4. Unconfigured tunnel url
    colab_config.colab_tunnel_url = None
    with pytest.raises(RuntimeError, match="tunnel URL is not configured"):
        await engine._synthesize_colab("ไม่มี url")


@pytest.mark.asyncio
async def test_synthesize_all_fail_and_fallback_disabled_raises(colab_config: AppConfig):
    """Verifies RuntimeError is raised if Colab, Fish Audio fail and fallback_tts is False."""
    colab_config.enable_fallback_tts = False
    engine = TTSEngine(colab_config)

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, side_effect=httpx.ConnectError("All down")):
        with pytest.raises(RuntimeError, match="fallback is disabled"):
            await engine.synthesize("ทั้งหมดพัง")
