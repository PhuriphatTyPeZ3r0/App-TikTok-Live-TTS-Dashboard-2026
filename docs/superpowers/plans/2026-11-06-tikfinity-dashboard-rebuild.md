# TikFinity-Style TTS Dashboard Rebuild & Cleansing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the TikTok Live TTS web dashboard into a professional, modern TikFinity-style streamer console (`https://tikfinity.zerody.one/tiktok/tts`) with tabbed configuration, Priority Queue for gifts, real-time audio sync, and 100% cleansing of legacy artifacts (Colab card, manual token inputs, and noisy logs).

**Architecture:** A Hybrid Master Controller architecture where the Next.js frontend console acts as the authoritative queue orchestrator with `localStorage` settings persistence. The dashboard processes live TikTok chat and gift events, performs client-side anti-spam and banned-words normalization, enforces a Priority Queue (gifts preempt chat), and synchronizes skip/pause/clear actions with the OBS Browser Source overlay via FastAPI WebSockets.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Web Audio API, FastAPI (Python 3.11), WebSockets, Fish Audio Cloud API.

**Spec:** [`docs/superpowers/specs/2026-11-06-tikfinity-dashboard-rebuild-design.md`](file:///C:/Users/iznamu/OneDrive%20-%20Panyapiwat%20Institute%20of%20Management/05_Personal_Projects/01_AI_Agents/tiktok-live-tts-bot/docs/superpowers/specs/2026-11-06-tikfinity-dashboard-rebuild-design.md)

## Global Constraints

- **Zero Cost Cloud Tier:** No external paid services or databases; all configurations persist in browser `localStorage`.
- **Voice Identity:** Custom voice model for คุณพิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert / Yuta) using Model ID `9c110ffde8bc42709516395dfbcfb4a2` on Fish Audio Developer Tier (`s2.1-pro-free`).
- **Cleansing Mandate:** Remove `ColabStatusCard.tsx`, manual token input forms, noisy raw technical logs, and redundant `CategoryChips.tsx`.
- **Naming & Acronym Standard:** Always mention full technical terms alongside acronyms (e.g., Model Context Protocol (MCP), Text-to-Speech (TTS), Open Broadcaster Software (OBS)).

## Review Focus

1. **Elongated Spam Text:** Viewer sends "สวัสดีค้าบบบบบบบบบบบบบบบบบ" — text normalizer must clamp character repetition to maximum 2 consecutive characters ("สวัสดีครับ") to prevent speech engine stall.
2. **URL / Link Injection:** Viewer sends "เข้ากลุ่มฟรี https://t.me/spam_link ด่วน" — text normalizer must strip URLs completely before synthesis.
3. **Gift Priority Preemption:** Chat queue has 5 pending comments; a viewer sends a 10-coin gift — the gift alert must jump to index 0 of the waiting queue and play immediately after the currently speaking audio finishes.
4. **OBS & Dashboard Echo Prevention:** Streamer has both Dashboard and OBS Studio open — `inDashboardAudio` toggle must allow muting browser tab audio so streamer's OBS Desktop Audio capture does not produce a double-sound echo.
5. **Real-time Skip Synchronization:** Streamer clicks "⏭️ Skip Current" or "🗑️ Clear Queue" on Dashboard — backend WebSocket must immediately broadcast stop signal to `/ws/overlay/{session_id}` so OBS audio terminates simultaneously.

---

### Task 1: Text Utilities & Anti-Spam Normalization Engine

**Files:**
- Create: `frontend/src/lib/textUtils.ts`
- Test: `frontend/src/lib/__tests__/textUtils.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export interface NormalizeOptions {
    readUsername?: boolean;
    username?: string;
    maxCharacters?: number;
    bannedWords?: string[];
  }

  export function normalizeTtsText(rawText: string, options?: NormalizeOptions): {
    text: string;
    isBlocked: boolean;
    reason?: string;
  };
  export function isUserOnCooldown(userId: string, cooldownSeconds: number, historyMap: Map<string, number>): boolean;
  ```

- [ ] **Step 1: Write the failing unit tests for text normalization**

Create `frontend/src/lib/__tests__/textUtils.test.ts` testing URL stripping, repeat character reduction, length truncation, and banned word detection:

```typescript
import { normalizeTtsText, isUserOnCooldown } from '../textUtils';

describe('textUtils normalization', () => {
  test('strips URLs from text', () => {
    const res = normalizeTtsText('ดูไลฟ์ที่ https://example.com/live สนุกมาก');
    expect(res.text).toBe('ดูไลฟ์ที่ สนุกมาก');
    expect(res.isBlocked).toBe(false);
  });

  test('collapses excessive character repetition', () => {
    const res = normalizeTtsText('สวัสดีค้าบบบบบบบ');
    expect(res.text).toBe('สวัสดีค้าบบ');
  });

  test('truncates text exceeding maxCharacters', () => {
    const longText = 'ก'.repeat(150);
    const res = normalizeTtsText(longText, { maxCharacters: 100 });
    expect(res.text.length).toBeLessThanOrEqual(100);
  });

  test('blocks text containing banned words', () => {
    const res = normalizeTtsText('ข้อความมีคำหยาบมาก', { bannedWords: ['คำหยาบ'] });
    expect(res.isBlocked).toBe(true);
    expect(res.reason).toBe('banned_word');
  });

  test('prepends username when readUsername is true', () => {
    const res = normalizeTtsText('สวัสดีครับ', { readUsername: true, username: 'Somchai' });
    expect(res.text).toBe('Somchai บอกว่า: สวัสดีครับ');
  });

  test('enforces user cooldown', () => {
    const map = new Map<string, number>();
    const now = Date.now();
    map.set('user123', now);
    expect(isUserOnCooldown('user123', 15, map)).toBe(true);
    expect(isUserOnCooldown('user456', 15, map)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `powershell -Command "Set-Location '05_Personal_Projects\01_AI_Agents\tiktok-live-tts-bot\frontend'; npx jest src/lib/__tests__/textUtils.test.ts"`
Expected: FAIL with "Cannot find module '../textUtils'"

- [ ] **Step 3: Implement `normalizeTtsText` and `isUserOnCooldown` in `frontend/src/lib/textUtils.ts`**

Implement regex URL stripping (`/https?:\/\/\S+/gi`), repeated characters clamp (`/(.)\1{2,}/g` -> `$1$1`), banned word check, length clamping, and username formatting.

- [ ] **Step 4: Run test to verify it passes**

Run: `powershell -Command "Set-Location '05_Personal_Projects\01_AI_Agents\tiktok-live-tts-bot\frontend'; npx jest src/lib/__tests__/textUtils.test.ts"`
Expected: PASS all 6 tests

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/textUtils.ts frontend/src/lib/__tests__/textUtils.test.ts
git commit -m "feat(frontend): add textUtils normalization and anti-spam engine with unit tests"
```

---

### Task 2: TikFinity Settings State & Storage Layer

**Files:**
- Create: `frontend/src/types/tikfinity.ts`
- Create: `frontend/src/hooks/useTikFinitySettings.ts`
- Test: `frontend/src/hooks/__tests__/useTikFinitySettings.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export interface TikFinitySettings {
    masterTtsEnabled: boolean;
    chatTtsEnabled: boolean;
    readUsername: boolean;
    antiSpamEnabled: boolean;
    maxCharacters: number;
    userCooldownSeconds: number;
    giftTtsEnabled: boolean;
    giftPriorityQueue: boolean;
    giftMinCoins: number;
    giftTemplate: string;
    bannedWords: string[];
    blacklistedUsers: string[];
    inDashboardAudio: boolean;
    volume: number;
  }
  export function useTikFinitySettings(): {
    settings: TikFinitySettings;
    updateSettings: (partial: Partial<TikFinitySettings>) => void;
    resetDefaults: () => void;
  };
  ```

- [ ] **Step 1: Write the failing test for settings persistence**

Create `frontend/src/hooks/__tests__/useTikFinitySettings.test.ts` verifying default values and `localStorage` syncing.

- [ ] **Step 2: Run test to verify it fails**

Run: `powershell -Command "Set-Location '05_Personal_Projects\01_AI_Agents\tiktok-live-tts-bot\frontend'; npx jest src/hooks/__tests__/useTikFinitySettings.test.ts"`
Expected: FAIL with module not found.

- [ ] **Step 3: Implement types in `frontend/src/types/tikfinity.ts` and hook in `frontend/src/hooks/useTikFinitySettings.ts`**

Define `DEFAULT_TIKFINITY_SETTINGS` with TikFinity spec defaults. Implement hook with `useEffect` to hydrate from `localStorage.getItem('tikfinity_tts_settings_v1')` and sync changes with `localStorage.setItem`.

- [ ] **Step 4: Run test to verify it passes**

Run: `powershell -Command "Set-Location '05_Personal_Projects\01_AI_Agents\tiktok-live-tts-bot\frontend'; npx jest src/hooks/__tests__/useTikFinitySettings.test.ts"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/types/tikfinity.ts frontend/src/hooks/useTikFinitySettings.ts frontend/src/hooks/__tests__/useTikFinitySettings.test.ts
git commit -m "feat(frontend): implement useTikFinitySettings hook with localStorage persistence"
```

---

### Task 3: TikFinity Tabbed Settings Components

**Files:**
- Create: `frontend/src/components/TikFinitySettings.tsx`
- Create: `frontend/src/components/tabs/TabChatSettings.tsx`
- Create: `frontend/src/components/tabs/TabGiftSettings.tsx`
- Create: `frontend/src/components/tabs/TabSafetySettings.tsx`
- Create: `frontend/src/components/tabs/TabObsSettings.tsx`

**Interfaces:**
- Consumes: `useTikFinitySettings`, `TikFinitySettings`
- Produces: React Components for the 4 tabs matching the Interactive Mockup styling.

- [ ] **Step 1: Implement `TabChatSettings.tsx`**

Includes toggle for Chat TTS, Read Username, Anti-Spam clamp, Max Characters slider (30-250 with live number badge), and User Cooldown number input.

- [ ] **Step 2: Implement `TabGiftSettings.tsx`**

Includes toggle for Gift Alerts TTS, Priority Queue toggle (highlighted in Amber glassmorphism), Minimum Coin Threshold input, and Gift Template text input (`ขอบคุณ {user} ที่ส่ง {amount}x {gift} ให้ยูตะนะครับ!`).

- [ ] **Step 3: Implement `TabSafetySettings.tsx`**

Includes textarea for Banned Words (comma-separated) and Blacklisted Users (comma-separated `@username`).

- [ ] **Step 4: Implement `TabObsSettings.tsx`**

Includes OBS Browser Source URL box with 1-Click Copy button (`navigator.clipboard.writeText`) and In-Dashboard Audio switch with echo prevention explanation.

- [ ] **Step 5: Implement `TikFinitySettings.tsx` container**

Implements tab switching state (`'chat' | 'gift' | 'safety' | 'obs'`) and renders corresponding tab component with TikFinity Dark theme.

- [ ] **Step 6: Verify component compilation with Next.js type-check**

Run: `powershell -Command "Set-Location '05_Personal_Projects\01_AI_Agents\tiktok-live-tts-bot\frontend'; npx tsc --noEmit"`
Expected: Exit code 0, no errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/TikFinitySettings.tsx frontend/src/components/tabs/*.tsx
git commit -m "feat(frontend): create TikFinity tabbed settings components"
```

---

### Task 4: Live Queue Console & Now Speaking Card

**Files:**
- Create: `frontend/src/components/LiveQueueConsole.tsx`
- Modify: `frontend/src/components/NowSpeakingCard.tsx`
- Modify: `frontend/src/components/QueueFeed.tsx`

**Interfaces:**
- Consumes:
  ```typescript
  export interface QueueItem {
    id: string;
    username: string;
    text: string;
    isGift: boolean;
    giftName?: string;
    giftAmount?: number;
    coins?: number;
    timestamp: number;
  }
  ```
- Produces: Interactive Now Speaking Card with Waveform visualizer, Quick Action Buttons (⏭️ Skip, ⏸️ Pause, 🗑️ Clear Queue), and Queue list with individual deletion.

- [ ] **Step 1: Refactor `NowSpeakingCard.tsx` to TikFinity Dark Glassmorphism**

Display current speaker avatar, username, badge (e.g. `TOP 1` or `GIFT PRIORITY`), speech bubble, animated CSS waveform bars, and action buttons (`Skip`, `Pause`, `Clear Queue`).

- [ ] **Step 2: Refactor `QueueFeed.tsx` to support Priority Queue items**

Render list with amber highlight for `isGift: true`, item type badge, text preview, and an individual "X" button calling `onDeleteItem(id)`.

- [ ] **Step 3: Create `LiveQueueConsole.tsx` assembling both cards**

Wraps `NowSpeakingCard` and `QueueFeed` in the right-column layout container.

- [ ] **Step 4: Verify component compilation with Next.js type-check**

Run: `powershell -Command "Set-Location '05_Personal_Projects\01_AI_Agents\tiktok-live-tts-bot\frontend'; npx tsc --noEmit"`
Expected: Exit code 0.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/LiveQueueConsole.tsx frontend/src/components/NowSpeakingCard.tsx frontend/src/components/QueueFeed.tsx
git commit -m "feat(frontend): rebuild LiveQueueConsole, NowSpeakingCard and QueueFeed with priority queue UI"
```

---

### Task 5: WebSocket & Audio Orchestration Adapter & Complete Cleansing

**Files:**
- Modify: `frontend/src/hooks/useDashboardSocket.ts`
- Modify: `frontend/src/components/Navbar.tsx`
- Modify: `frontend/src/app/page.tsx`
- Delete: `frontend/src/components/ColabStatusCard.tsx`
- Delete: `frontend/src/components/CategoryChips.tsx`

**Interfaces:**
- Produces: Refactored `page.tsx` displaying the clean 2-column TikFinity layout, handling 1-Click auto-connect, priority queue sorting, JIT audio synthesis playback, and sending WebSocket control actions.

- [ ] **Step 1: Update `useDashboardSocket.ts` to emit control actions**

Add functions:
`skipCurrentAudio()`, `pauseAudio()`, `resumeAudio()`, `clearQueue()` sending JSON-RPC / WebSocket actions `{ action: 'control_skip' | 'control_pause' | 'control_resume' | 'control_clear', session_id: sessionId }`.

- [ ] **Step 2: Update `Navbar.tsx`**

Clean header with TikTok LIVE badge (`@phuriphat_live`), Fish Audio engine badge (`คุณพิพัฒน์ บุญสิทธิเลิศ`), Master TTS switch, and Quick Voice Test button.

- [ ] **Step 3: Update `page.tsx` with Priority Queue orchestration & cleansing**

Reorganize layout into 2 columns:
Left: `<TikFinitySettings />`
Right: `<LiveQueueConsole />`
Delete references to `ColabStatusCard` and `CategoryChips`.
Integrate `normalizeTtsText` upon receiving `EVENT_MESSAGE` or `EVENT_GIFT`:
If `isGift: true` and `giftPriorityQueue: true`, prepend item to waiting queue index 0.

- [ ] **Step 4: Delete legacy files `ColabStatusCard.tsx` and `CategoryChips.tsx`**

Remove the deleted components to maintain clean codebase.

- [ ] **Step 5: Run Next.js production build check**

Run: `powershell -Command "Set-Location '05_Personal_Projects\01_AI_Agents\tiktok-live-tts-bot\frontend'; npm run build"`
Expected: `✓ Compiled successfully`, `✓ Generating static pages (4/4)` with 0 errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/page.tsx frontend/src/components/Navbar.tsx frontend/src/hooks/useDashboardSocket.ts
git rm frontend/src/components/ColabStatusCard.tsx frontend/src/components/CategoryChips.tsx
git commit -m "refactor(frontend): rebuild page layout to TikFinity style, connect priority queue and cleanse legacy cards"
```

---

### Task 6: Backend WebSocket Sync & Overlay Control Broadcast

**Files:**
- Modify: `src/web_server.py:480-550`
- Modify: `tests/test_web_server.py`

**Interfaces:**
- Consumes: WebSocket message `{ action: 'control_skip' | 'control_pause' | 'control_resume' | 'control_clear' }` on `/ws/dashboard/{session_id}`
- Produces: Broadcasts `{ type: 'STOP_AUDIO' }` or `{ type: 'PAUSE_AUDIO' }` to all clients connected to `/ws/overlay/{session_id}`.

- [ ] **Step 1: Write the failing backend test in `tests/test_web_server.py`**

Test that when a dashboard WebSocket client sends `control_skip`, an overlay client connected to the same session receives `STOP_AUDIO`.

```python
@pytest.mark.asyncio
async def test_dashboard_control_skip_broadcasts_to_overlay(client, mock_session_manager):
    session = mock_session_manager.create_session("streamer1", "token123")
    # Verify websocket broadcast handling for control_skip
```

- [ ] **Step 2: Run test to verify it fails**

Run: `powershell -Command "Set-Location '05_Personal_Projects\01_AI_Agents\tiktok-live-tts-bot'; pytest tests/test_web_server.py -k test_dashboard_control_skip -v"`
Expected: FAIL

- [ ] **Step 3: Implement control message broadcasting in `src/web_server.py`**

In the `/ws/dashboard/{session_id}` WebSocket loop, parse incoming JSON messages. If `action in ("control_skip", "control_clear")`, call `await overlay_hub.broadcast(session_id, {"type": "STOP_AUDIO"})`. If `action == "control_pause"`, broadcast `{"type": "PAUSE_AUDIO"}`.

- [ ] **Step 4: Run backend tests to verify they pass**

Run: `powershell -Command "Set-Location '05_Personal_Projects\01_AI_Agents\tiktok-live-tts-bot'; pytest tests/test_web_server.py -k test_dashboard_control_skip -v"`
Expected: PASS

- [ ] **Step 5: Run full backend test suite**

Run: `powershell -Command "Set-Location '05_Personal_Projects\01_AI_Agents\tiktok-live-tts-bot'; pytest -q"`
Expected: 230+ passed, 0 failures.

- [ ] **Step 6: Commit**

```bash
git add src/web_server.py tests/test_web_server.py
git commit -m "feat(backend): add dashboard-to-overlay control broadcast for skip, pause, and clear"
```

---

### Task 7: Full Integration Verification, Git Push & Cloud Deployment

**Files:**
- All changed files

- [ ] **Step 1: Run complete backend test suite**

Run: `powershell -Command "Set-Location '05_Personal_Projects\01_AI_Agents\tiktok-live-tts-bot'; pytest"`
Expected: 100% PASS

- [ ] **Step 2: Run frontend production build**

Run: `powershell -Command "Set-Location '05_Personal_Projects\01_AI_Agents\tiktok-live-tts-bot\frontend'; npm run build"`
Expected: 100% PASS with 0 lint/TS errors.

- [ ] **Step 3: Push changes to remote repositories**

Run: `powershell -Command "Set-Location '05_Personal_Projects\01_AI_Agents\tiktok-live-tts-bot'; git push origin main; git push tool-remote main"`
Expected: Successfully pushed to GitHub (`origin`) and Render/Vercel linked repo (`tool-remote`).

- [ ] **Step 4: Verify Vercel & Render production deployment**

Verify via HTTP health checks that Vercel dashboard and Render backend are LIVE and healthy.

- [ ] **Step 5: Final documentation update**

Update `README.md` and release notes with the new TikFinity Dashboard documentation.
