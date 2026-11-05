# Red Broadcast Design System Spec for TikTok Live TTS Studio

**Status**: Approved  
**Date**: 2026-11-06  
**Target Platform**: Next.js 15 (App Router), TypeScript, Tailwind CSS, Lucide Icons  
**Voice Identity**: คุณพิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert) — ผู้ให้เสียงพากย์ภาษาไทย อคคทสึ ยูตะ (Yuta Okkotsu)

---

## 1. Intent & Why
A content-first design system engineered for video consumption and live stream monitoring at scale. Red Broadcast replaces the existing dashboard theme with a clean, grid-driven aesthetic that puts live streamer feeds and TTS audio status at the center. Signature broadcast red (`#FF0000`) is reserved strictly for live indicators, audio progress bars, and critical actions (Emergency Flush), avoiding visual fatigue during long broadcasts.

---

## 2. Goals, Non-Goals & Anti-Goals
- **Goals:**
  - Standardize all dashboard UI elements into the Red Broadcast design tokens.
  - Implement collapsible sidebar (240px expanded ↔ 72px icon rail).
  - Implement top navigation (56px height) with attached search bar and voice search button.
  - Transform "Now Speaking" into a 16:9 Video Spotlight Player Card with red `[● LIVE]` badge and progress bar.
  - Transform Queue Feed into video grid/playlist items with 36px avatars, 2-line text clamping, and compact metadata.
  - Support both Light Surface Mode (`#FFFFFF` / `#F2F2F2`) and Dark Cinema Mode (`#0F0F0F` / `#272727`) with `localStorage` persistence.
  - Preserve 100% of the existing WebSocket and REST API contracts with Render backend and OBS Studio.
- **Non-Goals:**
  - Modifying the Python backend FastAPI or WebSocket contracts.
  - Changing external OBS Studio overlay rendering endpoint (`/overlay/{token}`).
- **Anti-Goals:**
  - Overusing red color across general UI components, cards, or borders.
  - Breaking existing contract tests or losing voice test preset functionality.

---

## 3. Design Tokens & Visual Specifications

### Colors
- **Broadcast Red (Primary)**: `#FF0000` (hover: `#CC0000`)
- **Link Blue (Secondary)**: `#065FD4`
- **Neutral**: `#606060` (Gray 600)
- **Light Theme**:
  - Background: `#FFFFFF`
  - Surface: `#F2F2F2` (Gray 100)
  - Text Primary: `#0F0F0F` (Near Black)
  - Text Secondary: `#606060`
  - Border: `#E5E5E5` (Gray 200)
  - Search Button Background: `#F8F8F8`
- **Dark Theme (Cinema)**:
  - Background: `#0F0F0F`
  - Surface: `#272727`
  - Text Primary: `#FFFFFF`
  - Text Secondary: `#AAAAAA`
  - Border: `#3F3F3F`
  - Search Button Background: `#222222`
- **Status Accents**:
  - Success: `#2BA640`
  - Warning: `#FB8C00`
  - Error: `#FF0000`

### Typography
- **Google Fonts**: Roboto (400, 500, 700) and Roboto Mono (400) imported via `next/font/google`.
- Page Title: Roboto 24px/32px, weight 700
- Section / Player Title: Roboto 20px/28px, weight 500
- Video / Chat Title (Grid): Roboto 14px/20px, weight 500, max 2 lines clamped
- Channel / User Name: Roboto 14px/20px, weight 500
- Body Text: Roboto 14px/20px, weight 400
- Metadata / Badges: Roboto 12px/16px, weight 400
- Button Text: Roboto 14px/20px, weight 500

### Elevation & Borders
- **Level 0 (Flat)**: Cards, player, feeds sit flush on background with 1px border. No drop shadows.
- **Level 1**: `0 1px 2px rgba(0,0,0,0.1)` on sticky top bar on scroll.
- **Level 2**: `0 4px 32px rgba(0,0,0,0.1)` on dropdown menus, modals, and presets.
- **Border Radius**:
  - `2px`: Badges, live indicator tags, duration badges
  - `4px`: Dropdown menus, tooltips
  - `8px`: Settings panels, modals
  - `12px`: Thumbnails, player card, large containers
  - `9999px` (`rounded-full`): Subscribe pill buttons, chips, search button right corners, avatars

---

## 4. Component Architectures

### 1. Top Navigation (`Navbar.tsx`)
- Height: 56px, sticky top with Level 1 shadow.
- Left: Hamburger toggle button (collapses sidebar) + Red Broadcast Studio Logo (Red play icon + "TTS Studio").
- Center: 44px height search input with attached 64px search button (`#F8F8F8` / `#222222`) with magnifying glass icon, plus rounded voice search button (`Mic`).
- Right: Dark/Light Mode Toggle, Bell notifications icon, Connection Status Indicators (TikTok Live, Colab Tesla T4 GPU, OBS Studio), Avatar (32px circle).

### 2. Collapsible Sidebar (`Sidebar.tsx`)
- Width: 240px expanded, 72px rail collapsed.
- Navigation items: Home / Cockpit, Live Queue, Voice Presets, OBS Integration, Settings.
- Active item uses surface background (`#F2F2F2` / `#272727`) with weight 700 text.

### 3. Category Filter Chips (`CategoryChips.tsx`)
- Horizontally scrollable chip bar below top bar or atop queue.
- Chips: "ทั้งหมด (All)", "ของขวัญ VIP (Gifts 🎁)", "แชทสด (Chat 💬)", "ระบบ (System)".
- Pill shape (`9999px` radius), active chip has `#0F0F0F` / `#FFFFFF` fill with inverted text.

### 4. Video Spotlight Player Card (`NowSpeakingCard.tsx`)
- 16:9 aspect ratio header area.
- Top-left: Red `[● LIVE]` broadcast badge.
- Audio Waveform Visualizer embedded directly into player screen.
- Bottom: Audio Progress Bar in Broadcast Red (`#FF0000`).
- Bottom row: User avatar (36px), username, message text clamped to 2 lines, and Skip button (`ข้าม`).

### 5. Queue Feed (`QueueFeed.tsx`)
- Structured as video playlist / grid items.
- Item: 36px circular avatar, user name in weight 500, message text clamped to 2 lines, compact metadata (diamonds/timestamp).
- Hover effect with surface background.

### 6. Control Panel & Actions (`ControlPanel.tsx`)
- Subscribe-styled pill buttons (36px height, 9999px radius).
- Master Volume slider with dB meter.
- Prominent Red Emergency Flush button (`#FF0000`, text white).
- Retains existing event callbacks (`onToggleMute`, `onSkip`, `onClearQueue`, `onEmergencyFlush`, `onTestVoice`).

### 7. OBS & Voice Cards (`OBSIntegrationCard.tsx`, `VoiceTestCard.tsx`)
- Styled in Red Broadcast flat cards with 12px radius, neutral borders, and clean typography.
