# Public Repository & Production Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform `tiktok-live-tts-bot` into a clean, secure, standalone Public Open-Source Repository with pre-warmed Fish Speech v1.5 Google Colab GPU backend, 1-click Windows installer, sanitized credentials, and complete documentation ready for live streaming on TikTok Studio.

**Architecture:** Standalone Git repository decoupling the bot from the parent user directory, with an in-memory FP16 GPU pipeline for Fish Speech v1.5 on Google Colab, secured configuration files, and Windows 1-click batch installers for frictionless onboarding.

**Tech Stack:** Python 3.10+, FastAPI, PyTorch, Fish Speech v1.5, Cloudflared Tunnel, PyAudio, VB-Audio Virtual Cable, pytest.

**Spec:** `production_readiness_audit.md` (Artifact: `C:\Users\iznamu\.gemini\antigravity-cli\brain\209e29ae-d192-42f7-9822-5d8e3469afb2\production_readiness_audit.md`)

## Global Constraints

- Preserve all existing 152 unit and integration tests with 100% pass rate.
- Never commit private credentials (`.env`, real API keys, or Cloudflare Account IDs) to Git.
- Maintain compatibility with Python 3.10 - 3.12 on Windows.
- Colab GPU backend must maintain latency < 1.5s using FP16 (`torch.half`) on Tesla T4.
- Follow Clean Code, DRY, and SOLID principles.

## Review Focus

- Accidental leakage of parent directory git history or `.env` during standalone repository creation.
- Fallback to mock voice (`yuta_sample.mp3`) instead of actual text synthesis in `colab/server.py`.
- Missing dependencies or paths in 1-click installer `install.bat`.
- Cloudflare gateway `wrangler.jsonc` containing personal Account ID.
- Broken audio routing when VB-Audio Virtual Cable is not present.

---

### Task 1: Standalone Git Repository Isolation & Secrets Sanitization

**Files:**
- Modify: `cloudflare-gateway/wrangler.jsonc`
- Create: `cloudflare-gateway/wrangler.example.jsonc`
- Modify: `.gitignore`
- Git root: Initialize standalone git repository inside `tiktok-live-tts-bot`

- [ ] **Step 1: Sanitize `cloudflare-gateway/wrangler.jsonc` and create `wrangler.example.jsonc`**
  Replace personal `account_id` with placeholder `YOUR_CLOUDFLARE_ACCOUNT_ID` in `wrangler.example.jsonc` and sanitize `wrangler.jsonc`.
- [ ] **Step 2: Verify `.gitignore` rules**
  Ensure `.gitignore` contains `.env`, `.env.*`, `!.env.example`, `*.pyc`, `__pycache__`, `.venv/`, `.pytest_cache/`, `cloudflare-gateway/.wrangler/`.
- [ ] **Step 3: Initialize standalone Git repository**
  Run `git init` inside `C:\Users\iznamu\OneDrive - Panyapiwat Institute of Management\05_Personal_Projects\01_AI_Agents\tiktok-live-tts-bot` to isolate it cleanly from `C:\Users\iznamu`.
- [ ] **Step 4: Verify git status and initial commit**
  Confirm no untracked parent files appear in `git status` and commit clean baseline.

---

### Task 2: Fish Speech V1.5 In-Memory Pipeline & Real Synthesis Fix

**Files:**
- Modify: `colab/server.py`
- Modify: `colab/fish_speech_yuta.ipynb`

- [ ] **Step 1: Update `colab/server.py` with real Fish Speech v1.5 in-memory engine**
  Replace obsolete v3 loader imports with v1.5 Hydra VQGAN and LLaMA loaders.
  Pre-warm both VQGAN Codec and LLaMA Dual-AR model in GPU VRAM in FP16 (`torch.half`).
  Implement real in-memory synthesis eliminating the mock fallback.
- [ ] **Step 2: Update `colab/fish_speech_yuta.ipynb` notebook**
  Update notebook cells to reflect the robust in-memory server launch, auto-patching of `rich_utils.py` (bypass torchvision nms), and quick-test cells.
- [ ] **Step 3: Run regression tests on contract**
  Execute `pytest tests/test_colab_server_contract.py tests/test_tts_colab.py` to verify local bot client compatibility with the Colab API contract.

---

### Task 3: Production Packaging & 1-Click User Installation

**Files:**
- Create: `install.bat`
- Create: `LICENSE`
- Modify: `run.bat`

- [ ] **Step 1: Create `LICENSE` file**
  Add standard MIT License for Open Source Software release.
- [ ] **Step 2: Create `install.bat` for Windows users**
  Write automated batch script:
  1. Check for Python 3.10+ installation.
  2. Create Python virtual environment `.venv`.
  3. Upgrade pip and install `requirements.txt`.
  4. Auto-copy `.env.example` to `.env` if `.env` does not exist.
  5. Print clear success instructions.
- [ ] **Step 3: Update `run.bat`**
  Ensure `run.bat` activates `.venv` if available before running `main.py`.

---

### Task 4: Public Open-Source Documentation & Colab Badge

**Files:**
- Modify: `README.md`
- Modify: `colab/README.md`

- [ ] **Step 1: Update main `README.md`**
  Add GitHub Badges (Python, FastAPI, Colab T4, License, Tests Passing).
  Add "Open In Colab" badge with direct link to the notebook.
  Add Architecture Diagram (Mermaid).
  Add 3-Step Quick Start guide for streamers.
- [ ] **Step 2: Update `colab/README.md`**
  Document the Colab Fish Speech v1.5 server setup, Cloudflare tunnel integration, and hardware specifications.

---

### Task 5: Full Test Suite Verification & Baseline Commit

**Files:**
- Test: `tests/`

- [ ] **Step 1: Run full automated test suite**
  Execute `pytest` across all 152+ unit and integration tests. Verify 100% pass rate.
- [ ] **Step 2: Create final production release commit**
  Stage all sanitized and verified files, and commit as `v1.0.0: initial public production release`.
