"""Unit tests for multi-user in-memory SessionManager and SessionInstance.

Tests the lifecycle, token generation, custom phonetics/blacklist propagation,
idle session reaping, and graceful teardown of live event ingestion services.
"""

import asyncio
import time
from unittest.mock import AsyncMock, MagicMock

import pytest

from src.session_manager import SessionInstance, SessionManager


def test_session_manager_lifecycle():
    """Verify session creation, retrieval, token separation, and idle session reaping."""
    manager = SessionManager()
    session = manager.create_session(
        tiktok_username="@fb.jachamch",
        fish_audio_api_key="sk-test-key",
        enable_comments=True,
        enable_gifts=True,
    )

    assert session.session_id is not None
    assert len(session.session_id) > 0
    assert session.tiktok_username == "@fb.jachamch"
    assert session.fish_audio_api_key == "sk-test-key"
    assert session.admin_token != session.overlay_token
    assert len(session.admin_token) >= 16
    assert len(session.overlay_token) >= 16
    assert session.enable_comments is True
    assert session.enable_gifts is True
    assert session.connected_overlays == set()
    assert session.connected_dashboards == set()

    # Retrieval check
    assert manager.get_session(session.session_id) is session
    assert manager.get_session("non_existent_id") is None

    # Idle session teardown check (no connected overlays and last_active expired)
    session.last_active = time.time() - 1000
    reaped = manager.reap_inactive_sessions(max_idle_seconds=600)
    assert session.session_id in reaped
    assert manager.get_session(session.session_id) is None


def test_session_instance_touch():
    """Verify SessionInstance.touch() updates last_active timestamp."""
    manager = SessionManager()
    session = manager.create_session(
        tiktok_username="@streamer",
        fish_audio_api_key="sk-key",
    )
    old_time = session.last_active - 10.0
    session.last_active = old_time

    session.touch()
    assert session.last_active > old_time
    assert abs(session.last_active - time.time()) < 2.0


def test_reap_skips_active_overlay_sessions():
    """Verify reaping does not remove sessions with connected overlay clients."""
    manager = SessionManager()
    session = manager.create_session(
        tiktok_username="@busy_streamer",
        fish_audio_api_key="sk-key",
    )
    # Simulate active connected overlay
    session.connected_overlays.add("client_ws_1")
    session.last_active = time.time() - 1000  # expired timestamp

    reaped = manager.reap_inactive_sessions(max_idle_seconds=600)
    assert session.session_id not in reaped
    assert manager.get_session(session.session_id) is session


def test_custom_phonetics_and_blacklist():
    """Verify custom phonetics and blacklist rules are injected into TextNormalizer."""
    manager = SessionManager()
    session = manager.create_session(
        tiktok_username="@custom_streamer",
        fish_audio_api_key="sk-key",
        custom_phonetics={"ตึง": "ดึงเปรี๊ยะ", "gg": "กู๊ดเกม"},
        custom_blacklist=["คำต้องห้าม", "สแปม"],
        user_cooldown=7,
        max_comment_length=60,
    )

    assert "ตึง" in session.normalizer.phonetics
    assert session.normalizer.phonetics["ตึง"] == "ดึงเปรี๊ยะ"
    assert "gg" in session.normalizer.phonetics
    assert "คำต้องห้าม" in session.normalizer.blacklist
    assert "สแปม" in session.normalizer.blacklist
    assert session.user_cooldown == 7
    assert session.max_comment_length == 60
    assert session.normalizer.max_length == 60


def test_delete_session_stops_ingestion_service():
    """Verify deleting a session cleanly invokes ingestion_service.stop()."""
    manager = SessionManager()
    session = manager.create_session(
        tiktok_username="@streamer_to_delete",
        fish_audio_api_key="sk-key",
    )

    # Attach mock ingestion service with async stop method
    mock_ingestion = MagicMock()
    mock_ingestion.stop = AsyncMock()
    session.ingestion_service = mock_ingestion

    deleted = manager.delete_session(session.session_id)
    assert deleted is True
    assert manager.get_session(session.session_id) is None
    mock_ingestion.stop.assert_called_once()


def test_delete_non_existent_session():
    """Verify deleting a non-existent session returns False gracefully."""
    manager = SessionManager()
    assert manager.delete_session("invalid-uuid") is False
