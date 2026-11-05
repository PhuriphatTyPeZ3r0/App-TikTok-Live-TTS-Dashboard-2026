"""Emergency hotkey listener: a global Operating System (OS) hotkey that cuts speech instantly.

The streamer may be full-screen in a game, so the hotkey is registered system-wide through the
Python Input Control library (pynput). When it fires, an abort flag is raised and the supplied
callback runs (typically ``audio_player.stop()`` and ``queue_manager.clear_queue()``).

pynput is imported lazily inside ``start()`` so unit tests never open a real keyboard hook.
"""

import logging
import re
import threading
from typing import Any, Callable, Optional

logger = logging.getLogger(__name__)

_MODIFIERS = frozenset({"ctrl", "shift", "alt", "cmd"})
_NAMED_KEYS = frozenset(
    {
        "esc", "enter", "tab", "space", "backspace", "delete", "insert", "home", "end",
        "page_up", "page_down", "up", "down", "left", "right", "pause", "scroll_lock",
        "print_screen", "caps_lock", "num_lock", "menu",
    }
    | {f"f{n}" for n in range(1, 25)}
)
_SINGLE_CHAR = re.compile(r"^[a-z0-9]$")


def normalize_hotkey(name: str) -> str:
    """Convert a friendly hotkey name to pynput ``GlobalHotKeys`` syntax.

    Accepts ``"f9"``, ``"end"``, ``"<f9>"`` and ``"ctrl+shift+x"`` (case/space insensitive), e.g.
    ``"ctrl+shift+x"`` becomes ``"<ctrl>+<shift>+x"``.

    Raises:
        ValueError: if the name is empty, has an unknown key, or contains only modifiers.
    """
    if not isinstance(name, str) or not name.strip():
        raise ValueError("Emergency hotkey must be a non-empty string, e.g. 'f9' or 'ctrl+shift+x'.")

    parts = [p.strip().lower() for p in name.split("+")]
    result = []
    has_main_key = False
    for part in parts:
        token = part[1:-1].strip() if part.startswith("<") and part.endswith(">") else part
        if token in _MODIFIERS:
            result.append(f"<{token}>")
        elif token in _NAMED_KEYS:
            result.append(f"<{token}>")
            has_main_key = True
        elif _SINGLE_CHAR.match(token):
            result.append(token)
            has_main_key = True
        else:
            raise ValueError(
                f"Unrecognised key {part!r} in emergency hotkey {name!r}. "
                "Use names like 'f9', 'end', '<f9>' or 'ctrl+shift+x'."
            )
    if not has_main_key:
        raise ValueError(f"Emergency hotkey {name!r} has only modifier keys; add a main key.")
    return "+".join(result)


class EmergencyController:
    """Global emergency hotkey that raises an abort flag and runs a stop callback."""

    def __init__(self, hotkey_name: str, on_trigger_callback: Callable[[], None]) -> None:
        # Validate eagerly so a bad AppConfig.emergency_hotkey fails at startup, not silently.
        self._hotkey = normalize_hotkey(hotkey_name)
        self._callback = on_trigger_callback
        self._abort_event = threading.Event()
        self._listener: Optional[Any] = None
        self._lock = threading.Lock()

    def _on_hotkey_hit(self) -> None:
        """Handle a hotkey press (runs on the pynput thread, so it must never raise)."""
        self._abort_event.set()
        logger.warning("Emergency hotkey %s pressed: aborting speech.", self._hotkey)
        try:
            self._callback()
        except Exception:
            # Why: an exception would kill the pynput listener thread and disable the hotkey.
            logger.exception("Emergency trigger callback failed.")

    def start(self) -> None:
        """Start the background listener thread (idempotent)."""
        with self._lock:
            if self._listener is not None:
                return
            from pynput import keyboard  # lazy: avoids a real OS hook at import/test time

            listener = keyboard.GlobalHotKeys({self._hotkey: self._on_hotkey_hit})
            listener.daemon = True
            listener.start()
            self._listener = listener
            logger.info("Emergency hotkey listener started on %s.", self._hotkey)

    def stop(self) -> None:
        """Stop the listener thread (idempotent)."""
        with self._lock:
            listener, self._listener = self._listener, None
        if listener is not None:
            listener.stop()
            logger.info("Emergency hotkey listener stopped.")

    def is_abort_requested(self) -> bool:
        """Return True once the hotkey has fired and the flag has not been reset."""
        return self._abort_event.is_set()

    def reset_abort_flag(self) -> None:
        """Clear the abort flag so speech can resume."""
        self._abort_event.clear()
