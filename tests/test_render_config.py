"""Tests for Render Infrastructure as Code (render.yaml) and Dockerfile port flexibility.

Validates schema, web service configuration, free tier plan, environment variables,
and flexible container port binding across Hugging Face Spaces and Render environments.
"""

from pathlib import Path
import pytest
import yaml

REPO_ROOT = Path(__file__).resolve().parent.parent
RENDER_YAML_PATH = REPO_ROOT / "render.yaml"
DOCKERFILE_PATH = REPO_ROOT / "Dockerfile"


def load_render_config() -> dict:
    """Load and parse render.yaml specification."""
    assert RENDER_YAML_PATH.exists(), f"render.yaml not found at {RENDER_YAML_PATH}"
    content = RENDER_YAML_PATH.read_text(encoding="utf-8")
    data = yaml.safe_load(content)
    assert isinstance(data, dict), "render.yaml must parse as a dictionary"
    return data


def test_render_yaml_exists_and_valid():
    """Verify render.yaml exists and parses cleanly as valid YAML."""
    data = load_render_config()
    assert "services" in data
    assert isinstance(data["services"], list)
    assert len(data["services"]) > 0


def test_render_web_service_definition():
    """Validate web service metadata, free plan, region, and runtime environment."""
    data = load_render_config()
    services = data["services"]
    web_services = [s for s in services if s.get("type") == "web"]

    assert len(web_services) >= 1, "At least one web service must be defined in render.yaml"
    web = web_services[0]

    assert web.get("name") == "tiktok-live-tts-bot"
    assert web.get("env") == "python"
    assert web.get("plan") == "free"
    assert web.get("region") == "oregon"


def test_render_build_and_start_commands():
    """Ensure build and start commands properly install dependencies and bind to dynamic $PORT."""
    data = load_render_config()
    web = [s for s in data["services"] if s.get("type") == "web"][0]

    build_cmd = web.get("buildCommand", "")
    assert "pip install" in build_cmd
    assert "requirements.txt" in build_cmd

    start_cmd = web.get("startCommand", "")
    assert "uvicorn" in start_cmd
    assert "src.web_server:app" in start_cmd
    assert "--host 0.0.0.0" in start_cmd
    assert "$PORT" in start_cmd


def test_render_environment_variables():
    """Verify required environment variables and secrets are defined with proper sync flags."""
    data = load_render_config()
    web = [s for s in data["services"] if s.get("type") == "web"][0]

    env_vars = web.get("envVars", [])
    assert isinstance(env_vars, list)
    env_map = {item["key"]: item for item in env_vars if "key" in item}

    # Static preset configuration
    assert "PYTHON_VERSION" in env_map
    assert env_map["PYTHON_VERSION"].get("value") == "3.11.9"

    assert "PREFER_COLAB_TTS" in env_map
    assert str(env_map["PREFER_COLAB_TTS"].get("value")).lower() == "true"

    assert "COLAB_TTS_TIMEOUT_SECONDS" in env_map
    assert str(env_map["COLAB_TTS_TIMEOUT_SECONDS"].get("value")) == "4.0"

    assert "ENABLE_FALLBACK_TTS" in env_map
    assert str(env_map["ENABLE_FALLBACK_TTS"].get("value")).lower() == "true"

    # User-configured runtime secrets / variables (sync: false)
    secret_keys = [
        "TIKTOK_USERNAME",
        "COLAB_TUNNEL_URL",
        "FISH_AUDIO_API_KEY",
        "HF_TOKEN",
    ]
    for key in secret_keys:
        assert key in env_map, f"Missing required env var key: {key}"
        assert env_map[key].get("sync") is False, f"Secret env var '{key}' must have 'sync: false'"


def test_dockerfile_port_flexibility():
    """Ensure Dockerfile supports flexible $PORT injection for cloud container deployment."""
    assert DOCKERFILE_PATH.exists(), f"Dockerfile not found at {DOCKERFILE_PATH}"
    content = DOCKERFILE_PATH.read_text(encoding="utf-8")

    # Verify base image is slim python
    assert "FROM python:3.11-slim" in content

    # Verify EXPOSE 7860
    assert "EXPOSE 7860" in content

    # Verify CMD uses shell form or variable substitution to respect ${PORT:-7860} or $PORT
    assert "${PORT" in content or "$PORT" in content
    assert "uvicorn src.web_server:app" in content
