"""System integration, playback worker, and main CLI entrypoint for TikTok Live TTS Bot.

This module unifies all subsystem modules into an asynchronous runtime pipeline:
- Environment variable configuration loading via AppConfig (Pydantic / Dataclass)
- Phonetic normalization and profanity filtering via TextNormalizer
- Priority First-In, First-Out (FIFO) queue management and spam throttling via TextQueueManager
- Dual-engine speech synthesis (Fish Audio Developer Free Tier with Edge-TTS fallback) via TTSEngine
- Virtual Audio Cable (VAC) routing with abortable playback via AudioPlayer
- Operating System (OS) global emergency stop hotkey via EmergencyController (pynput)
- Real-time terminal monitoring via LiveDashboard (Rich)
- Live Webcast WebSocket event consumption via TikTokIngestionService (TikTokLive)
- Asynchronous Server Gateway Interface (ASGI) cloud web server dispatch via FastAPI / Uvicorn
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import os
from pathlib import Path
import sys
from typing import Callable, Optional

import uvicorn

from src.audio_player import AudioPlayer
from src.config import AppConfig, load_config
from src.dashboard import DashboardMetrics, LiveDashboard
from src.hotkey_listener import EmergencyController
from src.ingestion import TikTokIngestionService
from src.normalizer import TextNormalizer
from src.queue_manager import SpeechItem, TextQueueManager
from src.tts_engine import TTSEngine

logger = logging.getLogger("tiktok_tts_bot")


def configure_logging(log_file: Path = Path(".cache/bot.log")) -> None:
    """Configure system logging to write to a log file instead of stdout/stderr.

    This prevents asynchronous log output from garbling the Rich Live terminal dashboard.

    Args:
        log_file: Target path where bot execution logs will be written.
    """
    log_file.parent.mkdir(parents=True, exist_ok=True)
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)

    # Remove existing stream/console handlers so standard output remains pristine
    for handler in list(root_logger.handlers):
        root_logger.removeHandler(handler)

    file_handler = logging.FileHandler(str(log_file), encoding="utf-8")
    formatter = logging.Formatter(
        "[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s"
    )
    file_handler.setFormatter(formatter)
    root_logger.addHandler(file_handler)


def check_env_file(env_path: Optional[Path] = None) -> bool:
    """Verify presence of .env configuration file and alert user if missing.

    Args:
        env_path: Optional explicit path to configuration file; defaults to '.env'.

    Returns:
        bool: True if configuration file exists; False otherwise.
    """
    target = env_path or Path(".env")
    if not target.exists():
        sys.stderr.write(
            f"[WARNING] Configuration file '{target}' not found!\n"
            f"Please copy '.env.example' to '.env' and specify your credentials:\n"
            f"  copy .env.example .env\n\n"
        )
        return False
    return True


def create_emergency_callback(
    audio_player: AudioPlayer,
    queue_mgr: TextQueueManager,
    loop: asyncio.AbstractEventLoop,
) -> Callable[[], None]:
    """Create a thread-safe emergency callback for EmergencyController.

    Because the pynput hotkey callback executes on an external Operating System (OS)
    thread, queue purging must be dispatched to the asyncio event loop thread safely
    via loop.call_soon_threadsafe(), while audio playback termination (audio_player.stop())
    is immediately thread-safe.

    Args:
        audio_player: Audio output player instance.
        queue_mgr: First-In, First-Out (FIFO) queue manager.
        loop: Active asyncio event loop.

    Returns:
        Callable[[], None]: Zero-argument thread-safe trigger callback.
    """
    def _on_emergency() -> None:
        audio_player.stop()
        if loop.is_running():
            loop.call_soon_threadsafe(queue_mgr.clear_queue)
        else:
            queue_mgr.clear_queue()

    return _on_emergency


async def playback_worker(
    queue_mgr: TextQueueManager,
    tts_engine: TTSEngine,
    audio_player: AudioPlayer,
    controller: EmergencyController,
    metrics: DashboardMetrics,
) -> None:
    """Asynchronous background worker synthesizing speech and driving audio playback.

    Consumes SpeechItem instances from the First-In, First-Out (FIFO) queue,
    synthesizes audio via TTSEngine, optionally plays gift chimes, and streams
    sound to the Virtual Audio Cable (VAC) driver while respecting abort checks.

    Args:
        queue_mgr: Source First-In, First-Out (FIFO) queue manager.
        tts_engine: Dual-engine Text-to-Speech (TTS) synthesizer.
        audio_player: Virtual Audio Cable (VAC) output driver.
        controller: Operating System (OS) emergency hotkey controller.
        metrics: Real-time dashboard state metrics snapshot.
    """
    while True:
        try:
            item: SpeechItem = await queue_mgr.get_next()
        except asyncio.CancelledError:
            break

        # If emergency stop was active when dequeued, skip this item entirely
        if controller.is_abort_requested():
            controller.reset_abort_flag()
            metrics.current_speaking = ""
            metrics.queue_size = queue_mgr.get_queue_size()
            continue

        metrics.current_speaking = item.text
        metrics.queue_size = queue_mgr.get_queue_size()

        try:
            audio_bytes = await tts_engine.synthesize(item.text)
            metrics.active_engine = tts_engine.last_engine
        except Exception as exc:
            logger.warning("Speech synthesis failed for '%s': %s", item.text, exc)
            if controller.is_abort_requested():
                controller.reset_abort_flag()
            metrics.current_speaking = ""
            metrics.queue_size = queue_mgr.get_queue_size()
            continue

        if controller.is_abort_requested():
            controller.reset_abort_flag()
            metrics.current_speaking = ""
            metrics.queue_size = queue_mgr.get_queue_size()
            continue

        abort_check = controller.is_abort_requested

        try:
            # Play chime sound effect for monetary gift announcements
            if item.is_gift:
                await asyncio.to_thread(audio_player.play_gift_chime, abort_check)

            # Stream synthesized audio bytes to Virtual Audio Cable (VAC)
            if not controller.is_abort_requested():
                await asyncio.to_thread(audio_player.play_audio_bytes, audio_bytes, abort_check)
        except Exception as exc:
            logger.error("Audio playback error for '%s': %s", item.text, exc)
        finally:
            if controller.is_abort_requested():
                controller.reset_abort_flag()
            metrics.current_speaking = ""
            metrics.queue_size = queue_mgr.get_queue_size()


async def shutdown(
    ingestion: TikTokIngestionService,
    audio_player: AudioPlayer,
    hotkey_controller: EmergencyController,
    dashboard: LiveDashboard,
    worker_task: Optional[asyncio.Task] = None,
) -> None:
    """Gracefully terminate all system components and background tasks.

    Args:
        ingestion: TikTok LIVE event ingestion service.
        audio_player: Virtual Audio Cable (VAC) audio player.
        hotkey_controller: Operating System (OS) emergency hotkey listener.
        dashboard: Terminal Rich live dashboard renderer.
        worker_task: Asynchronous playback worker task.
    """
    logger.info("Initiating graceful system shutdown...")

    # 1. Stop dashboard refresh to restore terminal state
    dashboard.stop()

    # 2. Stop global hotkey listener thread
    hotkey_controller.stop()

    # 3. Halt audio playback immediately
    audio_player.stop()

    # 4. Disconnect TikTok LIVE Webcast ingestion client
    await ingestion.stop()

    # 5. Cancel asynchronous playback worker
    if worker_task is not None and not worker_task.done():
        worker_task.cancel()
        try:
            await worker_task
        except asyncio.CancelledError:
            pass

    logger.info("Graceful shutdown completed successfully.")


async def run_bot(config: AppConfig) -> None:
    """Initialize subsystems and run the unified asynchronous pipeline.

    Args:
        config: Loaded application configuration instance.
    """
    loop = asyncio.get_running_loop()

    # Resolve paths for phonetic mappings, blacklist, and sound assets
    base_dir = Path(__file__).resolve().parent
    blacklist_path = base_dir / "data" / "blacklist.txt"
    phonetics_path = base_dir / "data" / "phonetics.json"
    assets_dir = base_dir / "assets"

    # Instantiate core domain components
    normalizer = TextNormalizer(
        blacklist_path=blacklist_path,
        phonetics_path=phonetics_path,
        max_length=config.max_comment_length,
    )
    queue_mgr = TextQueueManager(config=config)
    tts_engine = TTSEngine(config=config)
    audio_player = AudioPlayer(
        target_device_name=config.audio_output_device_name,
        assets_dir=assets_dir,
    )

    emergency_callback = create_emergency_callback(audio_player, queue_mgr, loop)
    hotkey_controller = EmergencyController(
        hotkey_name=config.emergency_hotkey,
        on_trigger_callback=emergency_callback,
    )

    # Initial audio device index resolution check
    audio_player.resolve_device_index()

    # Initialize dashboard metrics snapshot
    metrics = DashboardMetrics(
        connected_channel=config.tiktok_username or "Not configured",
        connection_status="Disconnected",
        total_comments=0,
        total_gifts=0,
        queue_size=0,
        current_speaking="",
        active_engine=f"Fish Audio ({config.fish_audio_tier_model})",
        emergency_hotkey=config.emergency_hotkey.upper(),
        device_warning=audio_player.device_warning,
    )
    dashboard = LiveDashboard(metrics=metrics)

    # TikTok LIVE event ingestion client service
    ingestion = TikTokIngestionService(
        config=config,
        normalizer=normalizer,
        queue_mgr=queue_mgr,
        metrics=metrics,
    )

    worker_task: Optional[asyncio.Task] = None

    try:
        # Start global keyboard hotkey listener
        hotkey_controller.start()

        # Launch playback worker task
        worker_task = asyncio.create_task(
            playback_worker(
                queue_mgr=queue_mgr,
                tts_engine=tts_engine,
                audio_player=audio_player,
                controller=hotkey_controller,
                metrics=metrics,
            )
        )

        # Start Rich terminal live dashboard
        dashboard.start()

        # Connect and start TikTok LIVE event ingestion
        await ingestion.start()

        # Main supervision loop
        while True:
            await asyncio.sleep(1)

    except (KeyboardInterrupt, asyncio.CancelledError):
        logger.info("Bot execution cancelled or interrupted by user.")
    finally:
        await shutdown(
            ingestion=ingestion,
            audio_player=audio_player,
            hotkey_controller=hotkey_controller,
            dashboard=dashboard,
            worker_task=worker_task,
        )


def parse_arguments(cli_args: Optional[list[str]] = None) -> argparse.Namespace:
    """Parse Command-Line Interface (CLI) arguments.

    Args:
        cli_args: Optional explicit list of arguments to parse; defaults to sys.argv[1:].

    Returns:
        argparse.Namespace: Parsed CLI argument flags.
    """
    parser = argparse.ArgumentParser(
        description="TikTok Live Text-to-Speech (TTS) Bot & Cloud Web Platform"
    )
    parser.add_argument(
        "--web",
        action="store_true",
        help="Run as FastAPI ASGI cloud web server instead of local desktop CLI bot.",
    )
    default_port = int(os.environ.get("PORT", "7860"))
    parser.add_argument(
        "--port",
        type=int,
        default=default_port,
        help=f"Port number for ASGI web server (default: {default_port}).",
    )
    parser.add_argument(
        "--host",
        type=str,
        default="0.0.0.0",
        help="Host network interface for ASGI web server (default: 0.0.0.0).",
    )
    parsed_args, _ = parser.parse_known_args(cli_args)
    return parsed_args


def main(cli_args: Optional[list[str]] = None) -> None:
    """Command-Line Interface (CLI) entrypoint for the application."""
    args = parse_arguments(cli_args)

    is_web_mode = (
        args.web
        or bool(os.environ.get("PORT"))
        or os.environ.get("MODE") == "web"
    )

    if is_web_mode:
        logger.info(
            "Starting TikTok Live TTS Cloud Web Platform on %s:%d",
            args.host,
            args.port,
        )
        uvicorn.run("src.web_server:app", host=args.host, port=args.port, log_level="info")
        return

    configure_logging()
    check_env_file()
    config = load_config()

    if not config.tiktok_username or not config.tiktok_username.strip():
        sys.stderr.write(
            "[ERROR] TIKTOK_USERNAME is empty or not configured.\n"
            "Please configure your channel handle in .env before running the bot (e.g. TIKTOK_USERNAME=@streamer).\n"
        )
        sys.exit(1)

    try:
        asyncio.run(run_bot(config))
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
