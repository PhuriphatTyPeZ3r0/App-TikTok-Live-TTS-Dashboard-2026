# Hugging Face Spaces ZeroGPU & Render Free-Tier Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide an automated, 100% Free-Tier ($0/month) cloud deployment for the TikTok Live TTS Bot by packaging the Fish Speech v1.5 Phiphat Voice Engine for Hugging Face Spaces ZeroGPU (A100/T4 on-demand) with a permanent URL, and configuring Render Free Web Service for 24/7 web dashboard and live stream ingestion with 3-tier failover.

**Architecture:** Cloud hybrid architecture decoupling compute-heavy model inference (Hugging Face Spaces ZeroGPU with Gradio/FastAPI) from the I/O-bound stream listener and web dashboard (Render Free Web Service), backed by adaptive pre-warming, optional Bearer token auth, and automated 3-tier fallback to Fish Audio Cloud API and Microsoft Edge-TTS.

**Tech Stack:** Python 3.10+, FastAPI, Gradio 4.x, `@spaces.GPU` (ZeroGPU), PyTorch, Fish Speech v1.5, Render Infrastructure as Code (`render.yaml`), pytest.

**Spec:** `docs/superpowers/specs/2026-11-05-huggingface-zerogpu-and-render-deployment-design.md`

## Global Constraints

- **Strict Zero-Cost Guarantee ($0/month):** Use exclusively permanent free tiers (Hugging Face Spaces ZeroGPU + Render Free Tier).
- **100% Test Pass Integrity:** Preserve all 152 existing tests; all new tests must pass with 0 regressions.
- **Permanent URL Architecture:** The bot connects directly to `https://<user>-phiphat-tts.hf.space` without requiring randomized Cloudflare Quick Tunnels.
- **Failover SLA:** Strict 4.0s timeout on Tier 1 before automatically falling back to Tier 2 (Fish Audio Cloud API) and Tier 3 (Edge-TTS).
- **Voice Timbre Integrity:** Rebrand voice identity to **"พิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)"** while accepting `"yuta"` as backward-compatible alias.

## Review Focus

- ZeroGPU dynamic allocation failure when called from external server IPs without Gradio mount.
- Render free tier 15-minute inactivity spin-down dropping the TikTok Live listener mid-stream.
- Cold boot timeouts exhausting Fish Audio cloud quota due to premature failovers.
- Render memory exhaustion (OOM > 512MB) caused by accidental PyTorch/CUDA package loading on the web worker.
- Missing Bearer token handling when accessing private or rate-limited Hugging Face Spaces.

---

### Task 1: Hugging Face Spaces ZeroGPU Model Package (`huggingface-space/`)

**Files:**
- Create: `huggingface-space/README.md`
- Create: `huggingface-space/requirements.txt`
- Create: `huggingface-space/app.py`
- Create: `huggingface-space/assets/yuta_sample.mp3`
- Test: `tests/test_huggingface_space_contract.py`

**Interfaces:**
- Consumes: Fish Speech v1.5 checkpoints (`checkpoints/fish-speech-1.5`) and Phiphat reference audio (`colab/assets/yuta_sample.mp3`).
- Produces: `POST /v1/tts` and `GET /health` endpoints wrapped with `@spaces.GPU(duration=30)`, returning synthesized MP3 audio bytes.

- [ ] **Step 1: Write contract test for Hugging Face Space FastAPI app**

```python
# tests/test_huggingface_space_contract.py
import pytest
from fastapi.testclient import TestClient

def test_hf_space_health_and_tts_contract():
    # Verify app exposes /health and /v1/tts with Phiphat voice
    from huggingface_space.app import app
    client = TestClient(app)
    health = client.get("/health")
    assert health.status_code == 200
    assert health.json()["voice"] in ("phiphat", "yuta")
```

- [ ] **Step 2: Run test to verify it fails**
Run: `pytest tests/test_huggingface_space_contract.py -v`
Expected: FAIL (module `huggingface_space` not found).

- [ ] **Step 3: Create `huggingface-space/README.md` with ZeroGPU metadata**
Write YAML frontmatter:
```yaml
---
title: Phiphat Boonsitthilert Voice Engine (Fish Speech v1.5)
emoji: 🎙️
colorFrom: purple
colorTo: blue
sdk: gradio
sdk_version: 4.44.0
app_file: app.py
pinned: false
---
```

- [ ] **Step 4: Create `huggingface-space/requirements.txt`**
List dependencies: `spaces`, `gradio>=4.40.0`, `torch>=2.1.0`, `torchaudio>=2.1.0`, `hydra-core`, `omegaconf`, `vector_quantize_pytorch==1.14.24`, `loralib`, `fastapi`, `uvicorn`, `soundfile`, `pydub`, `huggingface_hub`.

- [ ] **Step 5: Implement `huggingface-space/app.py`**
Implement the in-memory Fish Speech v1.5 engine with `@spaces.GPU(duration=30)` on the inference route, mount FastAPI with Gradio (`gr.mount_gradio_app`), and auto-download checkpoints via `snapshot_download("fishaudio/fish-speech-1.5")`.

- [ ] **Step 6: Copy reference voice sample**
Copy `assets/` or `colab/assets/yuta_sample.mp3` to `huggingface-space/assets/yuta_sample.mp3`.

- [ ] **Step 7: Run test to verify contract passes**
Run: `pytest tests/test_huggingface_space_contract.py -v`
Expected: PASS.

- [ ] **Step 8: Commit**
```bash
git add huggingface-space/ tests/test_huggingface_space_contract.py
git commit -m "feat: add Hugging Face Spaces ZeroGPU model package for Phiphat voice engine"
```

---

### Task 2: Render Free Web Service Blueprint (`render.yaml`)

**Files:**
- Create: `render.yaml`
- Modify: `Dockerfile`

**Interfaces:**
- Consumes: `requirements.txt` and `src.web_server:app`.
- Produces: Render Infrastructure-as-Code specification for 1-click cloud deployment.

- [ ] **Step 1: Write test for Render blueprint validation**
Create `tests/test_render_config.py` checking `render.yaml` schema, environment variable defaults, and command specifications.

- [ ] **Step 2: Run test to verify it fails**
Run: `pytest tests/test_render_config.py -v`
Expected: FAIL (`render.yaml` does not exist).

- [ ] **Step 3: Create `render.yaml`**
Define standard free-tier web service:
```yaml
services:
  - type: web
    name: tiktok-live-tts-bot
    env: python
    plan: free
    region: oregon
    buildCommand: pip install -r requirements.txt
    startCommand: python -m uvicorn src.web_server:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: PYTHON_VERSION
        value: 3.11.9
      - key: PREFER_COLAB_TTS
        value: "true"
      - key: COLAB_TTS_TIMEOUT_SECONDS
        value: "4.0"
      - key: ENABLE_FALLBACK_TTS
        value: "true"
      - key: TIKTOK_USERNAME
        sync: false
      - key: COLAB_TUNNEL_URL
        sync: false
      - key: FISH_AUDIO_API_KEY
        sync: false
      - key: HF_TOKEN
        sync: false
```

- [ ] **Step 4: Update `Dockerfile` for Cloud compatibility**
Ensure container exposes port 7860/10000 cleanly and runs without root issues.

- [ ] **Step 5: Run test to verify it passes**
Run: `pytest tests/test_render_config.py -v`
Expected: PASS.

- [ ] **Step 6: Commit**
```bash
git add render.yaml Dockerfile tests/test_render_config.py
git commit -m "feat: add Render blueprint render.yaml for 1-click free web service deployment"
```

---

### Task 3: Adaptive Pre-Warming & Bearer Token Authentication in `TTSEngine`

**Files:**
- Modify: `src/config.py`
- Modify: `src/tts_engine.py`
- Modify: `.env.example`
- Test: `tests/test_tts_hf_zerogpu.py`

**Interfaces:**
- Consumes: `HF_TOKEN` from `Config`, `COLAB_TUNNEL_URL` pointing to `*.hf.space`.
- Produces: HTTP requests carrying `Authorization: Bearer <HF_TOKEN>` and asynchronous pre-warming wake-up pings.

- [ ] **Step 1: Write tests for HF Bearer token and pre-warming in `tests/test_tts_hf_zerogpu.py`**
Test that:
1. When `HF_TOKEN` is set, `TTSEngine` includes `Authorization: Bearer <HF_TOKEN>` in headers.
2. `TTSEngine.warm_remote_engine()` sends asynchronous wake-up ping to `/health`.
3. If Tier 1 times out (> 4.0s), system fails over to Tier 2 (Fish Audio API) and preserves Phiphat voice timbre.

- [ ] **Step 2: Run test to verify it fails**
Run: `pytest tests/test_tts_hf_zerogpu.py -v`
Expected: FAIL (HF_TOKEN attribute not recognized on Config).

- [ ] **Step 3: Add `HF_TOKEN` to `src/config.py` and `.env.example`**
Add optional field `hf_token: Optional[str] = None` loaded from `HF_TOKEN`.

- [ ] **Step 4: Implement Bearer auth & `warm_remote_engine()` in `src/tts_engine.py`**
Inject `Authorization: Bearer <token>` header when `self.config.hf_token` is present. Add async method `warm_remote_engine()` triggering background non-blocking `GET /health`.

- [ ] **Step 5: Run test to verify it passes**
Run: `pytest tests/test_tts_hf_zerogpu.py -v`
Expected: PASS.

- [ ] **Step 6: Commit**
```bash
git add src/config.py src/tts_engine.py .env.example tests/test_tts_hf_zerogpu.py
git commit -m "feat: implement Hugging Face Bearer auth and adaptive pre-warming in TTSEngine"
```

---

### Task 4: Auto-Bootstrapping Lifecycle in `web_server.py`

**Files:**
- Modify: `src/web_server.py`
- Test: `tests/test_web_autobootstrap.py`

**Interfaces:**
- Consumes: `Config.tiktok_username` on startup.
- Produces: Automatically provisioned default session without manual browser button click.

- [ ] **Step 1: Write test for automatic startup session bootstrapping**
Verify that on FastAPI startup, if `TIKTOK_USERNAME` is present, a default session is automatically created and started in `SessionManager`.

- [ ] **Step 2: Run test to verify it fails**
Run: `pytest tests/test_web_autobootstrap.py -v`
Expected: FAIL.

- [ ] **Step 3: Implement lifespan handler in `src/web_server.py`**
Add `@asynccontextmanager async def lifespan(app: FastAPI)`:
On startup, inspect `config.tiktok_username`; if valid, auto-create and run default session. Also trigger `tts_engine.warm_remote_engine()` in background task.

- [ ] **Step 4: Run test to verify it passes**
Run: `pytest tests/test_web_autobootstrap.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/web_server.py tests/test_web_autobootstrap.py
git commit -m "feat: implement automated session bootstrapping on FastAPI lifespan startup"
```

---

### Task 5: Cloud Deployment Guide & Documentation

**Files:**
- Create: `docs/HUGGINGFACE_RENDER_DEPLOYMENT_GUIDE.md`
- Modify: `README.md`

- [ ] **Step 1: Create `docs/HUGGINGFACE_RENDER_DEPLOYMENT_GUIDE.md`**
Write detailed guide with screenshots/steps:
1. Creating a free Hugging Face Space with ZeroGPU.
2. Uploading the `huggingface-space/` files.
3. Deploying the bot to Render using 1-click `render.yaml`.
4. Connecting TikTok Studio Browser Source.

- [ ] **Step 2: Update `README.md`**
Add section "☁️ Zero-Cost Cloud Deployment (Hugging Face ZeroGPU + Render)" linking to the guide.

- [ ] **Step 3: Commit**
```bash
git add docs/HUGGINGFACE_RENDER_DEPLOYMENT_GUIDE.md README.md
git commit -m "docs: add complete Hugging Face ZeroGPU and Render deployment guide"
```

---

### Task 6: Full Test Suite Verification & Baseline Release

**Files:**
- Test: `tests/`

- [ ] **Step 1: Run full pytest suite across all modules**
Run: `pytest tests/ -v`
Expected: 100% pass rate across all 156+ tests with 0 failures.

- [ ] **Step 2: Tag release `v1.1.0`**
```bash
git tag -a v1.1.0 -m "Release v1.1.0: 100% Free-Tier Cloud Deployment with Hugging Face ZeroGPU & Render"
git push origin main --tags
```
