# Modular Pages & Modern Flowbite Enterprise Navbar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decompose the monolithic Single-Page Application (SPA) dashboard into dedicated Next.js 15 App Router pages for each sidebar menu (`/`, `/queue`, `/voice`, `/settings`, `/gift`, `/safety`, `/obs`, `/logs`) powered by a persistent `DashboardContext` and global docked Mini-Player, accompanied by a redesigned Flowbite Modern Enterprise Navbar.

**Architecture:** 
A centralized `DashboardProvider` mounted at the root layout maintains persistent WebSocket telemetry, FIFO queue state, speech synthesis, and Web Audio API playback across page transitions without dropping connections or interrupting ongoing TTS speech. Each sidebar menu links to its own Next.js page route with full-width or dedicated layouts. A redesigned Flowbite Navbar displays active breadcrumbs, the live TikTok `@username` room switcher chip, a master TTS switch, instant voice testing, volume controls, and SSO profile management. A persistent mini-player docked at the bottom of the viewport gives broadcasters continuous playback and waveform visualization on every page.

**Tech Stack:** Next.js 15 (App Router), React 19, Tailwind CSS 3.4, Lucide React, FastAPI WebSockets, Web Audio API, Node Test Runner (`tsx --test`), Pytest.

**Spec:** User alignment via brainstorming:
1. Routing: Dedicated App Router URL paths with persistent `DashboardProvider` at root.
2. Navbar: Flowbite Modern Enterprise layout with breadcrumbs, `@username` chip, Master TTS toggle, and quick test button.
3. Player: Global persistent docked Mini-Player at bottom with full `/queue` page.
4. Sidebar: 8 independent 1-click routes highlighting active route with `usePathname()`.
5. Voice Actor Attribution: Constant citation to **คุณพิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)**.

## Global Constraints
- Zero-fluff, clean and minimal enterprise styling with semantic design tokens (`bg-background`, `bg-card`, `text-foreground`, `border-border`).
- Zero unhandled exceptions or WebSocket reconnection storms on page transitions.
- Minimum 44x44px touch targets on all interactive elements adhering to WCAG 2.1 AA.
- Full academic terminology with acronyms: Single-Page Application (SPA), Open Authorization (OAuth), Proof Key for Code Exchange (PKCE), First-In, First-Out (FIFO), Open Broadcaster Software (OBS), Application Programming Interface (API), User Interface (UI), User Experience (UX), Role-Based Access Control (RBAC).

## Review Focus
1. WebSocket and audio playback continuity: Navigating between `/` and `/queue` or `/voice` must NOT tear down the WebSocket connection or abort currently synthesizing audio.
2. Active route highlighting: `Sidebar.tsx` must correctly highlight the active menu item based on `usePathname()`.
3. Responsive mobile drawer: The mobile sidebar toggle button in the new Navbar must seamlessly open and close the Flowbite mobile drawer without layout shifts.
4. Voice test audio trigger: Clicking "Test Voice" from the Navbar or Voice Studio must synthesize audio through the global audio player without conflicts.
5. Synchronization: All changes in `App-TikTok-Live-TTS-Dashboard-2026` must be mirrored cleanly to `tiktok-live-tts-bot/frontend`.

---

### Task 1: Create Global `DashboardContext` & Provider

**Files:**
- Create: `05_Personal_Projects/01_AI_Agents/App-TikTok-Live-TTS-Dashboard-2026/src/context/DashboardContext.tsx`
- Create: `05_Personal_Projects/01_AI_Agents/App-TikTok-Live-TTS-Dashboard-2026/src/context/__tests__/DashboardContext.test.ts`
- Modify: `05_Personal_Projects/01_AI_Agents/App-TikTok-Live-TTS-Dashboard-2026/src/app/layout.tsx`

**Requirements:**
- Consolidate state from monolithic `page.tsx`:
  - WebSocket connection (`useDashboardSocket`)
  - Settings management (`useTikFinitySettings`)
  - Audio playback & speech waveform state
  - Active speaker (`currentSpeaker`) & queue (`queue`, `skipCurrent`, `clearQueue`)
  - Master TTS toggle (`masterTtsEnabled`, `setMasterTtsEnabled`)
  - Session parameters (`sessionId`, `username`, `backendUrl`, `overlayToken`, `adminToken`)
  - Room switcher modal state (`showRoomModal`, `setShowRoomModal`)
  - Voice auditioning handler (`testVoice`)
- Provide `useDashboard()` hook throwing clear error when used outside provider.
- Wrap `DashboardProvider` in `layout.tsx` inside a client-side wrapper so all App Router pages have immediate access.

- [ ] **Step 1:** Write unit test in `src/context/__tests__/DashboardContext.test.ts` checking provider export, default state values, and hook exception when rendered outside provider.
- [ ] **Step 2:** Run `npm test` in dashboard repo to verify failing test.
- [ ] **Step 3:** Implement `DashboardContext.tsx` with full state management, Web Audio API synthesis handling, and WebSocket dispatchers.
- [ ] **Step 4:** Integrate `DashboardProvider` into `src/app/layout.tsx`.
- [ ] **Step 5:** Run `npm test` and ensure all tests pass.
- [ ] **Step 6:** Commit with message: `feat: implement global DashboardContext for seamless page transitions`.

---

### Task 2: Redesign Modern Flowbite Enterprise Navbar

**Files:**
- Modify: `05_Personal_Projects/01_AI_Agents/App-TikTok-Live-TTS-Dashboard-2026/src/components/Navbar.tsx`
- Modify: `05_Personal_Projects/01_AI_Agents/App-TikTok-Live-TTS-Dashboard-2026/src/components/Navbar.tsx:test` or add test in `src/components/__tests__/Navbar.test.ts`

**Requirements:**
- Implement Flowbite Modern Enterprise Navbar adhering to:
  - Mobile hamburger button (`data-drawer-target="logo-sidebar"`) triggering `toggleMobileSidebar`
  - Breadcrumb showing `StreamVox Live` / `[Active Page Name]`
  - Room Switcher Chip showing `@username` and Live status pill (`bg-emerald-500 animate-pulse`), clicking opens room modal
  - Master TTS Toggle switch (Green when enabled, Red when disabled)
  - Quick Voice Test modal/trigger button with audio icon
  - Master Volume Slider & Mute button
  - Superadministrator / Streamer User Profile Dropdown (`UserProfileButton`)
- 44px touch targets on mobile and accessible ARIA attributes.

- [ ] **Step 1:** Write unit test in `src/components/__tests__/Navbar.test.ts` validating Navbar export, breadcrumb computation, and action triggers.
- [ ] **Step 2:** Run `npm test` to confirm test behavior.
- [ ] **Step 3:** Update `src/components/Navbar.tsx` to the modern Flowbite design using `useDashboard()` and `usePathname()`.
- [ ] **Step 4:** Run `npm test` and verify clean rendering.
- [ ] **Step 5:** Commit with message: `feat: redesign Navbar to Flowbite Modern Enterprise standard`.

---

### Task 3: Update Flowbite Sidebar with Real Route Navigation

**Files:**
- Modify: `05_Personal_Projects/01_AI_Agents/App-TikTok-Live-TTS-Dashboard-2026/src/components/Sidebar.tsx`
- Modify: `05_Personal_Projects/01_AI_Agents/App-TikTok-Live-TTS-Dashboard-2026/src/components/__tests__/Sidebar.test.ts`

**Requirements:**
- Convert Sidebar links from hash/click handlers to Next.js `Link` components pointing to:
  - `/` (Cockpit)
  - `/queue` (Queue)
  - `/voice` (Voice Studio)
  - `/settings` (Chat TTS)
  - `/gift` (Gift Alerts)
  - `/safety` (Safety & Filters)
  - `/obs` (OBS Studio)
  - `/logs` (Broadcast Logs)
- Use `usePathname()` to automatically set active link styling (`bg-primary/10 text-primary border-primary/30 font-semibold`).
- Auto-close mobile drawer when a route link is clicked on small screens.
- Preserve master voice actor citation: **คุณพิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)** in compact bottom pill.

- [ ] **Step 1:** Update `src/components/__tests__/Sidebar.test.ts` to test route paths (`/`, `/queue`, etc.) and active pathname matching.
- [ ] **Step 2:** Run `npm test` to verify test expectations.
- [ ] **Step 3:** Implement Next.js `Link` navigation and `usePathname()` highlighting in `Sidebar.tsx`.
- [ ] **Step 4:** Run `npm test` to verify all tests pass.
- [ ] **Step 5:** Commit with message: `feat: convert Sidebar navigation to real App Router links with active state highlighting`.

---

### Task 4: Create Global Docked Persistent Mini-Player

**Files:**
- Create: `05_Personal_Projects/01_AI_Agents/App-TikTok-Live-TTS-Dashboard-2026/src/components/PersistentAudioPlayer.tsx`
- Create: `05_Personal_Projects/01_AI_Agents/App-TikTok-Live-TTS-Dashboard-2026/src/components/__tests__/PersistentAudioPlayer.test.ts`
- Modify: `05_Personal_Projects/01_AI_Agents/App-TikTok-Live-TTS-Dashboard-2026/src/app/layout.tsx`

**Requirements:**
- Fixed bottom dock (`fixed bottom-0 left-0 right-0 z-30 sm:left-64 h-16 bg-card/95 backdrop-blur border-t border-border`):
  - Left: Active speaker avatar, username, gift/comment pill, and live waveform bars
  - Center: Truncated spoken quote with voice actor name (คุณพิพัฒน์ บุญสิทธิเลิศ)
  - Right: Quick Skip button, Queue count badge (linking to `/queue`), and volume slider
- Standby state: subtle pulse with "Standby • Ready for TikTok Live"
- Ensures streamer always has visibility and control of speech output on any page.

- [ ] **Step 1:** Write unit test in `src/components/__tests__/PersistentAudioPlayer.test.ts`.
- [ ] **Step 2:** Run `npm test` to verify failing test.
- [ ] **Step 3:** Implement `PersistentAudioPlayer.tsx` connected to `useDashboard()`.
- [ ] **Step 4:** Mount `PersistentAudioPlayer` in `layout.tsx` and add bottom padding to pages (`pb-20`).
- [ ] **Step 5:** Run `npm test` and verify clean execution.
- [ ] **Step 6:** Commit with message: `feat: implement global docked persistent mini-player`.

---

### Task 5: Build Dedicated App Router Pages for Each Menu

**Files:**
- Modify: `05_Personal_Projects/01_AI_Agents/App-TikTok-Live-TTS-Dashboard-2026/src/app/page.tsx` (Cockpit)
- Create: `05_Personal_Projects/01_AI_Agents/App-TikTok-Live-TTS-Dashboard-2026/src/app/queue/page.tsx`
- Create: `05_Personal_Projects/01_AI_Agents/App-TikTok-Live-TTS-Dashboard-2026/src/app/voice/page.tsx`
- Create: `05_Personal_Projects/01_AI_Agents/App-TikTok-Live-TTS-Dashboard-2026/src/app/settings/page.tsx`
- Create: `05_Personal_Projects/01_AI_Agents/App-TikTok-Live-TTS-Dashboard-2026/src/app/gift/page.tsx`
- Create: `05_Personal_Projects/01_AI_Agents/App-TikTok-Live-TTS-Dashboard-2026/src/app/safety/page.tsx`
- Create: `05_Personal_Projects/01_AI_Agents/App-TikTok-Live-TTS-Dashboard-2026/src/app/obs/page.tsx`
- Create: `05_Personal_Projects/01_AI_Agents/App-TikTok-Live-TTS-Dashboard-2026/src/app/logs/page.tsx`

**Requirements:**
- Refactor `src/app/page.tsx` to become the dedicated **Cockpit Page**:
  - Top row: Quick Stats (Queue size, Total comments, Gifts received, Active voice)
  - Left: Master Volume, Event toggles, and Quick Controls (`ControlPanel.tsx`)
  - Right: Spotlight `NowSpeakingCard.tsx` and recent `QueueFeed.tsx` preview
- Each new page consumes `useDashboard()`:
  - `/queue`: Expanded full-height Queue Management with filter, search, manual test message, and batch clear
  - `/voice`: Full Voice Ecosystem with all voice cards and real-time acoustic tuning panel (`VoiceSelector.tsx`)
  - `/settings`: Full Chat TTS settings (`TabChatSettings.tsx`)
  - `/gift`: Full Gift TTS and alert configuration (`TabGiftSettings.tsx`)
  - `/safety`: Content moderation, banned keywords, and user blacklist (`TabSafetySettings.tsx`)
  - `/obs`: OBS Browser Source overlay URL copy and resolution settings (`TabObsSettings.tsx`)
  - `/logs`: Live WebSocket and broadcast audit logs console (`TabLogMonitor.tsx`)

- [ ] **Step 1:** Refactor `src/app/page.tsx` into clean, modular Cockpit.
- [ ] **Step 2:** Create `/queue/page.tsx`, `/voice/page.tsx`, `/settings/page.tsx`, `/gift/page.tsx`, `/safety/page.tsx`, `/obs/page.tsx`, `/logs/page.tsx`.
- [ ] **Step 3:** Run `npm test` and `npm run build` in dashboard repo to verify static page generation for all 8 routes.
- [ ] **Step 4:** Commit with message: `feat: create dedicated Next.js App Router pages for all 8 sidebar menus`.

---

### Task 6: Synchronize to Bot Repo, Run Full Test Suites & Deploy

**Files:**
- Mirror all modified files into `05_Personal_Projects/01_AI_Agents/tiktok-live-tts-bot/frontend/`
- Test: `05_Personal_Projects/01_AI_Agents/tiktok-live-tts-bot/tests/`

**Requirements:**
- Copy all new context, pages, and components into `tiktok-live-tts-bot/frontend/`.
- Run `npm test` and `npm run build` in both repositories.
- Run `pytest` on `test_render_auth.py`, `test_websocket_jwt_auth.py`, and `test_auth_components_contract.py`.
- Commit and push both repositories to `main`.
- Verify live production on Vercel via Chrome DevTools and capture screenshots.

- [ ] **Step 1:** Copy updated frontend files from `App-TikTok-Live-TTS-Dashboard-2026` to `tiktok-live-tts-bot/frontend`.
- [ ] **Step 2:** Run `npm test` in `App-TikTok-Live-TTS-Dashboard-2026`.
- [ ] **Step 3:** Run `npm run build` in `App-TikTok-Live-TTS-Dashboard-2026`.
- [ ] **Step 4:** Run `.venv\Scripts\pytest` in `tiktok-live-tts-bot`.
- [ ] **Step 5:** Commit and push both repos to `origin/main`.
- [ ] **Step 6:** Inspect live deployment on `https://tiktok-live-tts-dashboard.vercel.app/` using `chrome-devtools` and capture screenshots.
