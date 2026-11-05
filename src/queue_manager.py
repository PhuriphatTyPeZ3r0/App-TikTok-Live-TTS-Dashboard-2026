"""Smart Priority Queue Manager & Anti-Spam Defense Engine.

This module coordinates speech synthesis scheduling for the TikTok Live Text-to-Speech (TTS) Bot.
It implements a priority ordering system where monetary gifts (priority 0) jump ahead of pending
comments (priority 1) without interrupting the currently playing message, provides per-user
cooldown rate limiting, blocks duplicate spam within a 30-second sliding window, truncates comments
exceeding length constraints, and provides an emergency queue purge to stop speech on demand.
"""

import asyncio
from dataclasses import dataclass, field
import threading
import time
from typing import Any, Dict, List, Optional, Tuple

from src.config import AppConfig


@dataclass
class TTSItem:
    """Represents a speech synthesis task queued in the smart priority pipeline.

    Attributes:
        text: Pre-normalized and sanitized text string ready for speech synthesis.
        user_id: Unique identifier for the TikTok viewer who sent the comment or gift.
        event_type: Category of the live stream event ("comment" or "gift").
        priority: Scheduling priority number (0 for high-priority gifts, 1 for standard comments).
        created_at: Floating-point Unix epoch timestamp marking item creation.
        is_gift: Boolean flag indicating if item is a gift (backward compatibility).
        user: Viewer nickname or user identifier alias.
    """

    text: str
    user_id: str = ""
    event_type: str = "comment"
    priority: int = 1
    created_at: float = field(default_factory=time.time)
    is_gift: bool = False
    user: Optional[str] = None

    def __post_init__(self) -> None:
        """Harmonize aliases, gift flags, and scheduling priorities."""
        if self.user and not self.user_id:
            self.user_id = self.user
        elif self.user_id and not self.user:
            self.user = self.user_id

        if self.is_gift:
            self.event_type = "gift"
            self.priority = 0
        elif self.event_type == "gift" or self.priority == 0:
            self.is_gift = True
            self.event_type = "gift"
            self.priority = 0

    def __lt__(self, other: Any) -> bool:
        """Enable comparison ordering by priority and creation timestamp."""
        if not isinstance(other, TTSItem):
            return NotImplemented
        return (self.priority, self.created_at) < (other.priority, other.created_at)


# Backward compatibility alias
SpeechItem = TTSItem


class TTSQueueManager:
    """Smart Priority Queue Manager with Anti-Spam Defense and Gift Priority Jump.

    Attributes:
        max_size: Maximum capacity of the pending speech queue.
        user_cooldown: Minimum interval (seconds) between comments by the same user.
        cooldown_seconds: Alias for user_cooldown (backward compatibility).
        max_length: Maximum allowed character length for speech synthesis comments.
    """

    def __init__(
        self,
        max_size: Optional[int] = None,
        user_cooldown: Optional[int] = None,
        max_length: int = 80,
        config: Optional[AppConfig] = None,
        cooldown_seconds: Optional[int] = None,
    ) -> None:
        """Initialize the TTSQueueManager with capacity limits and cooldown timers.

        Args:
            max_size: Maximum queue capacity. If None, derived from config or defaults to 10.
            user_cooldown: Throttling period in seconds for repeating users. Defaults to 5.
            max_length: Character truncation threshold. Defaults to 80.
            config: Optional application configuration (AppConfig) instance.
            cooldown_seconds: Backward-compatible alias for user_cooldown.
        """
        if config is not None:
            self.max_size: int = max_size if max_size is not None else config.max_queue_size
            self.user_cooldown: int = (
                user_cooldown
                if user_cooldown is not None
                else (cooldown_seconds if cooldown_seconds is not None else config.user_cooldown_seconds)
            )
        else:
            self.max_size = max_size if max_size is not None else 10
            self.user_cooldown = (
                user_cooldown
                if user_cooldown is not None
                else (cooldown_seconds if cooldown_seconds is not None else 5)
            )

        self.cooldown_seconds: int = self.user_cooldown
        self.max_length: int = max_length

        self._items: List[TTSItem] = []
        self._user_history: Dict[str, Tuple[float, str]] = {}
        self._user_cooldowns: Dict[str, float] = {}
        self._lock: threading.RLock = threading.RLock()
        self._async_event: Optional[asyncio.Event] = None

    def is_spam(self, user: str = "", text: str = "", user_id: str = "") -> bool:
        """Detect duplicate comments within 30 seconds and enforce per-user cooldown limits.

        Args:
            user: Viewer username or identifier.
            text: Raw or pre-sanitized comment text.
            user_id: Optional user identifier alias.

        Returns:
            bool: True if comment constitutes spam (duplicate or cooldown violation); False if clean.
        """
        uid = (user or user_id).strip()
        if not uid:
            return False

        now = time.time()
        clean_text = text.strip()

        with self._lock:
            if uid in self._user_history:
                last_time, last_text = self._user_history[uid]

                # 1. Duplicate Spam Filter: Block identical text within 30 seconds
                if (now - last_time) < 30.0 and clean_text == last_text:
                    return True

                # 2. Per-User Cooldown Filter: Block rapid-fire comments
                if (now - last_time) < self.user_cooldown:
                    return True

            # If not spam, update user activity record
            self._user_history[uid] = (now, clean_text)
            self._user_cooldowns[uid] = now
            return False

    def sanitize_text(self, text: str) -> str:
        """Truncate comments exceeding max_length character threshold with ellipsis.

        Args:
            text: Input comment string.

        Returns:
            Truncated string (length <= max_length + 3) if text exceeded limit; original string otherwise.
        """
        if not text:
            return ""
        if len(text) > self.max_length:
            return text[: self.max_length] + "..."
        return text

    def put(self, item: TTSItem) -> bool:
        """Insert a TTSItem into the priority queue with gift priority jump logic.

        Gifts (priority 0) jump ahead of pending comments, positioning themselves directly
        after the current head item (index 0) and after any previously queued gifts.
        Standard comments (priority 1) are appended to the queue tail in FIFO order.

        Args:
            item: TTSItem speech task.

        Returns:
            bool: True upon successful placement; False if rejected due to full capacity.
        """
        with self._lock:
            is_gift = (
                item.priority == 0 or item.event_type == "gift" or getattr(item, "is_gift", False)
            )

            # Capacity constraint enforcement
            if len(self._items) >= self.max_size:
                if is_gift:
                    # Evict the oldest regular comment to accommodate incoming monetary gift
                    evicted = False
                    for idx, existing in enumerate(self._items):
                        existing_is_gift = (
                            existing.priority == 0
                            or existing.event_type == "gift"
                            or getattr(existing, "is_gift", False)
                        )
                        if not existing_is_gift:
                            self._items.pop(idx)
                            evicted = True
                            break
                    # If all existing items are gifts, gifts are still accommodated
                else:
                    return False

            if not is_gift:
                # Regular comment: append to end (FIFO)
                self._items.append(item)
            else:
                # Gift priority jump:
                # Place after the active head item (index 0) and after any gifts already queued
                if len(self._items) <= 1:
                    self._items.append(item)
                else:
                    insert_idx = 1
                    while insert_idx < len(self._items):
                        curr = self._items[insert_idx]
                        curr_is_gift = (
                            curr.priority == 0
                            or curr.event_type == "gift"
                            or getattr(curr, "is_gift", False)
                        )
                        if curr_is_gift:
                            insert_idx += 1
                        else:
                            break
                    self._items.insert(insert_idx, item)

        self._signal_available()
        return True

    def put_nowait(self, item: TTSItem) -> bool:
        """Synchronous non-blocking enqueue alias."""
        return self.put(item)

    def get_nowait(self) -> TTSItem:
        """Retrieve and dequeue the next item immediately without blocking.

        Raises:
            asyncio.QueueEmpty: If the queue is currently empty.

        Returns:
            TTSItem: The next queued speech task.
        """
        with self._lock:
            if not self._items:
                raise asyncio.QueueEmpty()
            return self._items.pop(0)

    async def get_next(self) -> TTSItem:
        """Retrieve and dequeue the next item, asynchronously suspending until available.

        Returns:
            TTSItem: The next queued speech task.
        """
        loop = asyncio.get_running_loop()
        while True:
            with self._lock:
                if self._items:
                    return self._items.pop(0)

            if self._async_event is None or getattr(self._async_event, "_loop", None) is not loop:
                self._async_event = asyncio.Event()

            self._async_event.clear()

            with self._lock:
                if self._items:
                    return self._items.pop(0)

            await self._async_event.wait()

    def empty(self) -> bool:
        """Return True if the queue has no pending items, False otherwise."""
        with self._lock:
            return len(self._items) == 0

    def clear_queue(self) -> int:
        """Immediately purge all pending items from the queue (Emergency Mute / Flush).

        Returns:
            int: Number of speech items dropped from the queue.
        """
        with self._lock:
            count = len(self._items)
            self._items.clear()
            return count

    def get_queue_size(self) -> int:
        """Return the current number of speech items waiting in the queue."""
        with self._lock:
            return len(self._items)

    def qsize(self) -> int:
        """Return the current number of speech items waiting in the queue."""
        with self._lock:
            return len(self._items)

    def __len__(self) -> int:
        """Return the number of queued speech items."""
        with self._lock:
            return len(self._items)

    async def enqueue_comment(self, user_id: str, text: str) -> bool:
        """Add a regular chat comment to the queue, enforcing spam and capacity rules.

        Args:
            user_id: Unique viewer identifier.
            text: Comment text to synthesize.

        Returns:
            bool: True if successfully queued; False if rejected.
        """
        if not text or not text.strip():
            return False

        with self._lock:
            if len(self._items) >= self.max_size:
                return False

            if self.is_spam(user=user_id, text=text):
                return False

        item = TTSItem(
            text=text,
            user_id=user_id,
            event_type="comment",
            priority=1,
            is_gift=False,
        )
        return self.put(item)

    async def enqueue_gift(self, user_id: str, text: str) -> bool:
        """Add a monetary gift announcement, bypassing user cooldown with priority placement.

        Args:
            user_id: Unique viewer identifier who sent the gift.
            text: Formatted gift speech announcement.

        Returns:
            bool: True upon successful enqueuing; False if text is empty/whitespace.
        """
        if not text or not text.strip():
            return False

        item = TTSItem(
            text=text,
            user_id=user_id,
            event_type="gift",
            priority=0,
            is_gift=True,
        )
        return self.put(item)

    def _signal_available(self) -> None:
        """Notify any awaiting get_next() coroutines that a new item is available."""
        if self._async_event is not None:
            try:
                loop = getattr(self._async_event, "_loop", None)
                if loop and loop.is_running() and asyncio.get_running_loop() is not loop:
                    loop.call_soon_threadsafe(self._async_event.set)
                else:
                    self._async_event.set()
            except Exception:
                try:
                    self._async_event.set()
                except Exception:
                    pass


# Backward compatibility alias
TextQueueManager = TTSQueueManager
