"""Comprehensive Unit and Integration Tests for FastAPI Lifespan and Automated Session Bootstrapping.

This test suite validates the Asynchronous Server Gateway Interface (ASGI) lifespan event orchestration:
1. Automated background session bootstrapping when TIKTOK_USERNAME is configured in AppConfig.
2. Background remote Zero-cost Graphics Processing Unit (ZeroGPU) / Google Colaboratory (Colab)
   pre-warming ping dispatch via warm_remote_engine().
3. Skipping session bootstrapping when TIKTOK_USERNAME is empty or whitespace while preserving
   endpoint pre-warming.
4. Graceful termination of all active live stream sessions during ASGI application shutdown.
5. Correct propagation of Hugging Face (HF) Bearer authentication tokens (hf_token) through
   SessionManager.create_session() and REST Application Programming Interface (API) endpoints.

Voice branding reference: พิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert) with 'yuta' backward-compatible alias.
"""

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from src.config import AppConfig
from src.session_manager import SessionInstance, SessionManager
from src.tts_engine import TTSEngine
from src.web_server import app, lifespan, session_manager


@pytest.fixture(autouse=True)
def clean_sessions():
    """Ensure clean session registry and reset application state before each test."""
    session_manager._sessions.clear()
    if hasattr(app.state, "default_session"):
        delattr(app.state, "default_session")
    yield
    session_manager._sessions.clear()
    if hasattr(app.state, "default_session"):
        delattr(app.state, "default_session")


@pytest.mark.asyncio
async def test_lifespan_autobootstrap_when_tiktok_username_configured():
    """Verify lifespan startup auto-bootstraps session and dispatches pre-warming.

    Validates that when TIKTOK_USERNAME is configured in AppConfig:
    - SessionManager creates and registers the default SessionInstance.
    - Reference is bound to app.state.default_session.
    - default_session.start() is triggered as an asynchronous task.
    - TTSEngine.warm_remote_engine() is dispatched when colab_tunnel_url is present.
    - Voice model configuration retains reference to พิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert) / 'yuta'.
    """
    app.state.config = AppConfig(
        tiktok_username="@streamer_official",
        fish_audio_api_key="sk-fish-test-key",
        colab_tunnel_url="https://zerogpu-yuta.hf.space",
        prefer_colab_tts=True,
        colab_tts_timeout_seconds=4.0,
        hf_token="hf_mock_token_abc123",
    )

    mock_warm = AsyncMock(return_value=True)
    with patch.object(TTSEngine, "warm_remote_engine", mock_warm), \
         patch.object(SessionInstance, "start", new_callable=AsyncMock) as mock_session_start:
        
        async with lifespan(app):
            # Allow event loop to process scheduled background tasks
            await asyncio.sleep(0.01)

            # Verify default session auto-bootstrapped
            assert hasattr(app.state, "default_session")
            default_session: SessionInstance = app.state.default_session
            assert default_session is not None
            assert default_session.tiktok_username == "@streamer_official"
            assert default_session.fish_audio_api_key == "sk-fish-test-key"

            # Verify Hugging Face (HF) ZeroGPU configuration forwarding
            assert default_session.tts_engine is not None
            assert default_session.tts_engine._config.hf_token == "hf_mock_token_abc123"
            assert default_session.tts_engine._config.colab_tunnel_url == "https://zerogpu-yuta.hf.space"
            assert default_session.tts_engine._config.prefer_colab_tts is True

            # Verify session was registered in SessionManager
            all_sessions = session_manager.get_all_sessions()
            assert len(all_sessions) == 1
            assert all_sessions[0] is default_session

            # Verify start task dispatched
            mock_session_start.assert_awaited()

            # Verify pre-warming ping dispatched
            mock_warm.assert_awaited()


@pytest.mark.asyncio
async def test_lifespan_skips_session_when_username_empty_but_warms_engine():
    """Verify lifespan does NOT create session if TIKTOK_USERNAME is empty, but warms endpoint.

    When TIKTOK_USERNAME contains only whitespace or is empty:
    - SessionManager must NOT create any session.
    - app.state.default_session must remain unset.
    - warm_remote_engine() must still be dispatched if colab_tunnel_url is present.
    """
    app.state.config = AppConfig(
        tiktok_username="   ",
        fish_audio_api_key="sk-key",
        colab_tunnel_url="https://standalone-zerogpu.hf.space",
        prefer_colab_tts=True,
        hf_token="hf_dummy_token",
    )

    mock_warm = AsyncMock(return_value=True)
    with patch.object(TTSEngine, "warm_remote_engine", mock_warm):
        async with lifespan(app):
            await asyncio.sleep(0.01)

            # Verify no sessions were bootstrapped
            assert not hasattr(app.state, "default_session")
            assert len(session_manager.get_all_sessions()) == 0

            # Verify pre-warming ping was still dispatched for remote endpoint
            mock_warm.assert_awaited()


@pytest.mark.asyncio
async def test_lifespan_shutdown_gracefully_stops_active_sessions():
    """Verify that on application shutdown, all active live stream sessions are gracefully stopped.

    Simulates multiple sessions:
    - Session 1: actively running -> stop() must be awaited.
    - Session 2: already stopped (is_running=False) -> stop() must NOT be called.
    """
    app.state.config = AppConfig(tiktok_username="", fish_audio_api_key="")

    session1 = session_manager.create_session(
        tiktok_username="@streamer_one",
        fish_audio_api_key="sk-key-1",
    )
    session2 = session_manager.create_session(
        tiktok_username="@streamer_two",
        fish_audio_api_key="sk-key-2",
    )

    session1._is_running = True
    session2._is_running = False

    session1.stop = AsyncMock()
    session2.stop = AsyncMock()

    async with lifespan(app):
        # Inside lifespan running context
        pass

    # Upon exiting lifespan (shutdown phase)
    session1.stop.assert_awaited_once()
    session2.stop.assert_not_awaited()


def test_session_manager_forwards_hf_token_to_tts_engine():
    """Verify SessionManager.create_session() forwards hf_token to TTSEngine and its config.

    Ensures zero-cost Hugging Face (HF) ZeroGPU authentication credentials are
    propagated seamlessly into TTSEngine and the underlying AppConfig.
    """
    manager = SessionManager()
    session = manager.create_session(
        tiktok_username="@creator_thai",
        fish_audio_api_key="sk-fish-api",
        colab_tunnel_url="https://huggingface.co/spaces/test/zerogpu",
        prefer_colab_tts=True,
        colab_tts_timeout_seconds=6.0,
        hf_token="hf_special_token_99999",
    )

    assert session.tts_engine is not None
    assert hasattr(session.tts_engine, "_config")
    assert session.tts_engine._config.hf_token == "hf_special_token_99999"
    assert session.tts_engine._config.colab_tunnel_url == "https://huggingface.co/spaces/test/zerogpu"
    assert session.tts_engine._config.prefer_colab_tts is True
    assert session.tts_engine._config.colab_tts_timeout_seconds == 6.0


def test_start_session_endpoint_forwards_hf_token():
    """Verify POST /api/session/start extracts hf_token from app.state.config.

    Tests the end-to-end REST Application Programming Interface (API) flow to ensure
    FastAPI forwards configured HF Bearer authentication tokens when clients initialize sessions.
    """
    app.state.config = AppConfig(
        tiktok_username="",
        fish_audio_api_key="sk-app-key",
        colab_tunnel_url="https://api-zerogpu.hf.space",
        prefer_colab_tts=True,
        colab_tts_timeout_seconds=5.0,
        hf_token="hf_app_level_secret_token",
    )

    client = TestClient(app)
    payload = {
        "tiktok_username": "@api_creator",
        "fish_audio_api_key": "sk-fish-client-key",
        "enable_comments": True,
        "enable_gifts": True,
        "user_cooldown": 4,
        "max_comment_length": 75,
    }

    response = client.post("/api/session/start", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "session_id" in data

    created_session = session_manager.get_session(data["session_id"])
    assert created_session is not None
    assert created_session.tts_engine is not None
    assert created_session.tts_engine._config.hf_token == "hf_app_level_secret_token"
    assert created_session.tts_engine._config.colab_tunnel_url == "https://api-zerogpu.hf.space"
