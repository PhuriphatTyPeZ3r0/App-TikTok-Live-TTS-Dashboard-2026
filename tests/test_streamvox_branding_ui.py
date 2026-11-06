"""Unit and Contract Tests for StreamVox Live VoiceSelector Component and Branding UI Integration.

This test module verifies:
1. `frontend/src/components/VoiceSelector.tsx` exists and renders all 5 voice profile IDs
   (`yuta`, `hana`, `joker`, `anchor`, `niwat`), engine badges, and Google Material Symbols
   (`material-symbols-rounded`).
2. `frontend/src/types/tikfinity.ts` exports `VoiceProfileInfo` and includes `selectedVoiceId`
   in `TikFinitySettings`.
3. `frontend/src/components/Navbar.tsx` includes `"StreamVox"` branding and Material Symbols.
4. `frontend/src/components/TikFinitySettings.tsx` integrates `<VoiceSelector>`.
5. `frontend/src/app/page.tsx` manages `selectedVoiceId`, syncs with `/voice` endpoint,
   and passes `voice_id` during voice testing.

Voice Actor Attribution: พิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)
Architecture: Single-Page Application (SPA) Next.js 15 communicating with Asynchronous Server
Gateway Interface (ASGI) FastAPI backend over WebSockets (WS) and Representational State Transfer (REST)
Application Programming Interface (API) for Text-to-Speech (TTS) synthesis.
"""

from pathlib import Path
import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
FRONTEND_DIR = REPO_ROOT / "frontend"
TYPES_FILE = FRONTEND_DIR / "src" / "types" / "tikfinity.ts"
VOICE_SELECTOR_FILE = FRONTEND_DIR / "src" / "components" / "VoiceSelector.tsx"
NAVBAR_FILE = FRONTEND_DIR / "src" / "components" / "Navbar.tsx"
SETTINGS_FILE = FRONTEND_DIR / "src" / "components" / "TikFinitySettings.tsx"
PAGE_FILE = FRONTEND_DIR / "src" / "app" / "page.tsx"


def test_voice_selector_and_branding_exist():
    """Verify VoiceSelector.tsx exists and StreamVox branding + selectedVoiceId are integrated."""
    assert VOICE_SELECTOR_FILE.exists(), f"Missing VoiceSelector.tsx at {VOICE_SELECTOR_FILE}"

    navbar_content = NAVBAR_FILE.read_text(encoding="utf-8")
    assert "StreamVox" in navbar_content

    page_content = PAGE_FILE.read_text(encoding="utf-8")
    assert "selectedVoiceId" in page_content or "selected_voice" in page_content


def test_voice_selector_five_profiles_and_material_symbols():
    """Verify VoiceSelector.tsx renders all 5 voice profile IDs, Material Symbols, and audition controls."""
    assert VOICE_SELECTOR_FILE.exists(), f"Missing VoiceSelector.tsx at {VOICE_SELECTOR_FILE}"
    content = VOICE_SELECTOR_FILE.read_text(encoding="utf-8")

    for profile_id in ["yuta", "hana", "joker", "anchor", "niwat"]:
        assert f'"{profile_id}"' in content or f"'{profile_id}'" in content, (
            f"VoiceSelector must include voice profile ID: {profile_id}"
        )

    assert "material-symbols-rounded" in content, "VoiceSelector must use Google Material Symbols (Rounded)"
    for icon_name in ["record_voice_over", "graphic_eq", "mic", "campaign", "smart_toy"]:
        assert icon_name in content, f"VoiceSelector must include Material Symbol icon: {icon_name}"

    assert "/api/voices" in content, "VoiceSelector must fetch voice profiles from /api/voices"
    assert "ฟังตัวอย่าง" in content, "VoiceSelector must include Thai audition button text"
    assert "onSelectVoice" in content
    assert "onTestVoice" in content


def test_tikfinity_types_voice_profile_contract():
    """Verify frontend/src/types/tikfinity.ts exports VoiceProfileInfo and selectedVoiceId."""
    content = TYPES_FILE.read_text(encoding="utf-8")
    assert "export interface VoiceProfileInfo" in content
    assert "selectedVoiceId" in content


def test_navbar_streamvox_live_branding_and_icons():
    """Verify Navbar.tsx displays StreamVox Live branding, v2.1 PRO badge, and Material Symbols."""
    content = NAVBAR_FILE.read_text(encoding="utf-8")
    assert "StreamVox Live" in content
    assert "v2.1 PRO" in content
    assert "material-symbols-rounded" in content
    assert "พิพัฒน์ บุญสิทธิเลิศ" in content or "Phiphat Boonsitthilert" in content


def test_settings_and_page_voice_synchronization():
    """Verify TikFinitySettings integrates VoiceSelector and page.tsx syncs with /voice and /test-voice."""
    settings_content = SETTINGS_FILE.read_text(encoding="utf-8")
    assert "VoiceSelector" in settings_content

    page_content = PAGE_FILE.read_text(encoding="utf-8")
    assert "/voice" in page_content
    assert "set_voice" in page_content
    assert "voice_id" in page_content


def test_voice_selector_includes_acoustic_tuning_sliders_and_reset():
    """Verify VoiceSelector.tsx and tikfinity.ts support per-voice speed, pitch, volume sliders and reset."""
    selector_src = VOICE_SELECTOR_FILE.read_text(encoding="utf-8")
    types_src = TYPES_FILE.read_text(encoding="utf-8")

    assert "VoiceTuningConfig" in types_src
    assert "DEFAULT_VOICE_TUNING" in types_src
    assert 'data-testid="voice-tuning-panel"' in selector_src
    assert 'data-testid="voice-tuning-speed"' in selector_src
    assert 'data-testid="voice-tuning-pitch"' in selector_src
    assert 'data-testid="voice-tuning-volume"' in selector_src
    assert 'data-testid="voice-tuning-reset"' in selector_src
    assert "restart_alt" in selector_src

