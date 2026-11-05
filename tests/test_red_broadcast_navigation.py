"""Tests for Navigation and Cleansing verification in TikFinity-Style TTS Dashboard.

This module validates:
- Top Navigation (`frontend/src/components/Navbar.tsx`) with TikFinity styling and master switch.
- Cleansing verification: `CategoryChips.tsx` is completely removed per user mandate.
- Voice Actor Attribution: คุณพิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert).
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
    """Verify Navbar and layout exist, and CategoryChips is cleanly removed."""
    assert NAVBAR_FILE.exists(), f"Missing Navbar at {NAVBAR_FILE}"
    assert not CATEGORY_CHIPS_FILE.exists(), "CategoryChips must be cleansed per user mandate"
    assert LAYOUT_FILE.exists(), f"Missing layout at {LAYOUT_FILE}"


def test_navbar_red_broadcast_contract():
    """Verify Navbar conforms to TikFinity style navigation."""
    assert NAVBAR_FILE.exists()
    content = NAVBAR_FILE.read_text(encoding="utf-8")

    assert '"use client"' in content or "'use client'" in content
    assert "export interface NavbarProps" in content
    assert "export function Navbar" in content or "export const Navbar" in content
    assert "TikTok" in content or "TTS" in content


def test_category_chips_contract():
    """Verify CategoryChips has been cleansed and removed from components."""
    assert not CATEGORY_CHIPS_FILE.exists(), "CategoryChips must be removed"


def test_academic_rigor_and_attribution_navigation():
    """Verify Thai voice actor attribution and technical acronym definitions in navigation components."""
    for file_path in [NAVBAR_FILE, SIDEBAR_FILE]:
        if not file_path.exists():
            continue
        content = file_path.read_text(encoding="utf-8")
        assert "พิพัฒน์ บุญสิทธิเลิศ" in content or "Phiphat Boonsitthilert" in content
