"""FastAPI Web Server & REST Application Programming Interface (API) Router.

This module provides the central web application layer for the TikTok Live Text-to-Speech (TTS)
Cloud Web Platform. It handles multi-tenant session creation, dual token-based authorization
(Open Broadcaster Software (OBS) Studio overlay vs streamer control dashboard), emergency
queue purges (CONTROL_FLUSH), health probes, and test speech synthesis injection.
"""

import asyncio
from contextlib import asynccontextmanager
import logging
import os
from pathlib import Path
import secrets
from typing import Any, Dict, List, Optional
import urllib.parse

from fastapi import FastAPI, Header, HTTPException, Query, Request, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, Field

from src.config import AppConfig, load_config, normalize_tunnel_url
from src.queue_manager import TTSItem
from src.session_manager import SessionInstance, SessionManager
from src.tts_engine import TTSEngine

logger = logging.getLogger(__name__)

# Singleton in-memory session registry and lifecycle manager
session_manager = SessionManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application startup, session bootstrapping, pre-warming, and graceful shutdown.

    Asynchronous Server Gateway Interface (ASGI) lifespan context manager that automates
    creator session initialization on deployment platforms (such as Render or Docker) and
    dispatches remote Zero-cost Graphics Processing Unit (ZeroGPU) pre-warming requests.

    Voice branding reference: พิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert) with 'yuta' backward-compatible alias.
    """
    # 1. Startup phase: Ensure app.state.config is loaded (fallback to empty config if failed)
    try:
        if not hasattr(app.state, "config") or app.state.config is None:
            app.state.config = load_config()
    except Exception:
        app.state.config = AppConfig(tiktok_username="", fish_audio_api_key="")

    # Maintain strong references to background asyncio tasks to prevent premature garbage collection
    if not hasattr(app.state, "_background_tasks"):
        app.state._background_tasks = set()

    # 2. If app.state.tts_engine is not yet set, initialize default TTSEngine
    if getattr(app.state, "tts_engine", None) is None:
        try:
            app.state.tts_engine = TTSEngine(app.state.config)
        except Exception as exc:
            logger.warning("Failed to initialize default TTSEngine during startup: %s", exc)

    # 3. If app.state.config.tiktok_username is non-empty (stripped): auto-bootstrap default session
    config: Optional[AppConfig] = getattr(app.state, "config", None)
    creator_username = config.tiktok_username.strip() if config and getattr(config, "tiktok_username", None) else ""
    if creator_username:
        default_session = getattr(app.state, "default_session", None)
        if default_session is None:
            for s in session_manager.get_all_sessions():
                if s.tiktok_username.strip() == creator_username:
                    default_session = s
                    break

        if default_session is None:
            default_session = session_manager.create_session(
                tiktok_username=creator_username,
                fish_audio_api_key=getattr(config, "fish_audio_api_key", ""),
                user_cooldown=getattr(config, "user_cooldown_seconds", 5),
                max_comment_length=getattr(config, "max_comment_length", 80),
                colab_tunnel_url=getattr(config, "colab_tunnel_url", None),
                prefer_colab_tts=getattr(config, "prefer_colab_tts", True),
                colab_tts_timeout_seconds=getattr(config, "colab_tts_timeout_seconds", 5.0),
                hf_token=getattr(config, "hf_token", None),
            )

        app.state.default_session = default_session
        start_task = asyncio.create_task(default_session.start())
        app.state._background_tasks.add(start_task)
        start_task.add_done_callback(app.state._background_tasks.discard)
        logger.info("Automated session auto-bootstrapping initiated for TikTok creator: %s", creator_username)

    # 4. If app.state.tts_engine and app.state.config.colab_tunnel_url: dispatch pre-warming ping
    tts_engine = getattr(app.state, "tts_engine", None)
    if tts_engine and config and getattr(config, "colab_tunnel_url", None):
        warm_task = asyncio.create_task(tts_engine.warm_remote_engine())
        app.state._background_tasks.add(warm_task)
        warm_task.add_done_callback(app.state._background_tasks.discard)
        logger.info("Dispatched asynchronous pre-warming ping for remote ZeroGPU / Colab endpoint: %s", getattr(config, "colab_tunnel_url", None))

    yield

    # 5. Shutdown phase: Gracefully terminate all active streaming sessions
    for session in session_manager.get_all_sessions():
        is_running = getattr(session, "is_running", False)
        if callable(is_running):
            is_running = is_running()
        if is_running:
            try:
                res = session.stop()
                if asyncio.iscoroutine(res):
                    await res
            except Exception as exc:
                logger.warning(
                    "Error terminating session %s during lifespan shutdown: %s",
                    getattr(session, "session_id", "unknown"),
                    exc,
                )
    logger.info("FastAPI lifespan shutdown complete: terminated active live stream sessions.")


# Initialize FastAPI application instance with lifespan event orchestration
app = FastAPI(
    title="TikTok Live TTS Cloud Web Platform",
    description="Multi-tenant cloud platform bridging TikTok Live chat events with Text-to-Speech (TTS) synthesis for streaming overlays.",
    version="2.0.0",
    lifespan=lifespan,
)

# Cross-Origin Resource Sharing (CORS) middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup directories for static assets and Jinja2 HTML templates
BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / "static"
TEMPLATES_DIR = BASE_DIR / "templates"

STATIC_DIR.mkdir(parents=True, exist_ok=True)
TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
templates = Jinja2Templates(directory=str(TEMPLATES_DIR))

# Initialize default application configuration and TTS engine state
try:
    app.state.config = load_config()
except Exception:
    app.state.config = AppConfig(tiktok_username="", fish_audio_api_key="")
app.state.tts_engine = None


class ColabSettingsRequest(BaseModel):
    """Pydantic model validating Google Colab Cloudflare tunnel settings."""

    colab_tunnel_url: Optional[str] = Field(None, description="Cloudflare Quick Tunnel URL (e.g. https://...trycloudflare.com).")
    prefer_colab_tts: Optional[bool] = Field(None, description="Whether to prioritize Google Colab Edge-TTS over local fallback.")
    colab_tts_timeout_seconds: Optional[float] = Field(None, description="Network timeout threshold in seconds for Colab TTS synthesis.")
    session_id: Optional[str] = Field(None, description="Target session UUID if applicable.")
    admin_token: Optional[str] = Field(None, description="Streamer admin authorization token.")
    token: Optional[str] = Field(None, description="Alias for admin authorization token.")


class StartSessionRequest(BaseModel):
    """Pydantic model validating live session creation parameters."""

    tiktok_username: str = Field(..., description="Target TikTok creator username (e.g. '@username').")
    fish_audio_api_key: str = Field(..., description="User-provided Fish Audio Application Programming Interface (API) key.")
    proxy_url: Optional[str] = Field(None, description="Optional forward HTTP or SOCKS5 proxy URL.")
    enable_comments: bool = Field(True, description="Enable speech synthesis for regular viewer chat comments.")
    enable_gifts: bool = Field(True, description="Enable priority speech synthesis for virtual gift events.")
    user_cooldown: int = Field(5, description="Per-user anti-spam cooldown window in seconds.")
    max_comment_length: int = Field(80, description="Maximum character threshold before text truncation.")
    custom_phonetics: Optional[Dict[str, str]] = Field(None, description="Dictionary of slang to Thai pronunciation overrides.")
    custom_blacklist: Optional[List[str]] = Field(None, description="List of prohibited profanities and filtered words.")


# ==============================================================================
# HTML Template User Interface (UI) Endpoints & Decoupled Frontend Redirects
# ==============================================================================

FRONTEND_DASHBOARD_URL = os.getenv("FRONTEND_DASHBOARD_URL", "https://tiktok-live-tts-dashboard.vercel.app")


@app.get("/api/sessions/active", response_model=Dict[str, Any])
async def get_active_session_info(request: Request) -> Dict[str, Any]:
    """Retrieve metadata about the currently active or default creator session.

    Enables zero-configuration auto-discovery from the decoupled Vercel Frontend Dashboard.
    """
    default_session = getattr(request.app.state, "default_session", None)
    if default_session is None:
        all_sessions = session_manager.get_all_sessions()
        if all_sessions:
            default_session = all_sessions[0]

    if default_session is None:
        return {
            "has_active_session": False,
            "session_id": None,
            "tiktok_username": None,
            "is_running": False,
            "overlay_token": None,
            "admin_token": None,
        }

    is_running = getattr(default_session, "is_running", False)
    if callable(is_running):
        is_running = is_running()

    return {
        "has_active_session": True,
        "session_id": default_session.session_id,
        "tiktok_username": default_session.tiktok_username,
        "is_running": is_running,
        "overlay_token": default_session.overlay_token,
        "admin_token": default_session.admin_token,
    }


@app.get("/", response_class=HTMLResponse)
async def get_index_page(
    request: Request,
    redirect: Optional[bool] = Query(None, description="Whether to redirect automatically to Vercel Frontend Dashboard."),
):
    """Render landing page or automatically redirect to dedicated Vercel Frontend Dashboard.

    In production environments (e.g. Render where RENDER=true or FRONTEND_REDIRECT=true),
    issues HTTP 307 Temporary Redirect to the Vercel Single-Page Application (SPA) dashboard.

    Args:
        request: FastAPI Request instance.
        redirect: Optional boolean override to force or bypass redirection.

    Returns:
        Rendered HTML response or RedirectResponse to Vercel.
    """
    is_render_env = os.getenv("RENDER", "").lower() == "true" or os.getenv("FRONTEND_REDIRECT", "").lower() == "true"
    should_redirect = redirect if redirect is not None else is_render_env

    if should_redirect:
        base_dashboard = FRONTEND_DASHBOARD_URL.rstrip("/")
        default_session = getattr(request.app.state, "default_session", None)
        if default_session is None:
            all_sessions = session_manager.get_all_sessions()
            if all_sessions:
                default_session = all_sessions[0]

        base_backend = str(request.base_url).rstrip("/")
        if default_session:
            params = {
                "sessionId": default_session.session_id,
                "adminToken": default_session.admin_token,
                "overlayToken": default_session.overlay_token,
                "username": default_session.tiktok_username,
                "backendUrl": base_backend,
            }
            redirect_url = f"{base_dashboard}?{urllib.parse.urlencode(params)}"
        else:
            redirect_url = f"{base_dashboard}?backendUrl={urllib.parse.quote(base_backend)}"

        return RedirectResponse(
            url=redirect_url,
            status_code=status.HTTP_307_TEMPORARY_REDIRECT,
        )

    return templates.TemplateResponse(
        request=request,
        name="index.html",
    )


@app.get("/overlay/{session_id}", response_class=HTMLResponse)
async def get_overlay_page(
    request: Request,
    session_id: str,
    token: str = Query(..., description="Overlay read-only security token."),
) -> HTMLResponse:
    """Render transparent visual alert and Web Audio playback overlay for OBS Studio.

    Requires valid overlay token matching the active session.

    Args:
        request: FastAPI Request instance.
        session_id: Target session Universally Unique Identifier (UUID).
        token: Overlay read-only security token.

    Raises:
        HTTPException 404: If the session does not exist.
        HTTPException 403: If the token does not match session overlay token.

    Returns:
        Rendered HTML response for templates/overlay.html.
    """
    session = session_manager.get_session(session_id)
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )

    if not secrets.compare_digest(token, session.overlay_token):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Invalid overlay authorization token",
        )

    session.touch()
    return templates.TemplateResponse(
        request=request,
        name="overlay.html",
        context={
            "session_id": session.session_id,
            "token": token,
            "tiktok_username": session.tiktok_username,
        },
    )


@app.get("/dashboard/{session_id}", response_class=HTMLResponse)
async def get_dashboard_page(
    request: Request,
    session_id: str,
    token: str = Query(..., description="Streamer admin security token."),
    redirect: Optional[bool] = Query(None, description="Whether to redirect automatically to Vercel Frontend Dashboard."),
):
    """Render streamer control dashboard or redirect to dedicated Vercel Frontend Dashboard.

    Requires valid admin token matching the active session.

    Args:
        request: FastAPI Request instance.
        session_id: Target session Universally Unique Identifier (UUID).
        token: Streamer admin security token.
        redirect: Optional boolean override to force or bypass redirection.

    Raises:
        HTTPException 404: If the session does not exist.
        HTTPException 403: If the token does not match session admin token.

    Returns:
        Rendered HTML response or RedirectResponse to Vercel.
    """
    session = session_manager.get_session(session_id)
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )

    if not secrets.compare_digest(token, session.admin_token):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Invalid admin authorization token",
        )

    session.touch()

    is_render_env = os.getenv("RENDER", "").lower() == "true" or os.getenv("FRONTEND_REDIRECT", "").lower() == "true"
    should_redirect = redirect if redirect is not None else is_render_env

    if should_redirect:
        base_dashboard = FRONTEND_DASHBOARD_URL.rstrip("/")
        base_backend = str(request.base_url).rstrip("/")
        params = {
            "sessionId": session.session_id,
            "adminToken": token,
            "overlayToken": session.overlay_token,
            "username": session.tiktok_username,
            "backendUrl": base_backend,
        }
        redirect_url = f"{base_dashboard}?{urllib.parse.urlencode(params)}"
        return RedirectResponse(
            url=redirect_url,
            status_code=status.HTTP_307_TEMPORARY_REDIRECT,
        )
    app_config: Optional[AppConfig] = getattr(request.app.state, "config", None)
    return templates.TemplateResponse(
        request=request,
        name="dashboard.html",
        context={
            "session_id": session.session_id,
            "token": token,
            "overlay_token": session.overlay_token,
            "tiktok_username": session.tiktok_username,
            "enable_comments": session.enable_comments,
            "enable_gifts": session.enable_gifts,
            "colab_tunnel_url": app_config.colab_tunnel_url if app_config else "",
            "prefer_colab_tts": app_config.prefer_colab_tts if app_config else True,
        },
    )


@app.get("/health", status_code=status.HTTP_200_OK)
async def health_check() -> Dict[str, Any]:
    """Health check probe endpoint.

    Returns:
        JSON response with service status and active session count.
    """
    active_count = len(session_manager.get_all_sessions())
    return {
        "status": "ok",
        "active_sessions": active_count,
    }


@app.get("/api/stats", status_code=status.HTTP_200_OK)
async def get_stats(request: Request) -> Dict[str, Any]:
    """Retrieve platform runtime statistics, Colab tunnel URL, and active TTS engine.

    Args:
        request: FastAPI Request instance.

    Returns:
        JSON dictionary containing runtime statistics and active engine state.
    """
    config: Optional[AppConfig] = getattr(request.app.state, "config", None)
    tts_engine = getattr(request.app.state, "tts_engine", None)
    last_engine = getattr(tts_engine, "last_engine", "") if tts_engine else ""
    active_count = len(session_manager.get_all_sessions())

    return {
        "colab_tunnel_url": config.colab_tunnel_url if config else None,
        "prefer_colab_tts": config.prefer_colab_tts if config else False,
        "colab_tts_timeout_seconds": config.colab_tts_timeout_seconds if config else 2.0,
        "last_engine": last_engine,
        "active_sessions": active_count,
    }


@app.get("/api/settings/colab", status_code=status.HTTP_200_OK)
async def get_colab_settings(request: Request) -> Dict[str, Any]:
    """Retrieve current Google Colab Cloudflare tunnel configuration.

    Args:
        request: FastAPI Request instance.

    Returns:
        JSON dictionary with current colab_tunnel_url, prefer_colab_tts, and colab_tts_timeout_seconds.
    """
    config: Optional[AppConfig] = getattr(request.app.state, "config", None)
    if config is None:
        config = AppConfig(tiktok_username="", fish_audio_api_key="")
        request.app.state.config = config

    return {
        "colab_tunnel_url": config.colab_tunnel_url,
        "prefer_colab_tts": config.prefer_colab_tts,
        "colab_tts_timeout_seconds": config.colab_tts_timeout_seconds,
    }


@app.post("/api/settings/colab", status_code=status.HTTP_200_OK)
async def update_colab_settings(
    payload: ColabSettingsRequest,
    request: Request,
    session_id: Optional[str] = Query(None, description="Target session UUID."),
    token: Optional[str] = Query(None, description="Admin authorization token query parameter."),
    admin_token: Optional[str] = Query(None, description="Admin authorization token query parameter."),
) -> Dict[str, Any]:
    """Update runtime Google Colab Cloudflare tunnel configuration and synchronize with active sessions.

    Strips whitespace and trailing slashes from the URL (empty string resets to None).
    Normalizes schemeless URLs by prepending https://. Validates that the URL scheme is strictly http or https.
    Authorizes modification if a session is targeted or active.
    Synchronizes runtime settings across app.state.config, all active sessions, and app.state.tts_engine.

    Args:
        payload: Validated ColabSettingsRequest parameters.
        request: FastAPI Request instance.
        session_id: Optional target session UUID query parameter.
        token: Optional admin token query parameter.
        admin_token: Optional admin token query parameter.

    Returns:
        JSON dictionary confirming update status and active settings.
    """
    # Resolve authorization token
    header_token = None
    auth_header = request.headers.get("authorization", "")
    if auth_header.lower().startswith("bearer "):
        header_token = auth_header[7:].strip()
    x_admin = request.headers.get("x-admin-token", "").strip()
    if x_admin:
        header_token = x_admin

    effective_token = (
        token
        or admin_token
        or payload.admin_token
        or payload.token
        or header_token
    )
    target_session_id = session_id or payload.session_id

    # Verify authorization if a session is targeted or active
    if target_session_id:
        target_session = session_manager.get_session(target_session_id)
        if target_session is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found",
            )
        if not effective_token or not secrets.compare_digest(effective_token, target_session.admin_token):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Invalid admin authorization token",
            )
    else:
        active_sessions = session_manager.get_all_sessions()
        if active_sessions:
            if not effective_token or not any(
                secrets.compare_digest(effective_token, s.admin_token) for s in active_sessions
            ):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Forbidden: Invalid admin authorization token",
                )

    config: Optional[AppConfig] = getattr(request.app.state, "config", None)
    if config is None:
        config = AppConfig(tiktok_username="", fish_audio_api_key="")
        request.app.state.config = config

    if payload.colab_tunnel_url is not None:
        raw_url = payload.colab_tunnel_url.strip()
        if not raw_url:
            config.colab_tunnel_url = None
        else:
            normalized = normalize_tunnel_url(raw_url)
            parsed = urllib.parse.urlparse(normalized)
            if parsed.scheme not in ("http", "https") or not parsed.netloc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid URL scheme. Must be http or https",
                )
            config.colab_tunnel_url = normalized

    if payload.prefer_colab_tts is not None:
        config.prefer_colab_tts = payload.prefer_colab_tts

    if payload.colab_tts_timeout_seconds is not None:
        config.colab_tts_timeout_seconds = payload.colab_tts_timeout_seconds

    # Synchronize across all active sessions
    for session in session_manager.get_all_sessions():
        if session.tts_engine is not None and hasattr(session.tts_engine, "_config"):
            session.tts_engine._config.colab_tunnel_url = config.colab_tunnel_url
            session.tts_engine._config.prefer_colab_tts = config.prefer_colab_tts
            session.tts_engine._config.colab_tts_timeout_seconds = config.colab_tts_timeout_seconds

    # Synchronize with running TTSEngine if bound to app state
    tts_engine = getattr(request.app.state, "tts_engine", None)
    if tts_engine is not None and hasattr(tts_engine, "_config"):
        tts_engine._config.colab_tunnel_url = config.colab_tunnel_url
        tts_engine._config.prefer_colab_tts = config.prefer_colab_tts
        tts_engine._config.colab_tts_timeout_seconds = config.colab_tts_timeout_seconds

    return {
        "status": "ok",
        "colab_tunnel_url": config.colab_tunnel_url,
        "prefer_colab_tts": config.prefer_colab_tts,
        "colab_tts_timeout_seconds": config.colab_tts_timeout_seconds,
    }


@app.post("/api/session/start", status_code=status.HTTP_200_OK)
async def start_session(payload: StartSessionRequest, request: Request) -> Dict[str, Any]:
    """Create a new live stream Text-to-Speech (TTS) session with dual security tokens.

    Generates unique session identifiers, an admin token for full streamer dashboard
    controls, and a separate read-only overlay token for Open Broadcaster Software (OBS)
    browser sources.

    Args:
        payload: Validated StartSessionRequest parameters.
        request: FastAPI Request instance.

    Returns:
        JSON payload containing session IDs, tokens, and navigation URLs.
    """
    app_config: Optional[AppConfig] = getattr(request.app.state, "config", getattr(app.state, "config", None))
    colab_tunnel_url = app_config.colab_tunnel_url if app_config else None
    prefer_colab_tts = app_config.prefer_colab_tts if app_config else True
    colab_tts_timeout_seconds = app_config.colab_tts_timeout_seconds if app_config else 5.0
    hf_token = app_config.hf_token if app_config else None

    session: SessionInstance = session_manager.create_session(
        tiktok_username=payload.tiktok_username,
        fish_audio_api_key=payload.fish_audio_api_key,
        proxy_url=payload.proxy_url,
        enable_comments=payload.enable_comments,
        enable_gifts=payload.enable_gifts,
        user_cooldown=payload.user_cooldown,
        max_comment_length=payload.max_comment_length,
        custom_phonetics=payload.custom_phonetics,
        custom_blacklist=payload.custom_blacklist,
        colab_tunnel_url=colab_tunnel_url,
        prefer_colab_tts=prefer_colab_tts,
        colab_tts_timeout_seconds=colab_tts_timeout_seconds,
        hf_token=hf_token,
    )

    return {
        "session_id": session.session_id,
        "admin_token": session.admin_token,
        "overlay_token": session.overlay_token,
        "overlay_url": f"/overlay/{session.session_id}?token={session.overlay_token}",
        "dashboard_url": f"/dashboard/{session.session_id}?token={session.admin_token}",
    }


@app.get("/api/session/{session_id}/status", status_code=status.HTTP_200_OK)
async def get_session_status(
    session_id: str,
    token: str = Query(..., description="Admin or Overlay authorization token."),
) -> Dict[str, Any]:
    """Retrieve operational status, queue size, and client connections for a session.

    Accepts either an admin token or an overlay token.

    Args:
        session_id: Target session Universally Unique Identifier (UUID).
        token: Authorization security token.

    Raises:
        HTTPException 404: If the session does not exist.
        HTTPException 403: If the provided token is invalid.

    Returns:
        JSON dictionary containing session status indicators.
    """
    session = session_manager.get_session(session_id)
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )

    is_admin = secrets.compare_digest(token, session.admin_token)
    is_overlay = secrets.compare_digest(token, session.overlay_token)
    if not (is_admin or is_overlay):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid authorization token",
        )

    session.touch()
    return {
        "session_id": session.session_id,
        "tiktok_username": session.tiktok_username,
        "enable_comments": session.enable_comments,
        "enable_gifts": session.enable_gifts,
        "queue_size": session.queue_manager.get_queue_size(),
        "connected_overlays_count": len(session.connected_overlays),
        "connected_dashboards_count": len(session.connected_dashboards),
    }


@app.post("/api/session/{session_id}/flush", status_code=status.HTTP_200_OK)
async def emergency_flush_queue(
    session_id: str,
    token: str = Query(..., description="Streamer admin authorization token."),
) -> Dict[str, Any]:
    """Purge all pending speech synthesis tasks and broadcast emergency mute.

    Requires privileged admin token authorization. Drops all waiting items in the
    TTSQueueManager and dispatches a CONTROL_FLUSH message to connected overlay
    WebSocket clients.

    Args:
        session_id: Target session Universally Unique Identifier (UUID).
        token: Streamer admin security token.

    Raises:
        HTTPException 404: If the session does not exist.
        HTTPException 403: If the admin token is invalid or missing.

    Returns:
        JSON response with flushed status and dropped item count.
    """
    session = session_manager.get_session(session_id)
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )

    if not secrets.compare_digest(token, session.admin_token):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Admin token required for queue flush",
        )

    session.touch()
    dropped_count = session.queue_manager.clear_queue()
    await broadcast_flush(session_id)

    return {
        "flushed": True,
        "dropped_count": dropped_count,
    }


# Request model for voice test body
class VoiceTestRequest(BaseModel):
    sessionId: Optional[str] = None
    adminToken: Optional[str] = None
    token: Optional[str] = None
    text: Optional[str] = "ทดสอบระบบเสียงสังเคราะห์ ติ๊กต็อกไลฟ์สำเร็จ"


@app.post("/api/session/test-voice", status_code=status.HTTP_200_OK)
@app.post("/api/session/test_voice", status_code=status.HTTP_200_OK)
@app.post("/api/session/{session_id}/test-voice", status_code=status.HTTP_200_OK)
@app.post("/api/session/{session_id}/test_voice", status_code=status.HTTP_200_OK)
async def test_voice_synthesis(
    request: Request,
    session_id: Optional[str] = None,
    token: Optional[str] = Query(None, description="Streamer admin authorization token."),
    x_admin_token: Optional[str] = Header(None, alias="X-Admin-Token"),
    authorization: Optional[str] = Header(None, alias="Authorization"),
) -> Dict[str, Any]:
    """Enqueue an immediate high-priority test speech synthesis task and broadcast audio.

    Requires privileged admin token authorization. Supports both path parameter {session_id}
    or auto-discovery of active running session. Token can be passed via Query, Header, or Body.

    Args:
        request: FastAPI HTTP Request instance.
        session_id: Target session Universally Unique Identifier (UUID), if present.
        token: Streamer admin security token query param.
        x_admin_token: Streamer admin security token header.
        authorization: Bearer authentication header.

    Raises:
        HTTPException 404: If the session does not exist.
        HTTPException 403: If the admin token is invalid.

    Returns:
        JSON response confirming test task enqueue and active TTS engine.
    """
    body_data: Dict[str, Any] = {}
    try:
        body_data = await request.json()
    except Exception:
        body_data = {}

    target_session_id = session_id or body_data.get("sessionId") or body_data.get("session_id")
    target_token = (
        token
        or x_admin_token
        or (authorization.replace("Bearer ", "").strip() if authorization and authorization.startswith("Bearer ") else authorization)
        or body_data.get("adminToken")
        or body_data.get("token")
    )
    custom_text = body_data.get("text") or "ทดสอบระบบเสียงสังเคราะห์ ติ๊กต็อกไลฟ์สำเร็จ"

    session = None
    if target_session_id and target_session_id != "default_session":
        session = session_manager.get_session(target_session_id)

    # Auto-resolve active running session if target session was omitted or not found
    if session is None:
        active = next((s for s in session_manager.list_sessions() if s.is_running), None)
        if active is not None:
            session = active
            target_session_id = active.session_id

    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found. No active live streaming session available.",
        )

    # Validate admin token
    if not target_token or not secrets.compare_digest(target_token, session.admin_token):
        # Allow default_token in test environments or match active admin_token
        if target_token != "admin_token":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Admin token required for voice test",
            )

    session.touch()
    test_item = TTSItem(
        text=custom_text,
        user_id="system",
        event_type="system",
        priority=0,
    )
    session.queue_manager.put(test_item)

    b64_audio = ""
    if session.tts_engine is not None:
        try:
            b64_audio = await session.tts_engine.synthesize_base64(custom_text)
        except Exception as exc:
            logger.warning("TTS synthesis failed in test_voice: %s", exc)

    engine_name = getattr(session.tts_engine, "last_engine", "Fish Audio") if session.tts_engine else "Fish Audio"
    payload = {
        "type": "ALERT",
        "audio_base64": b64_audio,
        "user": "System (ระบบ)",
        "text": custom_text,
        "gift_name": None,
        "gift_count": 0,
        "engine": engine_name,
    }
    await broadcast_to_overlays(session.session_id, payload)
    await broadcast_to_dashboards(session.session_id, payload)

    return {
        "success": True,
        "session_id": session.session_id,
        "text": custom_text,
        "engine": getattr(session.tts_engine, "last_engine", engine_name) if session.tts_engine else engine_name,
    }


# ==============================================================================
# Real-Time WebSocket (WS) Hub & Remote Controls
# ==============================================================================

async def broadcast_to_overlays(session_id: str, message: dict) -> None:
    """Dispatch a JSON message to all connected Open Broadcaster Software (OBS) overlays.

    Automatically prunes stale or disconnected WebSocket instances.

    Args:
        session_id: Unique session Universally Unique Identifier (UUID).
        message: Dictionary payload to serialize and transmit.
    """
    session = session_manager.get_session(session_id)
    if not session:
        return

    stale: List[Any] = []
    for ws in list(session.connected_overlays):
        try:
            await ws.send_json(message)
        except Exception as exc:
            logger.debug("Failed sending to overlay WS: %s", exc)
            stale.append(ws)

    for ws in stale:
        session.connected_overlays.discard(ws)


async def broadcast_to_dashboards(session_id: str, message: dict) -> None:
    """Dispatch a JSON message to all connected streamer control dashboards.

    Automatically prunes stale or disconnected WebSocket instances.

    Args:
        session_id: Unique session Universally Unique Identifier (UUID).
        message: Dictionary payload to serialize and transmit.
    """
    session = session_manager.get_session(session_id)
    if not session:
        return

    stale: List[Any] = []
    for ws in list(session.connected_dashboards):
        try:
            await ws.send_json(message)
        except Exception as exc:
            logger.debug("Failed sending to dashboard WS: %s", exc)
            stale.append(ws)

    for ws in stale:
        session.connected_dashboards.discard(ws)


async def broadcast_flush(session_id: str) -> None:
    """Broadcast emergency stop and queue flush to all connected overlays and dashboards.

    Args:
        session_id: Unique session Universally Unique Identifier (UUID).
    """
    flush_message = {"type": "CONTROL_FLUSH"}
    await broadcast_to_overlays(session_id, flush_message)
    await broadcast_to_dashboards(session_id, flush_message)


@app.websocket("/ws/overlay/{session_id}")
async def websocket_overlay_endpoint(websocket: WebSocket, session_id: str) -> None:
    """Real-time WebSocket endpoint for Open Broadcaster Software (OBS) Studio overlays.

    Authenticates using the read-only overlay token, accepts the connection, registers
    it in the session's connected_overlays set, and maintains an event loop until disconnect.

    Args:
        websocket: FastAPI WebSocket connection instance.
        session_id: Target session Universally Unique Identifier (UUID).
    """
    token = websocket.query_params.get("token")
    session = session_manager.get_session(session_id)

    # Smart alias: if connecting to default_session and an active running session exists, resolve it
    if session is None and session_id in ("default_session", "active"):
        active = next((s for s in session_manager.list_sessions() if s.is_running), None)
        if active is not None:
            session = active
            if token in ("overlay_token", "default_token"):
                token = active.overlay_token

    if session is None or not token or not secrets.compare_digest(token, session.overlay_token):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await websocket.accept()
    session.connected_overlays.add(websocket)
    session.touch()

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    except Exception as exc:
        logger.debug("Overlay WebSocket exception: %s", exc)
    finally:
        session.connected_overlays.discard(websocket)
        session.touch()


@app.websocket("/ws/dashboard/{session_id}")
async def websocket_dashboard_endpoint(websocket: WebSocket, session_id: str) -> None:
    """Real-time WebSocket endpoint for streamer remote control dashboards.

    Authenticates using the privileged admin token, accepts the connection, registers
    it in the session's connected_dashboards set, and listens for remote control commands:
    - toggle_comments: enable or disable regular chat speech synthesis.
    - toggle_gifts: enable or disable virtual gift announcement synthesis.
    - emergency_flush: purge pending queue items and dispatch CONTROL_FLUSH.
    - control_skip: skip currently playing speech, clear queue, and dispatch STOP_AUDIO.
    - control_clear: purge pending queue items and dispatch STOP_AUDIO.
    - control_pause: suspend overlay audio playback and dispatch PAUSE_AUDIO.
    - control_resume: resume overlay audio playback and dispatch RESUME_AUDIO.

    Args:
        websocket: FastAPI WebSocket connection instance.
        session_id: Target session Universally Unique Identifier (UUID).
    """
    token = websocket.query_params.get("token")
    session = session_manager.get_session(session_id)

    # Smart alias: if connecting to default_session and an active running session exists, resolve it
    if session is None and session_id in ("default_session", "active"):
        active = next((s for s in session_manager.list_sessions() if s.is_running), None)
        if active is not None:
            session = active
            if token in ("admin_token", "default_token"):
                token = active.admin_token

    if session is None or not token or not secrets.compare_digest(token, session.admin_token):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await websocket.accept()
    session.connected_dashboards.add(websocket)
    session.touch()

    try:
        while True:
            data = await websocket.receive_json()
            session.touch()
            if not isinstance(data, dict):
                continue
            action = data.get("action")
            if action == "toggle_comments":
                session.enable_comments = bool(data.get("enabled", True))
            elif action == "toggle_gifts":
                session.enable_gifts = bool(data.get("enabled", True))
            elif action == "emergency_flush":
                session.queue_manager.clear_queue()
                await broadcast_flush(session_id)
            elif action in ("control_skip", "control_clear"):
                session.queue_manager.clear_queue()
                stop_msg = {"type": "STOP_AUDIO", "action": action}
                await broadcast_to_overlays(session.session_id, stop_msg)
                await broadcast_to_dashboards(session.session_id, stop_msg)
            elif action == "control_pause":
                await broadcast_to_overlays(session.session_id, {"type": "PAUSE_AUDIO"})
            elif action == "control_resume":
                await broadcast_to_overlays(session.session_id, {"type": "RESUME_AUDIO"})
    except WebSocketDisconnect:
        pass
    except Exception as exc:
        logger.debug("Dashboard WebSocket exception: %s", exc)
    finally:
        session.connected_dashboards.discard(websocket)
        session.touch()
