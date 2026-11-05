"""Tests for Red Broadcast Top Navigation, Collapsible Sidebar, and Category Chips.

This module validates the implementation of Red Broadcast design system components:
- Top Navigation (`frontend/src/components/Navbar.tsx`) with 56px height, Level 1 shadow,
  search bar with voice search, theme toggling, connection badges, and backward-compatible props.
- Collapsible Sidebar (`frontend/src/components/Sidebar.tsx`) with 240px expanded vs 72px rail,
  nav items with active surface highlights, and fluid transition.
- Category Chips (`frontend/src/components/CategoryChips.tsx`) horizontally scrollable pill bar
  with active high-contrast inverted chip states.
- Layout cleanup in `frontend/src/app/layout.tsx`.

Voice Actor Attribution: คุณพิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)
Architecture: Single-Page Application (SPA) & Asynchronous Server Gateway Interface (ASGI)
"""

from pathlib import Path
import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
FRONTEND_DIR = REPO_ROOT / "frontend"
COMPONENTS_DIR = FRONTEND_DIR / "src" / "components"
NAVBAR_FILE = COMPONENTS_DIR / "Navbar.tsx"
SIDEBAR_FILE = COMPONENTS_DIR / "Sidebar.tsx"
CATEGORY_CHIPS_FILE = COMPONENTS_DIR / "CategoryChips.tsx"
LAYOUT_FILE = FRONTEND_DIR / "src" / "app" / "layout.tsx"


def test_navigation_files_exist():
    """Verify Navbar, Sidebar, and CategoryChips component files exist."""
    assert NAVBAR_FILE.exists(), f"Missing Navbar at {NAVBAR_FILE}"
    assert SIDEBAR_FILE.exists(), f"Missing Sidebar at {SIDEBAR_FILE}"
    assert CATEGORY_CHIPS_FILE.exists(), f"Missing CategoryChips at {CATEGORY_CHIPS_FILE}"
    assert LAYOUT_FILE.exists(), f"Missing layout at {LAYOUT_FILE}"


def test_navbar_red_broadcast_contract():
    """Verify Navbar conforms to Red Broadcast 56px height, Level 1 shadow, search, and props."""
    assert NAVBAR_FILE.exists()
    content = NAVBAR_FILE.read_text(encoding="utf-8")

    # Directive & Export
    assert '"use client"' in content or "'use client'" in content
    assert "export interface NavbarProps" in content
    assert "export function Navbar" in content or "export const Navbar" in content

    # 56px height and Level 1 shadow
    assert "h-14" in content or "h-[56px]" in content, "Navbar must have 56px height"
    assert "shadow-[0_1px_2px_rgba(0,0,0,0.1)]" in content, "Navbar must have Level 1 shadow"

    # Surface & Border colors
    assert "bg-white" in content
    assert "dark:bg-broadcast-dark" in content
    assert "border-broadcast-border-light" in content
    assert "dark:border-broadcast-border-dark" in content

    # Left: Hamburger toggle and Red TTS Studio logo badge
    assert "onToggleSidebar" in content, "Navbar must handle onToggleSidebar callback"
    assert "TTS Studio" in content, "Navbar must display 'TTS Studio' branding"
    assert "broadcast-red" in content or "#FF0000" in content, "Branding badge must use broadcast red"

    # Center: Search input, attached search button, and voice search (Mic)
    assert "Search" in content or 'type="search"' in content or 'type="text"' in content
    assert "bg-[#F8F8F8]" in content or "bg-neutral-100" in content or "bg-broadcast-surface-light" in content
    assert "dark:bg-[#222222]" in content or "dark:bg-neutral-800" in content or "dark:bg-broadcast-surface-dark" in content
    assert "Mic" in content, "Navbar center must include Mic voice search button"

    # Right: Theme toggle, Bell icon, connection badges, Avatar (32px circle)
    assert "toggleTheme" in content, "Navbar must support theme toggle"
    assert "Bell" in content, "Navbar must contain notification Bell icon"
    assert "TikTok" in content or "Live" in content, "Navbar must display TikTok Live badge"
    assert "Colab" in content or "GPU" in content, "Navbar must display Colab GPU badge"
    assert "OBS" in content, "Navbar must display OBS Studio badge"
    assert "w-8 h-8 rounded-full" in content or "w-[32px] h-[32px]" in content or "rounded-full" in content, "Avatar must be 32px circular"

    # Backward compatibility props
    assert "isConnected" in content
    assert "colabConnected" in content
    assert "obsConnected" in content
    assert "overlayToken" in content
    assert "backendUrl" in content
    assert "username" in content
    assert "onSwitchAccount" in content
    assert "onOpenOBSPreview" in content


def test_sidebar_red_broadcast_contract():
    """Verify Sidebar.tsx collapsible width (240px vs 72px rail), 5 menu items, and active states."""
    assert SIDEBAR_FILE.exists(), f"Sidebar component missing at {SIDEBAR_FILE}"
    content = SIDEBAR_FILE.read_text(encoding="utf-8")

    assert '"use client"' in content or "'use client'" in content
    assert "export function Sidebar" in content or "export const Sidebar" in content

    # Width: 240px expanded vs 72px rail
    assert "240px" in content or "w-[240px]" in content or "w-60" in content
    assert "72px" in content or "w-[72px]" in content or "w-18" in content

    # 5 navigation items
    assert "แดชบอร์ดหลัก (Cockpit)" in content
    assert "คิวอ่านสด (Live Queue)" in content
    assert "เสียงพากย์ (Voice Studio)" in content
    assert "OBS Studio" in content
    assert "ตั้งค่า (Settings)" in content

    # Active item styling
    assert "bg-broadcast-surface-light" in content
    assert "dark:bg-broadcast-surface-dark" in content
    assert "font-medium" in content

    # Responsive collapsed prop handling
    assert "isCollapsed" in content


def test_category_chips_contract():
    """Verify CategoryChips.tsx pill bar with 9999px radius and 4 chip categories."""
    assert CATEGORY_CHIPS_FILE.exists(), f"CategoryChips missing at {CATEGORY_CHIPS_FILE}"
    content = CATEGORY_CHIPS_FILE.read_text(encoding="utf-8")

    assert '"use client"' in content or "'use client'" in content
    assert "export function CategoryChips" in content or "export const CategoryChips" in content

    # 9999px radius / rounded-full
    assert "rounded-full" in content

    # 4 Category chips
    assert "ทั้งหมด" in content
    assert "ของขวัญ VIP 🎁" in content
    assert "แชทสด 💬" in content
    assert "ระบบ ⚙️" in content

    # High contrast active state
    assert "#0F0F0F" in content or "broadcast-dark" in content
    assert "#FFFFFF" in content or "white" in content


def test_layout_body_classes_cleanup():
    """Verify layout.tsx uses bg-white dark:bg-broadcast-dark text-broadcast-dark dark:text-white."""
    assert LAYOUT_FILE.exists()
    content = LAYOUT_FILE.read_text(encoding="utf-8")

    assert "bg-white dark:bg-broadcast-dark text-broadcast-dark dark:text-white" in content


def test_academic_rigor_and_attribution_navigation():
    """Verify Thai voice actor attribution and technical acronym definitions in navigation components."""
    for file_path in [NAVBAR_FILE, SIDEBAR_FILE, CATEGORY_CHIPS_FILE]:
        if not file_path.exists():
            continue
        content = file_path.read_text(encoding="utf-8")
        assert "พิพัฒน์ บุญสิทธิเลิศ" in content, f"Missing Thai attribution in {file_path.name}"
        assert "Phiphat Boonsitthilert" in content, f"Missing English attribution in {file_path.name}"
        assert "Single-Page Application (SPA)" in content, f"Missing SPA acronym in {file_path.name}"
        assert "Asynchronous Server Gateway Interface (ASGI)" in content, f"Missing ASGI acronym in {file_path.name}"
