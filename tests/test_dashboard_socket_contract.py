"""Contract tests for Next.js 15 Real-Time WebSocket Hook & State Management.

This test module verifies the integration contract between the frontend React hook
(`frontend/src/hooks/useDashboardSocket.ts`), TypeScript definitions (`frontend/src/types/dashboard.ts`),
and the FastAPI Asynchronous Server Gateway Interface (ASGI) backend server (`src/web_server.py`).

Voice actor attribution: พิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)
Contract:
- WebSockets (WS) protocol over /ws/dashboard/{session_id}?token={admin_token}
- JavaScript Object Notation (JSON) payloads for event delivery and control actions
- First-In, First-Out (FIFO) queue processing
"""

from pathlib import Path
import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
FRONTEND_DIR = REPO_ROOT / "frontend"
TYPES_FILE = FRONTEND_DIR / "src" / "types" / "dashboard.ts"
HOOK_FILE = FRONTEND_DIR / "src" / "hooks" / "useDashboardSocket.ts"
BACKEND_SERVER = REPO_ROOT / "src" / "web_server.py"


def test_dashboard_types_contract():
    """Verify frontend/src/types/dashboard.ts defines all required interfaces and types."""
    assert TYPES_FILE.exists(), f"Missing types file at {TYPES_FILE}"
    content = TYPES_FILE.read_text(encoding="utf-8")

    # Required interface definitions
    assert "export interface QueueItem" in content, "QueueItem interface must be exported"
    assert "export interface SpeakingItem" in content, "SpeakingItem interface must be exported"
    assert "export interface DashboardStats" in content, "DashboardStats interface must be exported"
    assert "export interface ColabSettings" in content, "ColabSettings interface must be exported"
    assert "export type DashboardEventType" in content or "export type DashboardEvent" in content or "export interface DashboardEvent" in content, "DashboardEvent must be exported"

    # QueueItem fields
    assert "id: string" in content or "id:" in content
    assert "user: string" in content or "user:" in content
    assert "text: string" in content or "text:" in content
    assert "is_gift: boolean" in content or "is_gift:" in content
    assert "gift_name?:" in content
    assert "diamonds?:" in content
    assert "timestamp: number" in content or "timestamp:" in content
    assert "priority: boolean" in content or "priority:" in content

    # SpeakingItem fields
    assert "id: string" in content or "id:" in content
    assert "user: string" in content or "user:" in content
    assert "text: string" in content or "text:" in content
    assert "engine: string" in content or "engine:" in content

    # DashboardStats fields
    assert "total_synthesized: number" in content or "total_synthesized:" in content
    assert "current_queue_size: number" in content or "current_queue_size:" in content
    assert "active_engine: string" in content or "active_engine:" in content
    assert "connected_clients: number" in content or "connected_clients:" in content
    assert "colab_tunnel_url?:" in content
    assert "prefer_colab_tts?:" in content

    # ColabSettings fields
    assert "colab_tunnel_url:" in content
    assert "prefer_colab_tts:" in content
    assert "colab_tts_timeout_seconds:" in content

    # DashboardEvent event types
    for event_type in ["STATUS_UPDATE", "EVENT_MESSAGE", "EVENT_GIFT", "CONTROL_FLUSH", "PONG"]:
        assert event_type in content, f"DashboardEvent must support event type: {event_type}"

    # Hook Options and Return contract types
    assert "export interface UseDashboardSocketOptions" in content
    assert "sessionId: string" in content
    assert "adminToken: string" in content
    assert "backendUrl?:" in content
    assert "wsUrl?:" in content
    assert "enabled?:" in content

    assert "export interface UseDashboardSocketReturn" in content
    assert "isConnected: boolean" in content
    assert "isReconnecting: boolean" in content
    assert "reconnectAttempts: number" in content
    assert "queue: QueueItem[]" in content
    assert "speakingItem: SpeakingItem | null" in content
    assert "stats: DashboardStats" in content
    assert "colabSettings: ColabSettings" in content
    assert "error: string | null" in content
    assert "sendControlFlush: () => void" in content
    assert "testVoice:" in content
    assert "updateColabSettings:" in content
    assert "skipItem:" in content
    assert "connect: () => void" in content
    assert "disconnect: () => void" in content


def test_dashboard_socket_hook_contract():
    """Verify frontend/src/hooks/useDashboardSocket.ts implementation details."""
    assert HOOK_FILE.exists(), f"Missing hook file at {HOOK_FILE}"
    content = HOOK_FILE.read_text(encoding="utf-8")

    # Exported hook signature
    assert "export function useDashboardSocket" in content or "export const useDashboardSocket" in content
    assert "export function resolveWebSocketUrl" in content or "resolveWebSocketUrl" in content

    # Scheme translation http(s) to ws(s)
    assert "ws:" in content or "wss:" in content
    assert ("http:" in content or "https:" in content or "replace(/^http/, 'ws')" in content or "location.protocol" in content), "Must handle HTTP(S) to WS(S) URL scheme translation"

    # WebSocket endpoint target path
    assert "/ws/dashboard/" in content, "Must connect to /ws/dashboard/{session_id}"
    assert "token=" in content, "Must pass authorization token parameter"

    # Exponential backoff formula: Math.min(1000 * Math.pow(2, attempt), 16000) or equivalent
    assert "1000" in content, "Base backoff initial delay must be 1000ms"
    assert "16000" in content, "Maximum backoff cap must be 16000ms"
    assert ("Math.pow(2" in content or "2 **" in content), "Must use exponential power of 2 backoff"

    # Message handlers for required event types
    for event_type in ["CONTROL_FLUSH", "STATUS_UPDATE", "EVENT_MESSAGE", "EVENT_GIFT", "PONG"]:
        assert event_type in content, f"Hook must handle event type: {event_type}"

    # Required actions
    assert "sendControlFlush" in content, "Hook must expose sendControlFlush"
    assert "testVoice" in content, "Hook must expose testVoice"
    assert "updateColabSettings" in content, "Hook must expose updateColabSettings"
    assert "skipItem" in content, "Hook must expose skipItem"
    assert "connect" in content, "Hook must expose connect"
    assert "disconnect" in content, "Hook must expose disconnect"

    # State elements
    assert "isConnected" in content
    assert "isReconnecting" in content
    assert "reconnectAttempts" in content
    assert "queue" in content
    assert "speakingItem" in content
    assert "stats" in content
    assert "colabSettings" in content
    assert "error" in content


def test_socket_hook_academic_rigor_and_attribution():
    """Verify academic terminology with full names and acronyms plus voice attribution."""
    assert HOOK_FILE.exists(), f"Missing hook file at {HOOK_FILE}"
    content = HOOK_FILE.read_text(encoding="utf-8")

    # Full technical terms with acronyms
    assert "Asynchronous Server Gateway Interface (ASGI)" in content
    assert "WebSockets (WS)" in content or "WebSocket (WS)" in content
    assert "JavaScript Object Notation (JSON)" in content
    assert "First-In, First-Out (FIFO)" in content

    # Voice actor attribution
    assert "พิพัฒน์ บุญสิทธิเลิศ" in content
    assert "Phiphat Boonsitthilert" in content


def test_backend_websocket_protocol_compatibility():
    """Verify compatibility with backend FastAPI WebSocket implementation in src/web_server.py."""
    assert BACKEND_SERVER.exists(), f"Missing backend server at {BACKEND_SERVER}"
    backend_content = BACKEND_SERVER.read_text(encoding="utf-8")

    # Backend dashboard WebSocket route
    assert "@app.websocket(\"/ws/dashboard/{session_id}\")" in backend_content
    # Backend validates token parameter
    assert "token = websocket.query_params.get(\"token\")" in backend_content
    # Backend broadcasts CONTROL_FLUSH
    assert '"type": "CONTROL_FLUSH"' in backend_content
    # Backend handles emergency_flush
    assert "emergency_flush" in backend_content
