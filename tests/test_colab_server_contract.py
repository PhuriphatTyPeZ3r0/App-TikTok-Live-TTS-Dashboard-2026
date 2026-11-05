import pytest
from fastapi.testclient import TestClient

# We will import the app from colab.server once implemented
from colab.server import app


@pytest.fixture
def client():
    return TestClient(app)


def test_health_endpoint(client: TestClient):
    """GET /health must return 200 and schema with status, voice, engine, gpu_available."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["voice"] == "yuta"
    assert data["engine"] == "fish-speech-v1.5"
    assert isinstance(data["gpu_available"], bool)


def test_post_tts_success(client: TestClient):
    """POST /v1/tts with valid text returns 200 and audio/mpeg content."""
    payload = {
        "text": "สวัสดีครับ ผมชื่อยูตะ",
        "reference_id": "yuta",
        "format": "mp3",
    }
    response = client.post("/v1/tts", json=payload)
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("audio/mpeg")
    assert len(response.content) > 0


def test_post_tts_empty_text_returns_error(client: TestClient):
    """POST /v1/tts with empty or whitespace-only text returns 422 or 400."""
    # Empty string
    response = client.post("/v1/tts", json={"text": "", "reference_id": "yuta", "format": "mp3"})
    assert response.status_code in (400, 422)

    # Whitespace only
    response_ws = client.post("/v1/tts", json={"text": "   ", "reference_id": "yuta", "format": "mp3"})
    assert response_ws.status_code in (400, 422)

    # Missing text field
    response_missing = client.post("/v1/tts", json={"reference_id": "yuta"})
    assert response_missing.status_code == 422


def test_websocket_tts_stream(client: TestClient):
    """WebSocket /ws/tts/stream accepts text request, streams audio chunks, and sends completion frame."""
    with client.websocket_connect("/ws/tts/stream") as websocket:
        websocket.send_json({"text": "ข้อความสตรีมมิ่งทดสอบ", "reference_id": "yuta", "format": "mp3"})
        chunks = []
        completion = None
        while True:
            message = websocket.receive()
            if "bytes" in message:
                chunks.append(message["bytes"])
            elif "text" in message:
                import json
                completion = json.loads(message["text"])
                break

        assert len(chunks) > 0
        assert sum(len(c) for c in chunks) > 0
        assert completion is not None
        assert completion.get("status") == "completed"
        assert "latency_ms" in completion
        assert isinstance(completion["latency_ms"], (int, float))
