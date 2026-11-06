# StreamVox Live: Brand, Multi-Voice & PyThaiNLP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand the platform to **StreamVox Live**, implement a high-precision Thai text normalization pipeline via **PyThaiNLP**, overhaul the typography and icons with **Google Font 'Prompt'** and **Google Material Symbols (Rounded)**, and introduce a **Multi-Voice Ecosystem** with 5 selectable voice profiles.

**Architecture:** 
1. **PyThaiNLP Pipeline (`src/thai_normalizer.py`):** Preprocesses incoming Thai text with `newmm` word tokenization, slang G2P expansion, and English loanword transliteration on FastAPI backend, backed by an LRU cache (<1ms latency). Raw text is preserved for UI/overlays while spoken speech uses normalized phonetics.
2. **Multi-Voice Registry (`src/tts_engine.py`):** Manages 5 curated voice profiles (Fish Audio Yuta primary, Hana Sweet, DJ Joker, News Anchor, and Microsoft Edge-TTS Niwat Neural zero-quota fallback) synchronized via `SessionInstance.selected_voice_id` and WebSocket control messages.
3. **Frontend Rebranding & Design System:** Migrates Next.js font stack to Google Font 'Prompt', replaces icon sets with Google Material Symbols (Rounded), and adds a reactive Voice Selector component with live audio sample auditioning.

**Tech Stack:** Python 3.10+, FastAPI, PyThaiNLP 5.4.0+, Next.js 15, Tailwind CSS, Google Fonts ('Prompt'), Google Material Symbols (Rounded), Fish Audio Cloud API, Edge-TTS.

**Spec:** `docs/superpowers/specs/2026-11-06-streamvox-live-brand-multivoice-pythainlp-design.md`

---

## Global Constraints

- **Voice Attribution:** Official voice remains พิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert / Yuta), Model ID `9c110ffde8bc42709516395dfbcfb4a2`.
- **Latency Ceiling:** PyThaiNLP text normalization pipeline must execute in under 50ms per request (under 1ms on LRU cache hits).
- **Zero Cost Cloud Tier:** Must remain 100% free deployment on Vercel + Render without requiring paid GPU instances.
- **Academic Rigor & Terminology:** All Markdown files and documentation must state full English technical terminology alongside acronyms (e.g. Text-to-Speech (TTS), First-In, First-Out (FIFO), Asynchronous Server Gateway Interface (ASGI), Application Programming Interface (API), Grapheme-to-Phoneme (G2P), Natural Language Processing (NLP)).

---

## Review Focus

1. **Extreme Slang & Repeated Characters (e.g. `5555555555`, `กกกกก`):** PyThaiNLP normalizer must condense excessive repetition to natural pronunciation ("ห้าห้าห้า") without infinite regex recursion or speech stutter.
2. **English Loanword Transliteration Edge Cases (e.g. mixed casing `LiVe`, `StReAm`, unknown English words):** System must match case-insensitively and leave unrecognized English terms intact for Fish Audio's multilingual phoneme processor.
3. **Voice Switch In-Flight Queuing:** Changing voices while a comment is playing must apply immediately to the next queued item without stalling or dropping playback turns.
4. **Offline / Fallback Resilience:** If Fish Audio API encounters quota exhaustion (HTTP 429) or network disruption, voice engine must seamlessly fail over to Microsoft Edge-TTS (`th-TH-NiwatNeural` or `th-TH-PremwadeeNeural`).
5. **Display Isolation Contract:** OBS Overlay and Dashboard feeds must strictly display raw viewer comments (e.g. "555 Live สนุกมาก") while only the synthesized audio receives phonetic expansion ("ห้าห้าห้า ไลฟ์ สนุกมาก").

---

## Tasks

### Task 1: PyThaiNLP Precision Normalization Module & Pipeline

**Files:**
- Create: `src/thai_normalizer.py`
- Modify: `requirements.txt:1-25`
- Test: `tests/test_thai_normalizer.py`

**Interfaces:**
- Consumes: `pythainlp.tokenize.word_tokenize`
- Produces: `normalize_thai_speech(text: str) -> str` (cached Thai speech normalization function returning phonetically optimized string)

- [ ] **Step 1: Write the failing unit tests for PyThaiNLP normalizer**

```python
# tests/test_thai_normalizer.py
import pytest
from src.thai_normalizer import normalize_thai_speech

def test_slang_and_number_expansion():
    assert "ห้าห้าห้า" in normalize_thai_speech("55555")
    assert "จริงดิ" in normalize_thai_speech("จิงดิ")
    assert "กู" in normalize_thai_speech("กุ")

def test_english_loanwords_transliteration():
    result = normalize_thai_speech("วันนี้ Live สตรีมเกมส์ rov")
    assert "ไลฟ์" in result
    assert "สตรีม" in result
    assert "อาร์โอวี" in result

def test_tokenization_pacing():
    result = normalize_thai_speech("ตากลมนั่งตากลม")
    assert isinstance(result, str)
    assert len(result) > 0
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_thai_normalizer.py -v`  
Expected: FAIL with `ModuleNotFoundError: No module named 'src.thai_normalizer'`

- [ ] **Step 3: Add `pythainlp>=5.0.0` to `requirements.txt` and implement `src/thai_normalizer.py`**

Implement `src/thai_normalizer.py` with:
- Standard slang dictionary (`กุ`->`กู`, `มุง`->`มึง`, `จิง`->`จริง`, `คับ/งับ`->`ครับ`, `ป่าว/ป้ะ`->`หรือเปล่า`, `555+`->`ห้าห้าห้า`).
- English loanword dictionary (`live`->`ไลฟ์`, `stream`->`สตรีม`, `game/games`->`เกม`, `pk`->`พีเค`, `gift`->`กิฟต์`, `rov`->`อาร์โอวี`, `sub`->`ซับ`).
- Word tokenization using `pythainlp.tokenize.word_tokenize(..., engine='newmm')` with space insertion for rhythm.
- `@functools.lru_cache(maxsize=4096)` for sub-millisecond execution on repeated phrases.

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_thai_normalizer.py -v`  
Expected: PASS (all tests green)

- [ ] **Step 5: Commit**

```bash
git add requirements.txt src/thai_normalizer.py tests/test_thai_normalizer.py
git commit -m "feat(nlp): implement PyThaiNLP speech normalization pipeline with G2P and loanword transliteration"
```

---

### Task 2: Multi-Voice Engine Registry & Voice Profile Switcher

**Files:**
- Create: `src/voice_registry.py`
- Modify: `src/tts_engine.py:40-200`
- Modify: `src/session_manager.py:50-120`
- Test: `tests/test_voice_registry.py`

**Interfaces:**
- Consumes: `src.thai_normalizer.normalize_thai_speech`
- Produces: `VoiceProfile` dataclass, `VOICE_PROFILES` registry dictionary, `SessionInstance.selected_voice_id: str`, `TTSEngine.synthesize(text, voice_id=None)`

- [ ] **Step 1: Write the failing unit tests for Voice Registry**

```python
# tests/test_voice_registry.py
import pytest
from src.voice_registry import VOICE_PROFILES, get_voice_profile

def test_default_voice_profile():
    profile = get_voice_profile("yuta")
    assert profile.name == "พิพัฒน์ (Yuta)"
    assert profile.engine == "fish_audio"
    assert profile.model_id == "9c110ffde8bc42709516395dfbcfb4a2"

def test_edge_tts_fallback_profile():
    profile = get_voice_profile("niwat")
    assert profile.name == "นิวัฒน์ (Niwat Edge)"
    assert profile.engine == "edge_tts"
    assert profile.edge_voice == "th-TH-NiwatNeural"

def test_unknown_voice_fallback():
    profile = get_voice_profile("non_existent_voice")
    assert profile.id == "yuta"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_voice_registry.py -v`  
Expected: FAIL with `ModuleNotFoundError: No module named 'src.voice_registry'`

- [ ] **Step 3: Implement `src/voice_registry.py` and integrate into `src/tts_engine.py` & `src/session_manager.py`**

- Define `VoiceProfile(id, name, description, engine, model_id, edge_voice, is_default)`
- Register 5 profiles:
  - `yuta`: Fish Audio Model `9c110ffde8bc42709516395dfbcfb4a2` (Primary Default)
  - `hana`: Fish Audio Sweet Girl (`th-TH-PremwadeeNeural` Edge fallback)
  - `joker`: Fish Audio DJ Hype / Comedy
  - `anchor`: Fish Audio News Anchor Pro
  - `niwat`: Edge-TTS `th-TH-NiwatNeural`
- Update `TTSEngine.synthesize()` to:
  1. Pass text through `normalize_thai_speech(text)` first.
  2. Synthesize using the target profile's engine and model ID.
- Add `selected_voice_id: str = "yuta"` to `SessionInstance` in `src/session_manager.py`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_voice_registry.py -v`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/voice_registry.py src/tts_engine.py src/session_manager.py tests/test_voice_registry.py
git commit -m "feat(tts): add Multi-Voice registry with 5 voice profiles and PyThaiNLP preprocessing in TTSEngine"
```

---

### Task 3: Backend REST & WebSocket Voice Switching Endpoints

**Files:**
- Modify: `src/web_server.py:720-1000`
- Test: `tests/test_voice_switching_api.py`

**Interfaces:**
- Consumes: `src.voice_registry.VOICE_PROFILES`, `src.session_manager.session_manager`
- Produces: `GET /api/voices`, `POST /api/session/{id}/voice`, WebSocket action `set_voice`

- [ ] **Step 1: Write the failing contract tests for voice endpoints**

```python
# tests/test_voice_switching_api.py
import pytest
from httpx import AsyncClient, ASGITransport
from src.web_server import app

@pytest.mark.asyncio
async def test_get_available_voices():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/voices")
        assert res.status_code == 200
        data = res.json()
        assert "voices" in data
        assert any(v["id"] == "yuta" for v in data["voices"])
        assert any(v["id"] == "niwat" for v in data["voices"])

@pytest.mark.asyncio
async def test_set_session_voice():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Update voice for default session
        res = await client.post("/api/session/default_session/voice?token=admin_token", json={"voice_id": "niwat"})
        assert res.status_code == 200
        assert res.json()["voice_id"] == "niwat"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_voice_switching_api.py -v`  
Expected: FAIL with HTTP 404 (endpoints not found)

- [ ] **Step 3: Implement `GET /api/voices` and `POST /api/session/{id}/voice` in `src/web_server.py`**

- In `src/web_server.py`:
  - Implement `@app.get("/api/voices")` returning list of voice profiles.
  - Implement `@app.post("/api/session/{session_id}/voice")` updating `session.selected_voice_id` and broadcasting `VOICE_CHANGED` envelope to connected overlays and dashboards.
  - In `websocket_dashboard_endpoint`, handle action `data.get("action") == "set_voice"` updating `session.selected_voice_id`.
  - In `test_voice_synthesis`, read `body_data.get("voice_id") or session.selected_voice_id` and pass to `tts_engine`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_voice_switching_api.py -v`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/web_server.py tests/test_voice_switching_api.py
git commit -m "feat(api): implement /api/voices and session voice switching via REST and WebSockets"
```

---

### Task 4: Typography ('Prompt') & Google Material Symbols Icons Overhaul

**Files:**
- Modify: `frontend/src/app/layout.tsx:1-70`
- Modify: `frontend/tailwind.config.js:1-50`
- Modify: `templates/overlay.html:1-120`
- Test: `tests/test_streamvox_typography.py`

**Interfaces:**
- Consumes: Google Fonts (`Prompt:300,400,500,600,700`), Google Material Symbols (Rounded)
- Produces: Global class `font-sans` resolved to Prompt, `<span class="material-symbols-rounded">` available across dashboard and OBS overlay

- [ ] **Step 1: Write test to verify typography and icon font assets**

```python
# tests/test_streamvox_typography.py
from pathlib import Path

def test_layout_includes_prompt_font_and_material_symbols():
    layout_path = Path("frontend/src/app/layout.tsx")
    content = layout_path.read_text(encoding="utf-8")
    assert "Prompt" in content
    assert "Material Symbols Rounded" in content or "material-symbols-rounded" in content

def test_overlay_includes_prompt_font():
    overlay_path = Path("templates/overlay.html")
    content = overlay_path.read_text(encoding="utf-8")
    assert "Prompt" in content
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_streamvox_typography.py -v`  
Expected: FAIL (Prompt font and Material Symbols not yet in layout / overlay)

- [ ] **Step 3: Update `layout.tsx`, `tailwind.config.js`, and `templates/overlay.html`**

- In `frontend/src/app/layout.tsx`:
  - Import `Prompt` from `next/font/google`:
    ```typescript
    const promptFont = Prompt({
      weight: ["300", "400", "500", "600", "700"],
      subsets: ["thai", "latin"],
      variable: "--font-prompt",
    });
    ```
  - Add Google Material Symbols (Rounded) stylesheet link:
    `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />`
  - Update metadata title to `"StreamVox Live - TikTok Live TTS Studio"`.
- In `templates/overlay.html`:
  - Include `<link href="https://fonts.googleapis.com/css2?family=Prompt:wght@400;600;700&display=swap" rel="stylesheet">`
  - Update body font to `'Prompt', sans-serif`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_streamvox_typography.py -v`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/layout.tsx templates/overlay.html tests/test_streamvox_typography.py
git commit -m "style(design): integrate Google Font Prompt and Google Material Symbols (Rounded) across dashboard and overlay"
```

---

### Task 5: Voice Selector Component & Rebranding UI Integration

**Files:**
- Create: `frontend/src/components/VoiceSelector.tsx`
- Modify: `frontend/src/types/tikfinity.ts:1-50`
- Modify: `frontend/src/components/Navbar.tsx:1-220`
- Modify: `frontend/src/components/TikFinitySettings.tsx:1-150`
- Modify: `frontend/src/app/page.tsx:1-750`
- Test: `tests/test_streamvox_branding_ui.py`

**Interfaces:**
- Consumes: `GET /api/voices`, `POST /api/session/{id}/voice`, `selectedVoiceId` in settings
- Produces: `<VoiceSelector>` card in settings panel, updated Navbar with StreamVox Live branding & Material Symbols

- [ ] **Step 1: Write test verifying VoiceSelector and StreamVox branding components**

```python
# tests/test_streamvox_branding_ui.py
from pathlib import Path

def test_voice_selector_and_branding_exist():
    selector_path = Path("frontend/src/components/VoiceSelector.tsx")
    assert selector_path.exists(), f"Missing VoiceSelector.tsx at {selector_path}"
    
    navbar_path = Path("frontend/src/components/Navbar.tsx")
    navbar_content = navbar_path.read_text(encoding="utf-8")
    assert "StreamVox" in navbar_content

    page_path = Path("frontend/src/app/page.tsx")
    page_content = page_path.read_text(encoding="utf-8")
    assert "selectedVoiceId" in page_content or "selected_voice" in page_content
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_streamvox_branding_ui.py -v`  
Expected: FAIL (`VoiceSelector.tsx` does not exist yet)

- [ ] **Step 3: Implement `VoiceSelector.tsx` and integrate into Dashboard & Settings**

- In `frontend/src/types/tikfinity.ts`:
  - Add `selectedVoiceId: string;` to `TikFinitySettings` with default `"yuta"`.
- Create `frontend/src/components/VoiceSelector.tsx`:
  - Fetches available voices from `/api/voices` or uses fallback list of 5 profiles.
  - Displays interactive grid of voice cards with active badge, engine tag, description, and "ฟังตัวอย่าง" audition button.
  - Triggers voice change handler syncing with backend and `localStorage`.
- In `frontend/src/components/Navbar.tsx`:
  - Update brand title to **StreamVox Live** with `graphic_eq` icon and `v2.1 PRO` pill badge.
  - Replace Lucide icons with Google Material Symbols (`volume_up`, `wifi`, `smart_toy`, etc.).
- In `frontend/src/components/TikFinitySettings.tsx`:
  - Add a dedicated **"Voice Profiles (โมเดลเสียง)"** tab or embed `<VoiceSelector>` directly in Chat TTS settings.
- In `frontend/src/app/page.tsx`:
  - Synchronize `selectedVoiceId` with backend on voice switch.

- [ ] **Step 4: Run test to verify it passes and verify frontend builds**

Run: `pytest tests/test_streamvox_branding_ui.py -v`  
Run: `powershell -Command "Set-Location 'frontend'; npx tsc --noEmit"`  
Expected: PASS with 0 errors

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/VoiceSelector.tsx frontend/src/types/tikfinity.ts frontend/src/components/Navbar.tsx frontend/src/components/TikFinitySettings.tsx frontend/src/app/page.tsx tests/test_streamvox_branding_ui.py
git commit -m "feat(ui): add VoiceSelector component and complete StreamVox Live branding migration"
```

---

### Task 6: End-to-End System Verification, Contract Tests & Production Deployment

**Files:**
- Modify: `tests/test_audio_visualizer_contract.py`
- Modify: `tests/test_bento_dashboard_ui.py`
- Modify: `README.md`
- Test: Full Pytest Suite (`pytest -q`) & Next.js Build (`npm run build`)

**Interfaces:**
- Consumes: All modules from Tasks 1-5
- Produces: Verified production build deployed to Vercel and Render

- [ ] **Step 1: Update existing contract tests to align with StreamVox Live brand & Prompt font**

- Ensure contract tests assert `StreamVox Live`, `Prompt` font, and `VoiceSelector` integration.

- [ ] **Step 2: Run full Python test suite**

Run: `pytest -q`  
Expected: 230+ passed, 0 failed

- [ ] **Step 3: Run full Frontend test & production build**

Run: `powershell -Command "Set-Location 'frontend'; npm run build"`  
Expected: Next.js static build succeeds with exit code 0 (4/4 pages prerendered).

- [ ] **Step 4: Update `README.md` with StreamVox Live branding and PyThaiNLP instructions**

- Update project title, architecture diagrams, and voice profile guide in `README.md`.

- [ ] **Step 5: Commit and push to remotes**

```bash
git add tests/ README.md
git commit -m "chore(release): complete StreamVox Live deployment with PyThaiNLP, Multi-Voice, and Prompt font"
git push origin main
git push tool-remote main
```

- [ ] **Step 6: Live production health check**

Run: `curl.exe -s https://tiktok-live-tts-bot.onrender.com/health`  
Run: `curl.exe -s -I https://tiktok-live-tts-dashboard.vercel.app`  
Expected: HTTP 200 OK on both endpoints
