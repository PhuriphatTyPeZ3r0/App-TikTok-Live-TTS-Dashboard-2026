import io
import wave
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
import sounddevice as sd

from src.audio_player import AudioPlayer, generate_chime

FAKE_DEVICES = [
    {"name": "Realtek High Definition Audio", "max_output_channels": 2, "index": 0},
    {"name": "CABLE Output (VB-Audio Virtual Cable)", "max_output_channels": 0, "index": 1},
    {"name": "CABLE Input (VB-Audio Virtual Cable)", "max_output_channels": 2, "index": 2},
]


def _wav_bytes(seconds: float = 0.05, rate: int = 22050) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(b"\x00\x10" * int(rate * seconds))
    return buf.getvalue()


def _idle_stream() -> MagicMock:
    stream = MagicMock()
    stream.active = False
    return stream


def test_resolve_device_index_matches_output_device_only(tmp_path: Path):
    # "CABLE" also matches the input-only "CABLE Output"; it must be skipped (0 output channels)
    with patch("sounddevice.query_devices", return_value=FAKE_DEVICES):
        player = AudioPlayer("CABLE Input", tmp_path)
        assert player.resolve_device_index() == 2
        assert AudioPlayer("cable", tmp_path).resolve_device_index() == 2


def test_missing_device_falls_back_to_default_with_warning(tmp_path: Path):
    with patch("sounddevice.query_devices", return_value=FAKE_DEVICES):
        player = AudioPlayer("NonExistentDevice", tmp_path)
        assert player.resolve_device_index() is None
        assert "NonExistentDevice" in player.device_warning


def test_device_query_failure_does_not_crash(tmp_path: Path):
    with patch("sounddevice.query_devices", side_effect=sd.PortAudioError("no host api")):
        assert AudioPlayer("CABLE Input", tmp_path).resolve_device_index() is None


def test_play_audio_bytes_targets_resolved_device(tmp_path: Path):
    with patch("sounddevice.query_devices", return_value=FAKE_DEVICES), patch(
        "sounddevice.play"
    ) as mock_play, patch("sounddevice.get_stream", return_value=_idle_stream()):
        player = AudioPlayer("CABLE Input", tmp_path)
        assert player.play_audio_bytes(_wav_bytes(rate=22050), lambda: False) is True
        args, kwargs = mock_play.call_args
        assert args[1] == 22050
        assert kwargs["device"] == 2


def test_abort_check_stops_playback_immediately(tmp_path: Path):
    active_stream = MagicMock()
    active_stream.active = True
    with patch("sounddevice.query_devices", return_value=FAKE_DEVICES), patch(
        "sounddevice.play"
    ), patch("sounddevice.get_stream", return_value=active_stream), patch(
        "sounddevice.stop"
    ) as mock_stop:
        player = AudioPlayer("CABLE Input", tmp_path)
        assert player.play_audio_bytes(_wav_bytes(), lambda: True) is False
        mock_stop.assert_called()


def test_undecodable_audio_is_skipped_not_raised(tmp_path: Path):
    with patch("sounddevice.query_devices", return_value=FAKE_DEVICES), patch(
        "sounddevice.play"
    ) as mock_play:
        player = AudioPlayer("CABLE Input", tmp_path)
        assert player.play_audio_bytes(b"", lambda: False) is False
        assert player.play_audio_bytes(b"not audio at all", lambda: False) is False
        mock_play.assert_not_called()


def test_device_open_error_retries_on_default_device(tmp_path: Path):
    calls = []

    def fake_play(data, samplerate, device=None):
        calls.append(device)
        if device is not None:
            raise sd.PortAudioError("device busy")

    with patch("sounddevice.query_devices", return_value=FAKE_DEVICES), patch(
        "sounddevice.play", side_effect=fake_play
    ), patch("sounddevice.get_stream", return_value=_idle_stream()):
        player = AudioPlayer("CABLE Input", tmp_path)
        assert player.play_audio_bytes(_wav_bytes(), lambda: False) is True
        assert calls == [2, None]
        assert player.device_warning


def test_stop_calls_sounddevice_stop(tmp_path: Path):
    with patch("sounddevice.stop") as mock_stop:
        AudioPlayer("CABLE Input", tmp_path).stop()
        mock_stop.assert_called_once()


def test_generate_chime_writes_valid_short_wav(tmp_path: Path):
    path = tmp_path / "chime.wav"
    generate_chime(path)
    with wave.open(str(path), "rb") as w:
        assert w.getframerate() == 44100
        assert w.getnchannels() == 1
        assert 0.2 <= w.getnframes() / 44100 <= 0.5


def test_play_gift_chime_creates_missing_asset_and_plays(tmp_path: Path):
    with patch("sounddevice.query_devices", return_value=FAKE_DEVICES), patch(
        "sounddevice.play"
    ) as mock_play, patch("sounddevice.get_stream", return_value=_idle_stream()):
        player = AudioPlayer("CABLE Input", tmp_path)
        assert not (tmp_path / "chime.wav").exists()
        assert player.play_gift_chime(lambda: False) is True
        assert (tmp_path / "chime.wav").exists()
        assert mock_play.call_args[0][1] == 44100
