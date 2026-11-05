"""TikTok LIVE Event Ingestion Engine and Streak Gift Deduplication Service.

This module consumes incoming live stream events from the TikTok LIVE Webcast service
using TikTokLiveClient, processes viewer comments through the phonetic and profanity
TextNormalizer, deduplicates combo gift streaks, enqueues speech synthesis tasks into the
First-In, First-Out (FIFO) TextQueueManager, and dynamically updates DashboardMetrics
for real-time terminal display.
"""

import asyncio
import logging
from typing import Any, Optional

from TikTokLive import TikTokLiveClient
from TikTokLive.events import CommentEvent, ConnectEvent, DisconnectEvent, GiftEvent

from src.config import AppConfig
from src.dashboard import DashboardMetrics
from src.normalizer import TextNormalizer
from src.queue_manager import TextQueueManager

logger = logging.getLogger(__name__)


def _extract_gift_name(gift: Any) -> str:
    """Extract human-readable gift name from various TikTokLive event representations.

    Supports mock hierarchies, legacy schema extended_gift wrappers, and modern
    TikTokLiveProto Gift models.

    Args:
        gift: The gift object attached to a GiftEvent.

    Returns:
        str: Cleaned gift name or fallback description.
    """
    if gift is None:
        return "ของขวัญ"

    # 1. Extended gift object wrapper (used in tests and older TikTokLive schemas)
    extended_gift = getattr(gift, "extended_gift", None)
    if extended_gift is not None:
        name = getattr(extended_gift, "name", None)
        if isinstance(name, str) and name.strip():
            return name.strip()

    # 2. Direct name attribute on Gift model
    name = getattr(gift, "name", None)
    if isinstance(name, str) and name.strip():
        return name.strip()

    # 3. Alternative gift_name attribute
    gift_name = getattr(gift, "gift_name", None)
    if isinstance(gift_name, str) and gift_name.strip():
        return gift_name.strip()

    return "ของขวัญ"


class TikTokIngestionService:
    """Ingests live events from TikTok LIVE and enqueues normalized comments and gifts.

    Provides resilient event ingestion that shields the main connection loop from
    unhandled event exceptions, deduplicates high-frequency gift streaks, enforces
    minimum coin thresholds, and keeps the terminal dashboard metrics synchronized.

    Attributes:
        config: Application configuration (AppConfig) instance.
        normalizer: Text sanitization and phonetic normalizer (TextNormalizer).
        queue_mgr: First-In, First-Out (FIFO) speech queue manager (TextQueueManager).
        metrics: Mutable runtime state snapshot (DashboardMetrics).
        client: TikTokLiveClient connection instance.
    """

    def __init__(
        self,
        config: AppConfig,
        normalizer: TextNormalizer,
        queue_mgr: TextQueueManager,
        metrics: DashboardMetrics,
        client: Optional[TikTokLiveClient] = None,
    ) -> None:
        """Initialize the TikTokIngestionService with dependencies and register listeners.

        Args:
            config: Application configuration containing TikTok credentials and thresholds.
            normalizer: Phonetic and profanity normalizer for comment and username sanitation.
            queue_mgr: First-In, First-Out (FIFO) queue for Text-to-Speech (TTS) items.
            metrics: Real-time dashboard metrics container.
            client: Optional TikTokLiveClient override for testing and dependency injection.
        """
        self.config = config
        self.normalizer = normalizer
        self.queue_mgr = queue_mgr
        self.metrics = metrics
        self._running: bool = False
        self._connect_task: Optional[asyncio.Task] = None

        if client is not None:
            self.client = client
        else:
            username = getattr(config, "tiktok_username", "")
            self.client = TikTokLiveClient(unique_id=username or "streamer")

        self._register_event_handlers()

    def _register_event_handlers(self) -> None:
        """Register listeners for connection lifecycle, comments, and gift events."""
        try:
            if hasattr(self.client, "add_listener"):
                self.client.add_listener(ConnectEvent, self.handle_connect)
                self.client.add_listener(DisconnectEvent, self.handle_disconnect)
                self.client.add_listener(CommentEvent, self.handle_comment)
                self.client.add_listener(GiftEvent, self.handle_gift)
            elif hasattr(self.client, "on"):
                self.client.on(ConnectEvent)(self.handle_connect)
                self.client.on(DisconnectEvent)(self.handle_disconnect)
                self.client.on(CommentEvent)(self.handle_comment)
                self.client.on(GiftEvent)(self.handle_gift)
        except Exception:
            # Fallback for custom mock clients expecting string-based event names
            if hasattr(self.client, "on"):
                for event_name, handler in [
                    ("connect", self.handle_connect),
                    ("disconnect", self.handle_disconnect),
                    ("comment", self.handle_comment),
                    ("gift", self.handle_gift),
                ]:
                    try:
                        self.client.on(event_name)(handler)
                    except Exception:
                        pass

    async def handle_connect(self, event: Any = None) -> None:
        """Handle connection established event from TikTok LIVE.

        Args:
            event: Optional ConnectEvent payload.
        """
        try:
            self.metrics.connection_status = "Connected"
            logger.info("Connected to TikTok LIVE channel: %s", self.metrics.connected_channel)
        except Exception:
            logger.exception("Unexpected error in handle_connect handler")

    async def handle_disconnect(self, event: Any = None) -> None:
        """Handle disconnection event from TikTok LIVE.

        Args:
            event: Optional DisconnectEvent payload.
        """
        try:
            self.metrics.connection_status = "Disconnected"
            logger.info("Disconnected from TikTok LIVE channel: %s", self.metrics.connected_channel)
        except Exception:
            logger.exception("Unexpected error in handle_disconnect handler")

    async def handle_comment(self, event: Any) -> None:
        """Normalize and enqueue incoming chat comment event.

        Executes the moderation and normalization pipeline on the comment text.
        If accepted and enqueued by TextQueueManager, increments metrics.total_comments.
        Catches all internal exceptions to prevent disrupting the client connection.

        Args:
            event: Incoming CommentEvent from TikTok LIVE.
        """
        try:
            raw_comment = getattr(event, "comment", "")
            cleaned_text = self.normalizer.clean_comment(raw_comment)
            if not cleaned_text:
                return

            user = getattr(event, "user", None)
            user_id = str(getattr(user, "unique_id", "") or "anonymous")

            enqueued = await self.queue_mgr.enqueue_comment(user_id, cleaned_text)
            if enqueued:
                self.metrics.total_comments += 1
                logger.debug("Enqueued comment from %s: %s", user_id, cleaned_text)
        except Exception:
            logger.exception("Error processing TikTok LIVE comment event")

    async def handle_gift(self, event: Any) -> None:
        """Process, deduplicate, and enqueue incoming gift event.

        Streak Gift Deduplication Strategy:
        1. Check if the gift is streakable. If non-streakable (streakable is False),
           it announces immediately without waiting for a streak end event.
        2. If streakable, intermediate events (repeat_end == 0 or streaking is True)
           are dropped to prevent spamming audio for every incremental coin.
           Only the terminal event (repeat_end == 1) is processed.
        3. Enforce the minimum coin threshold (min_gift_coins).
        4. Sanitize the sender's nickname and format the announcement.
        5. Enqueue the speech task; increment metrics.total_gifts on success.

        Args:
            event: Incoming GiftEvent from TikTok LIVE.
        """
        try:
            gift = getattr(event, "gift", None)

            # 1. Deduplication check: non-streakable vs streakable
            is_streakable = getattr(gift, "streakable", None)
            if is_streakable is False:
                is_finished = True
            else:
                if getattr(event, "streaking", False) is True:
                    is_finished = False
                else:
                    is_finished = getattr(event, "repeat_end", 0) == 1

            if not is_finished:
                return

            # 2. Minimum coin/diamond threshold check (evaluates total streak value)
            repeat_count = int(getattr(event, "repeat_count", 1) or 1)
            total_diamonds = (getattr(gift, "diamond_count", 0) or 0) * repeat_count
            min_coins = getattr(self.config, "min_gift_coins", 1)
            if total_diamonds < min_coins:
                logger.debug(
                    "Gift total diamonds (%s) below minimum threshold (%s); skipping",
                    total_diamonds,
                    min_coins,
                )
                return

            # 3. User details and sanitization
            user = getattr(event, "user", None)
            user_id = str(getattr(user, "unique_id", "") or "anonymous")
            raw_nickname = getattr(user, "nickname", None) or getattr(user, "unique_id", "ผู้ชม")
            clean_name = self.normalizer.clean_username(str(raw_nickname))

            # 4. Gift name extraction
            gift_name = _extract_gift_name(gift)

            # 5. Message formatting and enqueuing
            formatted_msg = self.normalizer.format_gift_message(clean_name, gift_name, repeat_count)
            enqueued = await self.queue_mgr.enqueue_gift(user_id, formatted_msg)
            if enqueued:
                self.metrics.total_gifts += 1
                logger.info(
                    "Enqueued gift speech from %s: %s (diamonds: %s, repeats: %s)",
                    clean_name,
                    gift_name,
                    total_diamonds,
                    repeat_count,
                )
        except Exception:
            logger.exception("Error processing TikTok LIVE gift event")

    async def start(self) -> None:
        """Start the TikTok LIVE event ingestion engine."""
        if self._running:
            return
        self._running = True
        logger.info("Starting TikTok LIVE ingestion service...")

        if hasattr(self.client, "start"):
            try:
                res = self.client.start()
                if asyncio.iscoroutine(res):
                    self._connect_task = await res
                elif isinstance(res, asyncio.Task):
                    self._connect_task = res
            except Exception:
                logger.exception("Failed to start TikTokLive client")
                self.metrics.connection_status = "Disconnected"
                raise
        elif hasattr(self.client, "connect"):
            try:
                res = self.client.connect()
                if asyncio.iscoroutine(res):
                    self._connect_task = asyncio.create_task(res)
            except Exception:
                logger.exception("Failed to connect TikTokLive client")
                self.metrics.connection_status = "Disconnected"
                raise

    async def stop(self) -> None:
        """Stop the TikTok LIVE event ingestion engine and disconnect client."""
        if not self._running:
            return
        self._running = False
        logger.info("Stopping TikTok LIVE ingestion service...")

        if hasattr(self.client, "disconnect"):
            try:
                res = self.client.disconnect()
                if asyncio.iscoroutine(res):
                    await res
            except Exception:
                logger.exception("Error during TikTokLive client disconnect")
        elif hasattr(self.client, "close"):
            try:
                res = self.client.close()
                if asyncio.iscoroutine(res):
                    await res
            except Exception:
                logger.exception("Error during TikTokLive client close")

        if self._connect_task is not None and not self._connect_task.done():
            self._connect_task.cancel()
            try:
                await self._connect_task
            except asyncio.CancelledError:
                pass
            except Exception:
                logger.exception("Error cancelling connection task")
            self._connect_task = None

        self.metrics.connection_status = "Disconnected"
