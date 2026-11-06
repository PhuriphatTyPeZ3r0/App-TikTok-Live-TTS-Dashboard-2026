"""Unit and Contract Tests for StreamVox Live Typography ('Prompt') and Google Material Symbols (Rounded).

This test module validates that the Next.js 15 Single-Page Application (SPA) root layout
(`frontend/src/app/layout.tsx`) and the Open Broadcaster Software (OBS) Studio overlay
template (`templates/overlay.html`) integrate the Google Font 'Prompt' and Google Material
Symbols (Rounded) icon system as part of the StreamVox Live design overhaul.

Voice Actor Attribution: พิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)
Backend Architecture: Asynchronous Server Gateway Interface (ASGI)
"""

from pathlib import Path
import re

REPO_ROOT = Path(__file__).resolve().parent.parent
LAYOUT_TSX = REPO_ROOT / "frontend" / "src" / "app" / "layout.tsx"
OVERLAY_HTML = REPO_ROOT / "templates" / "overlay.html"
EMOJI_ICON_PATTERN = re.compile(r"[\U0001F300-\U0001FAFF\u2600-\u27BF\u2300-\u23FF\u2B50\u2705\u274C\u26A0\uFE0F]")


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
    assert "material-symbols-rounded" in content


def test_zero_emoji_icons_in_ui_components_and_templates() -> None:
    """Verify all emojis used as icons in frontend/src and templates are replaced with Google Material Symbols."""
    for folder in [REPO_ROOT / "frontend" / "src", REPO_ROOT / "templates"]:
        for file_path in folder.rglob("*"):
            if file_path.suffix in {".tsx", ".ts", ".html"}:
                text = file_path.read_text(encoding="utf-8")
                match = EMOJI_ICON_PATTERN.search(text)
                assert match is None, (
                    f"Found emoji character {match.group(0)!r} in {file_path.relative_to(REPO_ROOT)}; "
                    "must use Google Material Symbols (material-symbols-rounded) instead."
                )

