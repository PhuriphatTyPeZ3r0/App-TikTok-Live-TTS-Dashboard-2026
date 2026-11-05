"""Tests for the emergency hotkey controller (no real OS keyboard hook is ever opened)."""

import sys
from unittest.mock import MagicMock, patch

import pytest

from src.hotkey_listener import EmergencyController, normalize_hotkey


def test_emergency_controller_trigger():
    callback = MagicMock()
    controller = EmergencyController(hotkey_name="f9", on_trigger_callback=callback)

    assert controller.is_abort_requested() is False

    controller._on_hotkey_hit()

    assert controller.is_abort_requested() is True
    callback.assert_called_once()

    controller.reset_abort_flag()
    assert controller.is_abort_requested() is False


@pytest.mark.parametrize(
    "raw, expected",
    [
        ("f9", "<f9>"),
        ("F9", "<f9>"),
        ("<f9>", "<f9>"),
        ("end", "<end>"),
        ("ctrl+shift+x", "<ctrl>+<shift>+x"),
        (" Ctrl + <Alt> + F12 ", "<ctrl>+<alt>+<f12>"),
    ],
)
def test_normalize_hotkey(raw, expected):
    assert normalize_hotkey(raw) == expected


@pytest.mark.parametrize("raw", ["", "   ", "ctrl+", "+", "ctrl++x", "notakey", "ctrl+shift"])
def test_normalize_hotkey_invalid(raw):
    with pytest.raises(ValueError):
        normalize_hotkey(raw)


def test_constructor_rejects_invalid_hotkey():
    with pytest.raises(ValueError):
        EmergencyController(hotkey_name="???", on_trigger_callback=MagicMock())


def test_callback_exception_is_swallowed_but_flag_set():
    callback = MagicMock(side_effect=RuntimeError("boom"))
    controller = EmergencyController("f9", callback)

    controller._on_hotkey_hit()  # must not raise (runs on the pynput thread)

    assert controller.is_abort_requested() is True


def test_start_and_stop_use_global_hotkeys():
    fake_keyboard = MagicMock()
    listener = fake_keyboard.GlobalHotKeys.return_value
    controller = EmergencyController("ctrl+shift+x", MagicMock())

    with patch.dict(sys.modules, {"pynput": MagicMock(keyboard=fake_keyboard),
                                  "pynput.keyboard": fake_keyboard}):
        controller.start()
        controller.start()  # idempotent

    fake_keyboard.GlobalHotKeys.assert_called_once_with(
        {"<ctrl>+<shift>+x": controller._on_hotkey_hit}
    )
    assert listener.daemon is True
    listener.start.assert_called_once()

    controller.stop()
    listener.stop.assert_called_once()
    controller.stop()  # idempotent, no error
    listener.stop.assert_called_once()


def test_start_failure_is_raised_not_silent():
    fake_keyboard = MagicMock()
    fake_keyboard.GlobalHotKeys.side_effect = RuntimeError("no hook")
    controller = EmergencyController("f9", MagicMock())

    with patch.dict(sys.modules, {"pynput": MagicMock(keyboard=fake_keyboard),
                                  "pynput.keyboard": fake_keyboard}):
        with pytest.raises(RuntimeError):
            controller.start()
