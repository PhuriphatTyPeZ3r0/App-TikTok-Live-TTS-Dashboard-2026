"""Tests for Hugging Face Spaces ZeroGPU Bearer Token authentication and pre-warming in TTSEngine.

Validates:
1. Injection of HTTP Authorization Bearer token header when HF_TOKEN is configured.
2. Omission of Authorization header when HF_TOKEN is None or empty.
3. Asynchronous pre-warming ping (warm_remote_engine) via GET /health with proper headers.
4. Resilient failover behavior when remote synthesis requests time out or fail.
"""

from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from src.config import AppConfig, load_config
from src.tts_engine import TTSEngine


@pytest.fixture
def hf_zerogpu_config(tmp_path: Path) -> AppConfig:
    """Fixture providing AppConfig configured for Hugging Face Spaces remote endpoint."""
    return AppConfig(
        tiktok_username="@streamer",
        fish_audio_api_key="valid_fish_key",
        fish_audio_model_id="phiphat_voice_id",
        fish_audio_tier_model="s2.1-pro-free",
        fallback_voice="th-TH-NiwatNeural",
        cache_dir=tmp_path / "cache",
        colab_tunnel_url="https://hf-space-endpoint.hf.space",
        colab_tts_timeout_seconds=4.0,
        prefer_colab_tts=True,
        enable_fallback_tts=True,
        hf_token="hf_mock_token_123456789",
    )


def _mock_response(status_code: int = 200, content: bytes = b"MOCK_REMOTE_AUDIO") -> MagicMock:
    """Helper creating a mock httpx.Response object."""
    res = MagicMock()
    res.is_success = (status_code == 200)
    res.status_code = status_code
    res.content = content
    return res


@pytest.mark.asyncio
async def test_bearer_token_injected_when_hf_token_configured(hf_zerogpu_config: AppConfig):
    """Verify that Authorization: Bearer <hf_token> header is injected into remote synthesis requests."""
    engine = TTSEngine(hf_zerogpu_config)
    fake_audio = b"HF_ZEROGPU_AUDIO_DATA"

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = _mock_response(200, fake_audio)

        result = await engine.synthesize("สวัสดีชาวไลฟ์สดทุกท่าน")

        assert result == fake_audio
        mock_post.assert_awaited_once()

        call_url = mock_post.call_args[0][0]
        call_kwargs = mock_post.call_args[1]

        assert call_url == "https://hf-space-endpoint.hf.space/v1/tts"
        headers = call_kwargs["headers"]
        assert headers.get("Authorization") == "Bearer hf_mock_token_123456789"
        assert headers.get("Content-Type") == "application/json"
        assert headers.get("User-Agent") == "TikTok-Live-TTS-Bot/2.0"


@pytest.mark.asyncio
async def test_no_authorization_header_when_hf_token_is_none(hf_zerogpu_config: AppConfig):
    """Verify that no Authorization header is present when hf_token is None."""
    hf_zerogpu_config.hf_token = None
    engine = TTSEngine(hf_zerogpu_config)
    fake_audio = b"HF_ZEROGPU_PUBLIC_AUDIO"

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = _mock_response(200, fake_audio)

        result = await engine.synthesize("สวัสดีรอบห้อง")

        assert result == fake_audio
        mock_post.assert_awaited_once()

        call_kwargs = mock_post.call_args[1]
        headers = call_kwargs["headers"]
        assert "Authorization" not in headers


@pytest.mark.asyncio
async def test_warm_remote_engine_success(hf_zerogpu_config: AppConfig):
    """Verify warm_remote_engine sends GET /health with Bearer auth and returns True on HTTP 200."""
    engine = TTSEngine(hf_zerogpu_config)

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = _mock_response(200, b'{"status":"ready"}')

        success = await engine.warm_remote_engine()

        assert success is True
        mock_get.assert_awaited_once()

        call_url = mock_get.call_args[0][0]
        call_kwargs = mock_get.call_args[1]

        assert call_url == "https://hf-space-endpoint.hf.space/health"
        headers = call_kwargs["headers"]
        assert headers.get("Authorization") == "Bearer hf_mock_token_123456789"


@pytest.mark.asyncio
async def test_warm_remote_engine_without_token(hf_zerogpu_config: AppConfig):
    """Verify warm_remote_engine omits Authorization header when hf_token is None."""
    hf_zerogpu_config.hf_token = None
    engine = TTSEngine(hf_zerogpu_config)

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = _mock_response(200, b'{"status":"ready"}')

        success = await engine.warm_remote_engine()

        assert success is True
        mock_get.assert_awaited_once()

        headers = mock_get.call_args[1]["headers"]
        assert "Authorization" not in headers


@pytest.mark.asyncio
async def test_warm_remote_engine_http_error_returns_false(hf_zerogpu_config: AppConfig):
    """Verify warm_remote_engine returns False gracefully without raising on non-200 responses."""
    engine = TTSEngine(hf_zerogpu_config)

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = _mock_response(503, b'{"status":"starting"}')

        success = await engine.warm_remote_engine()

        assert success is False


@pytest.mark.asyncio
async def test_warm_remote_engine_network_exception_returns_false(hf_zerogpu_config: AppConfig):
    """Verify warm_remote_engine returns False safely when a network exception occurs."""
    engine = TTSEngine(hf_zerogpu_config)

    with patch(
        "httpx.AsyncClient.get",
        new_callable=AsyncMock,
        side_effect=httpx.ConnectError("Connection refused by remote host"),
    ):
        success = await engine.warm_remote_engine()
        assert success is False


@pytest.mark.asyncio
async def test_warm_remote_engine_bypassed_if_unconfigured_or_disabled(hf_zerogpu_config: AppConfig):
    """Verify warm_remote_engine returns False immediately if tunnel URL is absent or prefer_colab_tts is False."""
    hf_zerogpu_config.colab_tunnel_url = None
    engine_no_url = TTSEngine(hf_zerogpu_config)
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        assert await engine_no_url.warm_remote_engine() is False
        mock_get.assert_not_called()

    hf_zerogpu_config.colab_tunnel_url = "https://hf-space-endpoint.hf.space"
    hf_zerogpu_config.prefer_colab_tts = False
    engine_disabled = TTSEngine(hf_zerogpu_config)
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        assert await engine_disabled.warm_remote_engine() is False
        mock_get.assert_not_called()


@pytest.mark.asyncio
async def test_remote_timeout_failover_to_fish_audio_then_edge(hf_zerogpu_config: AppConfig):
    """Verify synthesis times out on remote ZeroGPU endpoint and falls over to Tier 2 (Fish Audio) or Tier 3 (Edge-TTS)."""
    engine = TTSEngine(hf_zerogpu_config)
    fish_audio_bytes = b"FISH_AUDIO_FAILOVER_DATA"

    # Scenario A: Remote times out -> Tier 2 Fish Audio succeeds
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        # First call (remote) times out, second call (Fish Audio) succeeds
        mock_post.side_effect = [
            httpx.TimeoutException("Remote ZeroGPU instance wake-up timeout"),
            _mock_response(200, fish_audio_bytes),
        ]

        result = await engine.synthesize("ข้อความสำหรับทดสอบ Failover SLA")

        assert result == fish_audio_bytes
        assert engine.last_engine == f"Fish Audio ({hf_zerogpu_config.fish_audio_tier_model})"
        assert mock_post.await_count == 2

    # Scenario B: Remote times out AND Fish Audio fails -> Tier 3 Edge-TTS succeeds
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post, patch.object(
        engine, "_synthesize_edge_tts", new_callable=AsyncMock, return_value=b"EDGE_TTS_SLA_BACKUP"
    ) as mock_edge:
        mock_post.side_effect = [
            httpx.TimeoutException("Remote ZeroGPU instance timeout"),
            _mock_response(500, b"Fish Audio internal error"),
        ]

        result_edge = await engine.synthesize("ข้อความสำหรับทดสอบ Fallback ทั้งระบบ")

        assert result_edge == b"EDGE_TTS_SLA_BACKUP"
        assert engine.last_engine == "edge-tts"
        mock_edge.assert_awaited_once_with("ข้อความสำหรับทดสอบ Fallback ทั้งระบบ")


def test_load_config_hf_token(tmp_path: Path):
    """Verify load_config correctly parses HF_TOKEN environment variable."""
    env_file = tmp_path / ".env"
    env_file.write_text(
        "TIKTOK_USERNAME=@streamer\n"
        "FISH_AUDIO_API_KEY=test_key\n"
        "HF_TOKEN=hf_valid_token_test_abc\n",
        encoding="utf-8",
    )
    config = load_config(str(env_file))
    assert config.hf_token == "hf_valid_token_test_abc"

    # Empty token defaults to None
    env_empty = tmp_path / ".env.empty"
    env_empty.write_text(
        "TIKTOK_USERNAME=@streamer\n"
        "FISH_AUDIO_API_KEY=test_key\n"
        "HF_TOKEN=   \n",
        encoding="utf-8",
    )
    config_empty = load_config(str(env_empty))
    assert config_empty.hf_token is None
