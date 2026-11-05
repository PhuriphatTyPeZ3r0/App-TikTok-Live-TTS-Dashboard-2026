"""Configuration module for TikTok Live Text-to-Speech (TTS) Bot.

Handles loading, parsing, and validating environment variables from .env files
or system environment variables into a structured AppConfig dataclass.
"""

from dataclasses import dataclass
import os
from pathlib import Path
from typing import Optional
from dotenv import dotenv_values, find_dotenv, load_dotenv


@dataclass
class AppConfig:
    """Application configuration for TikTok Live Text-to-Speech (TTS) Bot.

    Attributes:
        tiktok_username: Unique channel handle for TikTok Live streamer.
        fish_audio_api_key: Application Programming Interface (API) key for Fish Audio.
        fish_audio_model_id: Custom reference voice model identifier.
        fish_audio_tier_model: Free Developer Tier model name (s2.1-pro-free).
        enable_fallback_tts: Flag to enable Microsoft Edge Neural TTS fallback.
        fallback_voice: Neural voice name for fallback TTS (e.g. th-TH-NiwatNeural).
        audio_output_device_name: Name of target audio driver (VB-Audio Virtual Cable).
        max_comment_length: Maximum allowed character length for incoming comments.
        user_cooldown_seconds: Cooldown duration per user to prevent spam.
        max_queue_size: Maximum capacity of First-In, First-Out (FIFO) queue.
        min_gift_coins: Minimum gift diamond/coin value required to trigger speech.
        emergency_hotkey: Operating System (OS) global hotkey for emergency stop.
        cache_dir: Local storage directory for synthesized audio cache.
        colab_tunnel_url: Optional public Uniform Resource Locator (URL) for Google Colaboratory (Colab) tunnel endpoint.
        colab_tts_timeout_seconds: Network timeout threshold in seconds for Google Colab TTS synthesis requests.
        prefer_colab_tts: Flag prioritizing Google Colab Edge-TTS acceleration endpoint over local fallback.
    """

    tiktok_username: str
    fish_audio_api_key: str
    fish_audio_model_id: str = "9c110ffde8bc42709516395dfbcfb4a2"
    fish_audio_tier_model: str = "s2.1-pro-free"
    enable_fallback_tts: bool = True
    fallback_voice: str = "th-TH-NiwatNeural"
    audio_output_device_name: str = "CABLE Input (VB-Audio Virtual Cable)"
    max_comment_length: int = 80
    user_cooldown_seconds: int = 15
    max_queue_size: int = 10
    min_gift_coins: int = 1
    emergency_hotkey: str = "f9"
    cache_dir: Path = Path(".cache/audio")
    colab_tunnel_url: Optional[str] = None
    colab_tts_timeout_seconds: float = 5.0
    prefer_colab_tts: bool = True


def _get_val(key: str, file_vars: dict, default: str) -> str:
    """Retrieve string value prioritizing explicit env file then system environment.

    Guards against empty stripped strings by falling back to the default value.
    """
    raw_val = None
    if key in file_vars and file_vars[key] is not None:
        raw_val = file_vars[key]
    else:
        raw_val = os.environ.get(key)

    if raw_val is not None:
        stripped = str(raw_val).strip()
        if stripped != "":
            return stripped
    return default


def _parse_bool(val: Optional[str], default: bool = True) -> bool:
    """Parse string representation of boolean with empty-string guard."""
    if val is None or str(val).strip() == "":
        return default
    return str(val).strip().lower() in ("true", "1", "yes", "t", "y")


def _parse_int(val: Optional[str], default: int) -> int:
    """Parse string representation of integer safely with empty-string guard."""
    if val is None or str(val).strip() == "":
        return default
    try:
        return int(str(val).strip())
    except (ValueError, TypeError):
        return default


def _parse_float(val: Optional[str], default: float) -> float:
    """Parse string representation of float safely with empty-string guard."""
    if val is None or str(val).strip() == "":
        return default
    try:
        return float(str(val).strip())
    except (ValueError, TypeError):
        return default


def normalize_tunnel_url(url: Optional[str]) -> Optional[str]:
    """Normalize tunnel URL by prepending https:// if schemeless and stripping trailing slashes."""
    if url is None:
        return None
    cleaned = str(url).strip().rstrip("/")
    if not cleaned:
        return None
    if "://" not in cleaned:
        cleaned = f"https://{cleaned}"
    return cleaned.rstrip("/")


def load_config(env_path: Optional[str] = None) -> AppConfig:
    """Load and validate configuration from .env file or environment variables.

    Args:
        env_path: Optional file path to a specific .env file. If None, resolves
            .env from current working directory or ancestors.

    Returns:
        AppConfig: Instantiated configuration dataclass.
    """
    file_vars: dict = {}
    if env_path is not None:
        file_vars = dotenv_values(dotenv_path=env_path)
    else:
        target_env = find_dotenv(usecwd=True)
        if target_env:
            load_dotenv(dotenv_path=target_env)
            file_vars = dotenv_values(dotenv_path=target_env)
        else:
            load_dotenv()
            file_vars = dotenv_values()

    tiktok_username = _get_val("TIKTOK_USERNAME", file_vars, "")
    fish_audio_api_key = _get_val("FISH_AUDIO_API_KEY", file_vars, "")
    fish_audio_model_id = _get_val("FISH_AUDIO_MODEL_ID", file_vars, "9c110ffde8bc42709516395dfbcfb4a2")
    fish_audio_tier_model = _get_val("FISH_AUDIO_TIER_MODEL", file_vars, "s2.1-pro-free")

    enable_fallback_tts_str = _get_val("ENABLE_FALLBACK_TTS", file_vars, "true")
    enable_fallback_tts = _parse_bool(enable_fallback_tts_str, default=True)

    fallback_voice = _get_val("FALLBACK_VOICE", file_vars, "th-TH-NiwatNeural")
    audio_output_device_name = _get_val(
        "AUDIO_OUTPUT_DEVICE_NAME", file_vars, "CABLE Input (VB-Audio Virtual Cable)"
    )

    max_comment_length = _parse_int(_get_val("MAX_COMMENT_LENGTH", file_vars, "80"), 80)
    user_cooldown_seconds = _parse_int(_get_val("USER_COOLDOWN_SECONDS", file_vars, "15"), 15)
    max_queue_size = _parse_int(_get_val("MAX_QUEUE_SIZE", file_vars, "10"), 10)
    min_gift_coins = _parse_int(_get_val("MIN_GIFT_COINS", file_vars, "1"), 1)

    emergency_hotkey = _get_val("EMERGENCY_HOTKEY", file_vars, "f9").lower()
    cache_dir_str = _get_val("CACHE_DIR", file_vars, ".cache/audio")
    cache_dir = Path(cache_dir_str)

    raw_colab_url = _get_val("COLAB_TUNNEL_URL", file_vars, "")
    colab_tunnel_url: Optional[str] = normalize_tunnel_url(raw_colab_url)

    colab_tts_timeout_seconds = _parse_float(
        _get_val("COLAB_TTS_TIMEOUT_SECONDS", file_vars, "5.0"), 5.0
    )
    prefer_colab_tts = _parse_bool(
        _get_val("PREFER_COLAB_TTS", file_vars, "true"), default=True
    )

    return AppConfig(
        tiktok_username=tiktok_username,
        fish_audio_api_key=fish_audio_api_key,
        fish_audio_model_id=fish_audio_model_id,
        fish_audio_tier_model=fish_audio_tier_model,
        enable_fallback_tts=enable_fallback_tts,
        fallback_voice=fallback_voice,
        audio_output_device_name=audio_output_device_name,
        max_comment_length=max_comment_length,
        user_cooldown_seconds=user_cooldown_seconds,
        max_queue_size=max_queue_size,
        min_gift_coins=min_gift_coins,
        emergency_hotkey=emergency_hotkey,
        cache_dir=cache_dir,
        colab_tunnel_url=colab_tunnel_url,
        colab_tts_timeout_seconds=colab_tts_timeout_seconds,
        prefer_colab_tts=prefer_colab_tts,
    )
