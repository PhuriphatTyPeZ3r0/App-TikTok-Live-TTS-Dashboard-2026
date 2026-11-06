"""Unit and Contract Tests for StreamVox Live Typography ('Prompt') and Google Material Symbols (Rounded).

This test module validates that the Next.js 15 Single-Page Application (SPA) root layout
(`frontend/src/app/layout.tsx`) and the Open Broadcaster Software (OBS) Studio overlay
template (`templates/overlay.html`) integrate the Google Font 'Prompt' and Google Material
Symbols (Rounded) icon system as part of the StreamVox Live design overhaul.

Voice Actor Attribution: พิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)
Backend Architecture: Asynchronous Server Gateway Interface (ASGI)
"""

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
LAYOUT_TSX = REPO_ROOT / "frontend" / "src" / "app" / "layout.tsx"
OVERLAY_HTML = REPO_ROOT / "templates" / "overlay.html"


def test_layout_includes_prompt_font_and_material_symbols() -> None:
    """Verify frontend/src/app/layout.tsx configures Prompt with weights 300-700, Material Symbols Rounded, and StreamVox Live title."""
    assert LAYOUT_TSX.exists(), f"Missing layout.tsx at {LAYOUT_TSX}"
    content = LAYOUT_TSX.read_text(encoding="utf-8")

    # Prompt font import and weights
    assert "Prompt" in content
    for weight in ["300", "400", "500", "600", "700"]:
        assert weight in content, f"Missing weight {weight} in layout.tsx"
    assert "--font-prompt" in content

    # Google Material Symbols (Rounded) stylesheet
    assert "Material+Symbols+Rounded" in content

    # StreamVox Live title
    assert "StreamVox Live" in content


def test_overlay_includes_prompt_font_and_material_symbols() -> None:
    """Verify templates/overlay.html loads Google Font Prompt and Material Symbols Rounded."""
    assert OVERLAY_HTML.exists(), f"Missing overlay.html at {OVERLAY_HTML}"
    content = OVERLAY_HTML.read_text(encoding="utf-8")

    assert "Prompt" in content
    assert "Material+Symbols+Rounded" in content
