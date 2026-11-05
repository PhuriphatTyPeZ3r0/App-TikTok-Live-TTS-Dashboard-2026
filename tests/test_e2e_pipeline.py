"""End-to-End Pipeline Integration Tests with Google Colab Speech Synthesis.

Verifies end-to-end integration across incoming comments and virtual gifts,
text normalization, queue management, Google Colab Fish Speech Yuta synthesis,
automatic failover to Edge-TTS upon network or tunnel errors, disk caching,
and audio playback worker progression without stalls or unhandled exceptions.
"""

from __future__ import annotations

import asyncio
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from main import playback_worker
from src.audio_player import AudioPlayer
from src.config import AppConfig
from src.dashboard import DashboardMetrics
from src.hotkey_listener import EmergencyController
from src.normalizer import TextNormalizer
from src.queue_manager import TextQueueManager
from src.tts_engine import TTSEngine


def _create_mock_response(status_code: int = 200, content: bytes = b"MOCK_COLAB_AUDIO") -> MagicMock:
    """Helper creating a mock httpx.Response object."""
    res = MagicMock()
    res.status_code = status_code
    res.is_success = (status_code == 200)
    res.content = content
    return res


@pytest.mark.asyncio
async def test_e2e_colab_speech_pipeline_success(tmp_path: Path) -> None:
    """Simulates full pipeline from incoming comment to queue processing with Colab tunnel enabled.
    
    Verifies:
    1. Incoming viewer comment is normalized and enqueued.
    2. Background playback_worker dequeues the item.
    3. TTSEngine prioritizes Colab Fish Speech endpoint (https://*.trycloudflare.com/v1/tts).
    4. Synthesized audio is received, cached to disk, and dispatched to audio player.
    5. Dashboard metrics reflect Colab Fish Speech engine and queue progression to completion.
    """
    cache_dir = tmp_path / "cache"
    config = AppConfig(
        tiktok_username="@streamer_e2e",
        fish_audio_api_key="valid_fish_key",
        fish_audio_model_id="yuta_v15_model",
        cache_dir=cache_dir,
        colab_tunnel_url="https://live-yuta.trycloudflare.com",
        prefer_colab_tts=True,
        colab_tts_timeout_seconds=3.0,
        enable_fallback_tts=True,
        fallback_voice="th-TH-NiwatNeural",
    )

    bl_file = tmp_path / "blacklist.txt"
    bl_file.write_text("badword", encoding="utf-8")
    ph_file = tmp_path / "phonetics.json"
    ph_file.write_text('{"gg": "กู๊ดเกม"}', encoding="utf-8")

    normalizer = TextNormalizer(bl_file, ph_file, max_length=80)
    queue_mgr = TextQueueManager(max_size=10, cooldown_seconds=5)
    tts_engine = TTSEngine(config)
    audio_player = AudioPlayer("CABLE Input", tmp_path)
    controller = EmergencyController("f9", lambda: None)
    metrics = DashboardMetrics(
        connected_channel=config.tiktok_username,
        connection_status="Connected",
        total_comments=0,
        total_gifts=0,
        queue_size=0,
        current_speaking="",
        active_engine="None",
        emergency_hotkey="F9",
    )

    # 1. Simulate incoming comment from TikTok Live webcast
    raw_comment = "สวัสดีครับ gg มากมาย"
    cleaned_comment = normalizer.clean_comment(raw_comment)
    assert cleaned_comment is not None
    assert "กู๊ดเกม" in cleaned_comment

    enqueue_ok = await queue_mgr.enqueue_comment("viewer_123", cleaned_comment)
    assert enqueue_ok is True
    assert queue_mgr.get_queue_size() == 1

    fake_colab_audio = b"ID3_COLAB_FISH_SPEECH_YUTA_MP3_STREAM"

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_colab_post, \
         patch.object(audio_player, "play_audio_bytes") as mock_play:

        mock_colab_post.return_value = _create_mock_response(200, fake_colab_audio)

        worker_task = asyncio.create_task(
            playback_worker(queue_mgr, tts_engine, audio_player, controller, metrics)
        )

        # Wait for worker to consume and complete playback
        for _ in range(30):
            if queue_mgr.get_queue_size() == 0 and metrics.current_speaking == "":
                break
            await asyncio.sleep(0.05)

        worker_task.cancel()
        try:
            await worker_task
        except asyncio.CancelledError:
            pass

        # Assertions for Colab call
        mock_colab_post.assert_awaited_once()
        call_url = mock_colab_post.call_args[0][0]
        call_json = mock_colab_post.call_args[1]["json"]
        assert call_url == "https://live-yuta.trycloudflare.com/v1/tts"
        assert call_json["text"] == cleaned_comment
        assert call_json["reference_id"] == "yuta"

        # Assertions for audio playback and metrics
        mock_play.assert_called_once()
        played_bytes = mock_play.call_args[0][0]
        assert played_bytes == fake_colab_audio
        assert metrics.active_engine == "Colab Fish Speech (Yuta)"
        assert queue_mgr.get_queue_size() == 0

        # Assertions for disk caching
        cache_path = tts_engine.get_cache_path(cleaned_comment, config.fish_audio_model_id)
        assert cache_path.exists()
        assert cache_path.read_bytes() == fake_colab_audio


@pytest.mark.asyncio
async def test_e2e_colab_speech_pipeline_failover_to_edge(tmp_path: Path) -> None:
    """Simulates full pipeline where Colab tunnel fails (network error / timeout).
    
    Verifies:
    1. Incoming viewer comment is normalized and enqueued.
    2. Background playback_worker dequeues the item.
    3. Colab tunnel times out or experiences a network error.
    4. Fish Audio is bypassed (or unavailable) and engine seamlessly falls back to Edge-TTS.
    5. Audio playback proceeds without unhandled exceptions, pipeline crashes, or queue stalls.
    6. Dashboard metrics reflect 'edge-tts' engine and queue size drops to 0.
    """
    cache_dir = tmp_path / "cache"
    config = AppConfig(
        tiktok_username="@streamer_failover",
        fish_audio_api_key="",  # No Fish API key: tests direct Colab -> Edge-TTS fallback
        fish_audio_model_id="yuta_v15_model",
        cache_dir=cache_dir,
        colab_tunnel_url="https://down-tunnel.trycloudflare.com",
        prefer_colab_tts=True,
        colab_tts_timeout_seconds=0.5,
        enable_fallback_tts=True,
        fallback_voice="th-TH-NiwatNeural",
    )

    normalizer = TextNormalizer(max_length=80)
    queue_mgr = TextQueueManager(max_size=10, cooldown_seconds=5)
    tts_engine = TTSEngine(config)
    audio_player = AudioPlayer("CABLE Input", tmp_path)
    controller = EmergencyController("f9", lambda: None)
    metrics = DashboardMetrics(
        connected_channel=config.tiktok_username,
        connection_status="Connected",
        total_comments=0,
        total_gifts=0,
        queue_size=0,
        current_speaking="",
        active_engine="None",
        emergency_hotkey="F9",
    )

    raw_comment = "ทดสอบการสลับเสียงสำรองเมื่อเน็ตหลุด"
    cleaned_comment = normalizer.clean_comment(raw_comment)
    assert cleaned_comment is not None
    await queue_mgr.enqueue_comment("viewer_failover", cleaned_comment)
    assert queue_mgr.get_queue_size() == 1

    fake_edge_audio = b"ID3_MICROSOFT_EDGE_NEURAL_TTS_AUDIO_BYTES"

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, side_effect=httpx.ConnectTimeout("Cloudflare quick tunnel timed out")), \
         patch.object(tts_engine, "_synthesize_edge_tts", new_callable=AsyncMock, return_value=fake_edge_audio) as mock_edge, \
         patch.object(audio_player, "play_audio_bytes") as mock_play:

        worker_task = asyncio.create_task(
            playback_worker(queue_mgr, tts_engine, audio_player, controller, metrics)
        )

        for _ in range(30):
            if queue_mgr.get_queue_size() == 0 and metrics.current_speaking == "":
                break
            await asyncio.sleep(0.05)

        worker_task.cancel()
        try:
            await worker_task
        except asyncio.CancelledError:
            pass

        # Verify fallback was invoked seamlessly
        mock_edge.assert_awaited_once_with(cleaned_comment)
        mock_play.assert_called_once_with(fake_edge_audio, controller.is_abort_requested)
        assert metrics.active_engine == "edge-tts"
        assert queue_mgr.get_queue_size() == 0

        # Edge fallback should NOT be cached under the primary Yuta model ID
        cache_path = tts_engine.get_cache_path(cleaned_comment, config.fish_audio_model_id)
        assert not cache_path.exists()


@pytest.mark.asyncio
async def test_e2e_colab_speech_pipeline_gift_priority_and_caching(tmp_path: Path) -> None:
    """Verifies priority gift queuing, chime playback, Colab synthesis, and disk caching."""
    cache_dir = tmp_path / "cache"
    config = AppConfig(
        tiktok_username="@streamer_gift_e2e",
        fish_audio_api_key="valid_fish_key",
        fish_audio_model_id="yuta_v15_model",
        cache_dir=cache_dir,
        colab_tunnel_url="https://live-yuta.trycloudflare.com",
        prefer_colab_tts=True,
        colab_tts_timeout_seconds=3.0,
    )

    queue_mgr = TextQueueManager(max_size=10, cooldown_seconds=5)
    tts_engine = TTSEngine(config)
    audio_player = AudioPlayer("CABLE Input", tmp_path)
    controller = EmergencyController("f9", lambda: None)
    metrics = DashboardMetrics(
        connected_channel=config.tiktok_username,
        connection_status="Connected",
        total_comments=0,
        total_gifts=0,
        queue_size=0,
        current_speaking="",
        active_engine="None",
        emergency_hotkey="F9",
    )

    # Enqueue two regular comments, then a gift to test priority jumping ahead of pending comment
    await queue_mgr.enqueue_comment("viewer_1", "สวัสดีครับทุกคน")
    await queue_mgr.enqueue_comment("viewer_2", "ข้อความรอคิว")
    await queue_mgr.enqueue_gift("viewer_3", "ขอบคุณสำหรับของขวัญ")

    # The gift jumps ahead of the pending second comment: [comment_1, gift, comment_2]
    assert queue_mgr._items[1].is_gift is True
    assert queue_mgr._items[1].text == "ขอบคุณสำหรับของขวัญ"
    assert queue_mgr._items[2].text == "ข้อความรอคิว"

    fake_colab_audio = b"ID3_COLAB_GIFT_AND_COMMENT_AUDIO"

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_colab_post, \
         patch.object(audio_player, "play_gift_chime") as mock_chime, \
         patch.object(audio_player, "play_audio_bytes") as mock_play:

        mock_colab_post.return_value = _create_mock_response(200, fake_colab_audio)

        worker_task = asyncio.create_task(
            playback_worker(queue_mgr, tts_engine, audio_player, controller, metrics)
        )

        for _ in range(40):
            if queue_mgr.get_queue_size() == 0 and metrics.current_speaking == "":
                break
            await asyncio.sleep(0.05)

        worker_task.cancel()
        try:
            await worker_task
        except asyncio.CancelledError:
            pass

        # Gift chime was played for the gift event
        mock_chime.assert_called_once()
        # Audio was played three times (once for comment1, once for gift, once for comment2)
        assert mock_play.call_count == 3
        # Colab was called three times
        assert mock_colab_post.call_count == 3

        # Verify disk cache exists for both items
        cache_gift = tts_engine.get_cache_path("ขอบคุณสำหรับของขวัญ", config.fish_audio_model_id)
        cache_comment = tts_engine.get_cache_path("สวัสดีครับทุกคน", config.fish_audio_model_id)
        assert cache_gift.exists()
        assert cache_comment.exists()

        # Enqueue the exact same comment again: should be served from disk cache without calling Colab
        mock_colab_post.reset_mock()
        await queue_mgr.enqueue_comment("viewer_3", "สวัสดีครับทุกคน")

        worker_task2 = asyncio.create_task(
            playback_worker(queue_mgr, tts_engine, audio_player, controller, metrics)
        )

        for _ in range(30):
            if queue_mgr.get_queue_size() == 0 and metrics.current_speaking == "":
                break
            await asyncio.sleep(0.05)

        worker_task2.cancel()
        try:
            await worker_task2
        except asyncio.CancelledError:
            pass

        # Served from cache: mock_colab_post should NOT be called
        mock_colab_post.assert_not_called()
        assert metrics.active_engine == "Cache"

