# OpenCode Autonomous Task Transfer & Per-Voice Acoustic Tuning Design Specification

**Date:** 2026-11-06
**Project:** StreamVox Live (`05_Personal_Projects/01_AI_Agents/tiktok-live-tts-bot`)
**Author:** Antigravity (Senior Software Engineer)

---

## 1. Intent & Why

StreamVox Live v2.1 PRO currently supports 5 curated Text-to-Speech (TTS) voice profiles (`yuta`, `hana`, `joker`, `anchor`, `niwat`). Streamers need fine-grained acoustic control (**Speed / Rate**, **Pitch**, and **Volume**) customizable per voice profile directly from the dashboard User Interface (UI), while Antigravity needs a repeatable, autonomous workflow skill (`opencode-worker`) to delegate implementation tasks to **OpenCode Command Line Interface (CLI)** (`opencode run --auto -m omniroute/auto/best-coding`) routed through **OmniRoute** (`http://localhost:20128`).

---

## 2. Goals, Non-Goals, and Anti-Goals

### Goals
1. **Reusable OpenCode Worker Skill & Handoff Runner:**
   - Create an Antigravity skill at `C:\Users\iznamu\.agents\skills\opencode-worker\SKILL.md` and a PowerShell execution helper `scripts/run_opencode_task.ps1` inside `tiktok-live-tts-bot` that dispatches structured task prompts to `opencode run --auto --standalone -m omniroute/auto/best-coding`, captures session logs, and enforces `pytest` + `npx tsc --noEmit` verification gates.
2. **Per-Voice Acoustic Tuning Backend (`VoiceTuning` & `VoiceProfile`):**
   - Extend `src/voice_registry.py` with `VoiceTuning(speed: float = 1.0, pitch: int = 0, volume: int = 100)` validation/clamping (`speed` clamped to `[0.5, 2.0]`, `pitch` in Hz clamped to `[-50, 50]`, `volume` percentage clamped to `[0, 200]`) and Edge-TTS formatting helpers (`format_edge_rate`, `format_edge_pitch`, `format_edge_volume`).
   - Extend `SessionInstance` and `SessionManager` in `src/session_manager.py` with `voice_tuning: dict[str, dict[str, float | int]]` per-session state, `get_voice_tuning(session_id, voice_id)` and `set_voice_tuning(session_id, voice_id, speed, pitch, volume)`.
   - Extend `TTSEngine` in `src/tts_engine.py` so `synthesize` and `synthesize_base64` accept optional `speed: float = 1.0`, `pitch: int = 0`, `volume: int = 100`, incorporating non-default tuning into cache keys and passing formatted `rate`, `pitch`, and `volume` arguments to `edge_tts.Communicate`.
   - Extend FastAPI endpoints in `src/web_server.py`:
     - `POST /api/session/{session_id}/voice` and `POST /api/session/voice`: accept optional `speed`, `pitch`, `volume` in request body, persist per-voice tuning on the session, and include `"tuning": {"speed": ..., "pitch": ..., "volume": ...}` in response and `VOICE_CHANGED` WebSocket broadcast.
     - WebSocket `set_voice` action: accept optional `speed`, `pitch`, `volume` and broadcast updated `tuning` in `VOICE_CHANGED`.
     - `POST /api/session/{session_id}/test-voice`: apply session or request-level tuning (`speed`, `pitch`, `volume`) and include `"tuning"` in the `ALERT` broadcast payload.
3. **Per-Voice Acoustic Tuning Frontend (`VoiceSelector.tsx` & `tikfinity.ts`):**
   - Extend `VoiceProfileInfo` and `TikFinitySettings` in `frontend/src/types/tikfinity.ts` with `VoiceTuningConfig` (`speed: number`, `pitch: number`, `volume: number`) and `voiceTunings?: Record<string, VoiceTuningConfig>`.
   - Enhance `frontend/src/components/VoiceSelector.tsx` with an interactive acoustic tuning panel for the currently selected voice profile containing range sliders for **ความเร็ว (Speed `0.5x` – `2.0x`)**, **ระดับเสียงสูง-ต่ำ (Pitch `-50Hz` – `+50Hz`)**, **ความดัง (Volume `0%` – `200%`)**, and a **รีเซ็ตค่าเริ่มต้น (Reset)** button using Google Material Symbols (`speed`, `graphic_eq`, `volume_up`, `restart_alt`) and zero emoji icons.

### Non-Goals
- Modifying the external Google Colaboratory (Colab) Fish Speech server binary protocol (`yuta` Colab synthesis remains strictly isolated and uses client-side/overlay playback rate/gain or Edge-TTS fallback parameters).
- Paid third-party Application Programming Interface (API) dependencies.

### Anti-Goals
- Introducing any emoji characters into UI components or templates (violates `test_zero_emoji_icons_in_ui_components_and_templates`).
- Allowing unvalidated out-of-range `speed`, `pitch`, or `volume` values to crash `edge-tts` or corrupt session state.

---

## 3. Technical Constraints & Standards

- **Full Technical Terminology & Acronyms:** Every Markdown document and docstring must spell out full English technical terms alongside acronyms (e.g., Text-to-Speech (TTS), Application Programming Interface (API), User Interface (UI), Command Line Interface (CLI), Single-Page Application (SPA)).
- **Typography & Icons:** Strictly use Google Font `Prompt` and Google Material Symbols (Rounded) (`<span className="material-symbols-rounded">...</span>`). Zero emojis in UI components.
- **Verification Gate:** All 257+ existing `pytest` unit/integration tests and `npx tsc --noEmit` must pass with zero regressions.
