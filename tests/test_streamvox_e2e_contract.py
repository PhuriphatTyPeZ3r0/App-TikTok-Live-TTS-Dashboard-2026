"""End-to-End Contract and System Verification Tests for StreamVox Live.

Verifies the complete end-to-end (E2E) integration across:
1. Multi-Voice Engine Registry (`GET /api/voices`) returning all 5 curated voice profiles.
2. Session Voice Switching (`POST /api/session/{id}/voice` and WebSocket `set_voice`).
3. PyThaiNLP Precision Speech Pipeline (`normalize_thai_speech`) integrated into `TTSEngine.synthesize`
   via `POST /api/session/{id}/test-voice`.
4. Raw Display Text Isolation: UI/Queue (`TTSItem.text`) and WebSocket `ALERT` broadcast retain the
   original un-normalized chat message while the Text-to-Speech (TTS) engine receives the phonetically
   normalized string.
5. `README.md` documentation contract for StreamVox Live branding, Multi-Voice Ecosystem, PyThaiNLP
   pipeline, and REST/WebSocket API specifications.

Voice Actor Attribution: พิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)
Architecture: Asynchronous Server Gateway Interface (ASGI) FastAPI backend, Single-Page Application (SPA)
Next.js 15 dashboard, First-In, First-Out (FIFO) priority queue, and Natural Language Processing (NLP)
Grapheme-to-Phoneme (G2P) normalization with Least Recently Used (LRU) caching.
"""

import base64
from pathlib import Path
from typing import Any, List, Tuple
import pytest
from fastapi.testclient import TestClient

from src.session_manager import SessionInstance
from src.thai_normalizer import normalize_thai_speech
from src.web_server import app, session_manager

REPO_ROOT = Path(__file__).resolve().parent.parent
README_FILE = REPO_ROOT / "README.md"


@pytest.fixture
def client() -> TestClient:
    """Create a FastAPI TestClient instance."""
    return TestClient(app)


@pytest.fixture
def e2e_session() -> SessionInstance:
    """Provision a clean isolated session for E2E contract testing."""
    session = session_manager.create_session(
        tiktok_username="@streamvox_e2e_creator",
        fish_audio_api_key="sk-e2e-test-key",
        enable_comments=True,
        enable_gifts=True,
    )
    yield session
    session_manager.delete_session(session.session_id)


def test_streamvox_e2e_voices_switch_and_pythainlp_isolation(
    client: TestClient,
    e2e_session: SessionInstance,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Verify full E2E contract: /api/voices -> /api/session/{id}/voice -> /test-voice with PyThaiNLP & raw isolation."""
    # Step 1: Query GET /api/voices -> confirm 5 profiles returned
    voices_resp = client.get("/api/voices")
    assert voices_resp.status_code == 200
    voices_data = voices_resp.json()
    assert "voices" in voices_data
    voices = voices_data["voices"]
    assert len(voices) == 5

    voice_ids = [v["id"] for v in voices]
    assert voice_ids == ["yuta", "hana", "joker", "anchor", "niwat"]

    # Step 2: Switch session voice via POST /api/session/{id}/voice to "niwat"
    switch_resp = client.post(
        f"/api/session/{e2e_session.session_id}/voice?token={e2e_session.admin_token}",
        json={"voice_id": "niwat"},
    )
    assert switch_resp.status_code == 200
    switch_json = switch_resp.json()
    assert switch_json["status"] == "ok"
    assert switch_json["voice_id"] == "niwat"
    assert e2e_session.selected_voice_id == "niwat"

    # Confirm via GET /api/session/{id}/status
    status_resp = client.get(
        f"/api/session/{e2e_session.session_id}/status?token={e2e_session.admin_token}"
    )
    assert status_resp.status_code == 200
    assert status_resp.json()["selected_voice_id"] == "niwat"

    # Step 3: Instrument TTSEngine to capture both the synthesize(text, voice_id) call
    # and the underlying Edge-TTS synthesis call receiving PyThaiNLP-normalized text.
    assert e2e_session.tts_engine is not None
    tts_engine = e2e_session.tts_engine

    synthesize_calls: List[Tuple[str, Any]] = []
    edge_tts_calls: List[Tuple[str, str]] = []
    fake_mp3_bytes = b"ID3-FAKE-STREAMVOX-NIWAT-MP3"

    orig_synthesize = tts_engine.synthesize

    async def tracked_synthesize(text: str, voice_id: str | None = None) -> bytes:
        synthesize_calls.append((text, voice_id))
        return await orig_synthesize(text, voice_id=voice_id)

    async def fake_call_edge_tts_with_voice(normalized_text: str, edge_voice: str) -> bytes:
        edge_tts_calls.append((normalized_text, edge_voice))
        return fake_mp3_bytes

    monkeypatch.setattr(tts_engine, "synthesize", tracked_synthesize)
    monkeypatch.setattr(tts_engine, "_call_edge_tts_with_voice", fake_call_edge_tts_with_voice)

    raw_chat_text = "สวัสดีคับ 555 วันนี้ Live สนุกจิงดิ"
    expected_normalized_text = normalize_thai_speech(raw_chat_text)
    assert expected_normalized_text == "สวัสดีครับ ห้าห้าห้า วันนี้ ไลฟ์ สนุกจริงดิ"

    with client.websocket_connect(
        f"/ws/overlay/{e2e_session.session_id}?token={e2e_session.overlay_token}"
    ) as overlay_ws:
        test_voice_resp = client.post(
            f"/api/session/{e2e_session.session_id}/test-voice?token={e2e_session.admin_token}",
            json={"text": raw_chat_text},
        )
        assert test_voice_resp.status_code == 200
        resp_body = test_voice_resp.json()

        # Verify TTSEngine.synthesize was invoked with voice_id="niwat"
        assert len(synthesize_calls) == 1
        assert synthesize_calls[0] == (raw_chat_text, "niwat")

        # Verify PyThaiNLP normalizer converted text before passing to the acoustic backend
        assert len(edge_tts_calls) == 1
        synthesized_phonetic_text, used_edge_voice = edge_tts_calls[0]
        assert synthesized_phonetic_text == expected_normalized_text
        assert "สวัสดีครับ" in synthesized_phonetic_text
        assert "ห้าห้าห้า" in synthesized_phonetic_text
        assert "ไลฟ์" in synthesized_phonetic_text
        assert "สนุกจริงดิ" in synthesized_phonetic_text
        assert used_edge_voice == "th-TH-NiwatNeural"

        # Step 4: Verify raw text isolation across HTTP response, Queue item, and Overlay WebSocket
        assert resp_body["success"] is True
        assert resp_body["voice_id"] == "niwat"
        assert resp_body["text"] == raw_chat_text
        assert resp_body["audio_base64"] == base64.b64encode(fake_mp3_bytes).decode("ascii")

        # Queue item retains raw text and voice_id="niwat"
        queued_item = e2e_session.queue_manager.get_nowait()
        assert queued_item is not None
        assert queued_item.text == raw_chat_text
        assert getattr(queued_item, "voice_id", None) == "niwat"

        # WebSocket overlay ALERT retains raw display text
        ws_alert = overlay_ws.receive_json()
        assert ws_alert["type"] == "ALERT"
        assert ws_alert["text"] == raw_chat_text
        assert ws_alert["voice_id"] == "niwat"
        assert ws_alert["audio_base64"] == base64.b64encode(fake_mp3_bytes).decode("ascii")


def test_readme_streamvox_live_documentation_contract() -> None:
    """Verify README.md documents StreamVox Live branding, Multi-Voice ecosystem, PyThaiNLP, and voice APIs."""
    assert README_FILE.exists(), f"Missing README.md at {README_FILE}"
    content = README_FILE.read_text(encoding="utf-8")

    # 1. StreamVox Live Brand & Studio UI
    assert "StreamVox Live" in content
    assert "Prompt" in content
    assert "Material Symbols" in content

    # 2. Multi-Voice Ecosystem (5 curated profiles)
    for profile_id in ["yuta", "hana", "joker", "anchor", "niwat"]:
        assert profile_id in content, f"README.md missing voice profile ID '{profile_id}'"
    assert "ฮานะ" in content
    assert "ดีเจโจ๊กเกอร์" in content
    assert "ผู้ประกาศข่าว" in content
    assert "นิวัฒน์" in content

    # 3. PyThaiNLP Precision Speech Pipeline
    assert "PyThaiNLP" in content
    assert "newmm" in content
    assert "Grapheme-to-Phoneme (G2P)" in content
    assert "Least Recently Used (LRU)" in content

    # 4. Voice Switching REST & WebSocket API
    assert "/api/voices" in content
    assert "/voice" in content
    assert "set_voice" in content
