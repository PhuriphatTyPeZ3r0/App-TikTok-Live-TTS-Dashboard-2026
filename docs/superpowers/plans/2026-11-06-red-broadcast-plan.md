# Red Broadcast Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul the TikTok Live TTS Studio Dashboard with the Red Broadcast Design System, providing a content-first streaming cockpit with broadcast red accents, Roboto typography, collapsible navigation rail, and a 16:9 video spotlight player.

**Architecture:** Implement Red Broadcast design tokens in Tailwind CSS and a theme state provider supporting both Light Surface and Dark Cinema modes. Replace existing UI components with Red Broadcast compliant components (`Navbar`, `Sidebar`, `CategoryChips`, `NowSpeakingCard`, `QueueFeed`, `ControlPanel`, `OBSIntegrationCard`, `VoiceTestCard`) while maintaining 100% backward compatibility with backend REST/WebSocket contracts.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons, FastAPI (Python ASGI backend).

**Spec:** `docs/superpowers/specs/2026-11-06-red-broadcast-design.md`

## Global Constraints

- Broadcast Red (`#FF0000`) is reserved strictly for live indicators, audio progress bars, and critical emergency flush actions.
- Typography strictly uses Roboto (400, 500, 700) and Roboto Mono (400) via `next/font/google`.
- The dashboard must support both Light Surface Mode (`#FFFFFF` / `#F2F2F2`) and Dark Cinema Mode (`#0F0F0F` / `#272727`) with `localStorage` persistence.
- Cards sit flush at Elevation Level 0 with 1px borders; only the sticky header uses Level 1 shadow (`0 1px 2px rgba(0,0,0,0.1)`).
- Honor the voice identity of คุณพิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert) across all voice preset cards.
- All existing Python tests (`tests/test_bento_dashboard_ui.py`, `tests/test_audio_visualizer_contract.py`, `tests/test_dashboard_socket_contract.py`) and Next.js static production builds must pass with 0 errors.

## Review Focus

1. **Theme Persistence Failure:** When opening the dashboard in a new tab or after a page refresh, the user's chosen theme (Light vs Dark) must persist without flashing or resetting to dark default.
2. **Text Overflow in 2-line Title Clamping:** Excessively long chat comments or gift messages must be cleanly clamped to 2 lines with ellipsis (`line-clamp-2`) without overflowing or breaking the card heights.
3. **Emergency Flush Response:** Clicking the `#FF0000` Emergency Flush button must immediately clear the local audio visualizer, reset the Now Speaking card, and invoke `onEmergencyFlush` without unmounting the player.
4. **Sidebar Collapse Visual Transition:** When collapsing sidebar from 240px to 72px rail, icon labels must hide smoothly and the main content area must fluidly expand without horizontal scrollbars.
5. **OBS Copy Reliability:** The 1-click OBS Browser Source copy button must copy the exact URL with parameters and show a transient green verified checkmark.

---

### Task 1: Design Tokens, Fonts & Theme Provider

**Files:**
- Create: `frontend/src/context/ThemeContext.tsx`
- Modify: `frontend/tailwind.config.ts:1-40`
- Modify: `frontend/src/app/layout.tsx:1-45`
- Test: `tests/test_red_broadcast_tokens.py`

**Interfaces:**
- Consumes: None
- Produces: `ThemeContext`, `useTheme() => { theme: 'light' | 'dark', toggleTheme: () => void }`, Tailwind CSS color utilities (`bg-broadcast-red`, `bg-broadcast-dark`, `text-broadcast-secondary`, etc.)

- [ ] **Step 1: Write the failing test for Red Broadcast Design Tokens & Theme Configuration**

```python
def test_tailwind_has_red_broadcast_tokens():
    with open("frontend/tailwind.config.ts", "r", encoding="utf-8") as f:
        content = f.read()
    assert "#FF0000" in content or "broadcast-red" in content
    assert "#0F0F0F" in content or "broadcast-dark" in content
    assert "#065FD4" in content or "broadcast-blue" in content
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_red_broadcast_tokens.py -v`
Expected: FAIL (file does not exist or tokens missing)

- [ ] **Step 3: Implement Design Tokens in `frontend/tailwind.config.ts`, `layout.tsx`, and `ThemeContext.tsx`**

1. Extend `theme.extend.colors` in `frontend/tailwind.config.ts` with:
   - `broadcast-red`: `#FF0000` (hover: `#CC0000`)
   - `broadcast-dark`: `#0F0F0F`
   - `broadcast-surface-light`: `#F2F2F2`
   - `broadcast-surface-dark`: `#272727`
   - `broadcast-blue`: `#065FD4`
   - `broadcast-border-light`: `#E5E5E5`
   - `broadcast-border-dark`: `#3F3F3F`
2. In `frontend/src/app/layout.tsx`, load Google Fonts `Roboto` (weights 400, 500, 700) and `Roboto Mono` (weight 400).
3. Create `frontend/src/context/ThemeContext.tsx` managing `theme` state (`light` | `dark`), reading and persisting to `localStorage.getItem("red_broadcast_theme")`, and wrapping `children` with `<ThemeContext.Provider>`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_red_broadcast_tokens.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/tailwind.config.ts frontend/src/app/layout.tsx frontend/src/context/ThemeContext.tsx tests/test_red_broadcast_tokens.py
git commit -m "feat(tokens): add Red Broadcast design tokens, Roboto fonts, and ThemeProvider"
```

---

### Task 2: Top Navigation, Collapsible Sidebar & Category Chips

**Files:**
- Create: `frontend/src/components/Sidebar.tsx`
- Create: `frontend/src/components/CategoryChips.tsx`
- Modify: `frontend/src/components/Navbar.tsx:1-120`
- Test: `tests/test_red_broadcast_navigation.py`

**Interfaces:**
- Consumes: `useTheme` from `ThemeContext.tsx`
- Produces: `<Navbar onToggleSidebar={() => void} ... />`, `<Sidebar isCollapsed={boolean} onToggle={() => void} />`, `<CategoryChips activeChip={string} onSelect={(id: string) => void} />`

- [ ] **Step 1: Write the failing test for Navigation and Sidebar components**

```python
def test_navigation_and_sidebar_components_exist():
    import os
    assert os.path.exists("frontend/src/components/Sidebar.tsx")
    assert os.path.exists("frontend/src/components/CategoryChips.tsx")
    with open("frontend/src/components/Navbar.tsx", "r", encoding="utf-8") as f:
        content = f.read()
    assert "TTS Studio" in content or "Broadcast" in content
    assert "Search" in content or "placeholder" in content
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_red_broadcast_navigation.py -v`
Expected: FAIL

- [ ] **Step 3: Implement `Navbar.tsx`, `Sidebar.tsx`, and `CategoryChips.tsx`**

1. In `Navbar.tsx`:
   - 56px height, Level 1 shadow on scroll (`shadow-[0_1px_2px_rgba(0,0,0,0.1)]`).
   - Left: Hamburger toggle button + Red Play/Broadcast Studio Logo.
   - Center: 44px height search input with square left corners, attached 64px search button (`#F8F8F8` / `#222222`) with magnifying glass icon, and circular voice search icon button.
   - Right: Theme toggle button (Sun/Moon), Bell notifications, Status badges (TikTok Live, Colab Tesla T4 GPU, OBS Studio).
2. In `Sidebar.tsx`:
   - Collapsible width: 240px expanded vs 72px rail.
   - Nav items: Home / Cockpit, Live Queue, Voice Presets, OBS Integration, Settings.
   - Active item styled with `#F2F2F2` / `#272727` background and font-bold.
3. In `CategoryChips.tsx`:
   - Horizontally scrolling pill chips: "ทั้งหมด (All)", "ของขวัญ VIP (Gifts 🎁)", "แชทสด (Chat 💬)", "ระบบ (System)".
   - Pill radius `rounded-full` (`9999px`), active chip highlighted with dark/light inverted fill.

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_red_broadcast_navigation.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Navbar.tsx frontend/src/components/Sidebar.tsx frontend/src/components/CategoryChips.tsx tests/test_red_broadcast_navigation.py
git commit -m "feat(ui): implement Red Broadcast Navbar, Collapsible Sidebar, and CategoryChips"
```

---

### Task 3: Video Spotlight Player Card (Now Speaking)

**Files:**
- Create: `frontend/src/components/NowSpeakingCard.tsx`
- Modify: `frontend/src/components/AudioVisualizer.tsx:1-100`
- Test: `tests/test_audio_visualizer_contract.py`

**Interfaces:**
- Consumes: `AudioVisualizerProps`, `currentSpeaker: QueueItem | null`, `onSkip: () => void`, `isSpeaking: boolean`
- Produces: `<NowSpeakingCard currentSpeaker={...} isSpeaking={boolean} onSkip={...} />`

- [ ] **Step 1: Write the failing test for Video Spotlight Player Card structure**

```python
def test_now_speaking_card_structure():
    with open("frontend/src/components/NowSpeakingCard.tsx", "r", encoding="utf-8") as f:
        content = f.read()
    assert "LIVE" in content
    assert "aspect-video" in content or "16:9" in content or "aspect-[16/9]" in content
    assert "พิพัฒน์ บุญสิทธิเลิศ" in content or "Phiphat" in content
    assert "#FF0000" in content or "broadcast-red" in content
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_audio_visualizer_contract.py -v`
Expected: FAIL (file does not exist)

- [ ] **Step 3: Implement `NowSpeakingCard.tsx` and integrate `AudioVisualizer.tsx`**

1. Build `NowSpeakingCard.tsx` with a 16:9 (`aspect-video`) player container:
   - Top-left overlay: Red broadcast badge `[● LIVE]` (`bg-[#FF0000] text-white text-xs font-bold px-2 py-0.5 rounded-[2px]`).
   - Center area: Integrated audio waveform bars rendered dynamically via `AudioVisualizer.tsx`.
   - Bottom overlay: Red Progress Bar (`bg-[#FF0000] h-1 w-full`).
   - Bottom row: User avatar (36px circular avatar with fallback), speaker name, 2-line clamped text (`line-clamp-2`), and Skip button (`ข้าม`).
   - Voice identity subtitle: "เสียงพากย์: คุณพิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)".
2. Ensure `AudioVisualizer.tsx` fits smoothly inside the player frame with customizable background.

- [ ] **Step 4: Run tests to verify it passes**

Run: `pytest tests/test_audio_visualizer_contract.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/NowSpeakingCard.tsx frontend/src/components/AudioVisualizer.tsx
git commit -m "feat(player): build Red Broadcast 16:9 Now Speaking Spotlight Card"
```

---

### Task 4: Queue Feed (Video Grid & Playlist Layout)

**Files:**
- Modify: `frontend/src/components/QueueFeed.tsx:1-180`
- Test: `tests/test_bento_dashboard_ui.py`
- Test: `tests/test_dashboard_socket_contract.py`

**Interfaces:**
- Consumes: `QueueItem[]`, `onClearQueue: () => void`, `activeFilter: string`
- Produces: Red Broadcast styled `<QueueFeed />` with 36px avatars, 2-line title clamps, and VIP diamond indicators.

- [ ] **Step 1: Write the failing test for Red Broadcast Queue Feed requirements**

```python
def test_queue_feed_red_broadcast_layout():
    with open("frontend/src/components/QueueFeed.tsx", "r", encoding="utf-8") as f:
        content = f.read()
    assert "line-clamp-2" in content
    assert "rounded-full" in content or "rounded-full h-9 w-9" in content
    assert "💎" in content or "เพชร" in content or "เหรียญ" in content
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_bento_dashboard_ui.py::test_queue_feed_rendering -v`
Expected: FAIL

- [ ] **Step 3: Update `frontend/src/components/QueueFeed.tsx`**

1. Render queue items with YouTube/Red Broadcast playlist item aesthetic:
   - 36px circular avatar (`rounded-full h-9 w-9`).
   - User name with weight 500 (`text-sm font-medium`).
   - Message text clamped to exactly 2 lines (`line-clamp-2 text-sm text-[#0F0F0F] dark:text-white`).
   - Compact metadata: "X เหรียญ/เพชร • รออ่านในคิว" with Gray 600 secondary text.
   - Filter tabs: `[ ทั้งหมด ]`, `[ เฉพาะของขวัญ 🎁 ]`, `[ แชท 💬 ]`.
   - Empty state: Clean flat box with "ไม่มีคิวข้อความรออ่าน (Queue is idle)".

- [ ] **Step 4: Run tests to verify it passes**

Run: `pytest tests/test_bento_dashboard_ui.py tests/test_dashboard_socket_contract.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/QueueFeed.tsx
git commit -m "feat(queue): style QueueFeed with Red Broadcast playlist items and 2-line clamps"
```

---

### Task 5: Control Panel, OBS Wizard, Voice Presets & Full Cockpit Integration

**Files:**
- Modify: `frontend/src/components/ControlPanel.tsx:1-160`
- Modify: `frontend/src/components/OBSIntegrationCard.tsx:1-120`
- Modify: `frontend/src/components/VoiceTestCard.tsx:1-120`
- Modify: `frontend/src/app/page.tsx:1-300`
- Test: `tests/test_bento_dashboard_ui.py`
- Test: `frontend` build test (`npm run build`)

**Interfaces:**
- Consumes: All components from Tasks 1-4, active session state from backend
- Produces: Integrated Cockpit Page at `/` responsive from mobile to 2200px max width.

- [ ] **Step 1: Write the failing test for complete dashboard integration**

```python
def test_dashboard_full_red_broadcast_cockpit():
    with open("frontend/src/app/page.tsx", "r", encoding="utf-8") as f:
        content = f.read()
    assert "Sidebar" in content
    assert "NowSpeakingCard" in content or "QueueFeed" in content
    assert "max-w-[2200px]" in content or "2200px" in content
    assert "Emergency Flush" in content or "🚨 ตัดเสียงฉุกเฉิน" in content
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_bento_dashboard_ui.py -v`
Expected: FAIL

- [ ] **Step 3: Update `ControlPanel.tsx`, `OBSIntegrationCard.tsx`, `VoiceTestCard.tsx`, and `page.tsx`**

1. In `ControlPanel.tsx`:
   - Subscribe-styled pill buttons (36px height, `rounded-full`).
   - Master volume slider with range 0-150% and dB readout.
   - Red Emergency Flush button: `#FF0000` with white text and hover state `#CC0000`.
   - Retain all contract buttons: `🚨 ตัดเสียงฉุกเฉิน (Emergency Flush)`, `onToggleMute`, `onSkip`, `onClearQueue`.
2. In `OBSIntegrationCard.tsx` and `VoiceTestCard.tsx`:
   - Flat card styling with 12px radius and 1px border.
   - Recommended 600x240 px guide and 1-click copy with transient verified icon.
   - Voice preset chips ("ยินดีต้อนรับ", "ขอบคุณของขวัญ 🎁", "เคาะจอเคาะใจ ❤️") honoring คุณพิพัฒน์ บุญสิทธิเลิศ.
3. In `frontend/src/app/page.tsx`:
   - Integrate `ThemeProvider`, `Sidebar` (collapsible 240px ↔ 72px), `Navbar`, `NowSpeakingCard`, `QueueFeed`, `ControlPanel`, `OBSIntegrationCard`, `VoiceTestCard`.
   - Fluid grid adapting smoothly to sidebar state, with max width `2200px`.

- [ ] **Step 4: Run full verification suite**

Run:
```powershell
pytest tests/ -v
cd frontend; npm run build
```
Expected: PASS (40/40 python tests passing, Next.js build clean with 0 errors).

- [ ] **Step 5: Commit & Push**

```bash
git add frontend/src/components/ControlPanel.tsx frontend/src/components/OBSIntegrationCard.tsx frontend/src/components/VoiceTestCard.tsx frontend/src/app/page.tsx
git commit -m "feat(cockpit): integrate full Red Broadcast Cockpit with collapsible sidebar and theme persistence"
git push origin main
git push tool-remote main
```
