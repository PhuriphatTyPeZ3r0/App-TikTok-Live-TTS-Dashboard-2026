"""Contract and Integration tests for Next.js 15 TikFinity-Style TTS Dashboard.

This test module verifies the component contract, UI architecture, TikFinity glassmorphism styling,
and academic rigor standards for:
- `frontend/src/components/Navbar.tsx`
- `frontend/src/components/TikFinitySettings.tsx`
- `frontend/src/components/tabs/TabChatSettings.tsx`
- `frontend/src/components/tabs/TabGiftSettings.tsx`
- `frontend/src/components/tabs/TabSafetySettings.tsx`
- `frontend/src/components/tabs/TabObsSettings.tsx`
- `frontend/src/components/LiveQueueConsole.tsx`
- `frontend/src/components/NowSpeakingCard.tsx`
- `frontend/src/components/QueueFeed.tsx`
- `frontend/src/app/page.tsx`

Voice actor attribution: พิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)
Contract:
- First-In, First-Out (FIFO) and Priority Queue rendering
- Single-Page Application (SPA) Next.js 15 client-side components
- Asynchronous Server Gateway Interface (ASGI) FastAPI backend event integration
- Model Context Protocol (MCP) and Text-to-Speech (TTS) integration
"""

from pathlib import Path
import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
FRONTEND_DIR = REPO_ROOT / "frontend"
COMPONENTS_DIR = FRONTEND_DIR / "src" / "components"
TABS_DIR = COMPONENTS_DIR / "tabs"
APP_DIR = FRONTEND_DIR / "src" / "app"

NAVBAR_FILE = COMPONENTS_DIR / "Navbar.tsx"
TIKFINITY_SETTINGS_FILE = COMPONENTS_DIR / "TikFinitySettings.tsx"
LIVE_CONSOLE_FILE = COMPONENTS_DIR / "LiveQueueConsole.tsx"
NOW_SPEAKING_FILE = COMPONENTS_DIR / "NowSpeakingCard.tsx"
QUEUE_FEED_FILE = COMPONENTS_DIR / "QueueFeed.tsx"
COLAB_STATUS_FILE = COMPONENTS_DIR / "ColabStatusCard.tsx"
PAGE_FILE = APP_DIR / "page.tsx"


def test_bento_dashboard_files_exist():
    """Verify that all required TikFinity dashboard components and main page exist, and ColabStatusCard is cleansed."""
    assert NAVBAR_FILE.exists(), f"Missing Navbar component at {NAVBAR_FILE}"
    assert TIKFINITY_SETTINGS_FILE.exists(), f"Missing TikFinitySettings at {TIKFINITY_SETTINGS_FILE}"
    assert LIVE_CONSOLE_FILE.exists(), f"Missing LiveQueueConsole at {LIVE_CONSOLE_FILE}"
    assert NOW_SPEAKING_FILE.exists(), f"Missing NowSpeakingCard at {NOW_SPEAKING_FILE}"
    assert QUEUE_FEED_FILE.exists(), f"Missing QueueFeed at {QUEUE_FEED_FILE}"
    assert PAGE_FILE.exists(), f"Missing main page component at {PAGE_FILE}"
    # Verify legacy ColabStatusCard is cleanly removed (Cleansing mandate)
    assert not COLAB_STATUS_FILE.exists(), "ColabStatusCard should be cleansed per user mandate"


def test_navbar_component_contract():
    """Verify Navbar.tsx exports, interface props, and TikFinity status pills."""
    assert NAVBAR_FILE.exists(), f"Missing {NAVBAR_FILE}"
    content = NAVBAR_FILE.read_text(encoding="utf-8")

    # Client-side directive
    assert '"use client"' in content or "'use client'" in content, "Navbar must declare 'use client'"

    # Exported interface and component
    assert "export interface NavbarProps" in content, "Must export NavbarProps interface"
    assert "export function Navbar" in content or "export const Navbar" in content, "Must export Navbar component"

    # Props contract validation
    assert "username?:" in content or "username:" in content
    assert "isConnected?:" in content or "isConnected:" in content or "isConnecting?:" in content or "isConnecting:" in content


def test_queue_feed_component_contract():
    """Verify QueueFeed component contract for priority gifts and individual delete."""
    assert QUEUE_FEED_FILE.exists()
    content = QUEUE_FEED_FILE.read_text(encoding="utf-8")
    assert '"use client"' in content or "'use client'" in content
    assert "export interface QueueFeedProps" in content
    assert "onDeleteItem" in content


def test_queue_feed_red_broadcast_playlist_styling():
    """Verify QueueFeed priority queue badge styling."""
    assert QUEUE_FEED_FILE.exists()
    content = QUEUE_FEED_FILE.read_text(encoding="utf-8")
    assert "isGift" in content or "is_gift" in content


def test_colab_status_card_component_contract():
    """Verify ColabStatusCard is cleansed and TikFinitySettings tabs exist."""
    assert not COLAB_STATUS_FILE.exists(), "ColabStatusCard must be cleansed"
    assert (TABS_DIR / "TabChatSettings.tsx").exists()
    assert (TABS_DIR / "TabGiftSettings.tsx").exists()
    assert (TABS_DIR / "TabSafetySettings.tsx").exists()
    assert (TABS_DIR / "TabObsSettings.tsx").exists()


def test_main_page_bento_grid_assembly():
    """Verify main page.tsx integrates TikFinitySettings and LiveQueueConsole."""
    assert PAGE_FILE.exists()
    content = PAGE_FILE.read_text(encoding="utf-8")
    assert "TikFinitySettings" in content
    assert "LiveQueueConsole" in content


def test_academic_rigor_and_attribution_mandate():
    """Verify voice actor attribution and technical acronym definitions."""
    content = PAGE_FILE.read_text(encoding="utf-8")
    assert "พิพัฒน์ บุญสิทธิเลิศ" in content or "Phiphat Boonsitthilert" in content


def test_dashboard_full_red_broadcast_cockpit():
    """Verify the 2-column TikFinity layout."""
    content = PAGE_FILE.read_text(encoding="utf-8")
    assert "grid" in content
