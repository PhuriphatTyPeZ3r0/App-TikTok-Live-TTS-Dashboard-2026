"""Unit tests for Smart Priority Queue, Anti-Spam Extensions, and Dynamic Normalization.

Tests Gift Priority Jump, duplicate spam filtering, per-user cooldown rate limits,
text truncation at 80 characters, and runtime phonetics and blacklist extensions.
"""

import asyncio
import time
import pytest

from src.normalizer import TextNormalizer
from src.queue_manager import SpeechItem, TTSItem, TTSQueueManager, TextQueueManager


def test_gift_priority_jump():
    """Verify virtual gifts (priority=0) jump ahead of pending comments (priority=1)."""
    qm = TTSQueueManager(max_size=10)
    comment1 = TTSItem(text="คอมเมนต์ 1", event_type="comment", priority=1)
    comment2 = TTSItem(text="คอมเมนต์ 2", event_type="comment", priority=1)
    gift = TTSItem(text="ขอบคุณสำหรับ กุหลาบ", event_type="gift", priority=0)

    qm.put(comment1)
    qm.put(comment2)
    qm.put(gift)  # Gift jumps ahead of comment2

    first = qm.get_nowait()
    second = qm.get_nowait()
    third = qm.get_nowait()

    assert first.text == "คอมเมนต์ 1"
    assert second.text == "ขอบคุณสำหรับ กุหลาบ"
    assert third.text == "คอมเมนต์ 2"


def test_anti_spam_duplicate_and_truncation():
    """Verify duplicate spam blocking, per-user cooldown throttling, and 80-char truncation."""
    qm = TTSQueueManager(user_cooldown=5, max_length=80)
    assert qm.is_spam(user="user1", text="สวัสดี") is False
    assert qm.is_spam(user="user1", text="สวัสดี") is True  # Duplicate within 30s window
    assert qm.is_spam(user="user1", text="ข้อความใหม่") is True  # Blocked by 5s cooldown

    # Different user is not throttled
    assert qm.is_spam(user="user2", text="สวัสดี") is False

    long_text = "ก" * 120
    truncated = qm.sanitize_text(long_text)
    assert len(truncated) <= 83  # 80 chars + "..."
    assert truncated.endswith("...")

    short_text = "ข้อความสั้น"
    assert qm.sanitize_text(short_text) == short_text


def test_normalizer_add_phonetics_and_blacklist():
    """Verify dynamic injection of custom phonetics and blacklist into TextNormalizer."""
    normalizer = TextNormalizer(max_length=80)

    # Add custom phonetic substitutions
    normalizer.add_phonetics({"ตึง": "ดึงเปรี๊ยะ", "gg": "กู๊ดเกม"})
    assert "ตึง" in normalizer.phonetics
    assert normalizer.phonetics["ตึง"] == "ดึงเปรี๊ยะ"
    assert "gg" in normalizer.phonetics

    cleaned = normalizer.clean_comment("เล่นเกมนี้ตึงมาก gg")
    assert cleaned is not None
    assert "ดึงเปรี๊ยะ" in cleaned
    assert "กู๊ดเกม" in cleaned

    # Add custom profanity blacklist
    normalizer.add_blacklist(["คำต้องห้ามร้ายแรง", "สแปมสุดๆ"])
    assert "คำต้องห้ามร้ายแรง" in normalizer.blacklist
    assert "สแปมสุดๆ" in normalizer.blacklist

    # Comments containing blacklisted words should be rejected (return None)
    assert normalizer.clean_comment("นี่คือ คำต้องห้ามร้ายแรง นะครับ") is None
    assert normalizer.clean_comment("สแปมสุดๆ ไปเลย") is None


@pytest.mark.asyncio
async def test_queue_manager_async_get_next_and_empty():
    """Verify async get_next, get_nowait on empty queue, and empty() indicator."""
    qm = TTSQueueManager(max_size=5)
    assert qm.empty() is True

    with pytest.raises(asyncio.QueueEmpty):
        qm.get_nowait()

    item = TTSItem(text="ทดสอบ", user_id="u1", priority=1)
    qm.put(item)
    assert qm.empty() is False
    assert qm.qsize() == 1

    fetched = await qm.get_next()
    assert fetched.text == "ทดสอบ"
    assert qm.empty() is True


def test_tts_item_and_speech_item_compatibility():
    """Verify SpeechItem and TTSItem compatibility and attribute aliases."""
    item1 = TTSItem(text="ข้อความ", user="alice", event_type="comment", priority=1)
    assert item1.user_id == "alice"
    assert item1.is_gift is False

    item2 = TTSItem(text="ของขวัญ", user_id="bob", is_gift=True)
    assert item2.priority == 0
    assert item2.event_type == "gift"

    # Backward compatibility with SpeechItem alias
    item3 = SpeechItem(text="ของขวัญเก่า", user_id="charlie", is_gift=True)
    assert item3.priority == 0
    assert item3.event_type == "gift"
    assert item3.is_gift is True
