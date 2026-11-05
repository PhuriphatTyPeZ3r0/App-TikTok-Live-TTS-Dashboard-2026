# Next.js 15 Apple Liquid Glass Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy a modern, high-performance Streamer Dashboard using Next.js 15 (App Router) and the Apple visionOS Frosted Liquid Glass Design System, decoupled from the FastAPI backend and deployable to Vercel with 1-click.

**Architecture:** A decoupled frontend Single-Page Application (SPA) in `frontend/` communicating with the Render Free Web Service backend via native WebSockets (`/ws/dashboard`) and REST APIs. The UI implements a visionOS Bento Grid layout with real-time Web Audio API waveform visualization, priority queue cards, master volume controls, and emergency queue purges.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript 5.5+, Tailwind CSS v3.4, Framer Motion 11+, Lucide React, Web Audio API, Vercel Edge CDN.

**Spec:** `docs/superpowers/specs/2026-11-05-apple-liquid-glass-dashboard-design.md`

## Global Constraints

- **Language & Framework:** TypeScript with strict typing, Next.js 15 App Router.
- **Design System:** Apple visionOS Frosted Liquid Glass (`backdrop-blur-3xl`, multi-layer specular borders `rgba(255,255,255,0.12)`, fluid spring physics).
- **Cost Mandate:** 100% Free-Tier ($0/month) on Vercel Global Edge Network.
- **Voice Branding:** Attributed to "พิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)" with backward-compatible alias "yuta".
- **Academic Rigor:** Full technical terminology with acronyms (Asynchronous Server Gateway Interface (ASGI), Single-Page Application (SPA), Content Delivery Network (CDN), First-In, First-Out (FIFO), Web Audio Application Programming Interface (Web Audio API), etc.).

## Review Focus

1. **Backend URL Misconfiguration:** When `NEXT_PUBLIC_BACKEND_URL` is empty or unreachable, the dashboard must gracefully prompt the streamer to input their Render backend URL instead of crashing with a white screen.
2. **WebSocket Sudden Disconnect & Exponential Backoff:** If the Render free tier sleeps or the connection drops during streaming, the socket client must enter an animated "Reconnecting" pill state and automatically retry with exponential backoff (1s, 2s, 4s, 8s, 16s) without dropping queued user events.
3. **Audio Context Autoplay Policy:** Browsers block audio playback unless initiated by user interaction; the visualizer and voice tester must handle `AudioContext.resume()` gracefully on the first user click.
4. **Emergency Flush Confirmation:** The Emergency Panic button (`CONTROL_FLUSH`) must execute within < 50ms over WebSocket and provide immediate visual haptic feedback (screen shake / glass glow).
5. **CORS & Mixed Content Resilience:** Secure HTTPS/WSS communication must be enforced when deployed on Vercel (`*.vercel.app`) connecting to Render (`*.onrender.com`).

---

### Task 1: Next.js 15 Project Scaffolding & Tailwind Liquid Glass Configuration (`frontend/`)

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/src/app/globals.css`
- Create: `frontend/src/app/layout.tsx`
- Create: `vercel.json`
- Test: `tests/test_frontend_scaffold.py`

**Interfaces:**
- Produces: `frontend/` directory configured with Next.js 15, TypeScript, Tailwind CSS, Framer Motion, Lucide Icons, and Apple Liquid Glass design tokens.

- [ ] **Step 1: Write test for frontend scaffold validation**
Create `tests/test_frontend_scaffold.py` to verify that `frontend/package.json`, `frontend/tailwind.config.ts`, `frontend/src/app/globals.css`, and `vercel.json` contain the required Next.js 15 dependencies, glass utility classes, and Vercel build settings.

- [ ] **Step 2: Run test to verify it fails**
Run: `pytest tests/test_frontend_scaffold.py -v`
Expected: FAIL (files do not exist).

- [ ] **Step 3: Scaffold Next.js 15 project structure**
Create `frontend/package.json` with `next: ^15.0.0`, `react: ^19.0.0`, `framer-motion: ^11.0.0`, `lucide-react: ^0.450.0`, `tailwindcss: ^3.4.0`.
Create `frontend/src/app/globals.css` defining visionOS classes: `.liquid-glass`, `.specular-border`, `.frosted-card`, `.ambient-glow`.
Create `vercel.json` defining root directory as `frontend` and framework as `nextjs`.

- [ ] **Step 4: Run test to verify it passes**
Run: `pytest tests/test_frontend_scaffold.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add frontend/ vercel.json tests/test_frontend_scaffold.py
git commit -m "feat(frontend): scaffold Next.js 15 project with Apple visionOS Liquid Glass design system"
```

---

### Task 2: Real-Time WebSocket Hook & State Management (`useDashboardSocket.ts`)

**Files:**
- Create: `frontend/src/hooks/useDashboardSocket.ts`
- Create: `frontend/src/types/dashboard.ts`
- Test: `tests/test_dashboard_socket_contract.py`

**Interfaces:**
- Consumes: Backend WebSocket endpoint `ws(s)://<backend>/ws/dashboard/{session_id}?token={admin_token}`.
- Produces: `useDashboardSocket(backendUrl, sessionId, adminToken)` returning `{ isConnected, isReconnecting, queue, speakingItem, stats, colabUrl, sendControlFlush, testVoice, updateColabSettings }`.

- [ ] **Step 1: Write contract test for dashboard WebSocket hook payload**
Create `tests/test_dashboard_socket_contract.py` to verify event types (`STATUS_UPDATE`, `EVENT_MESSAGE`, `EVENT_GIFT`, `CONTROL_FLUSH`) and payload data contracts match backend `src/web_server.py`.

- [ ] **Step 2: Run test to verify it fails**
Run: `pytest tests/test_dashboard_socket_contract.py -v`
Expected: FAIL.

- [ ] **Step 3: Implement `useDashboardSocket.ts` and `dashboard.ts`**
Create TypeScript types for `QueueItem`, `DashboardStats`, `DashboardMessage` in `frontend/src/types/dashboard.ts`.
Implement `useDashboardSocket.ts` with exponential backoff auto-reconnect (1s to 16s), message dispatching, and REST API helpers for `/api/settings/colab` and `/api/session/test-voice`.

- [ ] **Step 4: Run test to verify it passes**
Run: `pytest tests/test_dashboard_socket_contract.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add frontend/src/hooks/ frontend/src/types/ tests/test_dashboard_socket_contract.py
git commit -m "feat(frontend): implement real-time useDashboardSocket hook with exponential backoff"
```

---

### Task 3: Real-Time Audio Spectrum & Waveform Canvas Visualizer (`AudioVisualizer.tsx`)

**Files:**
- Create: `frontend/src/components/AudioVisualizer.tsx`
- Test: `tests/test_audio_visualizer_contract.py`

**Interfaces:**
- Consumes: `isSpeaking: boolean`, `accentColor?: string`
- Produces: Animated HTML5 Canvas component with reactive sine wave frequency bars and breathing visionOS glow.

- [ ] **Step 1: Write contract test for AudioVisualizer**
Create `tests/test_audio_visualizer_contract.py` verifying props and HTML5 Canvas render contract.

- [ ] **Step 2: Run test to verify it fails**
Run: `pytest tests/test_audio_visualizer_contract.py -v`
Expected: FAIL.

- [ ] **Step 3: Implement `AudioVisualizer.tsx`**
Create `AudioVisualizer.tsx` using `useRef<HTMLCanvasElement>` and `requestAnimationFrame`. When `isSpeaking` is true, render oscillating waveform bars with dynamic cyan/violet gradient; when idle, render gentle harmonic breathing waves.

- [ ] **Step 4: Run test to verify it passes**
Run: `pytest tests/test_audio_visualizer_contract.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add frontend/src/components/AudioVisualizer.tsx tests/test_audio_visualizer_contract.py
git commit -m "feat(frontend): add real-time audio spectrum and waveform canvas visualizer"
```

---

### Task 4: Bento Grid Studio Cards & Main Dashboard Page

**Files:**
- Create: `frontend/src/components/Navbar.tsx`
- Create: `frontend/src/components/ControlPanel.tsx`
- Create: `frontend/src/components/QueueFeed.tsx`
- Create: `frontend/src/components/ColabStatusCard.tsx`
- Create: `frontend/src/app/page.tsx`
- Test: `tests/test_bento_dashboard_ui.py`

**Interfaces:**
- Consumes: Hooks from Task 2, Visualizer from Task 3.
- Produces: Complete, interactive Bento Grid Studio Dashboard rendered in visionOS Frosted Liquid Glass.

- [ ] **Step 1: Write contract test for Bento Grid components**
Create `tests/test_bento_dashboard_ui.py` verifying component exports, accessibility labels, and emergency flush trigger interactions.

- [ ] **Step 2: Run test to verify it fails**
Run: `pytest tests/test_bento_dashboard_ui.py -v`
Expected: FAIL.

- [ ] **Step 3: Implement Bento Grid components and `page.tsx`**
- `Navbar.tsx`: Creator handle, connection pill, quick OBS copy button.
- `ControlPanel.tsx`: Master volume slider, comment/gift toggles, Emergency Panic button (CONTROL_FLUSH) with Framer Motion spring click, Test Voice button.
- `QueueFeed.tsx`: Real-time FIFO queue with VIP Gold badges for gifts and 1-click skip.
- `ColabStatusCard.tsx`: Real-time Colab Tesla T4 GPU latency and tunnel URL update drawer.
- `page.tsx`: Assembles the Bento Grid layout with responsive desktop/tablet grid columns.

- [ ] **Step 4: Run test to verify it passes**
Run: `pytest tests/test_bento_dashboard_ui.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add frontend/src/components/ frontend/src/app/page.tsx tests/test_bento_dashboard_ui.py
git commit -m "feat(frontend): assemble Apple visionOS Bento Grid studio dashboard"
```

---

### Task 5: Vercel 1-Click Deployment Guide & Project Documentation

**Files:**
- Create: `docs/VERCEL_RENDER_DEPLOYMENT_GUIDE.md`
- Modify: `README.md`
- Test: `tests/test_vercel_render_docs.py`

**Interfaces:**
- Produces: Complete step-by-step deployment documentation and 1-Click Deploy buttons for Vercel + Render.

- [ ] **Step 1: Write test for deployment documentation**
Create `tests/test_vercel_render_docs.py` verifying markdown links, Vercel badge URLs, and academic citations.

- [ ] **Step 2: Run test to verify it fails**
Run: `pytest tests/test_vercel_render_docs.py -v`
Expected: FAIL.

- [ ] **Step 3: Create `docs/VERCEL_RENDER_DEPLOYMENT_GUIDE.md` and update `README.md`**
- Write `docs/VERCEL_RENDER_DEPLOYMENT_GUIDE.md` detailing Vercel deployment, setting `NEXT_PUBLIC_BACKEND_URL`, and connecting to Render backend.
- Update `README.md` adding "Deploy to Vercel" button alongside Render button.

- [ ] **Step 4: Run test to verify it passes**
Run: `pytest tests/test_vercel_render_docs.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add docs/VERCEL_RENDER_DEPLOYMENT_GUIDE.md README.md tests/test_vercel_render_docs.py
git commit -m "docs: add Vercel and Render decoupled deployment guide and update README"
```

---

### Task 6: Full Verification, Regression Test Suite & Push

**Files:**
- Test: Entire repository pytest test suite (`pytest -v`)

- [ ] **Step 1: Run complete test suite**
Run: `.venv\Scripts\pytest -v`
Expected: 100% PASS across all unit, integration, and contract tests.

- [ ] **Step 2: Push changes to GitHub**
```bash
git push origin main
```
