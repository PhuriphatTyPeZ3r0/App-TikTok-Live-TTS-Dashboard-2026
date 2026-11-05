"""Unit tests for TikTokLive Event Ingestion Engine and Streak Gift Deduplication.

Verifies:
1. Comment ingestion through TextNormalizer and TextQueueManager.
2. Streak gift deduplication (only final repeat_end == 1 or non-streakable gifts trigger speech).
3. Minimum coin threshold enforcement (min_gift_coins).
4. Metrics tracking (total_comments, total_gifts, connection_status).
5. Error recovery: exceptions in event handlers are safely logged and do not crash the ingestion loop.
6. Service lifecycle: start() and stop() methods manage client connection safely without live network access.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from src.dashboard import DashboardMetrics
from src.ingestion import TikTokIngestionService


@pytest.fixture
def mock_dependencies():
    """Fixture providing mocked dependencies for TikTokIngestionService."""
    config = MagicMock()
    config.tiktok_username = "test_streamer"
    config.min_gift_coins = 1

    normalizer = MagicMock()
    normalizer.clean_comment.return_value = "สวัสดีครับบอท"
    normalizer.clean_username.return_value = "User123"
    normalizer.format_gift_message.return_value = "ขอบคุณ User123 สำหรับ Rose จำนวน 1 ชิ้น"

    queue_mgr = MagicMock()
    queue_mgr.enqueue_comment = AsyncMock(return_value=True)
    queue_mgr.enqueue_gift = AsyncMock(return_value=True)

    metrics = DashboardMetrics(
        connected_channel="@test_streamer",
        connection_status="Testing",
        total_comments=0,
        total_gifts=0,
        queue_size=0,
        current_speaking="",
        active_engine="Fish Audio (s2.1-pro-free)",
        emergency_hotkey="f9",
    )

    mock_client = MagicMock()
    mock_client.start = AsyncMock(return_value=MagicMock())
    mock_client.disconnect = AsyncMock()

    return {
        "config": config,
        "normalizer": normalizer,
        "queue_mgr": queue_mgr,
        "metrics": metrics,
        "client": mock_client,
    }


@pytest.mark.asyncio
async def test_ingestion_comment_and_gift_events():
    """Verify verbatim requirements from task-8 brief: comment handling and streak deduplication."""
    config = MagicMock()
    config.min_gift_coins = 1

    normalizer = MagicMock()
    normalizer.clean_comment.return_value = "สวัสดีครับบอท"
    normalizer.clean_username.return_value = "User123"
    normalizer.format_gift_message.return_value = "ขอบคุณ User123 สำหรับ Rose จำนวน 1 ชิ้น"

    queue_mgr = MagicMock()
    queue_mgr.enqueue_comment = AsyncMock(return_value=True)
    queue_mgr.enqueue_gift = AsyncMock(return_value=True)

    metrics = DashboardMetrics(
        connected_channel="@test",
        connection_status="Testing",
        total_comments=0,
        total_gifts=0,
        queue_size=0,
        current_speaking="",
        active_engine="",
        emergency_hotkey="F9",
    )

    service = TikTokIngestionService(config, normalizer, queue_mgr, metrics)

    # 1. Normal comment event
    comment_event = MagicMock()
    comment_event.user.unique_id = "user_1"
    comment_event.comment = "สวัสดีครับบอท"
    await service.handle_comment(comment_event)

    queue_mgr.enqueue_comment.assert_awaited_once_with("user_1", "สวัสดีครับบอท")
    assert metrics.total_comments == 1

    # Review Focus 2: Streak Gift Deduplication (only repeat_end == 1 is processed)
    gift_event_intermediate = MagicMock()
    gift_event_intermediate.repeat_end = 0
    gift_event_intermediate.gift.diamond_count = 1
    await service.handle_gift(gift_event_intermediate)
    queue_mgr.enqueue_gift.assert_not_called()

    gift_event_final = MagicMock()
    gift_event_final.repeat_end = 1
    gift_event_final.gift.diamond_count = 1
    gift_event_final.user.nickname = "User123"
    gift_event_final.user.unique_id = "user_1"
    gift_event_final.gift.extended_gift.name = "Rose"
    gift_event_final.repeat_count = 1

    await service.handle_gift(gift_event_final)
    queue_mgr.enqueue_gift.assert_awaited_once()
    assert metrics.total_gifts == 1


@pytest.mark.asyncio
async def test_ingestion_comment_filtered_by_normalizer(mock_dependencies):
    """Comments rejected by profanity or emptiness (clean_comment returns None) must not be enqueued."""
    deps = mock_dependencies
    deps["normalizer"].clean_comment.return_value = None

    service = TikTokIngestionService(
        deps["config"], deps["normalizer"], deps["queue_mgr"], deps["metrics"], deps["client"]
    )

    comment_event = MagicMock()
    comment_event.user.unique_id = "bad_user"
    comment_event.comment = "toxic text"

    await service.handle_comment(comment_event)

    deps["queue_mgr"].enqueue_comment.assert_not_called()
    assert deps["metrics"].total_comments == 0


@pytest.mark.asyncio
async def test_ingestion_comment_rejected_by_queue(mock_dependencies):
    """When TextQueueManager rejects comment (e.g. cooldown/full), total_comments must not increment."""
    deps = mock_dependencies
    deps["queue_mgr"].enqueue_comment.return_value = False

    service = TikTokIngestionService(
        deps["config"], deps["normalizer"], deps["queue_mgr"], deps["metrics"], deps["client"]
    )

    comment_event = MagicMock()
    comment_event.user.unique_id = "spam_user"
    comment_event.comment = "valid text"

    await service.handle_comment(comment_event)

    deps["queue_mgr"].enqueue_comment.assert_awaited_once_with("spam_user", "สวัสดีครับบอท")
    assert deps["metrics"].total_comments == 0


@pytest.mark.asyncio
async def test_ingestion_gift_below_min_coins_ignored(mock_dependencies):
    """Gifts with total diamonds (diamond_count * repeat_count) below min_gift_coins must be ignored."""
    deps = mock_dependencies
    deps["config"].min_gift_coins = 50

    service = TikTokIngestionService(
        deps["config"], deps["normalizer"], deps["queue_mgr"], deps["metrics"], deps["client"]
    )

    # 1 diamond * 10 repeats = 10 diamonds < 50 min_coins
    cheap_gift_event = MagicMock()
    cheap_gift_event.repeat_end = 1
    cheap_gift_event.gift.diamond_count = 1
    cheap_gift_event.user.nickname = "Viewer1"
    cheap_gift_event.user.unique_id = "v1"
    cheap_gift_event.gift.extended_gift.name = "Rose"
    cheap_gift_event.repeat_count = 10

    await service.handle_gift(cheap_gift_event)

    deps["queue_mgr"].enqueue_gift.assert_not_called()
    assert deps["metrics"].total_gifts == 0


@pytest.mark.asyncio
async def test_ingestion_gift_streak_total_diamonds_valuation(mock_dependencies):
    """Streaks of 1-coin gifts (e.g. 100 roses) must be recognized when total_diamonds >= min_gift_coins."""
    deps = mock_dependencies
    deps["config"].min_gift_coins = 50

    service = TikTokIngestionService(
        deps["config"], deps["normalizer"], deps["queue_mgr"], deps["metrics"], deps["client"]
    )

    # 1 diamond * 100 repeats = 100 diamonds >= 50 min_coins -> Enqueued!
    streak_gift_event = MagicMock()
    streak_gift_event.repeat_end = 1
    streak_gift_event.gift.diamond_count = 1
    streak_gift_event.repeat_count = 100
    streak_gift_event.user.nickname = "RoseStreakUser"
    streak_gift_event.user.unique_id = "user_streak_100"
    streak_gift_event.gift.extended_gift.name = "Rose"

    await service.handle_gift(streak_gift_event)

    deps["queue_mgr"].enqueue_gift.assert_awaited_once()
    assert deps["metrics"].total_gifts == 1


@pytest.mark.asyncio
async def test_ingestion_non_streakable_gift_announced_immediately(mock_dependencies):
    """Non-streakable gifts (streakable == False) announce immediately without waiting for repeat_end == 1."""
    deps = mock_dependencies
    deps["config"].min_gift_coins = 1

    service = TikTokIngestionService(
        deps["config"], deps["normalizer"], deps["queue_mgr"], deps["metrics"], deps["client"]
    )

    non_streak_gift = MagicMock()
    non_streak_gift.repeat_end = 0
    non_streak_gift.gift.streakable = False
    non_streak_gift.gift.diamond_count = 100
    non_streak_gift.user.nickname = "GenerousDonor"
    non_streak_gift.user.unique_id = "donor_99"
    non_streak_gift.gift.name = "Lion"
    non_streak_gift.repeat_count = 1

    deps["normalizer"].format_gift_message.return_value = "ขอบคุณ GenerousDonor สำหรับ Lion จำนวน 1 ชิ้น"

    await service.handle_gift(non_streak_gift)

    deps["queue_mgr"].enqueue_gift.assert_awaited_once()
    assert deps["metrics"].total_gifts == 1


@pytest.mark.asyncio
async def test_ingestion_handler_exception_does_not_crash(mock_dependencies):
    """Exceptions raised in normalizer or queue manager must be logged and not crash the loop."""
    deps = mock_dependencies
    deps["normalizer"].clean_comment.side_effect = RuntimeError("Normalization explosion")

    service = TikTokIngestionService(
        deps["config"], deps["normalizer"], deps["queue_mgr"], deps["metrics"], deps["client"]
    )

    comment_event = MagicMock()
    comment_event.user.unique_id = "user_err"
    comment_event.comment = "hello"

    # Must complete cleanly without raising
    await service.handle_comment(comment_event)
    assert deps["metrics"].total_comments == 0

    # Test gift exception handling as well
    deps["normalizer"].clean_username.side_effect = RuntimeError("Username error")
    broken_gift = MagicMock()
    broken_gift.repeat_end = 1
    broken_gift.gift.diamond_count = 10

    await service.handle_gift(broken_gift)
    assert deps["metrics"].total_gifts == 0


@pytest.mark.asyncio
async def test_ingestion_connect_and_disconnect_lifecycle(mock_dependencies):
    """handle_connect and handle_disconnect update metrics.connection_status appropriately."""
    deps = mock_dependencies
    service = TikTokIngestionService(
        deps["config"], deps["normalizer"], deps["queue_mgr"], deps["metrics"], deps["client"]
    )

    assert deps["metrics"].connection_status == "Testing"

    await service.handle_connect()
    assert deps["metrics"].connection_status == "Connected"

    await service.handle_disconnect()
    assert deps["metrics"].connection_status == "Disconnected"


@pytest.mark.asyncio
async def test_ingestion_start_and_stop_lifecycle(mock_dependencies):
    """service.start() and service.stop() cleanly invoke client connection lifecycle."""
    deps = mock_dependencies
    service = TikTokIngestionService(
        deps["config"], deps["normalizer"], deps["queue_mgr"], deps["metrics"], deps["client"]
    )

    await service.start()
    deps["client"].start.assert_awaited_once()

    await service.stop()
    deps["client"].disconnect.assert_awaited_once()
    assert deps["metrics"].connection_status == "Disconnected"
