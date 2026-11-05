"""Audio output driver: routes speech and the gift chime to a Virtual Audio Cable (VAC).

Playback is abortable: ``abort_check`` is polled while audio plays so an emergency hotkey can cut
speech instantly. A missing or unopenable target device never crashes the bot; it degrades to the
default output device and records ``device_warning`` for the dashboard.
"""

import io
import logging
import math
import struct
import time
import wave
from pathlib import Path
from typing import Callable, Optional

import sounddevice as sd
import soundfile as sf

logger = logging.getLogger(__name__)

CHIME_FILENAME = "chime.wav"
CHIME_SAMPLE_RATE = 44100
CHIME_SECONDS = 0.3
CHIME_FREQUENCY_HZ = 880  # A5
POLL_INTERVAL_SECONDS = 0.05


def generate_chime(path: Path) -> None:
    """Write a short decaying 880 Hz bell tone (with a quiet octave harmonic) as mono 16-bit WAV."""
    path.parent.mkdir(parents=True, exist_ok=True)
    frames = int(CHIME_SAMPLE_RATE * CHIME_SECONDS)
    samples = bytearray()
    for i in range(frames):
        t = i / CHIME_SAMPLE_RATE
        envelope = math.exp(-9.0 * t)
        value = math.sin(2 * math.pi * CHIME_FREQUENCY_HZ * t) + 0.3 * math.sin(
            2 * math.pi * CHIME_FREQUENCY_HZ * 2 * t
        )
        samples += struct.pack("<h", int(12000 * envelope * value))
    with wave.open(str(path), "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(CHIME_SAMPLE_RATE)
        wav.writeframes(bytes(samples))


class AudioPlayer:
    """Plays audio bytes and the gift chime on the configured output device."""

    def __init__(self, target_device_name: str, assets_dir: Path) -> None:
        self._target_device_name = target_device_name
        self._assets_dir = Path(assets_dir)
        # Human-readable note when we are not on the requested device; shown on the dashboard.
        self.device_warning: str = ""

    def resolve_device_index(self) -> Optional[int]:
        """Return the output device index matching the target name, or None for the default."""
        needle = self._target_device_name.lower()
        try:
            devices = sd.query_devices()
        except sd.PortAudioError as exc:
            self.device_warning = f"Cannot list audio devices ({exc}); using default output"
            logger.warning(self.device_warning)
            return None

        for position, device in enumerate(devices):
            # Skip input-only endpoints: "CABLE Output" is the capture side of the same cable.
            if device["max_output_channels"] > 0 and needle in device["name"].lower():
                self.device_warning = ""
                return device.get("index", position)

        self.device_warning = (
            f"Audio device '{self._target_device_name}' not found; using default output"
        )
        logger.warning(self.device_warning)
        return None

    def play_audio_bytes(self, audio_bytes: bytes, abort_check: Callable[[], bool]) -> bool:
        """Decode and play ``audio_bytes``. Returns True only if playback ran to completion."""
        try:
            data, sample_rate = sf.read(io.BytesIO(audio_bytes), dtype="float32")
        except (sf.LibsndfileError, RuntimeError, ValueError) as exc:
            logger.warning("Skipping undecodable audio: %s", exc)
            return False
        return self._play(data, sample_rate, abort_check)

    def play_gift_chime(self, abort_check: Callable[[], bool]) -> bool:
        """Play the gift chime, generating the asset first if it does not exist."""
        chime_path = self._assets_dir / CHIME_FILENAME
        if not chime_path.exists():
            generate_chime(chime_path)
        data, sample_rate = sf.read(str(chime_path), dtype="float32")
        return self._play(data, sample_rate, abort_check)

    def stop(self) -> None:
        """Stop any playback immediately (safe to call from the hotkey thread)."""
        sd.stop()

    def _play(self, data, sample_rate: int, abort_check: Callable[[], bool]) -> bool:
        device = self.resolve_device_index()
        try:
            sd.play(data, sample_rate, device=device)
        except sd.PortAudioError as exc:
            if device is None:
                logger.error("Default audio output failed: %s", exc)
                return False
            self.device_warning = f"Cannot open target device ({exc}); using default output"
            logger.warning(self.device_warning)
            try:
                sd.play(data, sample_rate, device=None)
            except sd.PortAudioError as default_exc:
                logger.error("Default audio output failed: %s", default_exc)
                return False

        stream = sd.get_stream()
        while stream.active:
            if abort_check():
                sd.stop()
                return False
            time.sleep(POLL_INTERVAL_SECONDS)
        return True
