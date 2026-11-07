# Responsive Sidebar, Centered Popups & All-Platform Optimization Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the StreamVox Live frontend into a fully responsive, cross-platform live streaming cockpit with a hybrid collapsible/slide-over responsive sidebar, 100% viewport-centered visionOS modal dialogs, and comprehensive adaptations for Apple (iOS/iPadOS/macOS) and Samsung (Galaxy Ultra/Fold/Tab) devices.

**Architecture:** 
- Hybrid Sidebar: Desktop offers a collapsible icon rail (72px) / expanded drawer (240px); Mobile and Tablet hide the sidebar into a high-performance slide-over drawer accessible via an ergonomic Navbar Hamburger button with frosted glass backdrop blur.
- Centered Modals: All popups (`AuthModal`, TikTok LIVE Room Switcher, OBS Preview) use `fixed inset-0 flex items-center justify-center` with Dynamic Viewport Height (`100dvh`), smooth scale-in/fade-in animation, and safe-area margin.
- All-Platform Polish: Safe-Area Inset utilities (`env(safe-area-inset-*)`), minimum 44x44px touch targets conforming to Apple Human Interface Guidelines (HIG) and Samsung One UI standards, and fluid 1-column mobile / 2-column tablet & desktop Bento Grid.

**Tech Stack:** Next.js 15 App Router, React 19, Tailwind CSS, Lucide React, Apple visionOS Frosted Liquid Glass tokens, Supabase GoTrue Auth, Render Managed PostgreSQL.

**Voice Actor Attribution:** พิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert) — Official voice actor for Yuta Okkotsu (Jujutsu Kaisen 0) Thai dub.

---

## Global Constraints

- **Zero Unsubstantiated Claims:** All UI layouts adhere to Apple Human Interface Guidelines (HIG) touch target metrics (44x44pt) and Google Material / Samsung One UI specifications (48x48dp minimum recommendation).
- **Mandatory Academic Acronyms:** Must include full terminology alongside abbreviations: Single-Page Application (SPA), Content Delivery Network (CDN), Asynchronous Server Gateway Interface (ASGI), Role-Based Access Control (RBAC), Row Level Security (RLS), Universally Unique Identifier (UUID), Application Programming Interface (API), JavaScript Object Notation (JSON).
- **Zero Emojis in Badges & System Indicators:** Maintain clean iconography using Lucide React and Google Material Symbols Rounded (`material-symbols-rounded`).
- **Production Build Integrity:** Must compile cleanly with `npm run build` (0 TypeScript / Webpack errors) and maintain 100% pass rate (309/309) on `pytest`.

---

## Review Focus

1. **Virtual Keyboard & Dynamic Viewport Height (DVH):** Modals must not overflow or shift off-center when mobile virtual keyboard opens on iOS Safari or Samsung Internet (`max-h-[calc(100dvh-2rem)] overflow-y-auto`).
2. **Safe Area Inset Clipping:** Content must not be obscured by Apple Dynamic Island, iPhone Notch, Home Indicator bar, or Samsung hole-punch camera (`env(safe-area-inset-top/bottom/left/right)`).
3. **Touch Target Accessibility:** All buttons and interactive tabs must meet the minimum 44x44px bounding box to prevent miss-clicks during live streaming.
4. **Desktop Rail vs Mobile Drawer Transition:** Window resize from mobile (<768px) to desktop (>=768px) must smoothly restore desktop sidebar state without trapped drawer artifacts.
5. **Backdrop & Focus Trapping:** Clicking the blurred backdrop or pressing `Escape` key must dismiss the open mobile sidebar drawer and pop-up dialogs cleanly.

---

## File Structure & Responsibilities

| File Path | Responsibility |
|---|---|
| `src/app/globals.css` | Safe Area Inset utility tokens, `@keyframes modalScaleIn`, touch target helpers, and Apple glass styling |
| `src/components/Navbar.tsx` | Sticky master header with Hamburger drawer trigger, compact status badges, and 44px touch targets |
| `src/components/Sidebar.tsx` | Hybrid sidebar: 72px/240px desktop collapsible rail + mobile slide-over drawer with backdrop blur |
| `src/components/auth/AuthModal.tsx` | 100% viewport-centered Apple visionOS glass dialog, DVH-aware, mobile-optimized |
| `src/app/page.tsx` | State coordination for sidebar, room switcher modal centering, responsive 1-col mobile / 2-col desktop Bento Grid |
| `src/components/TikFinitySettings.tsx` | Horizontally scrollable tab pills on mobile, touch-friendly setting controls |
| `src/components/LiveQueueConsole.tsx` | Responsive queue height, touch-friendly queue controls (Skip, Pause, Clear) |

---

## Implementation Tasks

### Task 1: Safe-Area Tokens, Centering Keyframes & CSS Utilities
- [ ] Add `@keyframes modalScaleIn` and `.modal-center-animate` to `src/app/globals.css`.
- [ ] Add Safe Area Inset utility classes (`pt-safe`, `pb-safe`, `pl-safe`, `pr-safe`).
- [ ] Add touch target helper classes for mobile (`min-touch-target`).
- [ ] Verify Tailwind builds without warnings.

### Task 2: Hybrid Responsive Sidebar Component (`Sidebar.tsx`)
- [ ] Extend `SidebarProps` with `isMobileOpen?: boolean`, `onCloseMobile?: () => void`.
- [ ] Support Desktop collapsible rail (72px collapsed / 240px expanded) with smooth CSS transition.
- [ ] Add Mobile/Tablet slide-over drawer with fixed backdrop overlay (`bg-black/60 backdrop-blur-sm`).
- [ ] Add drawer header with brand pill, close button (`X`), and safe-area padding.
- [ ] Wire keyboard `Escape` handler and outside click handler for mobile drawer dismissal.
- [ ] Ensure navigation items have minimum 44px touch target height.

### Task 3: Navbar Responsive Hamburger Button & Mobile Polish (`Navbar.tsx`)
- [ ] Add Hamburger Menu button (`Menu` / `X` icon from `lucide-react`) visible on mobile/tablet viewports.
- [ ] Wire `onToggleSidebar` prop to Hamburger button.
- [ ] Ensure all action buttons in Navbar (Quick Voice Test, Master Toggle, Theme, User Profile) have >= 44x44px touch targets.
- [ ] Optimize status pills and labels for narrow mobile screens (Samsung Fold outer ~344px, iPhone 14 ~375px-390px).

### Task 4: 100% Viewport-Centered Modal Dialogs (`AuthModal.tsx` & `page.tsx`)
- [ ] Standardize `AuthModal.tsx` outer container: `fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto`.
- [ ] Apply `modal-center-animate`, `max-h-[calc(100dvh-2rem)]`, and centered auto-margins to `AuthModal.tsx`.
- [ ] Standardize Room Switcher Modal (`showRoomModal` in `page.tsx`) with the identical centered modal layout.
- [ ] Ensure both dialogs dismiss cleanly on backdrop click or `Escape` key.

### Task 5: Page Layout Integration & Bento Grid Responsive Flow (`page.tsx`)
- [ ] Integrate `<Sidebar>` into `src/app/page.tsx` with `isSidebarCollapsed` (desktop) and `isMobileSidebarOpen` (mobile).
- [ ] Wire active tab switching from Sidebar to corresponding sections and subtabs.
- [ ] Reconfigure main Bento Grid layout: `grid grid-cols-1 lg:grid-cols-12` with responsive spacing.
- [ ] Add safe-area bottom padding to avoid interference with Apple Home Indicator and Samsung Navigation Bar.

### Task 6: Touch Targets & Responsive Polish in Settings & Live Queue
- [ ] Enable smooth horizontal scroll for subtab selector in `TikFinitySettings.tsx` on mobile.
- [ ] Ensure control buttons in `LiveQueueConsole.tsx` (Skip, Pause, Clear) meet 44px touch targets.
- [ ] Test fluid wrapping of sliders and input fields.

### Task 7: Production Verification & Sync
- [ ] Run `npx tsc --noEmit` and `npm run build` in `App-TikTok-Live-TTS-Dashboard-2026`.
- [ ] Sync updated components to `tiktok-live-tts-bot/frontend` to maintain backend contract.
- [ ] Run `pytest` to verify 309/309 backend contract tests pass (100%).
- [ ] Commit and push changes to GitHub repository [`PhuriphatTyPeZ3r0/App-TikTok-Live-TTS-Dashboard-2026`](https://github.com/PhuriphatTyPeZ3r0/App-TikTok-Live-TTS-Dashboard-2026).
