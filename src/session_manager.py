"""Multi-user In-Memory Session Manager and Lifecycle Orchestrator.

This module coordinates multi-tenant live stream ingestion, token-based authorization
separation (Open Broadcaster Software (OBS) Studio overlay vs streamer control dashboard),
custom text normalization rules, and automated inactive session scavenging for the
TikTok Live Text-to-Speech (TTS) Cloud Web Platform.
"""

import asyncio
from dataclasses import dataclass, field
import logging
import re
import secrets
import threading
import time
from typing import Any, Dict, List, Optional, Set, Union
import uuid

from src.ingestion import TikTokIngestionService
from src.normalizer import TextNormalizer
try:
    from src.queue_manager import TTSItem, TTSQueueManager
except ImportError:
    from src.queue_manager import SpeechItem as TTSItem, TextQueueManager as TTSQueueManager  # type: ignore[attr-defined]
from src.tts_engine import TTSEngine
from src.voice_registry import get_voice_profile

logger = logging.getLogger(__name__)


@dataclass
class SessionInstance:
    """Represents an active multi-tenant live stream Text-to-Speech (TTS) session.

    Attributes:
        session_id: Unique Universally Unique Identifier (UUID) string for the session.
        tiktok_username: Target TikTok live streamer account username.
        fish_audio_api_key: User-provided Fish Audio Application Programming Interface (API) key.
        admin_token: Privileged URL-safe token granting access to the control dashboard.
        overlay_token: Public read-only URL-safe token for Open Broadcaster Software (OBS) overlay.
        normalizer: TextNormalizer instance configured with default and custom phonetic rules.
        queue_manager: First-In, First-Out (FIFO) TTSQueueManager for speech task ordering.
        tts_engine: TTSEngine instance configured for session-specific voice synthesis.
        selected_voice_id: Currently active voice profile ID for this session (default: "yuta").
        proxy_url: Optional HTTP or SOCKS5 proxy URL to circumvent datacenter IP throttling.
        enable_comments: Whether regular viewer comments are converted to speech.
        enable_gifts: Whether virtual gifts trigger priority speech synthesis.
        user_cooldown: Anti-spam cooldown delay in seconds between comments by the same user.
        max_comment_length: Maximum allowed character length for incoming comments.
        connected_overlays: Set of active WebSocket connections for the browser source overlay.
        connected_dashboards: Set of active WebSocket connections for the streamer dashboard.
        ingestion_service: Background TikTokIngestionService managing the live event loop.
        created_at: Floating-point Unix epoch timestamp marking session creation.
        last_active: Floating-point Unix epoch timestamp marking most recent activity.
    """

    session_id: str
    tiktok_username: str
    fish_audio_api_key: str
    admin_token: str
    overlay_token: str
    normalizer: TextNormalizer
    queue_manager: TTSQueueManager
    tts_engine: Optional[TTSEngine] = None
    selected_voice_id: str = "yuta"
    proxy_url: Optional[str] = None
    enable_comments: bool = True
    enable_gifts: bool = True
    user_cooldown: int = 5
    max_comment_length: int = 80
    connected_overlays: Set[Any] = field(default_factory=set)
    connected_dashboards: Set[Any] = field(default_factory=set)
    ingestion_service: Optional[TikTokIngestionService] = None
    created_at: float = field(default_factory=time.time)
    last_active: float = field(default_factory=time.time)
    _is_running: bool = field(default=False, repr=False)

    def touch(self) -> None:
        """Update the last_active timestamp to the current Unix epoch time."""
        self.last_active = time.time()

    @property
    def is_running(self) -> bool:
        """Check whether the live stream session is actively running.

        Returns:
            bool: True if the session or its ingestion service is active, False otherwise.
        """
        if self.ingestion_service is not None:
            return getattr(self.ingestion_service, "_running", False) or self._is_running
        return self._is_running

    async def enqueue_speech(
        self,
        text: str,
        user_id: str = "anonymous",
        is_gift: bool = False,
        voice_id: Optional[str] = None,
    ) -> bool:
        """Enqueue a speech job into the session's queue carrying the session's selected voice ID.

        Args:
            text: Speech text to enqueue.
            user_id: Identifier of the viewer or sender.
            is_gift: True if the speech item is a priority gift announcement.
            voice_id: Optional voice ID override; defaults to self.selected_voice_id.

        Returns:
            bool: True if enqueued successfully, False otherwise.
        """
        if not text or not text.strip():
            return False

        target_voice_id = get_voice_profile(voice_id or self.selected_voice_id).id
        self.touch()

        if is_gift:
            item = TTSItem(
                text=text,
                user_id=user_id,
                event_type="gift",
                priority=0,
                is_gift=True,
            )
            setattr(item, "voice_id", target_voice_id)
            return self.queue_manager.put(item)

        if self.queue_manager.get_queue_size() >= self.queue_manager.max_size:
            return False
        if self.queue_manager.is_spam(user=user_id, text=text):
            return False

        item = TTSItem(
            text=text,
            user_id=user_id,
            event_type="comment",
            priority=1,
            is_gift=False,
        )
        setattr(item, "voice_id", target_voice_id)
        return self.queue_manager.put(item)

    async def start(self) -> None:
        """Start the live stream session and underlying live event ingestion loop."""
        if self._is_running:
            return
        self._is_running = True
        self.touch()
        if self.ingestion_service is not None:
            res = self.ingestion_service.start()
            if asyncio.iscoroutine(res):
                await res

    async def stop(self) -> None:
        """Gracefully terminate the live stream session and underlying ingestion service."""
        if not self.is_running:
            return
        self._is_running = False
        self.touch()
        if self.ingestion_service is not None:
            res = self.ingestion_service.stop()
            if asyncio.iscoroutine(res):
                await res


class SessionManager:
    """Thread-safe in-memory session registry and lifecycle manager.

    Orchestrates session creation with separate admin and overlay security tokens,
    session retrieval, custom phonetic rule configuration, and background reaping
    of orphaned or inactive sessions.
    """

    def __init__(self) -> None:
        """Initialize the SessionManager with an empty thread-safe session dictionary."""
        self._sessions: Dict[str, SessionInstance] = {}
        self._lock = threading.RLock()

    def create_session(
        self,
        tiktok_username: str,
        fish_audio_api_key: str,
        proxy_url: Optional[str] = None,
        enable_comments: bool = True,
        enable_gifts: bool = True,
        user_cooldown: int = 5,
        max_comment_length: int = 80,
        custom_phonetics: Optional[Dict[str, str]] = None,
        custom_blacklist: Optional[Union[List[str], Set[str]]] = None,
        colab_tunnel_url: Optional[str] = None,
        prefer_colab_tts: bool = True,
        colab_tts_timeout_seconds: float = 5.0,
        hf_token: Optional[str] = None,
        selected_voice_id: str = "yuta",
    ) -> SessionInstance:
        """Create and register a new multi-tenant live stream session.

        Initializes independent TextNormalizer, TTSQueueManager, and TTSEngine instances,
        merges custom phonetics and blacklist entries, and generates unique
        dual security tokens.

        Voice branding reference: พิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert) with 'yuta' alias.

        Args:
            tiktok_username: Target TikTok creator username (e.g., '@username').
            fish_audio_api_key: Streamer's Fish Audio API authentication key.
            proxy_url: Optional forward proxy URL for WebSocket live connection.
            enable_comments: Flag enabling comment text-to-speech processing.
            enable_gifts: Flag enabling virtual gift announcement synthesis.
            user_cooldown: Minimum interval (seconds) between comments per user.
            max_comment_length: Maximum permitted comment character count.
            custom_phonetics: Optional dictionary of slang to pronunciation overrides.
            custom_blacklist: Optional collection of prohibited words or phrases.
            colab_tunnel_url: Optional Google Colab Cloudflare tunnel URL.
            prefer_colab_tts: Flag prioritizing Google Colab Edge-TTS over local fallback.
            colab_tts_timeout_seconds: Request timeout in seconds for Colab TTS synthesis.
            hf_token: Optional Bearer authentication token for Hugging Face (HF) Spaces / Zero-cost Graphics Processing Unit (ZeroGPU).
            selected_voice_id: Initial voice profile identifier (defaults to "yuta").

        Returns:
            SessionInstance: The newly created and registered session instance.
        """
        session_id = str(uuid.uuid4())
        admin_token = secrets.token_urlsafe(16)
        overlay_token = secrets.token_urlsafe(16)

        # Initialize dedicated normalizer for this session
        normalizer = TextNormalizer(max_length=max_comment_length)
        if custom_phonetics:
            normalizer.phonetics.update(custom_phonetics)
            normalizer._phonetic_rules = [
                (re.compile(rf"\b{re.escape(k)}\b", re.IGNORECASE), v)
                for k, v in sorted(
                    normalizer.phonetics.items(),
                    key=lambda item: len(item[0]),
                    reverse=True,
                )
            ]
        if custom_blacklist:
            normalizer.blacklist.update(custom_blacklist)

        # Initialize dedicated queue manager with session-specific cooldown
        queue_manager = TTSQueueManager(cooldown_seconds=user_cooldown)

        # Initialize dedicated TTS synthesis engine with streamer's API key, Colab settings, and HF token
        tts_engine = TTSEngine(
            api_key=fish_audio_api_key,
            colab_tunnel_url=colab_tunnel_url,
            prefer_colab_tts=prefer_colab_tts,
            colab_tts_timeout_seconds=colab_tts_timeout_seconds,
            hf_token=hf_token,
        )
        if hasattr(tts_engine, "_config"):
            tts_engine._config.colab_tunnel_url = colab_tunnel_url
            tts_engine._config.prefer_colab_tts = prefer_colab_tts
            tts_engine._config.colab_tts_timeout_seconds = colab_tts_timeout_seconds
            tts_engine._config.hf_token = hf_token

        resolved_voice_id = get_voice_profile(selected_voice_id).id
        now = time.time()
        instance = SessionInstance(
            session_id=session_id,
            tiktok_username=tiktok_username,
            fish_audio_api_key=fish_audio_api_key,
            admin_token=admin_token,
            overlay_token=overlay_token,
            normalizer=normalizer,
            queue_manager=queue_manager,
            tts_engine=tts_engine,
            selected_voice_id=resolved_voice_id,
            proxy_url=proxy_url,
            enable_comments=enable_comments,
            enable_gifts=enable_gifts,
            user_cooldown=user_cooldown,
            max_comment_length=max_comment_length,
            created_at=now,
            last_active=now,
        )

        # Bind queue_manager enqueue methods to inject session's selected_voice_id automatically
        orig_enqueue_comment = queue_manager.enqueue_comment
        orig_enqueue_gift = queue_manager.enqueue_gift

        async def _bound_enqueue_comment(
            user_id: str, text: str, voice_id: Optional[str] = None
        ) -> bool:
            target_vid = get_voice_profile(voice_id or instance.selected_voice_id).id
            ok = await orig_enqueue_comment(user_id, text)
            if ok and queue_manager._items:
                setattr(queue_manager._items[-1], "voice_id", target_vid)
            return ok

        async def _bound_enqueue_gift(
            user_id: str, text: str, voice_id: Optional[str] = None
        ) -> bool:
            target_vid = get_voice_profile(voice_id or instance.selected_voice_id).id
            ok = await orig_enqueue_gift(user_id, text)
            if ok and queue_manager._items:
                for it in reversed(queue_manager._items):
                    if it.is_gift and it.text == text and getattr(it, "voice_id", None) is None:
                        setattr(it, "voice_id", target_vid)
                        break
            return ok

        queue_manager.enqueue_comment = _bound_enqueue_comment  # type: ignore[method-assign]
        queue_manager.enqueue_gift = _bound_enqueue_gift  # type: ignore[method-assign]

        with self._lock:
            self._sessions[session_id] = instance

        logger.info("Created session %s for streamer %s", session_id, tiktok_username)
        return instance

    def set_session_voice(self, session_id: str, voice_id: str) -> bool:
        """Update the selected voice profile ID for an active session.

        Args:
            session_id: Universally Unique Identifier (UUID) string of the session.
            voice_id: Target voice profile identifier (e.g., "yuta", "hana", "joker", "anchor", "niwat").

        Returns:
            bool: True if the session exists and was updated, False otherwise.
        """
        with self._lock:
            session = self._sessions.get(session_id)
            if session is None:
                return False
            resolved_profile = get_voice_profile(voice_id)
            session.selected_voice_id = resolved_profile.id
            session.touch()
            return True

    async def enqueue_speech(
        self,
        session_id: str,
        text: str,
        user_id: str = "anonymous",
        is_gift: bool = False,
        voice_id: Optional[str] = None,
    ) -> bool:
        """Enqueue a speech job for the specified session carrying its selected_voice_id.

        Args:
            session_id: Target session Universally Unique Identifier (UUID).
            text: Speech text to synthesize.
            user_id: Viewer or sender identifier.
            is_gift: Whether this is a priority gift announcement.
            voice_id: Optional voice ID override; defaults to session.selected_voice_id.

        Returns:
            bool: True if enqueued, False if session does not exist or queue rejected item.
        """
        session = self.get_session(session_id)
        if session is None:
            return False
        return await session.enqueue_speech(
            text=text,
            user_id=user_id,
            is_gift=is_gift,
            voice_id=voice_id or session.selected_voice_id,
        )

    def get_session(self, session_id: str) -> Optional[SessionInstance]:
        """Retrieve an active session instance by its session identifier.

        Args:
            session_id: Universally Unique Identifier (UUID) string.

        Returns:
            Optional[SessionInstance]: The matched session or None if not found.
        """
        with self._lock:
            return self._sessions.get(session_id)

    def delete_session(self, session_id: str) -> bool:
        """Decommission and remove a session from the in-memory registry.

        If a background TikTokIngestionService is attached and running, cleanly
        stops the ingestion event loop.

        Args:
            session_id: Universally Unique Identifier (UUID) of the session to terminate.

        Returns:
            bool: True if the session was found and removed, False otherwise.
        """
        with self._lock:
            session = self._sessions.pop(session_id, None)

        if session is None:
            return False

        if session.ingestion_service is not None:
            stop_fn = getattr(session.ingestion_service, "stop", None)
            if callable(stop_fn):
                try:
                    res = stop_fn()
                    if asyncio.iscoroutine(res):
                        try:
                            loop = asyncio.get_running_loop()
                            loop.create_task(res)
                        except RuntimeError:
                            asyncio.run(res)
                except Exception as exc:
                    logger.warning(
                        "Error stopping ingestion service for session %s: %s",
                        session_id,
                        exc,
                    )

        logger.info("Deleted session %s", session_id)
        return True

    def reap_inactive_sessions(self, max_idle_seconds: int = 600) -> List[str]:
        """Scan and terminate sessions exceeding the maximum inactivity duration.

        A session is eligible for reaping only if it has zero connected Open Broadcaster
        Software (OBS) overlay clients and its idle duration exceeds max_idle_seconds.

        Args:
            max_idle_seconds: Maximum allowed seconds without activity (default 600s / 10m).

        Returns:
            List[str]: Identifiers of all reaped sessions.
        """
        now = time.time()
        with self._lock:
            reap_candidates = [
                s.session_id
                for s in self._sessions.values()
                if len(s.connected_overlays) == 0
                and (now - s.last_active) > max_idle_seconds
            ]

        for sid in reap_candidates:
            self.delete_session(sid)

        if reap_candidates:
            logger.info("Reaped %d inactive sessions: %s", len(reap_candidates), reap_candidates)

        return reap_candidates

    def list_sessions(self) -> List[SessionInstance]:
        """List all active session instances currently in memory.

        Returns:
            List[SessionInstance]: Snapshot list of active sessions.
        """
        with self._lock:
            return list(self._sessions.values())

    def get_all_sessions(self) -> List[SessionInstance]:
        """Retrieve all active session instances currently in memory (alias for list_sessions).

        Returns:
            List[SessionInstance]: List of active sessions.
        """
        return self.list_sessions()

    async def broadcast_flush(self, session_id: str) -> None:
        """Broadcast emergency stop control message to connected overlays and dashboards.

        Args:
            session_id: Universally Unique Identifier (UUID) string of the session.
        """
        session = self.get_session(session_id)
        if not session:
            return

        message = {"type": "CONTROL_FLUSH"}
        for ws in list(session.connected_overlays):
            try:
                await ws.send_json(message)
            except Exception as exc:
                session.connected_overlays.discard(ws)
                logger.debug("Failed to send CONTROL_FLUSH to overlay ws: %s", exc)

        for ws in list(session.connected_dashboards):
            try:
                await ws.send_json(message)
            except Exception as exc:
                session.connected_dashboards.discard(ws)
                logger.debug("Failed to send CONTROL_FLUSH to dashboard ws: %s", exc)
