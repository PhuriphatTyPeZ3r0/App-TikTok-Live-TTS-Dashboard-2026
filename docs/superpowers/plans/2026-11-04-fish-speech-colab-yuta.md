# Self-Hosted Fish Speech on Google Colab with Yuta Voice Clone & Fallback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate a self-hosted Fish Speech V1.5 engine on Google Colab (with Yuta voice clone reference audio) into the TikTok Live TTS Bot, using Cloudflare Quick Tunnel for streaming audio transport with zero API quota cost and automatic failover to Edge-TTS.

**Architecture:** A standalone Google Colab Notebook sets up Fish Speech V1.5, loads the pre-extracted Yuta reference sample (`yuta_sample.mp3`), and exposes a FastAPI HTTP/WebSocket server via Cloudflare Quick Tunnel (`cloudflared`). In the local bot, `AppConfig` and `TTSEngine` are extended to support `colab_tunnel_url`, streaming audio generation, and sub-1.5s circuit-breaker failover to Microsoft Edge-TTS when the Colab tunnel is unreachable.

**Tech Stack:** Python 3.11+, PyTorch (CUDA T4 16GB on Colab), FastAPI, Uvicorn, WebSockets, httpx, Cloudflare Tunnel (`cloudflared`), Microsoft Edge-TTS (`edge-tts`), Pytest.

**Spec:** [docs/superpowers/specs/2026-11-04-fish-speech-colab-yuta-design.md](file:///C:/Users/iznamu/OneDrive%20-%20Panyapiwat%20Institute%20of%20Management/05_Personal_Projects/01_AI_Agents/tiktok-live-tts-bot/docs/superpowers/specs/2026-11-04-fish-speech-colab-yuta-design.md)

## Global Constraints

- **Python Compatibility:** Python 3.10 to 3.12 syntax, fully typed with type annotations.
- **Fail-Safe Operation:** Live audio playback must never crash or freeze the stream queue if the Colab tunnel disconnects or times out.
- **Latency Floor:** Local timeout on Colab requests must not exceed 2.0 seconds before triggering fallback to Edge-TTS.
- **Audio Output Format:** Must return valid MP3 / WAV audio bytes accepted by existing `AudioPlayer` and Web Audio Overlay.
- **Terminology Mandate:** Markdown documents must spell out full names alongside acronyms on first mention (e.g. Text-to-Speech (TTS), Application Programming Interface (API), Graphics Processing Unit (GPU)).

## Review Focus

1. **Colab Tunnel Disconnect / Unreachable Host:** When `colab_tunnel_url` is invalid, expired, or Colab runtime is disconnected, `synthesize()` must seamlessly fall back to Edge-TTS without raising an unhandled exception or hanging longer than 2.0 seconds.
2. **Missing Reference Audio on Colab:** The Colab backend script must embed the base64 or download the canonical Yuta reference sample so the server never fails with a missing prompt file error on boot.
3. **Empty or Whitespace-only Comment:** When text is blank or non-verbal whitespace, `synthesize()` must return early or handle gracefully without throwing an HTTP 422 or empty audio error.
4. **URL Normalization:** The `colab_tunnel_url` input must tolerate trailing slashes, missing protocols (e.g., `abc.trycloudflare.com` vs `https://abc.trycloudflare.com`), and automatically map to HTTP and WebSocket schemes.
5. **Concurrent Audio Generation Requests:** Rapid comments during live streams must not exhaust WebSocket connections or trigger unhandled concurrency deadlocks in `TTSEngine`.

---

### Task 1: Extend `AppConfig` with Colab Tunnel Configuration

**Files:**
- Modify: `src/config.py:30-55`
- Test: `tests/test_config.py`

**Interfaces:**
- Consumes: Environment variables `COLAB_TUNNEL_URL`, `COLAB_TTS_TIMEOUT_SECONDS`, `PREFER_COLAB_TTS`.
- Produces: `AppConfig.colab_tunnel_url: Optional[str]`, `AppConfig.colab_tts_timeout_seconds: float = 2.0`, `AppConfig.prefer_colab_tts: bool = True`.

- [ ] **Step 1: Write the failing test**

```python
# in tests/test_config.py
def test_app_config_colab_tunnel_fields(monkeypatch):
    monkeypatch.setenv("COLAB_TUNNEL_URL", "https://yuta-tunnel.trycloudflare.com/")
    monkeypatch.setenv("COLAB_TTS_TIMEOUT_SECONDS", "2.5")
    monkeypatch.setenv("PREFER_COLAB_TTS", "true")
    from src.config import load_config
    cfg = load_config()
    assert cfg.colab_tunnel_url == "https://yuta-tunnel.trycloudflare.com"
    assert cfg.colab_tts_timeout_seconds == 2.5
    assert cfg.prefer_colab_tts is True
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_config.py -k test_app_config_colab_tunnel_fields -v`  
Expected: FAIL with attribute error or unrecognized fields.

- [ ] **Step 3: Implement fields and normalization in `src/config.py`**

Add `colab_tunnel_url: Optional[str] = None`, `colab_tts_timeout_seconds: float = 2.0`, and `prefer_colab_tts: bool = True` to `AppConfig`. Strip trailing slashes in `load_config()`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_config.py -k test_app_config_colab_tunnel_fields -v`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/config.py tests/test_config.py
git commit -m "feat(config): add Colab tunnel URL and timeout configurations"
```

---

### Task 2: Implement Colab Fish Speech Client in `TTSEngine` with Fallback

**Files:**
- Modify: `src/tts_engine.py:25-96`
- Test: `tests/test_tts_colab.py`

**Interfaces:**
- Consumes: `AppConfig.colab_tunnel_url`, `AppConfig.colab_tts_timeout_seconds`, `httpx.AsyncClient`.
- Produces: `TTSEngine._synthesize_colab(text: str) -> bytes`, updated `TTSEngine.synthesize(text: str) -> bytes`.

- [ ] **Step 1: Write the failing test**

```python
# in tests/test_tts_colab.py
import pytest
from unittest.mock import AsyncMock, patch
import httpx
from src.config import AppConfig
from src.tts_engine import TTSEngine

@pytest.mark.asyncio
async def test_synthesize_colab_success(tmp_path):
    cfg = AppConfig(
        tiktok_username="test",
        fish_audio_api_key="",
        colab_tunnel_url="https://test-tunnel.trycloudflare.com",
        prefer_colab_tts=True,
        cache_dir=tmp_path / "cache"
    )
    engine = TTSEngine(cfg)
    mock_audio = b"\xff\xfb\x90\x00fake_mp3_data"
    
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_resp = httpx.Response(200, content=mock_audio, request=httpx.Request("POST", "http://test"))
        mock_post.return_value = mock_resp
        result = await engine.synthesize("สวัสดีครับ")
        assert result == mock_audio
        assert "Colab Fish Speech" in engine.last_engine

@pytest.mark.asyncio
async def test_synthesize_colab_timeout_falls_back_to_edge(tmp_path):
    cfg = AppConfig(
        tiktok_username="test",
        fish_audio_api_key="",
        colab_tunnel_url="https://test-tunnel.trycloudflare.com",
        prefer_colab_tts=True,
        enable_fallback_tts=True,
        cache_dir=tmp_path / "cache"
    )
    engine = TTSEngine(cfg)
    fallback_audio = b"edge_audio_bytes"
    
    with patch("httpx.AsyncClient.post", side_effect=httpx.TimeoutException("Timeout")), \
         patch.object(engine, "_synthesize_edge_tts", new_callable=AsyncMock, return_value=fallback_audio):
        result = await engine.synthesize("สวัสดีครับ")
        assert result == fallback_audio
        assert engine.last_engine == "edge-tts"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_tts_colab.py -v`  
Expected: FAIL with `AttributeError` or missing Colab synthesis branch.

- [ ] **Step 3: Implement `_synthesize_colab` in `src/tts_engine.py`**

In `src/tts_engine.py`, add `_synthesize_colab(text: str) -> bytes` calling POST `{tunnel_url}/v1/tts` with timeout `self._config.colab_tts_timeout_seconds`. In `synthesize()`, prioritize Colab when `prefer_colab_tts` is True and `colab_tunnel_url` is non-empty. On error/timeout, log warning and fallback to Edge-TTS.

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_tts_colab.py -v`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tts_engine.py tests/test_tts_colab.py
git commit -m "feat(tts): add Colab Fish Speech client with automatic Edge-TTS fallback"
```

---

### Task 3: Create Google Colab One-Click Backend & Notebook

**Files:**
- Create: `colab/server.py`
- Create: `colab/fish_speech_yuta.ipynb`
- Create: `colab/README.md`
- Copy: `yuta_sample.mp3` -> `colab/assets/yuta_sample.mp3`

**Interfaces:**
- Consumes: Reference audio (`yuta_sample.mp3`) and reference text ("ผมอยากมีปฏิสัมพันธ์กับคนอื่น...").
- Produces: FastAPI server on port 8000 with endpoints `POST /v1/tts`, `GET /health`, and Cloudflare tunnel script.

- [ ] **Step 1: Write test for Colab server schema and mock generation**

```python
# in tests/test_colab_server_contract.py
from fastapi.testclient import TestClient
from unittest.mock import patch
import pytest

# Test that the Colab server exposes standard /health and /v1/tts contracts
def test_colab_server_contract_routes():
    from colab.server import app
    client = TestClient(app)
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json().get("status") == "healthy"
    assert resp.json().get("voice") == "yuta"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_colab_server_contract.py -v`  
Expected: FAIL with `ModuleNotFoundError: No module named 'colab.server'`

- [ ] **Step 3: Implement `colab/server.py` and `colab/fish_speech_yuta.ipynb`**

Implement `colab/server.py` with FastAPI, wrapping Fish Speech V1.5 inference with fallback mock for CPU test environments, and build `colab/fish_speech_yuta.ipynb` containing a single execution cell that installs dependencies, launches the server, and initiates `cloudflared tunnel --url http://127.0.0.1:8000`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_colab_server_contract.py -v`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add colab/ tests/test_colab_server_contract.py
git commit -m "feat(colab): create one-click Fish Speech Colab server and Jupyter notebook"
```

---

### Task 4: Update Web Dashboard & Settings to Support Colab Tunnel

**Files:**
- Modify: `src/web_server.py:80-160`
- Modify: `src/dashboard.py:50-120`
- Test: `tests/test_web_server.py`

**Interfaces:**
- Consumes: `AppConfig`, `TTSEngine`.
- Produces: Settings API endpoint `POST /api/settings/colab` and UI field in Web Dashboard to view/update the tunnel URL live.

- [ ] **Step 1: Write the failing test**

```python
# in tests/test_web_colab_settings.py
from fastapi.testclient import TestClient
from src.web_server import create_app
from src.config import AppConfig

def test_update_colab_tunnel_url_api():
    cfg = AppConfig(tiktok_username="test", fish_audio_api_key="")
    app = create_app(config=cfg)
    client = TestClient(app)
    
    resp = client.post("/api/settings/colab", json={
        "colab_tunnel_url": "https://new-url.trycloudflare.com",
        "prefer_colab_tts": True
    })
    assert resp.status_code == 200
    assert resp.json()["colab_tunnel_url"] == "https://new-url.trycloudflare.com"
    assert cfg.colab_tunnel_url == "https://new-url.trycloudflare.com"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_web_colab_settings.py -v`  
Expected: FAIL with 404 Not Found for `/api/settings/colab`.

- [ ] **Step 3: Implement Colab settings endpoint in `src/web_server.py` and UI input in `dashboard.py`**

Add route `POST /api/settings/colab` updating `config.colab_tunnel_url` and `config.prefer_colab_tts`. Update the dashboard HTML/JS to provide a quick paste input for the Cloudflare Tunnel URL copied from Google Colab.

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_web_colab_settings.py -v`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/web_server.py src/dashboard.py tests/test_web_colab_settings.py
git commit -m "feat(ui): add live Colab tunnel configuration to web dashboard and REST API"
```

---

### Task 5: End-to-End Integration Verification & User Guide

**Files:**
- Modify: `docs/USER_MANUAL.md`
- Modify: `docs/QUICK_START.md`
- Test: `tests/test_e2e_pipeline.py`

**Interfaces:**
- Consumes: All modules from Tasks 1-4.
- Produces: 100% passing test suite and step-by-step documentation for opening Colab, copying tunnel URL, and starting TikTok live stream.

- [ ] **Step 1: Write full E2E pipeline test with Colab priority**

Test complete flow: Comment ingestion -> Normalizer -> Queue Manager -> TTS Engine (Colab preferred with fallback) -> Audio Player.

- [ ] **Step 2: Run all tests in the repository**

Run: `pytest tests/ -v`  
Expected: All tests PASS with zero regressions.

- [ ] **Step 3: Update `docs/USER_MANUAL.md` with Colab Setup instructions**

Add section: "วิธีใช้งานเสียงยูตะฟรีผ่าน Google Colab (Zero-Cost Unlimited TTS)" with Colab link and screenshots/guide.

- [ ] **Step 4: Commit**

```bash
git add docs/ tests/test_e2e_pipeline.py
git commit -m "docs(manual): add Google Colab Yuta TTS deployment and streaming guide"
```
