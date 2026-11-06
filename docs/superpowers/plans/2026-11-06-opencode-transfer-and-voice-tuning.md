# OpenCode Autonomous Task Transfer & Per-Voice Acoustic Tuning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reusable OpenCode Command Line Interface (CLI) autonomous task handoff skill (`opencode-worker`) routed via OmniRoute (`omniroute/auto/best-coding`) and use it to implement per-voice acoustic tuning (`speed`, `pitch`, `volume`) across the StreamVox Live FastAPI backend and Next.js 15 Single-Page Application (SPA) dashboard.

**Architecture:** First, establish the `opencode-worker` skill (`C:\Users\iznamu\.agents\skills\opencode-worker\SKILL.md`) and a PowerShell task runner (`scripts/run_opencode_task.ps1`) that invokes `opencode run --auto --standalone -m omniroute/auto/best-coding` with automatic `OMNIROUTE_API_KEY` injection and post-run test verification (`pytest` + `npx tsc --noEmit`). Second, extend the Python backend (`src/voice_registry.py`, `src/tts_engine.py`, `src/session_manager.py`, `src/web_server.py`) with clamped `VoiceTuning` parameters (`speed`, `pitch`, `volume`), Edge-TTS prosody formatting, cache key isolation, and REST/WebSocket synchronization. Third, update the Next.js frontend (`frontend/src/types/tikfinity.ts`, `frontend/src/components/VoiceSelector.tsx`, `frontend/src/app/page.tsx`) with interactive per-voice tuning sliders using Google Material Symbols (Rounded) and zero emojis.

**Tech Stack:** Python 3.11+, FastAPI, `edge-tts`, `pytest`, Next.js 15, React 19, TypeScript, Tailwind CSS, OpenCode CLI v2.2.5 (`opencode`), OmniRoute v3.8.52 (`http://localhost:20128`).

**Spec:** `docs/superpowers/specs/2026-11-06-opencode-transfer-and-voice-tuning-design.md`

## Global Constraints

- **OmniRoute + OpenCode Execution:** All delegated OpenCode tasks run via `opencode run --auto --standalone -m omniroute/auto/best-coding` with `OMNIROUTE_API_KEY` loaded from user environment or `C:\Users\iznamu\.omniroute\.env`.
- **Mandatory Full Technical Terminology & Acronyms:** All Markdown files and docstrings must include full English terms alongside acronyms (e.g., Text-to-Speech (TTS), Application Programming Interface (API), User Interface (UI), Command Line Interface (CLI), Single-Page Application (SPA), Representational State Transfer (REST), WebSocket (WS)).
- **Zero Emoji Policy in UI Components:** All UI icons in `frontend/src/components/*.tsx` and `templates/*.html` must use `<span className="material-symbols-rounded">icon_name</span>` (`speed`, `graphic_eq`, `volume_up`, `restart_alt`, `tune`). Zero Unicode emoji characters are permitted (`tests/test_streamvox_typography.py::test_zero_emoji_icons_in_ui_components_and_templates`).
- **Colab Routing Isolation:** Google Colaboratory (Colab) synthesis in `src/tts_engine.py` must remain strictly isolated to `profile.id == "yuta"`.
- **Quality Gate:** Every task must pass `pytest` and `npx tsc --noEmit` (inside `frontend/`) before committing.

## Review Focus

1. **Out-of-range or non-numeric tuning inputs (`speed=-5`, `speed="fast"`, `pitch=999`, `volume=-20`):** `normalize_voice_tuning` must coerce numeric strings and clamp `speed` to `[0.5, 2.0]`, `pitch` to `[-50, 50]` (int), and `volume` to `[0, 200]` (int), falling back to `(1.0, 0, 100)` on `None` or invalid values without raising `ValueError` or `TypeError`.
2. **Default tuning backward compatibility with `edge_tts.Communicate` mocks:** Existing unit tests mock `edge_tts.Communicate(text, voice)` with positional arguments only. When tuning is at default `(speed=1.0, pitch=0, volume=100)`, `_synthesize_edge_tts` must call `edge_tts.Communicate(text, target_voice)` without extra keyword arguments unless non-default tuning is provided (with `TypeError` fallback for legacy 2-arg mocks).
3. **Disk cache collision across different tuning settings:** `TTSEngine.get_cache_path` must keep the existing `md5(f"{voice_id}_{text}")` digest when tuning is default `(1.0, 0, 100)` so existing cache tests pass, and append tuning suffix `_{speed:.2f}_{pitch}_{volume}` when any parameter differs from default.
4. **Partial tuning updates on `POST /api/session/{session_id}/voice` and WebSocket `set_voice`:** Updating only `speed` (or switching voice without passing `tuning`) must preserve previously saved tuning for that `voice_id` or return default `{"speed": 1.0, "pitch": 0, "volume": 100}` without resetting other voices' saved tunings.
5. **Zero-emoji regression in `VoiceSelector.tsx`:** Adding tuning sliders and reset buttons in `VoiceSelector.tsx` must use only `material-symbols-rounded` ligatures (`tune`, `speed`, `graphic_eq`, `volume_up`, `restart_alt`) so `test_zero_emoji_icons_in_ui_components_and_templates` passes.

---

### Task 1: OpenCode Autonomous Worker Skill & Task Runner Script

**Files:**
- Create: `C:\Users\iznamu\.agents\skills\opencode-worker\SKILL.md`
- Create: `scripts/run_opencode_task.ps1`
- Test: `tests/test_opencode_handoff.py`

**Interfaces:**
- Consumes: `opencode` CLI v2.2.5 (`opencode run --auto --standalone -m omniroute/auto/best-coding`) and `C:\Users\iznamu\.omniroute\.env`.
- Produces:
  - `scripts/run_opencode_task.ps1`: accepts `-Prompt <string>`, `-Model <string>` (default `"omniroute/auto/best-coding"`), `-WorkDir <string>`, `-DryRun` switch; ensures `OMNIROUTE_API_KEY` is populated in `$env:OMNIROUTE_API_KEY` from User env or `C:\Users\iznamu\.omniroute\.env`; executes `opencode run --auto --standalone -m $Model $Prompt`.
  - `C:\Users\iznamu\.agents\skills\opencode-worker\SKILL.md`: skill definition documenting how Antigravity transfers coding tasks to OpenCode CLI and verifies results.

- [ ] **Step 1: Write the failing test in `tests/test_opencode_handoff.py`**

```python
from pathlib import Path
import subprocess

REPO_ROOT = Path(__file__).resolve().parent.parent
SKILL_PATH = Path(r"C:\Users\iznamu\.agents\skills\opencode-worker\SKILL.md")
RUNNER_SCRIPT = REPO_ROOT / "scripts" / "run_opencode_task.ps1"


def test_opencode_worker_skill_exists_and_documents_omniroute():
    assert SKILL_PATH.exists(), "opencode-worker SKILL.md must exist"
    content = SKILL_PATH.read_text(encoding="utf-8")
    assert "name: opencode-worker" in content
    assert "omniroute/auto/best-coding" in content
    assert "opencode run --auto" in content


def test_run_opencode_task_script_dry_run():
    assert RUNNER_SCRIPT.exists(), "scripts/run_opencode_task.ps1 must exist"
    res = subprocess.run(
        [
            "powershell",
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            str(RUNNER_SCRIPT),
            "-Prompt",
            "Verify DryRun handoff",
            "-DryRun",
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    assert res.returncode == 0, f"DryRun failed: {res.stderr}"
    assert "omniroute/auto/best-coding" in res.stdout
    assert "Verify DryRun handoff" in res.stdout
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_opencode_handoff.py -v`
Expected: FAIL with `AssertionError: opencode-worker SKILL.md must exist`

- [ ] **Step 3: Create `C:\Users\iznamu\.agents\skills\opencode-worker\SKILL.md` and `scripts/run_opencode_task.ps1`**

Create `C:\Users\iznamu\.agents\skills\opencode-worker\SKILL.md` with YAML frontmatter (`name: opencode-worker`, `description: Delegate autonomous coding, testing, and refactoring tasks to OpenCode CLI (opencode run --auto) via OmniRoute.`) and instructions for running `scripts/run_opencode_task.ps1` followed by `pytest` and `npx tsc --noEmit`.
Create `scripts/run_opencode_task.ps1` accepting `param([Parameter(Mandatory=$true)][string]$Prompt, [string]$Model = "omniroute/auto/best-coding", [string]$WorkDir = (Get-Location).Path, [switch]$DryRun)`. Load `OMNIROUTE_API_KEY` from `[Environment]::GetEnvironmentVariable("OMNIROUTE_API_KEY", "User")` or `C:\Users\iznamu\.omniroute\.env` if `$env:OMNIROUTE_API_KEY` is empty. When `-DryRun` is passed, output `[DRY-RUN] opencode run --auto --standalone -m $Model "$Prompt"` and exit 0; otherwise invoke `opencode run --auto --standalone -m $Model $Prompt` inside `$WorkDir`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_opencode_handoff.py -v`
Expected: PASS (2 passed)

- [ ] **Step 5: Commit**

```bash
git add scripts/run_opencode_task.ps1 tests/test_opencode_handoff.py
git commit -m "feat(automation): add opencode-worker skill and task handoff runner script"
```

---

### Task 2: Per-Voice Acoustic Tuning Model, Validation & Edge-TTS Synthesis (`voice_registry.py` & `tts_engine.py`)

**Files:**
- Modify: `src/voice_registry.py`
- Modify: `src/tts_engine.py`
- Modify: `tests/test_voice_registry.py`

**Interfaces:**
- Consumes: existing `VoiceProfile`, `VOICE_PROFILES`, `get_voice_profile`, `list_voice_profiles` in `src/voice_registry.py`.
- Produces:
  - In `src/voice_registry.py`:
    - `@dataclass class VoiceTuning`: `speed: float = 1.0`, `pitch: int = 0`, `volume: int = 100`
    - `VoiceProfile` gains default fields: `default_speed: float = 1.0`, `default_pitch: int = 0`, `default_volume: int = 100`
    - `normalize_voice_tuning(speed: Any = 1.0, pitch: Any = 0, volume: Any = 100) -> VoiceTuning` (clamps `speed` to `[0.5, 2.0]` rounded to 2 decimals, `pitch` to `[-50, 50]` int, `volume` to `[0, 200]` int; invalid/None values fall back to `1.0`, `0`, `100`).
    - `format_edge_prosody(tuning: VoiceTuning | None) -> tuple[str, str, str]` returning `(rate_str, pitch_str, volume_str)` formatted for `edge-tts` (e.g. `speed=1.2` -> `"+20%"`, `speed=0.8` -> `"-20%"`, `speed=1.0` -> `"+0%"`; `pitch=10` -> `"+10Hz"`, `pitch=-15` -> `"-15Hz"`; `volume=100` -> `"+0%"`, `volume=130` -> `"+30%"`, `volume=70` -> `"-30%"`).
  - In `src/tts_engine.py`:
    - `get_cache_path(self, text: str, voice_id: str, tuning: Optional[VoiceTuning] = None) -> Path`: uses `f"{voice_id}_{text}"` when `tuning` is None or `(1.0, 0, 100)`, otherwise `f"{voice_id}_{tuning.speed:.2f}_{tuning.pitch}_{tuning.volume}_{text}"`.
    - `synthesize(self, text: str, voice_id: str | None = None, *, speed: float = 1.0, pitch: int = 0, volume: int = 100) -> bytes`
    - `synthesize_base64(self, text: str, voice_id: str | None = None, *, speed: float = 1.0, pitch: int = 0, volume: int = 100) -> str`
    - `_synthesize_edge_tts(self, text: str, voice: Optional[str] = None, *, rate: str = "+0%", pitch: str = "+0Hz", volume: str = "+0%") -> bytes`: calls `edge_tts.Communicate(text, target_voice)` when `rate == "+0%" and pitch == "+0Hz" and volume == "+0%"`, otherwise calls `edge_tts.Communicate(text, target_voice, rate=rate, pitch=pitch, volume=volume)` with `TypeError` fallback to `edge_tts.Communicate(text, target_voice)`.

- [ ] **Step 1: Write the failing tests in `tests/test_voice_registry.py`**

```python
from src.voice_registry import (
    VoiceTuning,
    format_edge_prosody,
    normalize_voice_tuning,
)


def test_normalize_voice_tuning_clamps_and_handles_invalid_inputs():
    t1 = normalize_voice_tuning(speed=3.5, pitch=-90, volume=250)
    assert (t1.speed, t1.pitch, t1.volume) == (2.0, -50, 200)

    t2 = normalize_voice_tuning(speed=0.1, pitch=80, volume=-10)
    assert (t2.speed, t2.pitch, t2.volume) == (0.5, 50, 0)

    t3 = normalize_voice_tuning(speed="invalid", pitch=None, volume="bad")
    assert (t3.speed, t3.pitch, t3.volume) == (1.0, 0, 100)


def test_format_edge_prosody_formats_rate_pitch_volume():
    default_prosody = format_edge_prosody(VoiceTuning(1.0, 0, 100))
    assert default_prosody == ("+0%", "+0Hz", "+0%")

    custom_prosody = format_edge_prosody(VoiceTuning(1.25, -12, 80))
    assert custom_prosody == ("+25%", "-12Hz", "-20%")


def test_tts_engine_cache_path_includes_non_default_tuning(tmp_path):
    from src.tts_engine import TTSEngine

    engine = TTSEngine(cache_dir=tmp_path)
    p_default = engine.get_cache_path("สวัสดี", "yuta")
    p_same = engine.get_cache_path("สวัสดี", "yuta", VoiceTuning(1.0, 0, 100))
    p_fast = engine.get_cache_path("สวัสดี", "yuta", VoiceTuning(1.5, 10, 120))
    assert p_default == p_same
    assert p_default != p_fast
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_voice_registry.py -k "tuning or prosody" -v`
Expected: FAIL with `ImportError: cannot import name 'VoiceTuning' from 'src.voice_registry'`

- [ ] **Step 3: Delegate implementation to OpenCode CLI (`scripts/run_opencode_task.ps1`) or implement in `src/voice_registry.py` and `src/tts_engine.py`**

Implement `VoiceTuning`, `normalize_voice_tuning`, and `format_edge_prosody` in `src/voice_registry.py`, and update `get_cache_path`, `synthesize`, `synthesize_base64`, `_call_edge_tts_with_voice`, and `_synthesize_edge_tts` in `src/tts_engine.py`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_voice_registry.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/voice_registry.py src/tts_engine.py tests/test_voice_registry.py
git commit -m "feat(tts): add per-voice VoiceTuning clamping, prosody formatting, and cache isolation"
```

---

### Task 3: Session Tuning Persistence & FastAPI REST/WebSocket Endpoints (`session_manager.py` & `web_server.py`)

**Files:**
- Modify: `src/session_manager.py`
- Modify: `src/web_server.py`
- Modify: `tests/test_voice_switching_api.py`

**Interfaces:**
- Consumes: `VoiceTuning`, `normalize_voice_tuning`, `get_voice_profile` from `src/voice_registry.py`.
- Produces:
  - In `src/session_manager.py`:
    - `SessionInstance.voice_tuning: Dict[str, Dict[str, Union[float, int]]] = field(default_factory=dict)`
    - `SessionManager.get_voice_tuning(self, session_id: str, voice_id: Optional[str] = None) -> Dict[str, Union[float, int]]` returning `{"speed": float, "pitch": int, "volume": int}` (defaults to `{"speed": 1.0, "pitch": 0, "volume": 100}`).
    - `SessionManager.set_voice_tuning(self, session_id: str, voice_id: str, speed: Any = None, pitch: Any = None, volume: Any = None) -> Dict[str, Union[float, int]]` merging any non-None `speed`, `pitch`, `volume` with existing tuning for `resolved_profile.id`, normalizing via `normalize_voice_tuning`, storing in `session.voice_tuning[resolved_profile.id]`, and returning the dict.
  - In `src/web_server.py`:
    - `POST /api/session/{session_id}/voice` and `POST /api/session/voice`: reads optional `speed`, `pitch`, `volume` (or nested `tuning: {speed, pitch, volume}`) from JSON body; updates tuning via `session_manager.set_voice_tuning`; includes `"tuning": tuning_dict` in both the HTTP JSON response and the `VOICE_CHANGED` `data` payload.
    - `GET /api/session/{session_id}/status`: includes `"voice_tuning": session_manager.get_voice_tuning(session.session_id, session.selected_voice_id)` in response.
    - WebSocket `set_voice` action: reads optional `speed`, `pitch`, `volume` (or `tuning` dict) from message or `data`, updates session tuning, and includes `"tuning": tuning_dict` in `VOICE_CHANGED` `data`.
    - `POST /api/session/{session_id}/test-voice`: resolves tuning from request body or `session_manager.get_voice_tuning(session.session_id, target_voice_id)`, passes `speed`, `pitch`, `volume` to `synthesize_base64` (with `TypeError` fallback for mocked engines), and includes `"tuning": tuning_dict` in the `ALERT` broadcast and HTTP response.

- [ ] **Step 1: Write the failing tests in `tests/test_voice_switching_api.py`**

```python
def test_post_session_voice_with_acoustic_tuning_persists_and_broadcasts(client):
    start_resp = client.post(
        "/api/session/start",
        json={"tiktok_username": "@tuning_streamer", "fish_audio_api_key": "test_key"},
    )
    assert start_resp.status_code == 200
    data = start_resp.json()
    session_id = data["session_id"]
    admin_token = data["admin_token"]

    resp = client.post(
        f"/api/session/{session_id}/voice",
        headers={"X-Admin-Token": admin_token},
        json={"voice_id": "hana", "speed": 1.25, "pitch": 15, "volume": 110},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["voice_id"] == "hana"
    assert body["tuning"] == {"speed": 1.25, "pitch": 15, "volume": 110}

    # Partial update preserves pitch and volume while clamping out-of-range speed
    resp2 = client.post(
        f"/api/session/{session_id}/voice",
        headers={"X-Admin-Token": admin_token},
        json={"voice_id": "hana", "speed": 9.9},
    )
    assert resp2.status_code == 200
    assert resp2.json()["tuning"] == {"speed": 2.0, "pitch": 15, "volume": 110}

    status_resp = client.get(f"/api/session/{session_id}/status?token={admin_token}")
    assert status_resp.status_code == 200
    assert status_resp.json()["voice_tuning"] == {"speed": 2.0, "pitch": 15, "volume": 110}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_voice_switching_api.py -k "acoustic_tuning" -v`
Expected: FAIL with `KeyError: 'tuning'`

- [ ] **Step 3: Delegate implementation to OpenCode CLI or implement in `src/session_manager.py` and `src/web_server.py`**

Add `voice_tuning`, `get_voice_tuning`, and `set_voice_tuning` to `src/session_manager.py` and update `set_session_voice_endpoint`, `get_session_status`, `test_voice_synthesis`, and `websocket_dashboard_endpoint` (`set_voice`) in `src/web_server.py`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_voice_switching_api.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/session_manager.py src/web_server.py tests/test_voice_switching_api.py
git commit -m "feat(api): support per-voice acoustic tuning in session manager, REST API, and WebSocket"
```

---

### Task 4: Frontend Per-Voice Acoustic Tuning Sliders (`tikfinity.ts`, `VoiceSelector.tsx`, `page.tsx`)

**Files:**
- Modify: `frontend/src/types/tikfinity.ts`
- Modify: `frontend/src/components/VoiceSelector.tsx`
- Modify: `frontend/src/app/page.tsx`
- Modify: `tests/test_streamvox_branding_ui.py`

**Interfaces:**
- Consumes: `GET /api/voices`, `POST /api/session/{session_id}/voice` with `{ voice_id, speed, pitch, volume }`.
- Produces:
  - In `frontend/src/types/tikfinity.ts`:
    - `export interface VoiceTuningConfig { speed: number; pitch: number; volume: number; }`
    - `export const DEFAULT_VOICE_TUNING: VoiceTuningConfig = { speed: 1.0, pitch: 0, volume: 100 };`
    - `TikFinitySettings` adds `voiceTunings?: Record<string, VoiceTuningConfig>;`
  - In `frontend/src/components/VoiceSelector.tsx`:
    - `VoiceSelectorProps` adds optional `voiceTuning?: VoiceTuningConfig` and `onChangeTuning?: (voiceId: string, tuning: VoiceTuningConfig) => void`.
    - Renders an interactive Per-Voice Acoustic Tuning panel (`data-testid="voice-tuning-panel"`) displaying the active voice name and 3 range sliders:
      - Speed slider (`data-testid="voice-tuning-speed"`, `min="0.5"`, `max="2.0"`, `step="0.05"`, icon `speed`)
      - Pitch slider (`data-testid="voice-tuning-pitch"`, `min="-50"`, `max="50"`, `step="1"`, icon `graphic_eq`)
      - Volume slider (`data-testid="voice-tuning-volume"`, `min="0"`, `max="200"`, `step="5"`, icon `volume_up`)
      - Reset button (`data-testid="voice-tuning-reset"`, icon `restart_alt`) that restores `{ speed: 1.0, pitch: 0, volume: 100 }`.
  - In `frontend/src/app/page.tsx`:
    - Wires `voiceTunings` state into `VoiceSelector` and sends `{ voice_id, speed, pitch, volume }` when calling `/api/session/${sessionId}/voice` or `/api/session/test-voice`.

- [ ] **Step 1: Write the failing test in `tests/test_streamvox_branding_ui.py`**

```python
def test_voice_selector_includes_acoustic_tuning_sliders_and_reset():
    from pathlib import Path
    repo_root = Path(__file__).resolve().parent.parent
    selector_src = (repo_root / "frontend" / "src" / "components" / "VoiceSelector.tsx").read_text(encoding="utf-8")
    types_src = (repo_root / "frontend" / "src" / "types" / "tikfinity.ts").read_text(encoding="utf-8")

    assert "VoiceTuningConfig" in types_src
    assert "DEFAULT_VOICE_TUNING" in types_src
    assert 'data-testid="voice-tuning-panel"' in selector_src
    assert 'data-testid="voice-tuning-speed"' in selector_src
    assert 'data-testid="voice-tuning-pitch"' in selector_src
    assert 'data-testid="voice-tuning-volume"' in selector_src
    assert 'data-testid="voice-tuning-reset"' in selector_src
    assert "restart_alt" in selector_src
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_streamvox_branding_ui.py -k "acoustic_tuning_sliders" -v`
Expected: FAIL with `AssertionError: assert 'VoiceTuningConfig' in types_src`

- [ ] **Step 3: Delegate implementation to OpenCode CLI or implement in `tikfinity.ts`, `VoiceSelector.tsx`, and `page.tsx`**

Update `frontend/src/types/tikfinity.ts`, `frontend/src/components/VoiceSelector.tsx`, and `frontend/src/app/page.tsx`. Ensure all icons use `<span className="material-symbols-rounded">` and zero emojis are used.

- [ ] **Step 4: Run tests and TypeScript compiler to verify all pass**

Run: `pytest tests/test_streamvox_branding_ui.py tests/test_streamvox_typography.py -v` and `cd frontend && npx tsc --noEmit`
Expected: PASS with 0 errors

- [ ] **Step 5: Commit**

```bash
git add frontend/src/types/tikfinity.ts frontend/src/components/VoiceSelector.tsx frontend/src/app/page.tsx tests/test_streamvox_branding_ui.py
git commit -m "feat(ui): add per-voice acoustic tuning sliders to VoiceSelector dashboard"
```
