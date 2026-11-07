"""Tests for In-Dashboard Real-Time Log Monitor Tab Contract (StreamVox Live).

This module validates:
- File existence and component export for frontend/src/components/tabs/TabLogMonitor.tsx.
- Registration of Tab 6 ('logs') in frontend/src/components/TikFinitySettings.tsx.
- Integration contracts: real-time subscription, circular ring buffer hydration, and cleanup.
- Severity and category filtering, free-text search, auto-scroll, and JSON export.
- Role-Based Access Control (RBAC) administrator remote backend telemetry ingestion.
- Expandable JavaScript Object Notation (JSON) details accordion and clipboard copy actions.
- Strictly zero emojis across all code, UI labels, tooltips, and badges.
- Mandatory academic technical terminology and acronyms:
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
COMPONENTS_DIR = FRONTEND_DIR / "src" / "components"
TABS_DIR = COMPONENTS_DIR / "tabs"

TAB_LOG_MONITOR_FILE = TABS_DIR / "TabLogMonitor.tsx"
TIKFINITY_SETTINGS_FILE = COMPONENTS_DIR / "TikFinitySettings.tsx"
LOGGER_FILE = FRONTEND_DIR / "src" / "lib" / "logger.ts"
LOGGER_TYPES_FILE = FRONTEND_DIR / "src" / "types" / "logger.ts"

MONITOR_SOURCE_FILES = [
    TAB_LOG_MONITOR_FILE,
    TIKFINITY_SETTINGS_FILE,
    LOGGER_FILE,
    LOGGER_TYPES_FILE,
]


def test_log_monitor_files_exist():
    """Verify all required files for Task 5 exist on disk."""
    for file_path in MONITOR_SOURCE_FILES:
        assert file_path.exists(), f"Required file does not exist: {file_path}"


def test_tab_log_monitor_component_exports():
    """Verify TabLogMonitor.tsx exports the component and prop types."""
    content = TAB_LOG_MONITOR_FILE.read_text(encoding="utf-8")

    assert "export function TabLogMonitor" in content
    assert "export default TabLogMonitor" in content
    assert "export interface TabLogMonitorProps" in content


def test_tab_log_monitor_consumes_logger_and_auth():
    """Verify TabLogMonitor consumes centralized logger, event bus, and auth hook."""
    content = TAB_LOG_MONITOR_FILE.read_text(encoding="utf-8")

    # Logger and event bus consumption
    assert "subscribeToLogs" in content
    assert "getLogs" in content
    assert "clearLogs" in content
    assert "logger" in content

    # Supabase authentication hook consumption
    assert "useSupabaseAuth" in content

    # Logger types
    assert "LogEntry" in content
    assert "LogLevel" in content
    assert "LogCategory" in content


def test_tab_log_monitor_filter_and_control_contracts():
    """Verify filter specifications, auto-scroll, search, and export capabilities."""
    content = TAB_LOG_MONITOR_FILE.read_text(encoding="utf-8")

    # Severity levels
    for level in ["ALL", "ERROR", "WARN", "INFO", "DEBUG"]:
        assert f'"{level}"' in content or f"'{level}'" in content

    # Subsystem categories
    for cat in ["ALL", "TTS", "TIKTOK_WS", "AUTH", "NETWORK", "OVERLAY", "SYSTEM"]:
        assert f'"{cat}"' in content or f"'{cat}'" in content

    # Search filtering
    assert "searchQuery" in content
    assert "setSearchQuery" in content

    # Auto-scroll toggle
    assert "autoScroll" in content
    assert "setAutoScroll" in content

    # Clear logs action
    assert "handleClearLogs" in content or "clearLogs()" in content

    # Export to JSON file
    assert "handleExportJson" in content or "streamvox-logs-" in content
    assert "streamvox-logs-" in content
    assert ".json" in content


def test_tab_log_monitor_admin_remote_mode():
    """Verify Role-Based Access Control (RBAC) remote telemetry ingestion for administrators."""
    content = TAB_LOG_MONITOR_FILE.read_text(encoding="utf-8")

    # Role inspection
    assert "role === \"admin\"" in content or "role === 'admin'" in content

    # Remote telemetry fetch
    assert "/api/logs" in content
    assert "fetch(" in content or "fetchRemoteLogs" in content
    assert "Remote Backend" in content or "isRemoteActive" in content


def test_tab_log_monitor_details_accordion_and_copy():
    """Verify expandable JSON context inspection and clipboard copying."""
    content = TAB_LOG_MONITOR_FILE.read_text(encoding="utf-8")

    # Accordion toggle
    assert "expandedIds" in content
    assert "toggleAccordion" in content

    # Clipboard copy actions
    assert "navigator.clipboard.writeText" in content
    assert "Copy JSON" in content
    assert "handleCopyRow" in content or "handleCopyJson" in content


def test_tikfinity_settings_tab_registration():
    """Verify Tab 6 ('logs') is properly registered in TikFinitySettings."""
    content = TIKFINITY_SETTINGS_FILE.read_text(encoding="utf-8")

    # SettingsTabId union type includes 'logs'
    assert '"logs"' in content or "'logs'" in content
    assert 'export type SettingsTabId = "chat" | "voices" | "gift" | "safety" | "obs" | "logs";' in content

    # TABS array registration
    assert '{ id: "logs", label: "Logs", icon: "terminal" }' in content

    # TabLogMonitor import and rendering
    assert 'import { TabLogMonitor } from "./tabs/TabLogMonitor";' in content
    assert 'activeTab === "logs"' in content
    assert "<TabLogMonitor" in content


def test_apple_visionos_color_tokens():
    """Verify Apple visionOS Liquid Glass dark aesthetic color tokens."""
    content = TAB_LOG_MONITOR_FILE.read_text(encoding="utf-8")

    assert "#0a0b0e" in content
    assert "#12141a" in content
    assert "#181b24" in content
    assert "#fe2c55" in content
    assert "#25f4ee" in content


def test_zero_emoji_compliance():
    """Strictly assert no emoji characters are present in any of the Task 5 files."""
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

    for file_path in MONITOR_SOURCE_FILES:
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

    monitor_content = TAB_LOG_MONITOR_FILE.read_text(encoding="utf-8")
    settings_content = TIKFINITY_SETTINGS_FILE.read_text(encoding="utf-8")

    for acronym in required_acronyms:
        found = (acronym in monitor_content) or (acronym in settings_content)
        assert found, f"Mandatory academic acronym missing from monitor suite: {acronym}"
