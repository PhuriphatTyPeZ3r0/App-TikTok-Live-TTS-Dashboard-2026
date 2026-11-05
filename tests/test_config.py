from pathlib import Path
import pytest
from src.config import load_config, AppConfig


def test_load_config_defaults(tmp_path: Path):
    """Test loading configuration with default values applied."""
    env_file = tmp_path / ".env"
    env_file.write_text(
        "TIKTOK_USERNAME=@streamer\n"
        "FISH_AUDIO_API_KEY=test_api_key\n",
        encoding="utf-8"
    )
    config = load_config(str(env_file))
    assert isinstance(config, AppConfig)
    assert config.tiktok_username == "@streamer"
    assert config.fish_audio_api_key == "test_api_key"
    assert config.fish_audio_model_id == "9c110ffde8bc42709516395dfbcfb4a2"
    assert config.fish_audio_tier_model == "s2.1-pro-free"
    assert config.fallback_voice == "th-TH-NiwatNeural"
    assert config.max_queue_size == 10
    assert config.min_gift_coins == 1
    assert config.emergency_hotkey == "f9"
    assert config.audio_output_device_name == "CABLE Input (VB-Audio Virtual Cable)"
    assert config.max_comment_length == 80
    assert config.user_cooldown_seconds == 15
    assert config.enable_fallback_tts is True
    assert config.cache_dir == Path(".cache/audio")


def test_load_config_custom_values(tmp_path: Path):
    """Test loading configuration with custom environment variable overrides."""
    env_file = tmp_path / ".env"
    env_file.write_text(
        "TIKTOK_USERNAME=@custom_user\n"
        "FISH_AUDIO_API_KEY=custom_key_123\n"
        "FISH_AUDIO_MODEL_ID=custom_model_id\n"
        "FISH_AUDIO_TIER_MODEL=s2.1-custom\n"
        "ENABLE_FALLBACK_TTS=false\n"
        "FALLBACK_VOICE=th-TH-PremwadeeNeural\n"
        "AUDIO_OUTPUT_DEVICE_NAME=Speakers (Realtek)\n"
        "MAX_COMMENT_LENGTH=120\n"
        "USER_COOLDOWN_SECONDS=30\n"
        "MAX_QUEUE_SIZE=25\n"
        "MIN_GIFT_COINS=5\n"
        "EMERGENCY_HOTKEY=f10\n"
        "CACHE_DIR=custom_cache/dir\n",
        encoding="utf-8"
    )
    config = load_config(str(env_file))
    assert config.tiktok_username == "@custom_user"
    assert config.fish_audio_api_key == "custom_key_123"
    assert config.fish_audio_model_id == "custom_model_id"
    assert config.fish_audio_tier_model == "s2.1-custom"
    assert config.enable_fallback_tts is False
    assert config.fallback_voice == "th-TH-PremwadeeNeural"
    assert config.audio_output_device_name == "Speakers (Realtek)"
    assert config.max_comment_length == 120
    assert config.user_cooldown_seconds == 30
    assert config.max_queue_size == 25
    assert config.min_gift_coins == 5
    assert config.emergency_hotkey == "f10"
    assert config.cache_dir == Path("custom_cache/dir")


def test_load_config_invalid_numeric_types_fallback_to_defaults(tmp_path: Path):
    """Test that invalid numeric strings safely fall back to default values."""
    env_file = tmp_path / ".env"
    env_file.write_text(
        "MAX_COMMENT_LENGTH=invalid_int\n"
        "USER_COOLDOWN_SECONDS=not_a_number\n"
        "MAX_QUEUE_SIZE=xyz\n"
        "MIN_GIFT_COINS=\n",
        encoding="utf-8"
    )
    config = load_config(str(env_file))
    assert config.max_comment_length == 80
    assert config.user_cooldown_seconds == 15
    assert config.max_queue_size == 10
    assert config.min_gift_coins == 1


def test_load_config_empty_string_values_fallback_to_defaults(tmp_path: Path):
    """Test that empty string values in .env safely fall back to default values."""
    env_file = tmp_path / ".env"
    env_file.write_text(
        "TIKTOK_USERNAME=@streamer\n"
        "FISH_AUDIO_API_KEY=test_api_key\n"
        "FISH_AUDIO_MODEL_ID=\n"
        "FISH_AUDIO_TIER_MODEL=\n"
        "ENABLE_FALLBACK_TTS=\n"
        "FALLBACK_VOICE=\n"
        "AUDIO_OUTPUT_DEVICE_NAME=\n"
        "MAX_COMMENT_LENGTH=\n"
        "USER_COOLDOWN_SECONDS=\n"
        "MAX_QUEUE_SIZE=\n"
        "MIN_GIFT_COINS=\n"
        "EMERGENCY_HOTKEY=\n"
        "CACHE_DIR=\n",
        encoding="utf-8"
    )
    config = load_config(str(env_file))
    assert config.tiktok_username == "@streamer"
    assert config.fish_audio_api_key == "test_api_key"
    assert config.fish_audio_model_id == "9c110ffde8bc42709516395dfbcfb4a2"
    assert config.fish_audio_tier_model == "s2.1-pro-free"
    assert config.enable_fallback_tts is True
    assert config.fallback_voice == "th-TH-NiwatNeural"
    assert config.audio_output_device_name == "CABLE Input (VB-Audio Virtual Cable)"
    assert config.max_comment_length == 80
    assert config.user_cooldown_seconds == 15
    assert config.max_queue_size == 10
    assert config.min_gift_coins == 1
    assert config.emergency_hotkey == "f9"
    assert config.cache_dir == Path(".cache/audio")


def test_load_config_default_none_path(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    """Test load_config() with no arguments loads .env from current working directory."""
    env_file = tmp_path / ".env"
    env_file.write_text(
        "TIKTOK_USERNAME=@cwd_streamer\n"
        "FISH_AUDIO_API_KEY=cwd_api_key\n",
        encoding="utf-8"
    )
    monkeypatch.chdir(tmp_path)
    config = load_config()
    assert isinstance(config, AppConfig)
    assert config.tiktok_username == "@cwd_streamer"
    assert config.fish_audio_api_key == "cwd_api_key"
    assert config.fish_audio_model_id == "9c110ffde8bc42709516395dfbcfb4a2"
    assert config.fallback_voice == "th-TH-NiwatNeural"


def test_load_config_nonexistent_file_returns_defaults():
    """Test loading config from nonexistent file returns default values."""
    config = load_config("nonexistent_env_file_path.env")
    assert isinstance(config, AppConfig)
    assert config.fish_audio_tier_model == "s2.1-pro-free"
    assert config.emergency_hotkey == "f9"
    assert config.cache_dir == Path(".cache/audio")


def test_app_config_colab_tunnel_fields(tmp_path: Path):
    """Test loading Google Colab tunnel configuration fields and default fallbacks."""
    env_file = tmp_path / ".env"
    env_file.write_text(
        "TIKTOK_USERNAME=@streamer\n"
        "FISH_AUDIO_API_KEY=test_api_key\n"
        "COLAB_TUNNEL_URL=https://sample-tunnel.loca.lt/ \n"
        "COLAB_TTS_TIMEOUT_SECONDS=3.5\n"
        "PREFER_COLAB_TTS=false\n",
        encoding="utf-8"
    )
    config = load_config(str(env_file))
    assert config.colab_tunnel_url == "https://sample-tunnel.loca.lt"
    assert config.colab_tts_timeout_seconds == 3.5
    assert config.prefer_colab_tts is False

    # Also test empty string, invalid float, and defaults
    empty_env = tmp_path / ".env.empty"
    empty_env.write_text(
        "TIKTOK_USERNAME=@streamer\n"
        "FISH_AUDIO_API_KEY=test_api_key\n"
        "COLAB_TUNNEL_URL=   \n"
        "COLAB_TTS_TIMEOUT_SECONDS=invalid_float\n"
        "PREFER_COLAB_TTS=\n",
        encoding="utf-8"
    )
    config_empty = load_config(str(empty_env))
    assert config_empty.colab_tunnel_url is None
    assert config_empty.colab_tts_timeout_seconds == 5.0
    assert config_empty.prefer_colab_tts is True

    # Test schemeless URL normalization (adding https://) and stripping slashes
    schemeless_env = tmp_path / ".env.schemeless"
    schemeless_env.write_text(
        "TIKTOK_USERNAME=@streamer\n"
        "FISH_AUDIO_API_KEY=test_api_key\n"
        "COLAB_TUNNEL_URL=fast-tunnel.trycloudflare.com/ \n",
        encoding="utf-8"
    )
    config_schemeless = load_config(str(schemeless_env))
    assert config_schemeless.colab_tunnel_url == "https://fast-tunnel.trycloudflare.com"
    assert config_schemeless.colab_tts_timeout_seconds == 5.0
