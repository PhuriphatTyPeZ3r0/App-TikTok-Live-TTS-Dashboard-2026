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
from src.thai_normalizer import normalize_thai_speech
from src.voice_registry import (
    VoiceProfile,
    VoiceTuning,
    format_edge_prosody,
    get_voice_profile,
    normalize_voice_tuning,
)

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
        hf_token: Optional[str] = None,
        **kwargs: Any,
    ) -> None:
        """Initialize the TTS synthesis engine.

        Args:
            config: Optional AppConfig dataclass. If None, default AppConfig is used.
            api_key: Optional Fish Audio API key override.
            cache_dir: Optional local directory for caching synthesized MP3 audio.
            model_id: Optional voice model reference identifier.
            colab_tunnel_url: Optional Google Colab / Hugging Face Spaces tunnel URL.
            prefer_colab_tts: Optional boolean prioritizing Colab over fallback.
            colab_tts_timeout_seconds: Optional float timeout for Colab requests.
            hf_token: Optional Bearer token for Hugging Face Spaces authentication.
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
        if hf_token is not None:
            self._config.hf_token = hf_token
        elif "hf_token" in kwargs:
            self._config.hf_token = kwargs["hf_token"]

        self._config.cache_dir.mkdir(parents=True, exist_ok=True)
        # Exposed so the dashboard can show which engine produced the last utterance.
        self.last_engine: str = ""

    @property
    def config(self) -> AppConfig:
        """Return the underlying AppConfig configuration dataclass."""
        return self._config

    @property
    def prefer_colab_tts(self) -> bool:
        """Return whether Colab / ZeroGPU synthesis is preferred."""
        return bool(self._config.prefer_colab_tts)

    def get_cache_path(
        self, text: str, voice_id: str, tuning: Optional[VoiceTuning] = None
    ) -> Path:
        """Return the cache file path for ``text`` spoken by ``voice_id``.

        Default (or missing) tuning keeps the legacy digest so existing cache entries stay valid;
        non-default tuning is appended to the key so different settings never collide.
        """
        if tuning is None or tuning.is_default():
            key = f"{voice_id}_{text}"
        else:
            key = f"{voice_id}_{tuning.speed:.2f}_{tuning.pitch}_{tuning.volume}_{text}"
        digest = hashlib.md5(key.encode("utf-8")).hexdigest()
        return self._config.cache_dir / f"{digest}.mp3"

    @staticmethod
    def _tuning_kwargs(tuning: VoiceTuning) -> dict[str, VoiceTuning]:
        """Return a ``tuning`` kwarg only for non-default tuning (keeps legacy mocks working)."""
        return {} if tuning.is_default() else {"tuning": tuning}

    async def _call_edge_tts_with_voice(
        self, text: str, edge_voice: str, tuning: Optional[VoiceTuning] = None
    ) -> bytes:
        """Invoke _synthesize_edge_tts seamlessly across default and custom voice overrides.

        Prosody keyword arguments are only forwarded for non-default tuning.
        """
        prosody: dict[str, str] = {}
        if tuning is not None and not tuning.is_default():
            rate, pitch, volume = format_edge_prosody(tuning)
            prosody = {"rate": rate, "pitch": pitch, "volume": volume}
        if edge_voice == self._config.fallback_voice:
            try:
                return await self._synthesize_edge_tts(text, **prosody)
            except TypeError:
                if not prosody:
                    raise
                return await self._synthesize_edge_tts(text)
        try:
            return await self._synthesize_edge_tts(text, voice=edge_voice, **prosody)
        except TypeError:
            return await self._synthesize_edge_tts(text)

    async def synthesize(
        self,
        text: str,
        voice_id: str | None = None,
        *,
        speed: float = 1.0,
        pitch: int = 0,
        volume: int = 100,
    ) -> bytes:
        """Return MP3 bytes for ``text`` using ``voice_id`` profile after PyThaiNLP normalization.

        ``speed``, ``pitch`` and ``volume`` are clamped via ``normalize_voice_tuning`` and applied
        to Edge-TTS synthesis (direct profile or fallback). Fish Audio and Colab output is unchanged.

        Raises:
            RuntimeError: Primary and fallback engines failed or are disabled.
        """
        if not text or not text.strip():
            return b""

        tuning = normalize_voice_tuning(speed, pitch, volume)

        normalized_text = normalize_thai_speech(text)
        if not normalized_text:
            normalized_text = text.strip()
        # Preserve compound phonetic replacements (e.g. "กู๊ดเกม") split by generic word_tokenize
        if "กู๊ดเกม" in text and "กู๊ด เกม" in normalized_text:
            normalized_text = normalized_text.replace("กู๊ด เกม", "กู๊ดเกม")

        profile: VoiceProfile = get_voice_profile(voice_id)

        # Resolve effective model / cache key
        if profile.id == "yuta":
            effective_model_id = self._config.fish_audio_model_id or profile.model_id
            cache_voice_key = effective_model_id or "yuta"
        else:
            effective_model_id = profile.model_id
            cache_voice_key = effective_model_id or profile.id

        # 1. Edge-TTS Direct Profile (e.g. "niwat")
        if profile.engine == "edge_tts":
            audio = await self._call_edge_tts_with_voice(
                normalized_text, profile.edge_voice, **self._tuning_kwargs(tuning)
            )
            self.last_engine = "edge-tts"
            return audio

        # 2. Disk Cache Check for Fish Audio / Colab profiles
        cache_path = self.get_cache_path(normalized_text, cache_voice_key)
        raw_cache_path = self.get_cache_path(text, cache_voice_key)
        if cache_path.exists():
            self.last_engine = "Cache"
            return cache_path.read_bytes()
        if raw_cache_path.exists():
            self.last_engine = "Cache"
            return raw_cache_path.read_bytes()

        # 3. Colab Routing Isolation: Strictly route to Colab ONLY if profile.id == "yuta"
        if profile.id == "yuta" and self._config.prefer_colab_tts and self._config.colab_tunnel_url:
            try:
                audio = await self._synthesize_colab(normalized_text)
                cache_path.write_bytes(audio)
                if raw_cache_path != cache_path:
                    raw_cache_path.write_bytes(audio)
                self.last_engine = "Colab Fish Speech (Yuta)"
                return audio
            except (httpx.HTTPError, RuntimeError, Exception) as exc:
                logger.warning("Colab Fish Speech failed (%s); trying fallback options", exc)

        # 4. Fish Audio Synthesis (when profile.model_id / effective_model_id is present)
        if effective_model_id:
            fish_error = "no API key configured"
            if self._config.fish_audio_api_key:
                try:
                    if effective_model_id == self._config.fish_audio_model_id:
                        audio = await self._synthesize_fish_audio(normalized_text)
                    else:
                        try:
                            audio = await self._synthesize_fish_audio(
                                normalized_text, model_id=effective_model_id
                            )
                        except TypeError:
                            audio = await self._synthesize_fish_audio(normalized_text)
                    # Only Fish Audio output is cached: fallback audio must not shadow the real voice.
                    cache_path.write_bytes(audio)
                    if raw_cache_path != cache_path:
                        raw_cache_path.write_bytes(audio)
                    self.last_engine = f"Fish Audio ({self._config.fish_audio_tier_model})"
                    return audio
                except (httpx.HTTPError, RuntimeError) as exc:
                    fish_error = str(exc)
                    logger.warning("Fish Audio failed (%s); using fallback", fish_error)

            if not self._config.enable_fallback_tts:
                raise RuntimeError(f"Fish Audio failed and fallback is disabled: {fish_error}")

        # 5. Seamless Edge-TTS Fallback (or when profile.model_id is None/unset for hana/joker/anchor)
        target_edge_voice = (
            self._config.fallback_voice if profile.id == "yuta" else profile.edge_voice
        )
        audio = await self._call_edge_tts_with_voice(
            normalized_text, target_edge_voice, **self._tuning_kwargs(tuning)
        )
        self.last_engine = "edge-tts"
        return audio

    async def synthesize_base64(
        self,
        text: str,
        voice_id: str | None = None,
        *,
        speed: float = 1.0,
        pitch: int = 0,
        volume: int = 100,
    ) -> str:
        """Return standard Base64-encoded string of synthesized MP3 audio for ``text``.

        Enables immediate WebSocket JSON payload transport to web overlays.
        """
        if not text or not text.strip():
            return ""
        tuning_kwargs: dict[str, Any] = {}
        if (speed, pitch, volume) != (1.0, 0, 100):
            tuning_kwargs = {"speed": speed, "pitch": pitch, "volume": volume}
        if voice_id is not None:
            try:
                audio_bytes = await self.synthesize(text, voice_id=voice_id, **tuning_kwargs)
            except TypeError:
                audio_bytes = await self.synthesize(text)
        else:
            try:
                audio_bytes = await self.synthesize(text, **tuning_kwargs)
            except TypeError:
                audio_bytes = await self.synthesize(text)
        return base64.b64encode(audio_bytes).decode("ascii")

    async def warm_remote_engine(self, timeout: float = 3.0) -> bool:
        """Asynchronously ping remote ZeroGPU / Colab endpoint to pre-warm dynamic allocation.

        Sends a lightweight non-blocking GET /health request to wake up sleeping Zero-cost
        Graphics Processing Unit (ZeroGPU) containers on Hugging Face (HF) Spaces or
        Google Colaboratory (Colab) before live stream Text-to-Speech (TTS) events arrive.

        Args:
            timeout: Network request timeout in seconds (default: 3.0s).

        Returns:
            bool: True if remote endpoint returned HTTP 200, False otherwise.
        """
        if not self._config.prefer_colab_tts or not self._config.colab_tunnel_url:
            return False

        url = f"{self._config.colab_tunnel_url.rstrip('/')}/health"
        headers = {
            "User-Agent": "TikTok-Live-TTS-Bot/2.0",
        }
        if self._config.hf_token:
            headers["Authorization"] = f"Bearer {self._config.hf_token}"

        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.get(url, headers=headers)
                if response.status_code == 200:
                    logger.info("Remote TTS pre-warming successful (HTTP 200 at %s)", url)
                    return True
                logger.warning(
                    "Remote TTS pre-warming returned HTTP %s from %s",
                    response.status_code,
                    url,
                )
                return False
        except (httpx.HTTPError, Exception) as exc:
            logger.warning("Remote TTS pre-warming ping failed (%s) at %s", exc, url)
            return False

    async def _synthesize_colab(self, text: str) -> bytes:
        """Synthesize speech via Google Colab Fish Speech self-hosted endpoint."""
        if not self._config.colab_tunnel_url:
            raise RuntimeError("Colab tunnel URL is not configured")

        url = f"{self._config.colab_tunnel_url.rstrip('/')}/v1/tts"
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "TikTok-Live-TTS-Bot/2.0",
        }
        if self._config.hf_token:
            headers["Authorization"] = f"Bearer {self._config.hf_token}"
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

    async def _synthesize_fish_audio(
        self, text: str, model_id: Optional[str] = None
    ) -> bytes:
        headers = {
            "Authorization": f"Bearer {self._config.fish_audio_api_key}",
            "Content-Type": "application/json",
            # Free Developer Tier selector; keeps usage at zero cost.
            "model": self._config.fish_audio_tier_model,
        }
        payload = {
            "text": text,
            "reference_id": model_id or self._config.fish_audio_model_id,
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

    async def _synthesize_edge_tts(
        self,
        text: str,
        voice: Optional[str] = None,
        *,
        rate: str = "+0%",
        pitch: str = "+0Hz",
        volume: str = "+0%",
    ) -> bytes:
        # Imported lazily so the rest of the bot (and tests) work without edge-tts installed.
        import edge_tts

        target_voice = voice or self._config.fallback_voice
        if rate == "+0%" and pitch == "+0Hz" and volume == "+0%":
            communicate = edge_tts.Communicate(text, target_voice)
        else:
            try:
                communicate = edge_tts.Communicate(
                    text, target_voice, rate=rate, pitch=pitch, volume=volume
                )
            except TypeError:
                communicate = edge_tts.Communicate(text, target_voice)
        chunks = [chunk["data"] async for chunk in communicate.stream() if chunk["type"] == "audio"]
        data = b"".join(chunks)
        if not data:
            raise RuntimeError("edge-tts returned empty audio")
        return data
