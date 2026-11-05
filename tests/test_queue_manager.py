"""Tests for FIFO Text Queue Manager and User Cooldown Tracker."""

import asyncio
from dataclasses import is_dataclass
import time
import pytest

from src.config import AppConfig
from src.queue_manager import SpeechItem, TextQueueManager


@pytest.mark.asyncio
async def test_queue_manager_cooldown_and_capacity():
    """Verify primary cooldown enforcement, capacity limits, gift bypass, and queue clearing."""
    queue = TextQueueManager(max_size=2, cooldown_seconds=10)

    # First comment passes
    res1 = await queue.enqueue_comment("user_1", "สวัสดีครับ")
    assert res1 is True
    assert queue.get_queue_size() == 1

    # Second comment from same user is blocked by cooldown
    res2 = await queue.enqueue_comment("user_1", "สวัสดีรอบสอง")
    assert res2 is False
    assert queue.get_queue_size() == 1

    # Gift from same user BYPASSES cooldown
    res3 = await queue.enqueue_gift("user_1", "ขอบคุณสำหรับกุหลาบ")
    assert res3 is True
    assert queue.get_queue_size() == 2

    # Queue is now at capacity (max_size=2), subsequent comment from user_2 is dropped
    res4 = await queue.enqueue_comment("user_2", "ข้อความล้นคิว")
    assert res4 is False

    # Dequeue item
    item = await queue.get_next()
    assert isinstance(item, SpeechItem)
    assert item.text == "สวัสดีครับ"
    assert queue.get_queue_size() == 1

    # Clear queue (Emergency flush)
    cleared = queue.clear_queue()
    assert cleared == 1
    assert queue.get_queue_size() == 0


@pytest.mark.asyncio
async def test_queue_manager_cooldown_expiration():
    """Verify that a user can enqueue a new comment after their cooldown duration expires."""
    queue = TextQueueManager(max_size=5, cooldown_seconds=1)

    # First comment succeeds
    assert await queue.enqueue_comment("user_speedy", "ข้อความที่ 1") is True

    # Immediate second comment is blocked
    assert await queue.enqueue_comment("user_speedy", "ข้อความเร็วไป") is False

    # Wait for cooldown to expire (1 second)
    await asyncio.sleep(1.05)

    # Third comment succeeds after cooldown elapsed
    assert await queue.enqueue_comment("user_speedy", "ข้อความที่ 2 ผ่านแล้ว") is True
    assert queue.get_queue_size() == 2


@pytest.mark.asyncio
async def test_queue_manager_independent_user_cooldowns():
    """Verify that cooldown for one user does not restrict or block other users."""
    queue = TextQueueManager(max_size=5, cooldown_seconds=10)

    assert await queue.enqueue_comment("user_alice", "สวัสดีจาก Alice") is True
    assert await queue.enqueue_comment("user_bob", "สวัสดีจาก Bob") is True
    assert await queue.enqueue_comment("user_charlie", "สวัสดีจาก Charlie") is True

    assert queue.get_queue_size() == 3

    # Alice is on cooldown, but Dave is not
    assert await queue.enqueue_comment("user_alice", "Alice พูดซ้ำ") is False
    assert await queue.enqueue_comment("user_dave", "สวัสดีจาก Dave") is True
    assert queue.get_queue_size() == 4


@pytest.mark.asyncio
async def test_queue_manager_gift_evicts_oldest_comment():
    """Verify that an incoming gift evicts the oldest regular comment when queue is full."""
    queue = TextQueueManager(max_size=2, cooldown_seconds=10)

    # Fill queue with two comments from different users
    assert await queue.enqueue_comment("user_1", "Comment 1") is True
    assert await queue.enqueue_comment("user_2", "Comment 2") is True
    assert queue.get_queue_size() == 2

    # Enqueue a high-priority gift event
    # Since queue is full, Comment 1 (oldest comment) should be evicted
    assert await queue.enqueue_gift("user_3", "Gift from user 3") is True
    assert queue.get_queue_size() == 2

    # First dequeued item should be Comment 2 (since Comment 1 was evicted)
    first_item = await queue.get_next()
    assert first_item.text == "Comment 2"
    assert first_item.user_id == "user_2"
    assert first_item.is_gift is False

    # Second dequeued item should be the Gift
    second_item = await queue.get_next()
    assert second_item.text == "Gift from user 3"
    assert second_item.user_id == "user_3"
    assert second_item.is_gift is True


@pytest.mark.asyncio
async def test_queue_manager_gift_evicts_comment_preserving_earlier_gifts():
    """Verify that an incoming gift preserves earlier gifts and only evicts comments."""
    queue = TextQueueManager(max_size=2, cooldown_seconds=10)

    # Queue contains 1 Gift and 1 Comment
    assert await queue.enqueue_gift("user_vip1", "Gift 1") is True
    assert await queue.enqueue_comment("user_regular", "Comment 1") is True
    assert queue.get_queue_size() == 2

    # Now a second gift arrives; it must evict Comment 1 and keep Gift 1
    assert await queue.enqueue_gift("user_vip2", "Gift 2") is True
    assert queue.get_queue_size() == 2

    # Check order: Gift 1 first, then Gift 2
    item1 = await queue.get_next()
    assert item1.text == "Gift 1"
    assert item1.is_gift is True

    item2 = await queue.get_next()
    assert item2.text == "Gift 2"
    assert item2.is_gift is True


@pytest.mark.asyncio
async def test_queue_manager_gift_when_all_items_are_gifts():
    """Verify that incoming gifts are pushed even if queue currently contains only gifts."""
    queue = TextQueueManager(max_size=2, cooldown_seconds=10)

    assert await queue.enqueue_gift("user_g1", "Gift 1") is True
    assert await queue.enqueue_gift("user_g2", "Gift 2") is True
    assert queue.get_queue_size() == 2

    # A third gift arrives when queue is full of gifts; it should still be accepted
    assert await queue.enqueue_gift("user_g3", "Gift 3") is True
    assert queue.get_queue_size() == 3

    # All three gifts should be dequeued in FIFO order
    g1 = await queue.get_next()
    g2 = await queue.get_next()
    g3 = await queue.get_next()
    assert g1.text == "Gift 1"
    assert g2.text == "Gift 2"
    assert g3.text == "Gift 3"
    assert queue.get_queue_size() == 0


@pytest.mark.asyncio
async def test_queue_manager_dropped_comment_does_not_set_cooldown():
    """Verify that if a comment is rejected due to full queue, the user's cooldown is not updated."""
    queue = TextQueueManager(max_size=1, cooldown_seconds=30)

    # User 1 fills queue
    assert await queue.enqueue_comment("user_1", "Comment 1") is True

    # User 2 attempts to send comment, dropped due to queue full
    assert await queue.enqueue_comment("user_2", "User 2 comment") is False

    # Dequeue user 1's comment
    item = await queue.get_next()
    assert item.user_id == "user_1"

    # User 2 retries immediately; should succeed because cooldown was never started
    assert await queue.enqueue_comment("user_2", "User 2 retry") is True
    assert queue.get_queue_size() == 1


@pytest.mark.asyncio
async def test_queue_manager_init_with_app_config():
    """Verify initialization using an AppConfig instance."""
    config = AppConfig(
        tiktok_username="@streamer",
        fish_audio_api_key="mock_key",
        max_queue_size=3,
        user_cooldown_seconds=5,
    )
    queue = TextQueueManager(config=config)
    assert queue.max_size == 3
    assert queue.cooldown_seconds == 5

    # Can accept up to 3 items
    assert await queue.enqueue_comment("u1", "c1") is True
    assert await queue.enqueue_comment("u2", "c2") is True
    assert await queue.enqueue_comment("u3", "c3") is True
    # 4th item rejected
    assert await queue.enqueue_comment("u4", "c4") is False


def test_queue_manager_clear_empty_queue():
    """Verify clear_queue returns 0 on an empty queue."""
    queue = TextQueueManager(max_size=5, cooldown_seconds=10)
    assert queue.clear_queue() == 0
    assert queue.get_queue_size() == 0


def test_speech_item_dataclass():
    """Verify SpeechItem fields, defaults, and dataclass structure."""
    assert is_dataclass(SpeechItem)

    t0 = time.time()
    item = SpeechItem(text="ทดสอบ", user_id="user_99")
    assert item.text == "ทดสอบ"
    assert item.user_id == "user_99"
    assert item.is_gift is False
    assert item.created_at >= t0

    custom_item = SpeechItem(
        text="ของขวัญ",
        user_id="user_vip",
        is_gift=True,
        created_at=12345.678,
    )
    assert custom_item.text == "ของขวัญ"
    assert custom_item.user_id == "user_vip"
    assert custom_item.is_gift is True
    assert custom_item.created_at == 12345.678


@pytest.mark.asyncio
async def test_queue_manager_empty_or_whitespace_rejected():
    queue = TextQueueManager(max_size=5, cooldown_seconds=0)
    assert await queue.enqueue_comment("u1", "") is False
    assert await queue.enqueue_comment("u1", "   ") is False
    assert await queue.enqueue_gift("u1", "") is False
    assert await queue.enqueue_gift("u1", "   ") is False
    assert queue.get_queue_size() == 0
