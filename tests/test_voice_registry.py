"""Unit tests for Multi-Voice Engine Registry, TTSEngine voice routing, and SessionManager voice state."""

from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.config import AppConfig
from src.session_manager import SessionManager
from src.tts_engine import TTSEngine
from src.voice_registry import (
    VOICE_PROFILES,
    VoiceProfile,
    VoiceTuning,
    format_edge_prosody,
    get_voice_profile,
    list_voice_profiles,
    normalize_voice_tuning,
)


def test_default_voice_profile():
    """Verify default voice profile resolution returns Yuta with expected attributes."""
    profile = get_voice_profile("yuta")
    assert isinstance(profile, VoiceProfile)
    assert profile.id == "yuta"
    assert profile.name == "พิพัฒน์ (Yuta)"
    assert profile.engine == "fish_audio"
    assert profile.model_id == "9c110ffde8bc42709516395dfbcfb4a2"
    assert profile.edge_voice == "th-TH-NiwatNeural"
    assert profile.is_default is True


def test_all_five_voice_profiles_registered():
    """Verify all 5 voice profiles are registered in VOICE_PROFILES and list_voice_profiles()."""
    expected_ids = {"yuta", "hana", "joker", "anchor", "niwat"}
    assert set(VOICE_PROFILES.keys()) == expected_ids

    assert VOICE_PROFILES["hana"].name == "ฮานะ (Hana Sweet)"
    assert VOICE_PROFILES["hana"].engine == "fish_audio"
    assert VOICE_PROFILES["hana"].edge_voice == "th-TH-PremwadeeNeural"

    assert VOICE_PROFILES["joker"].name == "ดีเจโจ๊กเกอร์ (DJ Joker)"
    assert VOICE_PROFILES["joker"].engine == "fish_audio"
    assert VOICE_PROFILES["joker"].edge_voice == "th-TH-NiwatNeural"

    assert VOICE_PROFILES["anchor"].name == "ผู้ประกาศข่าว ชาย (News Anchor)"
    assert VOICE_PROFILES["anchor"].engine == "fish_audio"
    assert VOICE_PROFILES["anchor"].edge_voice == "th-TH-NiwatNeural"

    serialized = list_voice_profiles()
    assert len(serialized) == 5
    assert all(isinstance(item, dict) for item in serialized)
    assert {item["id"] for item in serialized} == expected_ids


def test_edge_tts_fallback_profile():
    """Verify Niwat Edge-TTS profile configuration."""
    profile = get_voice_profile("niwat")
    assert profile.id == "niwat"
    assert profile.name == "นิวัฒน์ (Niwat Edge)"
    assert profile.engine == "edge_tts"
    assert profile.edge_voice == "th-TH-NiwatNeural"
    assert profile.model_id is None


def test_unknown_or_empty_voice_fallback():
    """Verify None, empty, or unknown voice_id safely falls back to default 'yuta' profile."""
    assert get_voice_profile("non_existent_voice").id == "yuta"
    assert get_voice_profile("").id == "yuta"
    assert get_voice_profile(None).id == "yuta"


@pytest.mark.asyncio
async def test_tts_engine_synthesize_normalizes_thai_and_routes_by_voice_id(tmp_path: Path):
    """Verify TTSEngine.synthesize normalizes Thai text and routes according to voice_id."""
    cfg = AppConfig(
        tiktok_username="@streamer",
        fish_audio_api_key="valid_fish_key",
        cache_dir=tmp_path / "cache",
        prefer_colab_tts=False,
    )
    engine = TTSEngine(cfg)

    mock_res = MagicMock()
    mock_res.is_success = True
    mock_res.status_code = 200
    mock_res.content = b"FISH_AUDIO_YUTA"

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_res) as mock_post:
        audio = await engine.synthesize("555 จิงดิ", voice_id="yuta")
        assert audio == b"FISH_AUDIO_YUTA"
        sent_payload = mock_post.call_args[1]["json"]
        # Normalized text should convert 555 -> ห้าห้าห้า and จิงดิ -> จริงดิ
        assert "ห้าห้าห้า" in sent_payload["text"]
        assert "จริงดิ" in sent_payload["text"]
        assert sent_payload["reference_id"] == "9c110ffde8bc42709516395dfbcfb4a2"

    # Synthesize with niwat (Edge-TTS profile)
    with patch.object(engine, "_synthesize_edge_tts", new_callable=AsyncMock, return_value=b"NIWAT_EDGE") as mock_edge:
        audio_niwat = await engine.synthesize("สวัสดีคับ", voice_id="niwat")
        assert audio_niwat == b"NIWAT_EDGE"
        mock_edge.assert_awaited_once_with("สวัสดีครับ")


@pytest.mark.asyncio
async def test_tts_engine_fish_profile_without_model_id_uses_profile_edge_voice(tmp_path: Path):
    """Verify Fish Audio profile without model_id (e.g. hana with unset env var) falls back to its edge_voice."""
    cfg = AppConfig(
        tiktok_username="@streamer",
        fish_audio_api_key="valid_fish_key",
        cache_dir=tmp_path / "cache",
        prefer_colab_tts=False,
    )
    engine = TTSEngine(cfg)

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post, patch.object(
        engine, "_synthesize_edge_tts", new_callable=AsyncMock, return_value=b"HANA_PREMWADEE_EDGE"
    ) as mock_edge:
        # Ensure hana has no model_id configured
        with patch.dict(VOICE_PROFILES, {"hana": VoiceProfile(
            id="hana",
            name="ฮานะ (Hana Sweet)",
            description="Sweet female voice",
            engine="fish_audio",
            model_id=None,
            edge_voice="th-TH-PremwadeeNeural",
        )}):
            audio = await engine.synthesize("สวัสดีค่ะ", voice_id="hana")
            assert audio == b"HANA_PREMWADEE_EDGE"
            mock_post.assert_not_called()
            mock_edge.assert_awaited_once_with("สวัสดีค่ะ", voice="th-TH-PremwadeeNeural")


@pytest.mark.asyncio
async def test_colab_routing_isolation_for_non_yuta_voices(tmp_path: Path):
    """Verify Colab endpoint is strictly used for 'yuta' and bypassed for all other voice profiles."""
    cfg = AppConfig(
        tiktok_username="@streamer",
        fish_audio_api_key="valid_fish_key",
        cache_dir=tmp_path / "cache",
        colab_tunnel_url="https://colab-tunnel.trycloudflare.com",
        prefer_colab_tts=True,
    )
    engine = TTSEngine(cfg)

    with patch.object(engine, "_synthesize_colab", new_callable=AsyncMock, return_value=b"COLAB_AUDIO") as mock_colab, \
         patch.object(engine, "_synthesize_edge_tts", new_callable=AsyncMock, return_value=b"EDGE_AUDIO") as mock_edge:

        # 1. Non-yuta voice ('niwat') must bypass Colab completely
        res_niwat = await engine.synthesize("ทดสอบนิวัฒน์", voice_id="niwat")
        assert res_niwat == b"EDGE_AUDIO"
        mock_colab.assert_not_called()
        mock_edge.assert_awaited_once()

        mock_edge.reset_mock()

        # 2. Non-yuta voice ('hana') must also bypass Colab
        res_hana = await engine.synthesize("ทดสอบฮานะ", voice_id="hana")
        assert res_hana == b"EDGE_AUDIO"
        mock_colab.assert_not_called()

        # 3. Default / 'yuta' voice routes to Colab when prefer_colab_tts=True
        res_yuta = await engine.synthesize("ทดสอบยูตะ", voice_id="yuta")
        assert res_yuta == b"COLAB_AUDIO"
        mock_colab.assert_awaited_once()


@pytest.mark.asyncio
async def test_session_manager_voice_state_tracking():
    """Verify SessionManager tracks selected_voice_id and propagates it to speech enqueueing."""
    manager = SessionManager()
    session = manager.create_session(
        tiktok_username="@streamvox_tester",
        fish_audio_api_key="sk-test",
    )

    assert session.selected_voice_id == "yuta"

    # Update session voice to 'hana'
    updated = manager.set_session_voice(session.session_id, "hana")
    assert updated is True
    assert session.selected_voice_id == "hana"

    # Unknown voice ID falls back to 'yuta' or is normalized via get_voice_profile
    manager.set_session_voice(session.session_id, "unknown_voice_xyz")
    assert session.selected_voice_id == "yuta"

    # Non-existent session returns False
    assert manager.set_session_voice("non-existent-session", "niwat") is False

    # Set to 'joker' and enqueue speech via session
    manager.set_session_voice(session.session_id, "joker")
    enqueued = await manager.enqueue_speech(session.session_id, user_id="viewer1", text="สวัสดีครับ")
    assert enqueued is True
    queued_item = session.queue_manager.get_nowait()
    assert queued_item.voice_id == "joker"


def test_normalize_voice_tuning_clamps_and_handles_invalid_inputs():
    t1 = normalize_voice_tuning(speed=3.5, pitch=-90, volume=250)
    assert (t1.speed, t1.pitch, t1.volume) == (2.0, -50, 200)

    t2 = normalize_voice_tuning(speed=0.1, pitch=80, volume=-10)
    assert (t2.speed, t2.pitch, t2.volume) == (0.5, 50, 0)

    t3 = normalize_voice_tuning(speed="invalid", pitch=None, volume="bad")
    assert (t3.speed, t3.pitch, t3.volume) == (1.0, 0, 100)

    t4 = normalize_voice_tuning(speed="1.5", pitch="10", volume="120")
    assert (t4.speed, t4.pitch, t4.volume) == (1.5, 10, 120)

    t5 = normalize_voice_tuning(speed=-5, pitch=999, volume=-20)
    assert (t5.speed, t5.pitch, t5.volume) == (0.5, 50, 0)


def test_format_edge_prosody_formats_rate_pitch_volume():
    default_prosody = format_edge_prosody(VoiceTuning(1.0, 0, 100))
    assert default_prosody == ("+0%", "+0Hz", "+0%")
    assert format_edge_prosody(None) == ("+0%", "+0Hz", "+0%")

    custom_prosody = format_edge_prosody(VoiceTuning(1.25, -12, 80))
    assert custom_prosody == ("+25%", "-12Hz", "-20%")

    assert format_edge_prosody(VoiceTuning(0.8, 10, 130)) == ("-20%", "+10Hz", "+30%")


def test_tts_engine_cache_path_includes_non_default_tuning(tmp_path):
    engine = TTSEngine(cache_dir=tmp_path)
    p_default = engine.get_cache_path("สวัสดี", "yuta")
    p_same = engine.get_cache_path("สวัสดี", "yuta", VoiceTuning(1.0, 0, 100))
    p_fast = engine.get_cache_path("สวัสดี", "yuta", VoiceTuning(1.5, 10, 120))
    assert p_default == p_same
    assert p_default != p_fast


def test_voice_profile_has_default_tuning_fields():
    profile = get_voice_profile("yuta")
    assert (profile.default_speed, profile.default_pitch, profile.default_volume) == (1.0, 0, 100)


@pytest.mark.asyncio
async def test_edge_tts_default_tuning_uses_legacy_two_arg_communicate(tmp_path: Path):
    engine = TTSEngine(cache_dir=tmp_path)

    async def fake_stream():
        yield {"type": "audio", "data": b"AUDIO"}

    with patch("edge_tts.Communicate") as mock_comm:
        mock_comm.return_value.stream = fake_stream
        audio = await engine.synthesize("สวัสดีครับ", voice_id="niwat")
    assert audio == b"AUDIO"
    mock_comm.assert_called_once_with("สวัสดีครับ", "th-TH-NiwatNeural")


@pytest.mark.asyncio
async def test_edge_tts_non_default_tuning_passes_prosody(tmp_path: Path):
    engine = TTSEngine(cache_dir=tmp_path)

    async def fake_stream():
        yield {"type": "audio", "data": b"AUDIO"}

    with patch("edge_tts.Communicate") as mock_comm:
        mock_comm.return_value.stream = fake_stream
        audio = await engine.synthesize(
            "สวัสดีครับ", voice_id="niwat", speed=1.25, pitch=-12, volume=80
        )
    assert audio == b"AUDIO"
    mock_comm.assert_called_once_with(
        "สวัสดีครับ", "th-TH-NiwatNeural", rate="+25%", pitch="-12Hz", volume="-20%"
    )
