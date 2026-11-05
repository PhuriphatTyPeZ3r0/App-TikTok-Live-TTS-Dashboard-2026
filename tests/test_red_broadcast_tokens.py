"""Tests for Red Broadcast Design Tokens, Typography, and Theme State Provider.

This module validates that the Red Broadcast design system tokens are strictly
defined in Tailwind CSS, Google Fonts Roboto and Roboto Mono are integrated via Next.js
font loader, and ThemeProvider properly handles 'light' and 'dark' mode persistence
via LocalStorage.

Voice Actor Attribution: คุณพิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)
Backend Architecture: Asynchronous Server Gateway Interface (ASGI)
"""

from pathlib import Path
import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
FRONTEND_DIR = REPO_ROOT / "frontend"
TAILWIND_CONFIG = FRONTEND_DIR / "tailwind.config.ts"
LAYOUT_TSX = FRONTEND_DIR / "src" / "app" / "layout.tsx"
THEME_CONTEXT_TSX = FRONTEND_DIR / "src" / "context" / "ThemeContext.tsx"


def test_tailwind_has_red_broadcast_tokens():
    """Verify frontend/tailwind.config.ts configures Red Broadcast tokens, dark mode, and fonts."""
    assert TAILWIND_CONFIG.exists(), f"Missing tailwind.config.ts at {TAILWIND_CONFIG}"
    content = TAILWIND_CONFIG.read_text(encoding="utf-8")

    # Broadcast red primary and hover tokens
    assert "broadcast-red" in content
    assert "#FF0000" in content or "#ff0000" in content
    assert "#CC0000" in content or "#cc0000" in content

    # Cinema dark and surface tokens
    assert "broadcast-dark" in content
    assert "#0F0F0F" in content or "#0f0f0f" in content
    assert "broadcast-surface-light" in content
    assert "#F2F2F2" in content or "#f2f2f2" in content
    assert "broadcast-surface-dark" in content
    assert "#272727" in content

    # Link blue and border tokens
    assert "broadcast-blue" in content
    assert "#065FD4" in content or "#065fd4" in content
    assert "broadcast-border-light" in content
    assert "#E5E5E5" in content or "#e5e5e5" in content
    assert "broadcast-border-dark" in content
    assert "#3F3F3F" in content or "#3f3f3f" in content

    # Dark mode class strategy
    assert "darkMode" in content
    assert '"class"' in content or "'class'" in content

    # Font families
    assert "--font-roboto" in content or "roboto" in content.lower()


def test_layout_has_roboto_fonts_and_theme_provider():
    """Verify layout.tsx loads Roboto, Roboto_Mono, and mounts ThemeProvider."""
    assert LAYOUT_TSX.exists(), f"Missing layout.tsx at {LAYOUT_TSX}"
    content = LAYOUT_TSX.read_text(encoding="utf-8")

    # Font imports from next/font/google
    assert "Roboto" in content
    assert "Roboto_Mono" in content
    assert "next/font/google" in content

    # Weights configured
    assert "400" in content
    assert "500" in content
    assert "700" in content

    # Font variables attached to layout
    assert "--font-roboto" in content
    assert "--font-roboto-mono" in content

    # ThemeProvider wraps application tree
    assert "ThemeProvider" in content


def test_theme_context_exists_and_implements_contract():
    """Verify ThemeContext.tsx implements theme state, localStorage persistence, and useTheme hook."""
    assert THEME_CONTEXT_TSX.exists(), f"Missing ThemeContext.tsx at {THEME_CONTEXT_TSX}"
    content = THEME_CONTEXT_TSX.read_text(encoding="utf-8")

    # Client component directive
    assert '"use client"' in content or "'use client'" in content

    # Theme persistence key
    assert "red_broadcast_theme" in content

    # Theme toggle and state contract
    assert "toggleTheme" in content
    assert "useTheme" in content
    assert "ThemeProvider" in content
    assert "light" in content
    assert "dark" in content

    # Document element dark class manipulation
    assert "classList" in content
