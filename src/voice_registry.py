"""Multi-Voice Engine Registry and Voice Profile Definitions for StreamVox Live.

This module defines the curated voice profiles for the StreamVox Live platform,
supporting both Fish Audio Application Programming Interface (API) neural voice
cloning models and Microsoft Edge-TTS Neural fallback voices.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
import os
from typing import Any


@dataclass
class VoiceProfile:
    """Represents a selectable Text-to-Speech (TTS) voice profile.

    Attributes:
        id: Unique short identifier for the voice profile (e.g., "yuta", "hana").
        name: Display name in Thai and English for the dashboard User Interface (UI).
        description: Concise description of the voice persona and acoustic style.
        engine: Primary synthesis engine ("fish_audio" or "edge_tts").
        model_id: Optional Fish Audio reference model identifier.
        edge_voice: Microsoft Edge-TTS neural voice identifier used directly or as fallback.
        is_default: Boolean flag indicating whether this profile is the system default.
    """

    id: str
    name: str
    description: str
    engine: str  # "fish_audio" or "edge_tts"
    model_id: str | None = None
    edge_voice: str = "th-TH-NiwatNeural"
    is_default: bool = False


def _env_or_none(key: str) -> str | None:
    """Read an environment variable and return None if unset or blank."""
    val = os.getenv(key)
    if val is not None and val.strip():
        return val.strip()
    return None


VOICE_PROFILES: dict[str, VoiceProfile] = {
    "yuta": VoiceProfile(
        id="yuta",
        name="พิพัฒน์ (Yuta)",
        description="เสียงมาตรฐาน อบอุ่น เป็นธรรมชาติ (Official StreamVox Primary Voice)",
        engine="fish_audio",
        model_id="9c110ffde8bc42709516395dfbcfb4a2",
        edge_voice="th-TH-NiwatNeural",
        is_default=True,
    ),
    "hana": VoiceProfile(
        id="hana",
        name="ฮานะ (Hana Sweet)",
        description="เสียงสาวหวาน สไตล์อนิเมะ น่ารักสดใส เหมาะกับไลฟ์พูดคุยและเกมมิ่ง",
        engine="fish_audio",
        model_id=_env_or_none("FISH_AUDIO_HANA_MODEL_ID"),
        edge_voice="th-TH-PremwadeeNeural",
        is_default=False,
    ),
    "joker": VoiceProfile(
        id="joker",
        name="ดีเจโจ๊กเกอร์ (DJ Joker)",
        description="เสียงดีเจสายเอ็นเตอร์เทน กระตือรือร้น เฮฮา สร้างสีสันในไลฟ์สตรีม",
        engine="fish_audio",
        model_id=_env_or_none("FISH_AUDIO_JOKER_MODEL_ID"),
        edge_voice="th-TH-NiwatNeural",
        is_default=False,
    ),
    "anchor": VoiceProfile(
        id="anchor",
        name="ผู้ประกาศข่าว ชาย (News Anchor)",
        description="เสียงทุ้ม ชัดเจน สุภาพ เป็นทางการ เหมาะสำหรับไลฟ์สาระและความรู้",
        engine="fish_audio",
        model_id=_env_or_none("FISH_AUDIO_ANCHOR_MODEL_ID"),
        edge_voice="th-TH-NiwatNeural",
        is_default=False,
    ),
    "niwat": VoiceProfile(
        id="niwat",
        name="นิวัฒน์ (Niwat Edge)",
        description="เสียง Microsoft Neural ความเร็วสูง ฟรีไม่จำกัดโควต้า (Zero-Quota Fallback)",
        engine="edge_tts",
        model_id=None,
        edge_voice="th-TH-NiwatNeural",
        is_default=False,
    ),
}


def get_voice_profile(voice_id: str | None) -> VoiceProfile:
    """Resolve a VoiceProfile by identifier, safely falling back to 'yuta' default.

    Args:
        voice_id: Target voice profile identifier or None.

    Returns:
        VoiceProfile: Matched voice profile or the default 'yuta' profile.
    """
    if not voice_id or not isinstance(voice_id, str):
        return VOICE_PROFILES["yuta"]

    clean_id = voice_id.strip().lower()
    if clean_id in VOICE_PROFILES:
        profile = VOICE_PROFILES[clean_id]
        # Dynamically refresh env-backed model_id if None so runtime monkeypatching works
        if profile.id == "hana" and profile.model_id is None:
            env_model = _env_or_none("FISH_AUDIO_HANA_MODEL_ID")
            if env_model:
                return VoiceProfile(
                    id=profile.id,
                    name=profile.name,
                    description=profile.description,
                    engine=profile.engine,
                    model_id=env_model,
                    edge_voice=profile.edge_voice,
                    is_default=profile.is_default,
                )
        elif profile.id == "joker" and profile.model_id is None:
            env_model = _env_or_none("FISH_AUDIO_JOKER_MODEL_ID")
            if env_model:
                return VoiceProfile(
                    id=profile.id,
                    name=profile.name,
                    description=profile.description,
                    engine=profile.engine,
                    model_id=env_model,
                    edge_voice=profile.edge_voice,
                    is_default=profile.is_default,
                )
        elif profile.id == "anchor" and profile.model_id is None:
            env_model = _env_or_none("FISH_AUDIO_ANCHOR_MODEL_ID")
            if env_model:
                return VoiceProfile(
                    id=profile.id,
                    name=profile.name,
                    description=profile.description,
                    engine=profile.engine,
                    model_id=env_model,
                    edge_voice=profile.edge_voice,
                    is_default=profile.is_default,
                )
        return profile

    return VOICE_PROFILES["yuta"]


def list_voice_profiles() -> list[dict[str, Any]]:
    """Return a serializable list of dictionaries for all registered voice profiles.

    Returns:
        list[dict[str, Any]]: List of voice profile dictionaries for API responses.
    """
    return [asdict(get_voice_profile(vid)) for vid in VOICE_PROFILES]
