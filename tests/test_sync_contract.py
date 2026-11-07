"""Tests for User Profile Cloud Settings Sync Contract (StreamVox Live).

This module validates:
- File existence and interface contract for frontend/src/hooks/useSupabaseSync.ts.
- Integration contract for frontend/src/components/TikFinitySettings.tsx and frontend/src/app/page.tsx.
- Debounced auto-sync, cloud hydration, and manual synchronization mechanisms.
- 3-tier Role-Based Access Control (RBAC) gating ('admin', 'streamer', 'viewer').
- Offline resilience and fail-safe local storage fallback.
- Strictly zero emojis in all code, comments, badges, and components.
- Academic rigor and mandatory technical terminology:
    - Role-Based Access Control (RBAC)
    - Row Level Security (RLS)
    - Universally Unique Identifier (UUID)
    - Application Programming Interface (API)
"""

from pathlib import Path
import re
import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
FRONTEND_DIR = REPO_ROOT / "frontend"
HOOKS_DIR = FRONTEND_DIR / "src" / "hooks"
COMPONENTS_DIR = FRONTEND_DIR / "src" / "components"
APP_DIR = FRONTEND_DIR / "src" / "app"

USE_SUPABASE_SYNC_FILE = HOOKS_DIR / "useSupabaseSync.ts"
USE_TIKFINITY_SETTINGS_FILE = HOOKS_DIR / "useTikFinitySettings.ts"
TIKFINITY_SETTINGS_COMPONENT = COMPONENTS_DIR / "TikFinitySettings.tsx"
APP_PAGE_FILE = APP_DIR / "page.tsx"

SYNC_SOURCE_FILES = [
    USE_SUPABASE_SYNC_FILE,
    USE_TIKFINITY_SETTINGS_FILE,
    TIKFINITY_SETTINGS_COMPONENT,
    APP_PAGE_FILE,
]


def test_sync_files_exist():
    """Verify all required files for Task 4 exist on disk."""
    for file_path in SYNC_SOURCE_FILES:
        assert file_path.exists(), f"Required file does not exist: {file_path}"


def test_use_supabase_sync_hook_exports():
    """Verify useSupabaseSync.ts exports required interfaces and the hook function."""
    content = USE_SUPABASE_SYNC_FILE.read_text(encoding="utf-8")

    # Hook function exports
    assert "export function useSupabaseSync" in content
    assert "export default useSupabaseSync" in content

    # Interface exports
    assert "export interface UseSupabaseSyncOptions" in content
    assert "export interface UseSupabaseSyncReturn" in content

    # Parameter contract in UseSupabaseSyncOptions
    assert "settings: TikFinitySettings" in content
    assert "onHydrate?:" in content
    assert "debounceMs?:" in content

    # Return contract in UseSupabaseSyncReturn
    assert "isSyncing: boolean;" in content
    assert "lastSyncedAt: Date | null;" in content
    assert "syncError: string | null;" in content
    assert "isCloudSyncActive: boolean;" in content
    assert "manualSync: () => Promise<void>;" in content


def test_use_supabase_sync_logic_contracts():
    """Verify key internal mechanisms: debouncing, hydration, RLS, and RBAC."""
    content = USE_SUPABASE_SYNC_FILE.read_text(encoding="utf-8")

    # Consumes useSupabaseAuth and getSupabaseBrowserClient
    assert "useSupabaseAuth" in content
    assert "getSupabaseBrowserClient" in content
    assert "logger" in content

    # Debounce handling (default 1000ms)
    assert "debounceMs = 1000" in content
    assert "setTimeout" in content
    assert "clearTimeout" in content

    # Cloud hydration logic
    assert "onHydrateRef" in content or "onHydrate" in content
    assert "profile.settings" in content
    assert "profile.voice_tunings" in content
    assert "profile.selected_voice_id" in content

    # Persistence to Supabase user_profiles table with RLS & RBAC
    assert "'user_profiles'" in content
    assert "selected_voice_id" in content
    assert "voice_tunings" in content
    assert "updated_at" in content

    # Role-Based Access Control (RBAC): Viewer role cannot mutate settings
    assert "role === 'viewer'" in content
    assert "read-only" in content.lower()

    # Offline resilience: client null check & try/catch error containment
    assert "!client || !user" in content or "!client" in content
    assert "catch (err" in content or "catch" in content


def test_tikfinity_settings_header_badge():
    """Verify TikFinitySettings component renders the cloud sync status badge."""
    content = TIKFINITY_SETTINGS_COMPONENT.read_text(encoding="utf-8")

    # Status labels
    assert "Cloud Synced" in content
    assert "Syncing..." in content
    assert "Local Storage" in content

    # Props contract in TikFinitySettingsProps
    assert "isSyncing?:" in content
    assert "isCloudSyncActive?:" in content
    assert "lastSyncedAt?:" in content
    assert "syncError?:" in content
    assert "onManualSync?:" in content

    # Apple visionOS palette tokens
    assert "#12141a" in content
    assert "#181b24" in content
    assert "#25f4ee" in content


def test_app_page_wires_use_supabase_sync():
    """Verify frontend/src/app/page.tsx wires useSupabaseSync to TikFinitySettings."""
    content = APP_PAGE_FILE.read_text(encoding="utf-8")

    # Import
    assert 'import { useSupabaseSync } from "../hooks/useSupabaseSync";' in content

    # Hook invocation
    assert "useSupabaseSync(" in content
    assert "onHydrate: updateSettings" in content
    assert "debounceMs: 1000" in content

    # Passed to TikFinitySettings
    assert "isSyncing={isSyncing}" in content
    assert "isCloudSyncActive={isCloudSyncActive}" in content
    assert "lastSyncedAt={lastSyncedAt}" in content
    assert "syncError={syncError}" in content
    assert "onManualSync={manualSync}" in content


def test_zero_emoji_compliance():
    """Strictly assert no emoji characters are present in any of the Task 4 files."""
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

    for file_path in SYNC_SOURCE_FILES:
        text = file_path.read_text(encoding="utf-8")
        matches = emoji_pattern.findall(text)
        assert len(matches) == 0, f"Found prohibited emoji in {file_path.name}: {matches}"


def test_mandatory_academic_terminology():
    """Ensure mandatory academic technical terminology and acronyms are documented."""
    required_acronyms = [
        "Role-Based Access Control (RBAC)",
        "Row Level Security (RLS)",
        "Universally Unique Identifier (UUID)",
        "Application Programming Interface (API)",
    ]

    hook_content = USE_SUPABASE_SYNC_FILE.read_text(encoding="utf-8")
    component_content = TIKFINITY_SETTINGS_COMPONENT.read_text(encoding="utf-8")

    for acronym in required_acronyms:
        found = (acronym in hook_content) or (acronym in component_content)
        assert found, f"Mandatory academic acronym missing from sync suite: {acronym}"
