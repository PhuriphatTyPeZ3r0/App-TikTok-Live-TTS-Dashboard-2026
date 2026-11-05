"""Contract and Integration tests for Next.js 15 Apple visionOS Bento Grid Studio Dashboard.

This test module verifies the component contract, UI architecture, Apple visionOS Liquid Glass styling,
and academic rigor standards for:
- `frontend/src/components/Navbar.tsx`
- `frontend/src/components/ControlPanel.tsx`
- `frontend/src/components/QueueFeed.tsx`
- `frontend/src/components/ColabStatusCard.tsx`
- `frontend/src/app/page.tsx`

Voice actor attribution: พิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)
Contract:
- First-In, First-Out (FIFO) queue rendering and state handling
- Single-Page Application (SPA) Next.js 15 client-side components
- Asynchronous Server Gateway Interface (ASGI) FastAPI backend event integration
- Web Audio Application Programming Interface (Web Audio API) audio visualizer synchronization
- Apple visionOS Frosted Liquid Glass design tokens (liquid-glass, specular-border, ambient-glow)
"""

from pathlib import Path
import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
FRONTEND_DIR = REPO_ROOT / "frontend"
COMPONENTS_DIR = FRONTEND_DIR / "src" / "components"
APP_DIR = FRONTEND_DIR / "src" / "app"

NAVBAR_FILE = COMPONENTS_DIR / "Navbar.tsx"
CONTROL_PANEL_FILE = COMPONENTS_DIR / "ControlPanel.tsx"
QUEUE_FEED_FILE = COMPONENTS_DIR / "QueueFeed.tsx"
COLAB_STATUS_FILE = COMPONENTS_DIR / "ColabStatusCard.tsx"
PAGE_FILE = APP_DIR / "page.tsx"


def test_bento_dashboard_files_exist():
    """Verify that all required dashboard bento grid components and main page exist."""
    assert NAVBAR_FILE.exists(), f"Missing Navbar component at {NAVBAR_FILE}"
    assert CONTROL_PANEL_FILE.exists(), f"Missing ControlPanel component at {CONTROL_PANEL_FILE}"
    assert QUEUE_FEED_FILE.exists(), f"Missing QueueFeed component at {QUEUE_FEED_FILE}"
    assert COLAB_STATUS_FILE.exists(), f"Missing ColabStatusCard component at {COLAB_STATUS_FILE}"
    assert PAGE_FILE.exists(), f"Missing main page component at {PAGE_FILE}"


def test_navbar_component_contract():
    """Verify Navbar.tsx exports, interface props, OBS overlay actions, and status pills."""
    assert NAVBAR_FILE.exists(), f"Missing {NAVBAR_FILE}"
    content = NAVBAR_FILE.read_text(encoding="utf-8")

    # Client-side directive
    assert '"use client"' in content or "'use client'" in content, "Navbar must declare 'use client'"

    # Exported interface and component
    assert "export interface NavbarProps" in content, "Must export NavbarProps interface"
    assert "export function Navbar" in content or "export const Navbar" in content, "Must export Navbar component"

    # Props contract validation
    assert "username?:" in content or "username:" in content
    assert "isConnected:" in content
    assert "isReconnecting:" in content
    assert "backendUrl:" in content
    assert "sessionId:" in content
    assert "overlayToken?:" in content or "overlayToken:" in content

    # Liquid glass styling
    assert "liquid-glass" in content, "Navbar must have liquid-glass styling"
    assert "specular-border" in content, "Navbar must have specular-border styling"

    # Connection status indicators
    assert "Online" in content or "เชื่อมต่อแล้ว" in content
    assert "Reconnecting" in content or "กำลังเชื่อมต่อใหม่" in content
    assert "Disconnected" in content or "ขาดการเชื่อมต่อ" in content

    # OBS Overlay actions
    assert "Copy OBS Overlay URL" in content or "คัดลอก OBS Overlay URL" in content or "overlay" in content.lower()
    assert "Preview Overlay" in content or "ดูตัวอย่าง Overlay" in content or "preview" in content.lower()
    assert "/overlay/" in content, "Must format overlay URL with /overlay/{sessionId}"


def test_control_panel_component_contract():
    """Verify ControlPanel.tsx volume controls, toggles, and Emergency Flush panic button."""
    assert CONTROL_PANEL_FILE.exists(), f"Missing {CONTROL_PANEL_FILE}"
    content = CONTROL_PANEL_FILE.read_text(encoding="utf-8")

    assert '"use client"' in content or "'use client'" in content, "ControlPanel must declare 'use client'"
    assert "export interface ControlPanelProps" in content, "Must export ControlPanelProps interface"
    assert "export function ControlPanel" in content or "export const ControlPanel" in content

    # Props contract
    assert "volume:" in content
    assert "onVolumeChange:" in content
    assert "enableComments:" in content
    assert "onToggleComments:" in content
    assert "enableGifts:" in content
    assert "onToggleGifts:" in content
    assert "onEmergencyFlush:" in content
    assert "onTestVoice:" in content

    # Emergency Flush Panic Button requirements
    assert "🚨 ตัดเสียงฉุกเฉิน (Emergency Flush)" in content, "Must contain exact Emergency Flush button label"
    assert "bg-rose-500" in content, "Emergency button must have rose glowing style"
    assert "whileTap" in content, "Must have Framer Motion whileTap spring physics"

    # Voice test button
    assert "🔊 ทดสอบเสียงสังเคราะห์ (Test Voice)" in content, "Must contain exact Test Voice button label"

    # Volume slider & decibel / percentage indicator
    assert 'type="range"' in content or "type='range'" in content or "slider" in content.lower()
    assert "dB" in content or "เดซิเบล" in content or "%" in content


def test_queue_feed_component_contract():
    """Verify QueueFeed.tsx FIFO list, Now Speaking banner, and VIP Gift styling."""
    assert QUEUE_FEED_FILE.exists(), f"Missing {QUEUE_FEED_FILE}"
    content = QUEUE_FEED_FILE.read_text(encoding="utf-8")

    assert '"use client"' in content or "'use client'" in content, "QueueFeed must declare 'use client'"
    assert "export interface QueueFeedProps" in content, "Must export QueueFeedProps interface"
    assert "export function QueueFeed" in content or "export const QueueFeed" in content

    # Header & Empty state
    assert "คิวเสียงพูด (Speech Queue)" in content, "Must contain header 'คิวเสียงพูด (Speech Queue)'"
    assert "ไม่มีคิวข้อความรออ่าน (Queue is idle)" in content, "Must contain exact empty state text"

    # Now Speaking banner
    assert "speakingItem" in content, "Must reference speakingItem"

    # VIP Gift badges & diamond count
    assert "is_gift" in content or "gift" in content.lower()
    assert "diamond" in content.lower() or "เหรียญ" in content or "diamonds" in content

    # Skip individual queue item
    assert "onSkipItem" in content, "Must support skipping individual queue items"


def test_colab_status_card_component_contract():
    """Verify ColabStatusCard.tsx GPU status, active engine, and tunnel URL configuration."""
    assert COLAB_STATUS_FILE.exists(), f"Missing {COLAB_STATUS_FILE}"
    content = COLAB_STATUS_FILE.read_text(encoding="utf-8")

    assert '"use client"' in content or "'use client'" in content, "ColabStatusCard must declare 'use client'"
    assert "export interface ColabStatusCardProps" in content, "Must export ColabStatusCardProps interface"
    assert "export function ColabStatusCard" in content or "export const ColabStatusCard" in content

    # Props contract
    assert "colabSettings:" in content
    assert "onUpdateSettings:" in content

    # GPU / Tunnel / Engine indicators
    assert "Tesla T4" in content or "GPU" in content, "Must indicate Colab GPU status"
    assert "colab_tunnel_url" in content, "Must display or edit colab_tunnel_url"
    assert "prefer_colab_tts" in content, "Must display or edit prefer_colab_tts toggle"
    assert "activeEngine" in content or "engine" in content.lower()


def test_main_page_bento_grid_assembly():
    """Verify app/page.tsx integrates useDashboardSocket, AudioVisualizer, and bento components."""
    assert PAGE_FILE.exists(), f"Missing {PAGE_FILE}"
    content = PAGE_FILE.read_text(encoding="utf-8")

    assert '"use client"' in content or "'use client'" in content, "page.tsx must declare 'use client'"

    # Subcomponent imports
    assert "Navbar" in content, "page.tsx must import and render Navbar"
    assert "ControlPanel" in content, "page.tsx must import and render ControlPanel"
    assert "QueueFeed" in content, "page.tsx must import and render QueueFeed"
    assert "ColabStatusCard" in content, "page.tsx must import and render ColabStatusCard"
    assert "AudioVisualizer" in content, "page.tsx must import and render AudioVisualizer"

    # Hook usage
    assert "useDashboardSocket" in content, "page.tsx must invoke useDashboardSocket hook"
    assert "useSearchParams" in content, "page.tsx must read query parameters via useSearchParams"

    # Visualizer state binding
    assert "speakingItem" in content, "page.tsx must pass speakingItem or derived isSpeaking to AudioVisualizer"


def test_academic_rigor_and_attribution_mandate():
    """Verify full technical terms with acronyms and voice actor attribution across all files."""
    files_to_check = [NAVBAR_FILE, CONTROL_PANEL_FILE, QUEUE_FEED_FILE, COLAB_STATUS_FILE, PAGE_FILE]

    for file_path in files_to_check:
        assert file_path.exists(), f"File {file_path} must exist"
        content = file_path.read_text(encoding="utf-8")

        # Voice actor attribution
        assert "พิพัฒน์ บุญสิทธิเลิศ" in content, f"Missing Thai voice actor attribution in {file_path.name}"
        assert "Phiphat Boonsitthilert" in content, f"Missing English voice actor attribution in {file_path.name}"

        # Mandatory Acronyms & Technical terms
        assert "First-In, First-Out (FIFO)" in content, f"Missing FIFO definition in {file_path.name}"
        assert "Single-Page Application (SPA)" in content, f"Missing SPA definition in {file_path.name}"
        assert "Asynchronous Server Gateway Interface (ASGI)" in content, f"Missing ASGI definition in {file_path.name}"
        assert "Web Audio Application Programming Interface (Web Audio API)" in content, (
            f"Missing Web Audio API definition in {file_path.name}"
        )
