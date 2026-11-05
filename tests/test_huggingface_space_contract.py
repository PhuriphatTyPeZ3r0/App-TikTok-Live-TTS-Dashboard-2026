"""Contract and integration tests for Hugging Face Spaces ZeroGPU Model Package.

Validates the Asynchronous Server Gateway Interface (ASGI) FastAPI and Gradio
application contracts for the Fish Speech v1.5 Dual Autoregressive (Dual-AR)
neural voice engine featuring พิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert).
"""

import importlib.util
import json
from pathlib import Path
import sys
import unittest.mock as mock
import pytest
from fastapi.testclient import TestClient

# Resolve path to huggingface-space/app.py
REPO_ROOT = Path(__file__).resolve().parent.parent
HF_SPACE_DIR = REPO_ROOT / "huggingface-space"
APP_FILE = HF_SPACE_DIR / "app.py"


def load_hf_app():
    """Dynamically load app module from huggingface-space/app.py."""
    if not APP_FILE.exists():
        raise FileNotFoundError(f"Missing required file: {APP_FILE}")

    spec = importlib.util.spec_from_file_location("hf_space_app", str(APP_FILE))
    if spec is None or spec.loader is None:
        raise ImportError(f"Cannot load module spec from {APP_FILE}")
    module = importlib.util.module_from_spec(spec)
    sys.modules["hf_space_app"] = module
    spec.loader.exec_module(module)
    return module


@pytest.fixture(scope="module")
def hf_module():
    """Load the huggingface-space app module."""
    return load_hf_app()


@pytest.fixture
def client(hf_module):
    """Provide FastAPI test client."""
    return TestClient(hf_module.app)


def test_health_endpoint(client: TestClient):
    """GET /health must return 200 with status ready, voice phiphat, and alias yuta."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"
    assert data["voice"] == "phiphat"
    assert data["alias"] == "yuta"
    assert data["engine"] == "fish-speech-v1.5"
    assert isinstance(data["gpu_available"], bool)
    assert isinstance(data["zero_gpu"], bool)


def test_post_tts_phiphat_success(client: TestClient):
    """POST /v1/tts with reference_id 'phiphat' returns 200 with audio/mpeg."""
    payload = {
        "text": "สวัสดีครับ ผมชื่อพิพัฒน์ บุญสิทธิเลิศ",
        "reference_id": "phiphat",
        "format": "mp3",
    }
    response = client.post("/v1/tts", json=payload)
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("audio/mpeg")
    assert len(response.content) > 0
    assert response.headers.get("X-TTS-Voice") == "phiphat"
    assert response.headers.get("X-TTS-Engine") == "fish-speech-v1.5"


def test_post_tts_yuta_alias_success(client: TestClient):
    """POST /v1/tts with backward-compatible alias 'yuta' returns 200."""
    payload = {
        "text": "สวัสดีครับ ผมอยากช่วยทุกคนครับ",
        "reference_id": "yuta",
        "format": "mp3",
    }
    response = client.post("/v1/tts", json=payload)
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("audio/mpeg")
    assert len(response.content) > 0


def test_post_tts_empty_or_invalid_text(client: TestClient):
    """POST /v1/tts rejects empty or whitespace-only inputs with 400 or 422."""
    res_empty = client.post("/v1/tts", json={"text": "", "reference_id": "phiphat"})
    assert res_empty.status_code in (400, 422)

    res_whitespace = client.post("/v1/tts", json={"text": "   \n\t  ", "reference_id": "phiphat"})
    assert res_whitespace.status_code in (400, 422)

    res_missing = client.post("/v1/tts", json={"reference_id": "phiphat"})
    assert res_missing.status_code == 422


def test_websocket_tts_streaming(client: TestClient):
    """WebSocket /ws/tts and /ws/tts/stream stream audio frames and complete gracefully."""
    for path in ["/ws/tts", "/ws/tts/stream"]:
        with client.websocket_connect(path) as websocket:
            websocket.send_json({
                "text": "ทดสอบการสตรีมเสียงผ่านโปรโตคอลเว็บซ็อกเก็ต",
                "reference_id": "phiphat",
                "format": "mp3",
            })
            chunks = []
            completion = None
            while True:
                message = websocket.receive()
                if "bytes" in message:
                    chunks.append(message["bytes"])
                elif "text" in message:
                    completion = json.loads(message["text"])
                    break

            assert len(chunks) > 0
            assert sum(len(c) for c in chunks) > 0
            assert completion is not None
            assert completion.get("status") == "completed"
            assert "latency_ms" in completion


def test_zero_gpu_spaces_decorator_compatibility(hf_module):
    """Verify spaces.GPU decorator integration supporting both parameterized and non-parameterized syntax."""
    engine = hf_module.engine
    # Synthesize should execute smoothly regardless of whether spaces is active or fallback
    audio = engine.synthesize("ทดสอบ ZeroGPU Decorator", reference_id="phiphat")
    assert isinstance(audio, bytes)
    assert len(audio) > 0

    # 1. Parameterized syntax @spaces_gpu(duration=30)
    @hf_module.spaces_gpu(duration=30)
    def dummy_param_inference(val: int) -> int:
        return val * 2

    assert dummy_param_inference(21) == 42

    # 2. Non-parameterized syntax @spaces_gpu
    @hf_module.spaces_gpu
    def dummy_non_param_inference(val: int) -> int:
        return val + 10

    assert dummy_non_param_inference(5) == 15


def test_zerogpu_device_resolution_and_lazy_prompt(hf_module, monkeypatch):
    """Verify that ZeroGPU enables gpu_available flag and triggers lazy prompt encoding."""
    # Test device resolution when has_spaces is True
    monkeypatch.setattr(hf_module, "has_spaces", True)
    test_engine = hf_module.FishSpeechEngine(checkpoint_dir=Path("non_existent_checkpoints"))
    assert test_engine.gpu_available is True

    # Test lazy prompt encoding in _synthesize_zerogpu
    prepared_calls = []
    test_engine.llama_model = "mock_llama"
    test_engine.decoder_model = "mock_decoder"
    test_engine.prompt_tokens = None
    test_engine.generate_long_fn = lambda **kw: iter([])
    monkeypatch.setattr(test_engine, "_prepare_prompt", lambda dev: prepared_calls.append(dev))

    # Calling _synthesize_zerogpu when prompt_tokens is None should invoke _prepare_prompt
    try:
        test_engine._synthesize_zerogpu("ข้อความทดสอบ lazy prompt")
    except Exception:
        pass

    assert len(prepared_calls) == 1
    assert prepared_calls[0] in ("cuda", "cpu")


def test_gradio_demo_contract(hf_module):
    """Ensure Gradio demo UI blocks are defined or interface is mounted properly."""
    assert hasattr(hf_module, "demo")
    assert hasattr(hf_module, "build_gradio_ui")
