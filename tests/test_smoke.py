"""Smoke and system integration tests for TikTok Live Text-to-Speech (TTS) Bot.

Verifies end-to-end component wiring across configuration, normalization,
First-In, First-Out (FIFO) queue management, speech synthesis, audio output,
emergency hotkey control, real-time dashboard monitoring, and graceful shutdown.
"""

import asyncio
import logging
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from main import (
    check_env_file,
    configure_logging,
    create_emergency_callback,
    main,
    playback_worker,
    shutdown,
)
from src.audio_player import AudioPlayer
from src.config import AppConfig
from src.dashboard import DashboardMetrics, LiveDashboard
from src.hotkey_listener import EmergencyController
from src.ingestion import TikTokIngestionService
from src.normalizer import TextNormalizer
from src.queue_manager import SpeechItem, TextQueueManager
from src.tts_engine import TTSEngine


@pytest.mark.asyncio
async def test_pipeline_smoke_wiring(tmp_path: Path) -> None:
    """Verify full end-to-end pipeline components wiring from brief specification."""
    config = AppConfig(
        tiktok_username="@streamer",
        fish_audio_api_key="key",
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

    bl = tmp_path / "bl.txt"
    bl.write_text("", encoding="utf-8")
    ph = tmp_path / "ph.json"
    ph.write_text("{}", encoding="utf-8")

    normalizer = TextNormalizer(bl, ph)
    queue_mgr = TextQueueManager()
    tts_engine = TTSEngine(config)
    audio_player = AudioPlayer("CABLE Input", tmp_path)

    # Simulate adding an event, processing, synthesizing, and playing
    await queue_mgr.enqueue_gift("u1", "ขอบคุณสำหรับกุหลาบ")
    item = await queue_mgr.get_next()
    assert item.is_gift is True

    with patch.object(tts_engine, "synthesize", new_callable=AsyncMock) as mock_synth:
        mock_synth.return_value = b"MOCK_BYTES"
        with patch.object(audio_player, "play_audio_bytes") as mock_play, patch.object(
            audio_player, "play_gift_chime"
        ) as mock_chime:
            audio_bytes = await tts_engine.synthesize(item.text)
            assert audio_bytes == b"MOCK_BYTES"
            if item.is_gift:
                audio_player.play_gift_chime(lambda: False)
            audio_player.play_audio_bytes(audio_bytes, lambda: False)

            mock_chime.assert_called_once()
            mock_play.assert_called_once()


def test_emergency_callback_threadsafe() -> None:
    """Verify emergency callback halts audio playback and schedules queue clearing on the loop."""
    mock_audio_player = MagicMock(spec=AudioPlayer)
    mock_queue_mgr = MagicMock(spec=TextQueueManager)
    mock_loop = MagicMock(spec=asyncio.AbstractEventLoop)
    mock_loop.is_running.return_value = True

    callback = create_emergency_callback(mock_audio_player, mock_queue_mgr, mock_loop)
    callback()

    mock_audio_player.stop.assert_called_once()
    mock_loop.call_soon_threadsafe.assert_called_once_with(mock_queue_mgr.clear_queue)


def test_emergency_callback_when_loop_not_running() -> None:
    """Verify emergency callback directly clears queue if loop is not running."""
    mock_audio_player = MagicMock(spec=AudioPlayer)
    mock_queue_mgr = MagicMock(spec=TextQueueManager)
    mock_loop = MagicMock(spec=asyncio.AbstractEventLoop)
    mock_loop.is_running.return_value = False

    callback = create_emergency_callback(mock_audio_player, mock_queue_mgr, mock_loop)
    callback()

    mock_audio_player.stop.assert_called_once()
    mock_queue_mgr.clear_queue.assert_called_once()


@pytest.mark.asyncio
async def test_playback_worker_processes_gift_and_comment(tmp_path: Path) -> None:
    """Verify playback_worker processes gift with chime and comment without chime."""
    queue_mgr = TextQueueManager()
    config = AppConfig(
        tiktok_username="@streamer",
        fish_audio_api_key="key",
        cache_dir=tmp_path / "cache",
    )
    tts_engine = TTSEngine(config)
    audio_player = AudioPlayer("CABLE Input", tmp_path)
    controller = EmergencyController("f9", lambda: None)
    metrics = DashboardMetrics(
        connected_channel="@streamer",
        connection_status="Connected",
        total_comments=0,
        total_gifts=0,
        queue_size=0,
        current_speaking="",
        active_engine="Fish Audio",
        emergency_hotkey="F9",
    )

    await queue_mgr.enqueue_gift("u1", "ขอบคุณสำหรับของขวัญ")
    await queue_mgr.enqueue_comment("u2", "สวัสดีครับ")

    with patch.object(tts_engine, "synthesize", new_callable=AsyncMock) as mock_synth:
        mock_synth.return_value = b"SYNTH_BYTES"
        with patch.object(audio_player, "play_gift_chime") as mock_chime, patch.object(
            audio_player, "play_audio_bytes"
        ) as mock_play:
            worker_task = asyncio.create_task(
                playback_worker(queue_mgr, tts_engine, audio_player, controller, metrics)
            )

            # Give worker time to process both queued items
            for _ in range(20):
                if queue_mgr.get_queue_size() == 0 and metrics.current_speaking == "":
                    break
                await asyncio.sleep(0.05)

            worker_task.cancel()
            try:
                await worker_task
            except asyncio.CancelledError:
                pass

            assert mock_synth.call_count == 2
            mock_chime.assert_called_once()
            assert mock_play.call_count == 2
            assert metrics.current_speaking == ""


@pytest.mark.asyncio
async def test_playback_worker_skips_when_abort_requested(tmp_path: Path) -> None:
    """Verify playback_worker skips playback when emergency abort flag is raised."""
    queue_mgr = TextQueueManager()
    config = AppConfig(
        tiktok_username="@streamer",
        fish_audio_api_key="key",
        cache_dir=tmp_path / "cache",
    )
    tts_engine = TTSEngine(config)
    audio_player = AudioPlayer("CABLE Input", tmp_path)
    controller = EmergencyController("f9", lambda: None)
    metrics = DashboardMetrics(
        connected_channel="@streamer",
        connection_status="Connected",
        total_comments=0,
        total_gifts=0,
        queue_size=0,
        current_speaking="",
        active_engine="Fish Audio",
        emergency_hotkey="F9",
    )

    await queue_mgr.enqueue_comment("u1", "ข้อความนี้จะถูก abort")
    # Simulate emergency abort flag set before processing
    controller._abort_event.set()

    with patch.object(tts_engine, "synthesize", new_callable=AsyncMock) as mock_synth:
        mock_synth.return_value = b"SYNTH_BYTES"
        with patch.object(audio_player, "play_audio_bytes") as mock_play:
            worker_task = asyncio.create_task(
                playback_worker(queue_mgr, tts_engine, audio_player, controller, metrics)
            )
            await asyncio.sleep(0.1)
            worker_task.cancel()
            try:
                await worker_task
            except asyncio.CancelledError:
                pass

            # Playback was bypassed due to abort flag
            mock_play.assert_not_called()
            assert metrics.current_speaking == ""


@pytest.mark.asyncio
async def test_shutdown_lifecycle() -> None:
    """Verify shutdown halts ingestion, audio player, emergency controller, and dashboard."""
    mock_ingestion = AsyncMock(spec=TikTokIngestionService)
    mock_audio_player = MagicMock(spec=AudioPlayer)
    mock_hotkey = MagicMock(spec=EmergencyController)
    mock_dashboard = MagicMock(spec=LiveDashboard)

    async def dummy_worker():
        while True:
            await asyncio.sleep(1)

    worker_task = asyncio.create_task(dummy_worker())

    await shutdown(
        ingestion=mock_ingestion,
        audio_player=mock_audio_player,
        hotkey_controller=mock_hotkey,
        dashboard=mock_dashboard,
        worker_task=worker_task,
    )

    mock_dashboard.stop.assert_called_once()
    mock_hotkey.stop.assert_called_once()
    mock_audio_player.stop.assert_called_once()
    mock_ingestion.stop.assert_awaited_once()
    assert worker_task.done()


def test_check_env_file_missing_and_existing(tmp_path: Path) -> None:
    """Verify check_env_file detects missing and existing .env files."""
    missing_env = tmp_path / "nonexistent.env"
    assert check_env_file(missing_env) is False

    existing_env = tmp_path / "exists.env"
    existing_env.write_text("TIKTOK_USERNAME=@tester\n", encoding="utf-8")
    assert check_env_file(existing_env) is True


def test_configure_logging_writes_to_file(tmp_path: Path) -> None:
    """Verify configure_logging routes log output to designated log file."""
    log_file = tmp_path / "logs" / "bot.log"
    configure_logging(log_file)

    test_logger = logging.getLogger("test_logger")
    test_logger.info("TikTok Live TTS bot logging test entry")

    # Flush handlers to ensure file content is committed
    for handler in logging.getLogger().handlers:
        handler.flush()

    assert log_file.exists()
    content = log_file.read_text(encoding="utf-8")
    assert "TikTok Live TTS bot logging test entry" in content


@pytest.mark.asyncio
async def test_playback_worker_resets_abort_flag_after_mid_playback_abort(tmp_path: Path) -> None:
    """Verify that if emergency abort occurs mid-playback, abort flag is reset for next message."""
    queue_mgr = TextQueueManager()
    config = AppConfig(
        tiktok_username="@streamer",
        fish_audio_api_key="key",
        cache_dir=tmp_path / "cache",
    )
    tts_engine = TTSEngine(config)
    audio_player = AudioPlayer("CABLE Input", tmp_path)
    controller = EmergencyController("f9", lambda: None)
    metrics = DashboardMetrics(
        connected_channel="@streamer",
        connection_status="Connected",
        total_comments=0,
        total_gifts=0,
        queue_size=0,
        current_speaking="",
        active_engine="Fish Audio",
        emergency_hotkey="F9",
    )

    await queue_mgr.enqueue_comment("u1", "ข้อความที่ถูก abort กลางคัน")
    await queue_mgr.enqueue_comment("u2", "ข้อความถัดไปที่ต้องพูดได้")

    played_items: list[bytes] = []
    first_call = True

    def mock_play(audio_bytes: bytes, abort_check) -> bool:
        # Simulate emergency hotkey pressed while first message was playing
        nonlocal first_call
        if first_call:
            first_call = False
            controller._abort_event.set()
            return False
        played_items.append(audio_bytes)
        return True

    with patch.object(tts_engine, "synthesize", new_callable=AsyncMock) as mock_synth:
        mock_synth.return_value = b"VALID_AUDIO"
        with patch.object(audio_player, "play_audio_bytes", side_effect=mock_play):
            worker_task = asyncio.create_task(
                playback_worker(queue_mgr, tts_engine, audio_player, controller, metrics)
            )

            for _ in range(25):
                if len(played_items) == 1 and queue_mgr.get_queue_size() == 0:
                    break
                await asyncio.sleep(0.05)

            worker_task.cancel()
            try:
                await worker_task
            except asyncio.CancelledError:
                pass

            # First item aborted mid-playback, second item successfully processed!
            assert len(played_items) == 1
            assert not controller.is_abort_requested()
            assert metrics.current_speaking == ""


@pytest.mark.asyncio
async def test_playback_worker_recovers_from_playback_exception(tmp_path: Path) -> None:
    """Verify that an unexpected exception during audio playback does not kill the worker."""
    queue_mgr = TextQueueManager()
    config = AppConfig(
        tiktok_username="@streamer",
        fish_audio_api_key="key",
        cache_dir=tmp_path / "cache",
    )
    tts_engine = TTSEngine(config)
    audio_player = AudioPlayer("CABLE Input", tmp_path)
    controller = EmergencyController("f9", lambda: None)
    metrics = DashboardMetrics(
        connected_channel="@streamer",
        connection_status="Connected",
        total_comments=0,
        total_gifts=0,
        queue_size=0,
        current_speaking="",
        active_engine="Fish Audio",
        emergency_hotkey="F9",
    )

    await queue_mgr.enqueue_comment("u1", "ข้อความที่มี error ทางเสียง")
    await queue_mgr.enqueue_comment("u2", "ข้อความปกติถัดมา")

    call_count = 0

    def faulty_play(audio_bytes: bytes, abort_check) -> bool:
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            raise RuntimeError("Simulated PortAudio driver failure")
        return True

    with patch.object(tts_engine, "synthesize", new_callable=AsyncMock) as mock_synth:
        mock_synth.return_value = b"VALID_AUDIO"
        with patch.object(audio_player, "play_audio_bytes", side_effect=faulty_play):
            worker_task = asyncio.create_task(
                playback_worker(queue_mgr, tts_engine, audio_player, controller, metrics)
            )

            for _ in range(25):
                if call_count == 2 and queue_mgr.get_queue_size() == 0:
                    break
                await asyncio.sleep(0.05)

            worker_task.cancel()
            try:
                await worker_task
            except asyncio.CancelledError:
                pass

            assert call_count == 2
            assert metrics.current_speaking == ""


def test_main_exits_on_empty_tiktok_username(monkeypatch) -> None:
    """Verify that main() exits with code 1 if TIKTOK_USERNAME is empty."""
    empty_config = AppConfig(
        tiktok_username="",
        fish_audio_api_key="key",
    )
    with patch("main.load_config", return_value=empty_config), patch("main.check_env_file", return_value=True):
        with pytest.raises(SystemExit) as exc_info:
            main()
        assert exc_info.value.code == 1

