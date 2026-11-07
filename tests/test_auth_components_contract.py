"""Tests for Supabase Authentication, RBAC Role Gate, and Auth UI Components Contract.

This module validates:
- File existence for all Supabase Auth and Role-Based Access Control (RBAC) components.
- Export contracts and interface signatures for hooks and UI components.
- Zero-emoji enforcement across all authentication source code and UI files.
- Academic rigor and mandatory technical terminology:
    - Role-Based Access Control (RBAC)
    - Row Level Security (RLS)
    - Universally Unique Identifier (UUID)
    - Single Sign-On (SSO)
    - Application Programming Interface (API)
- Liquid Glass visionOS styling tokens and offline fallback resilience.
"""

from pathlib import Path
import re
import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
FRONTEND_DIR = REPO_ROOT / "frontend"
HOOKS_DIR = FRONTEND_DIR / "src" / "hooks"
COMPONENTS_DIR = FRONTEND_DIR / "src" / "components"
AUTH_COMPONENTS_DIR = COMPONENTS_DIR / "auth"

USE_SUPABASE_AUTH_FILE = HOOKS_DIR / "useSupabaseAuth.ts"
ROLE_GATE_FILE = AUTH_COMPONENTS_DIR / "RoleGate.tsx"
GOOGLE_LOGIN_BUTTON_FILE = AUTH_COMPONENTS_DIR / "GoogleLoginButton.tsx"
TIKTOK_LOGIN_BUTTON_FILE = AUTH_COMPONENTS_DIR / "TikTokLoginButton.tsx"
AUTH_MODAL_FILE = AUTH_COMPONENTS_DIR / "AuthModal.tsx"
USER_PROFILE_BUTTON_FILE = AUTH_COMPONENTS_DIR / "UserProfileButton.tsx"
AUTH_BARREL_FILE = AUTH_COMPONENTS_DIR / "index.ts"
NAVBAR_FILE = COMPONENTS_DIR / "Navbar.tsx"

AUTH_FILES = [
    USE_SUPABASE_AUTH_FILE,
    ROLE_GATE_FILE,
    GOOGLE_LOGIN_BUTTON_FILE,
    TIKTOK_LOGIN_BUTTON_FILE,
    AUTH_MODAL_FILE,
    USER_PROFILE_BUTTON_FILE,
    AUTH_BARREL_FILE,
]


def test_auth_files_exist():
    """Verify all required authentication and authorization files exist."""
    for file_path in AUTH_FILES:
        assert file_path.exists(), f"Required auth component file missing: {file_path}"


def test_use_supabase_auth_hook_contract():
    """Verify useSupabaseAuth hook implementation and exported contract."""
    content = USE_SUPABASE_AUTH_FILE.read_text(encoding="utf-8")

    # Exports
    assert "export function useSupabaseAuth" in content or "export const useSupabaseAuth" in content
    assert "export interface UseSupabaseAuthReturn" in content
    assert "export default useSupabaseAuth" in content

    # Contract methods
    assert "signInWithPassword:" in content
    assert "signUp:" in content
    assert "signInWithGoogle:" in content
    assert "signInWithTikTok:" in content
    assert "signOut:" in content
    assert "refreshProfile:" in content
    assert "isConfigured:" in content
    assert "role:" in content

    # Logger consumption under 'AUTH' category
    assert "logger" in content
    assert "'AUTH'" in content

    # Offline fallback logic
    assert "isSupabaseConfigured" in content
    assert "streamer" in content


def test_role_gate_component_contract():
    """Verify RoleGate declarative authorization component contract."""
    content = ROLE_GATE_FILE.read_text(encoding="utf-8")

    assert '"use client"' in content or "'use client'" in content
    assert "export interface RoleGateProps" in content
    assert "export function RoleGate" in content or "export const RoleGate" in content
    assert "allowedRoles" in content
    assert "useSupabaseAuth" in content

    # Permissive offline fallback
    assert "!isConfigured" in content
    assert "children" in content


def test_login_buttons_contract():
    """Verify GoogleLoginButton and TikTokLoginButton contracts and clean SVGs."""
    google_content = GOOGLE_LOGIN_BUTTON_FILE.read_text(encoding="utf-8")
    assert '"use client"' in google_content or "'use client'" in google_content
    assert "export interface GoogleLoginButtonProps" in google_content
    assert "export function GoogleLoginButton" in google_content
    assert "<svg" in google_content
    assert "Google Single Sign-On (SSO)" in google_content

    tiktok_content = TIKTOK_LOGIN_BUTTON_FILE.read_text(encoding="utf-8")
    assert '"use client"' in tiktok_content or "'use client'" in tiktok_content
    assert "export interface TikTokLoginButtonProps" in tiktok_content
    assert "export function TikTokLoginButton" in tiktok_content
    assert "<svg" in tiktok_content
    assert "TikTok Single Sign-On (SSO)" in tiktok_content


def test_auth_modal_contract():
    """Verify AuthModal component contract and tab structure."""
    content = AUTH_MODAL_FILE.read_text(encoding="utf-8")

    assert '"use client"' in content or "'use client'" in content
    assert "export interface AuthModalProps" in content
    assert "export function AuthModal" in content
    assert "GoogleLoginButton" in content
    assert "TikTokLoginButton" in content
    assert "useSupabaseAuth" in content
    assert "Sign In" in content
    assert "Create Account" in content or "Sign Up" in content
    assert "!isConfigured" in content


def test_user_profile_button_contract():
    """Verify UserProfileButton displays avatar, role pill, and dropdown."""
    content = USER_PROFILE_BUTTON_FILE.read_text(encoding="utf-8")

    assert '"use client"' in content or "'use client'" in content
    assert "export interface UserProfileButtonProps" in content
    assert "export function UserProfileButton" in content
    assert "useSupabaseAuth" in content
    assert "ROLE_STYLES" in content
    assert "ADMIN" in content
    assert "STREAMER" in content
    assert "VIEWER" in content
    assert "Sign Out" in content


def test_navbar_auth_integration():
    """Verify Navbar integrates UserProfileButton and AuthModal."""
    content = NAVBAR_FILE.read_text(encoding="utf-8")

    assert "UserProfileButton" in content
    assert "AuthModal" in content
    assert "<UserProfileButton" in content
    assert "<AuthModal" in content


def test_zero_emoji_compliance_in_auth_files():
    """Strictly assert no emoji characters are present in any of the authentication files."""
    # Unicode emoji ranges: Emoticons, Miscellaneous Symbols and Pictographs, Transport and Map, Supplemental
    emoji_pattern = re.compile(
        "[\U0001F600-\U0001F64F"  # emoticons
        "\U0001F300-\U0001F5FF"  # symbols & pictographs
        "\U0001F680-\U0001F6FF"  # transport & map
        "\U0001F1E0-\U0001F1FF"  # flags
        "\U00002702-\U000027B0"  # dingbats
        "\U000024C2-\U0001F251"
        "\U0001F900-\U0001F9FF"  # Supplemental Symbols and Pictographs
        "\U0001FA70-\U0001FAFF"  # Symbols and Pictographs Extended-A
        "]+",
        flags=re.UNICODE,
    )

    for file_path in AUTH_FILES:
        text = file_path.read_text(encoding="utf-8")
        matches = emoji_pattern.findall(text)
        assert len(matches) == 0, f"Found prohibited emoji in {file_path.name}: {matches}"


def test_mandatory_academic_terminology():
    """Ensure mandatory academic technical terminology and acronyms are documented in auth components."""
    required_acronyms = [
        "Role-Based Access Control (RBAC)",
        "Row Level Security (RLS)",
        "Universally Unique Identifier (UUID)",
        "Single Sign-On (SSO)",
        "Application Programming Interface (API)",
    ]

    for acronym in required_acronyms:
        found_in_hook = acronym in USE_SUPABASE_AUTH_FILE.read_text(encoding="utf-8")
        found_in_gate = acronym in ROLE_GATE_FILE.read_text(encoding="utf-8")
        found_in_modal = acronym in AUTH_MODAL_FILE.read_text(encoding="utf-8")
        found_in_profile = acronym in USER_PROFILE_BUTTON_FILE.read_text(encoding="utf-8")

        assert (
            found_in_hook or found_in_gate or found_in_modal or found_in_profile
        ), f"Mandatory academic acronym missing from auth suite: {acronym}"


def test_apple_liquid_glass_palette_compliance():
    """Verify Apple visionOS dark theme color tokens are utilized across auth components."""
    modal_content = AUTH_MODAL_FILE.read_text(encoding="utf-8")
    assert "#12141a" in modal_content or "#0a0b0e" in modal_content
    assert "#fe2c55" in modal_content
    assert "#25f4ee" in modal_content
