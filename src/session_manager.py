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
    from src.queue_manager import TTSQueueManager
except ImportError:
    from src.queue_manager import TextQueueManager as TTSQueueManager  # type: ignore[attr-defined]
from src.tts_engine import TTSEngine

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

    def touch(self) -> None:
        """Update the last_active timestamp to the current Unix epoch time."""
        self.last_active = time.time()


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
    ) -> SessionInstance:
        """Create and register a new multi-tenant live stream session.

        Initializes independent TextNormalizer, TTSQueueManager, and TTSEngine instances,
        merges custom phonetics and blacklist entries, and generates unique
        dual security tokens.

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

        # Initialize dedicated TTS synthesis engine with streamer's API key and Colab settings
        tts_engine = TTSEngine(
            api_key=fish_audio_api_key,
            colab_tunnel_url=colab_tunnel_url,
            prefer_colab_tts=prefer_colab_tts,
            colab_tts_timeout_seconds=colab_tts_timeout_seconds,
        )
        if hasattr(tts_engine, "_config"):
            tts_engine._config.colab_tunnel_url = colab_tunnel_url
            tts_engine._config.prefer_colab_tts = prefer_colab_tts
            tts_engine._config.colab_tts_timeout_seconds = colab_tts_timeout_seconds

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
            proxy_url=proxy_url,
            enable_comments=enable_comments,
            enable_gifts=enable_gifts,
            user_cooldown=user_cooldown,
            max_comment_length=max_comment_length,
            created_at=now,
            last_active=now,
        )

        with self._lock:
            self._sessions[session_id] = instance

        logger.info("Created session %s for streamer %s", session_id, tiktok_username)
        return instance

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
