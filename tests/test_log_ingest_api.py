"""Unit and Integration Tests for Centralized Log Ingestion Application Programming Interface (API).

Verifies the Representational State Transfer (REST) log ingestion endpoints (POST /api/logs,
GET /api/logs), circular ring buffer eviction semantics, schema validation, and multi-parameter
filtering mechanisms for StreamVox Live.
"""

import uuid
from typing import Any, Dict, List
import pytest
from fastapi.testclient import TestClient

from src.web_server import app, log_buffer_lock, log_ring_buffer


@pytest.fixture(autouse=True)
def reset_log_buffer() -> None:
    """Ensure the centralized in-memory ring buffer is cleared before and after each test."""
    with log_buffer_lock:
        log_ring_buffer.clear()
    yield
    with log_buffer_lock:
        log_ring_buffer.clear()


@pytest.fixture
def client() -> TestClient:
    """Provide a FastAPI TestClient instance for issuing synchronous HTTP requests."""
    return TestClient(app)


def test_post_single_log_entry_success(client: TestClient) -> None:
    """Verify POST /api/logs successfully ingests a single structured log object."""
    payload: Dict[str, Any] = {
        "level": "INFO",
        "category": "TTS",
        "message": "Text-to-Speech synthesis initiated for commentator",
        "details": {"voice_id": "yuta", "char_count": 42},
        "sessionId": "session-test-uuid-001",
        "userId": "user-test-uuid-001",
    }
    response = client.post("/api/logs", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["count"] == 1
    assert data["total_buffered"] == 1

    # Verify retrieval
    get_res = client.get("/api/logs")
    assert get_res.status_code == 200
    logs_data = get_res.json()
    assert logs_data["total"] == 1
    stored = logs_data["logs"][0]
    assert stored["level"] == "INFO"
    assert stored["category"] == "TTS"
    assert stored["message"] == "Text-to-Speech synthesis initiated for commentator"
    assert stored["details"]["voice_id"] == "yuta"
    assert stored["sessionId"] == "session-test-uuid-001"
    assert stored["userId"] == "user-test-uuid-001"
    assert "id" in stored and isinstance(stored["id"], str)
    assert "timestamp" in stored and isinstance(stored["timestamp"], str)


def test_post_batch_log_entries_success(client: TestClient) -> None:
    """Verify POST /api/logs accepts a batch array of structured log entries."""
    batch_payload: List[Dict[str, Any]] = [
        {
            "id": str(uuid.uuid4()),
            "level": "WARN",
            "category": "NETWORK",
            "message": "High latency detected on WebSocket transport",
            "details": {"rtt_ms": 450},
        },
        {
            "id": str(uuid.uuid4()),
            "level": "ERROR",
            "category": "TIKTOK_WS",
            "message": "Heartbeat keepalive missed; initiating reconnection procedure",
            "details": {"attempt": 3},
        },
    ]
    response = client.post("/api/logs", json=batch_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["count"] == 2
    assert data["total_buffered"] == 2

    get_res = client.get("/api/logs")
    assert get_res.status_code == 200
    assert get_res.json()["total"] == 2


def test_post_logs_validation_failure(client: TestClient) -> None:
    """Verify POST /api/logs returns HTTP 422 Unprocessable Entity on schema invalidity."""
    # Missing required 'message' field
    invalid_payload = {
        "level": "INFO",
        "category": "TTS",
    }
    response = client.post("/api/logs", json=invalid_payload)
    assert response.status_code == 422

    # Invalid LogLevel enum value
    invalid_level_payload = {
        "level": "CRITICAL_PANIC",
        "category": "SYSTEM",
        "message": "Unexpected state exception",
    }
    response_level = client.post("/api/logs", json=invalid_level_payload)
    assert response_level.status_code == 422

    # Invalid LogCategory enum value
    invalid_category_payload = {
        "level": "DEBUG",
        "category": "UNKNOWN_SUBSYSTEM",
        "message": "Diagnostic event",
    }
    response_category = client.post("/api/logs", json=invalid_category_payload)
    assert response_category.status_code == 422


def test_get_logs_filtering_and_limits(client: TestClient) -> None:
    """Verify GET /api/logs applies level and category filters and honors pagination limits."""
    test_entries = [
        {"level": "INFO", "category": "AUTH", "message": "User session authenticated"},
        {"level": "WARN", "category": "OVERLAY", "message": "Frame rate drop detected on renderer"},
        {"level": "ERROR", "category": "AUTH", "message": "Failed token exchange verification"},
        {"level": "DEBUG", "category": "SYSTEM", "message": "Garbage collection pass finished"},
    ]
    client.post("/api/logs", json=test_entries)

    # Filter by level
    res_level = client.get("/api/logs?level=ERROR")
    assert res_level.status_code == 200
    error_logs = res_level.json()["logs"]
    assert len(error_logs) == 1
    assert error_logs[0]["level"] == "ERROR"
    assert error_logs[0]["message"] == "Failed token exchange verification"

    # Filter by category
    res_cat = client.get("/api/logs?category=AUTH")
    assert res_cat.status_code == 200
    auth_logs = res_cat.json()["logs"]
    assert len(auth_logs) == 2
    assert all(l["category"] == "AUTH" for l in auth_logs)

    # Filter by combined level and category
    res_comb = client.get("/api/logs?level=WARN&category=OVERLAY")
    assert res_comb.status_code == 200
    overlay_warns = res_comb.json()["logs"]
    assert len(overlay_warns) == 1
    assert overlay_warns[0]["category"] == "OVERLAY"

    # Limit parameter
    res_limit = client.get("/api/logs?limit=2")
    assert res_limit.status_code == 200
    limited_logs = res_limit.json()["logs"]
    assert len(limited_logs) == 2
    # Verify latest logs first ordering
    assert limited_logs[0]["message"] == "Garbage collection pass finished"
    assert limited_logs[1]["message"] == "Failed token exchange verification"


def test_ring_buffer_capacity_eviction(client: TestClient) -> None:
    """Verify circular ring buffer caps capacity at 1000 items and evicts oldest entries."""
    # Ingest 1050 items in batches of 100
    batch_size = 100
    for batch_idx in range(10):
        batch = [
            {
                "level": "INFO",
                "category": "SYSTEM",
                "message": f"Sequential heartbeat marker #{batch_idx * batch_size + i}",
            }
            for i in range(batch_size)
        ]
        res = client.post("/api/logs", json=batch)
        assert res.status_code == 200

    # Ingest remaining 50 items
    tail_batch = [
        {
            "level": "INFO",
            "category": "SYSTEM",
            "message": f"Sequential heartbeat marker #{1000 + i}",
        }
        for i in range(50)
    ]
    tail_res = client.post("/api/logs", json=tail_batch)
    assert tail_res.status_code == 200
    assert tail_res.json()["total_buffered"] == 1000

    # Inspect all logs via GET
    get_all = client.get("/api/logs?limit=1000")
    assert get_all.status_code == 200
    all_logs = get_all.json()["logs"]
    assert len(all_logs) == 1000
    assert get_all.json()["total"] == 1000

    # The latest entry must be marker #1049 (index 0 because latest first)
    assert all_logs[0]["message"] == "Sequential heartbeat marker #1049"
    # The oldest retained entry must be marker #50 (items 0 to 49 were evicted)
    assert all_logs[-1]["message"] == "Sequential heartbeat marker #50"


def test_frontend_logger_contract_and_exports() -> None:
    """Verify frontend/src/lib/logger.ts satisfies contracts and exports required functions."""
    from pathlib import Path
    repo_root = Path(__file__).resolve().parent.parent
    logger_ts = repo_root / "frontend" / "src" / "lib" / "logger.ts"
    assert logger_ts.exists(), f"Missing logger file at {logger_ts}"
    content = logger_ts.read_text(encoding="utf-8")

    # Contract function and constant checks
    assert "export function subscribeToLogs" in content
    assert "export function getLogs" in content
    assert "export const getLogHistory = getLogs" in content or "export function getLogHistory" in content
    assert "export function clearLogs" in content
    assert "export function setSessionId" in content
    assert "export function setUserId" in content
    assert "export const logger" in content
    assert "MAX_RING_BUFFER_CAPACITY = 500" in content

    # Academic terminology checks
    assert "First-In, First-Out (FIFO)" in content
    assert "Universally Unique Identifier (UUID)" in content
    assert "Event-Driven Architecture (EDA)" in content

    # Zero emojis check in frontend logger
    emojis = ["🔥", "✨", "🚀", "💡", "⚠️", "❌", "✅", "🎉"]
    for emoji in emojis:
        assert emoji not in content, f"Emoji {emoji} found in frontend/src/lib/logger.ts"

