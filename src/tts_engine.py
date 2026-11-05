"""Zero-cost Text-to-Speech (TTS) synthesis engine.

Primary engine is the Fish Audio Application Programming Interface (API) on the free developer
tier (``model: s2.1-pro-free`` header, same technique as the japanese-speaking-coach project).
Results are cached on disk so repeated phrases cost no quota. When Fish Audio fails (rate limit,
network error, missing key) the engine falls back to ``edge-tts`` (Microsoft Neural voices, free).
"""

import base64
import hashlib
import logging
from pathlib import Path
from typing import Any, Optional, Union

import httpx

from src.config import AppConfig

logger = logging.getLogger(__name__)

FISH_AUDIO_TTS_URL = "https://api.fish.audio/v1/tts"
FISH_REQUEST_TIMEOUT_SECONDS = 15.0


class TTSEngine:
    """Synthesizes speech with Fish Audio (free tier), disk cache and an ``edge-tts`` fallback."""

    def __init__(
        self,
        config: Optional[AppConfig] = None,
        *,
        api_key: Optional[str] = None,
        cache_dir: Optional[Union[str, Path]] = None,
        model_id: Optional[str] = None,
        colab_tunnel_url: Optional[str] = None,
        prefer_colab_tts: Optional[bool] = None,
        colab_tts_timeout_seconds: Optional[float] = None,
        **kwargs: Any,
    ) -> None:
        """Initialize the TTS synthesis engine.

        Args:
            config: Optional AppConfig dataclass. If None, default AppConfig is used.
            api_key: Optional Fish Audio API key override.
            cache_dir: Optional local directory for caching synthesized MP3 audio.
            model_id: Optional voice model reference identifier.
            colab_tunnel_url: Optional Google Colab Cloudflare tunnel URL.
            prefer_colab_tts: Optional boolean prioritizing Colab over fallback.
            colab_tts_timeout_seconds: Optional float timeout for Colab requests.
            **kwargs: Additional configuration overrides.
        """
        if config is None:
            config = AppConfig(
                tiktok_username=kwargs.get("tiktok_username", ""),
                fish_audio_api_key=api_key or kwargs.get("fish_audio_api_key", ""),
            )
        self._config = config
        if api_key is not None:
            self._config.fish_audio_api_key = api_key
        if cache_dir is not None:
            self._config.cache_dir = Path(cache_dir)
        if model_id is not None:
            self._config.fish_audio_model_id = model_id
        if colab_tunnel_url is not None:
            self._config.colab_tunnel_url = colab_tunnel_url
        elif "colab_tunnel_url" in kwargs:
            self._config.colab_tunnel_url = kwargs["colab_tunnel_url"]
        if prefer_colab_tts is not None:
            self._config.prefer_colab_tts = prefer_colab_tts
        elif "prefer_colab_tts" in kwargs:
            self._config.prefer_colab_tts = kwargs["prefer_colab_tts"]
        if colab_tts_timeout_seconds is not None:
            self._config.colab_tts_timeout_seconds = colab_tts_timeout_seconds
        elif "colab_tts_timeout_seconds" in kwargs:
            self._config.colab_tts_timeout_seconds = kwargs["colab_tts_timeout_seconds"]

        self._config.cache_dir.mkdir(parents=True, exist_ok=True)
        # Exposed so the dashboard can show which engine produced the last utterance.
        self.last_engine: str = ""

    def get_cache_path(self, text: str, voice_id: str) -> Path:
        """Return the cache file path for ``text`` spoken by ``voice_id``."""
        digest = hashlib.md5(f"{voice_id}_{text}".encode("utf-8")).hexdigest()
        return self._config.cache_dir / f"{digest}.mp3"

    async def synthesize(self, text: str) -> bytes:
        """Return MP3 bytes for ``text``.

        Raises:
            RuntimeError: Primary and fallback engines failed or are disabled.
        """
        if not text or not text.strip():
            return b""

        cache_path = self.get_cache_path(text, self._config.fish_audio_model_id)
        if cache_path.exists():
            self.last_engine = "Cache"
            return cache_path.read_bytes()

        if self._config.prefer_colab_tts and self._config.colab_tunnel_url:
            try:
                audio = await self._synthesize_colab(text)
                cache_path.write_bytes(audio)
                self.last_engine = "Colab Fish Speech (Yuta)"
                return audio
            except (httpx.HTTPError, RuntimeError, Exception) as exc:
                logger.warning("Colab Fish Speech failed (%s); trying fallback options", exc)

        fish_error = "no API key configured"
        if self._config.fish_audio_api_key:
            try:
                audio = await self._synthesize_fish_audio(text)
                # Only Fish Audio output is cached: fallback audio must not shadow the real voice.
                cache_path.write_bytes(audio)
                self.last_engine = f"Fish Audio ({self._config.fish_audio_tier_model})"
                return audio
            except (httpx.HTTPError, RuntimeError) as exc:
                fish_error = str(exc)
                logger.warning("Fish Audio failed (%s); using fallback", fish_error)

        if not self._config.enable_fallback_tts:
            raise RuntimeError(f"Fish Audio failed and fallback is disabled: {fish_error}")

        audio = await self._synthesize_edge_tts(text)
        self.last_engine = "edge-tts"
        return audio

    async def synthesize_base64(self, text: str) -> str:
        """Return standard Base64-encoded string of synthesized MP3 audio for ``text``.

        Enables immediate WebSocket JSON payload transport to web overlays.
        """
        if not text or not text.strip():
            return ""
        audio_bytes = await self.synthesize(text)
        return base64.b64encode(audio_bytes).decode("ascii")

    async def _synthesize_colab(self, text: str) -> bytes:
        """Synthesize speech via Google Colab Fish Speech self-hosted endpoint."""
        if not self._config.colab_tunnel_url:
            raise RuntimeError("Colab tunnel URL is not configured")

        url = f"{self._config.colab_tunnel_url.rstrip('/')}/v1/tts"
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "TikTok-Live-TTS-Bot/2.0",
        }
        payload = {
            "text": text,
            "reference_id": "yuta",
            "format": "mp3",
        }

        try:
            async with httpx.AsyncClient(timeout=self._config.colab_tts_timeout_seconds) as client:
                response = await client.post(url, headers=headers, json=payload)
        except (httpx.HTTPError, Exception) as exc:
            raise RuntimeError(f"Colab Fish Speech request failed: {exc}") from exc

        if response.status_code != 200 or not response.is_success:
            raise RuntimeError(f"Colab Fish Speech HTTP {response.status_code}")
        if not response.content:
            raise RuntimeError("Colab Fish Speech returned empty audio")
        return response.content

    async def _synthesize_fish_audio(self, text: str) -> bytes:
        headers = {
            "Authorization": f"Bearer {self._config.fish_audio_api_key}",
            "Content-Type": "application/json",
            # Free Developer Tier selector; keeps usage at zero cost.
            "model": self._config.fish_audio_tier_model,
        }
        payload = {
            "text": text,
            "reference_id": self._config.fish_audio_model_id,
            "format": "mp3",
            "sample_rate": 44100,
            "mp3_bitrate": 128,
            "latency": "balanced",
        }
        async with httpx.AsyncClient(timeout=FISH_REQUEST_TIMEOUT_SECONDS) as client:
            response = await client.post(FISH_AUDIO_TTS_URL, headers=headers, json=payload)
        if not response.is_success:
            raise RuntimeError(f"Fish Audio HTTP {response.status_code}")
        if not response.content:
            raise RuntimeError("Fish Audio returned empty audio")
        return response.content

    async def _synthesize_edge_tts(self, text: str) -> bytes:
        # Imported lazily so the rest of the bot (and tests) work without edge-tts installed.
        import edge_tts

        communicate = edge_tts.Communicate(text, self._config.fallback_voice)
        chunks = [chunk["data"] async for chunk in communicate.stream() if chunk["type"] == "audio"]
        data = b"".join(chunks)
        if not data:
            raise RuntimeError("edge-tts returned empty audio")
        return data
