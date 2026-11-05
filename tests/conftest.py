"""Pytest configuration and test setup."""
import sys
from pathlib import Path
import pytest

# Add project root to sys.path so that tests can import src modules
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


@pytest.fixture(autouse=True)
def clean_session_registry():
    """Ensure clean in-memory session registry before and after every test."""
    try:
        from src.web_server import session_manager
        with session_manager._lock:
            session_manager._sessions.clear()
    except Exception:
        pass
    yield
    try:
        from src.web_server import session_manager
        with session_manager._lock:
            session_manager._sessions.clear()
    except Exception:
        pass
