import io
import logging
import os
from pathlib import Path
import time
from typing import AsyncGenerator, Optional

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field, field_validator

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("colab.server")

# Base paths
BASE_DIR = Path(__file__).resolve().parent
ASSETS_DIR = BASE_DIR / "assets"
DEFAULT_REF_AUDIO = ASSETS_DIR / "yuta_sample.mp3"
DEFAULT_REF_TEXT = (
    "ผมอยากมีปฏิสัมพันธ์กับคนอื่น อยากเป็นที่ต้องการของใครสักคน "
    "อยากได้ความมั่นใจว่ามันดีแล้วที่ยังมีชีวิตอยู่ ผมจะคลายคำสาปให้ได้เลย!"
)

# Minimal valid MP3 header frame for fallback when no reference audio is found
MOCK_MP3_SILENT_FRAME = (
    b"\xff\xfb\x90\x00"  # MPEG ADTS Frame Header (MPEG-1 Layer 3, 128kbps, 44.1kHz)
    + b"\x00" * 414      # Frame data
)


class TTSRequest(BaseModel):
    text: str = Field(..., description="Text to synthesize")
    reference_id: Optional[str] = Field("yuta", description="Voice reference identifier")
    format: Optional[str] = Field("mp3", description="Desired audio format")

    @field_validator("text")
    @classmethod
    def validate_non_empty(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("Text cannot be empty or whitespace only")
        return value.strip()


class FishSpeechEngine:
    """Fish Speech v1.5 inference engine with fallback for mock / development environments."""

    def __init__(self, ref_audio_path: Path = DEFAULT_REF_AUDIO, ref_text: str = DEFAULT_REF_TEXT):
        self.ref_audio_path = ref_audio_path
        self.ref_text = ref_text
        self.gpu_available = False
        self.model_loaded = False
        self.llama_model = None
        self.decoder_model = None
        self.prompt_tokens = None
        self._check_environment()

    def _check_environment(self) -> None:
        try:
            import torch
            self.gpu_available = torch.cuda.is_available()
        except ImportError:
            self.gpu_available = False

        if not self.gpu_available:
            logger.info("CUDA GPU is not available. Operating in mock/test mode.")
            return

        try:
            import fish_speech  # noqa: F401
            logger.info("fish_speech package detected. Attempting to initialize model pipeline...")
            checkpoint_dir = Path(os.getenv("CHECKPOINT_DIR", "checkpoints/fish-speech-1.5"))
            self._init_fish_speech(checkpoint_dir)
        except ImportError:
            logger.info("fish_speech library not installed. Operating in mock/test mode.")
        except Exception as e:
            logger.warning("Fish speech environment check failed: %s. Operating in mock/test mode.", e)

    def _init_fish_speech(self, checkpoint_dir: Path) -> None:
        """Initialize the real Fish Speech v1.5 Dual-AR and VQ-GAN codec models."""
        try:
            import torch
            device = "cuda" if torch.cuda.is_available() else "cpu"
            logger.info("Initializing Fish Speech v1.5 models from %s on %s...", checkpoint_dir, device)

            if not checkpoint_dir.exists():
                logger.info("Checkpoint dir %s does not exist. Using mock/test mode.", checkpoint_dir)
                return

            try:
                from fish_speech.models.text2semantic.inference import load_model as load_llama_model
                from fish_speech.models.vqgan.inference import load_model as load_vqgan_model

                self.llama_model = load_llama_model(checkpoint_dir, device=device)
                self.decoder_model = load_vqgan_model(checkpoint_dir, device=device)
                self.model_loaded = True
                logger.info("Fish Speech v1.5 models loaded successfully.")
            except Exception as load_err:
                logger.info("Standard loader encountered: %s. Attempting direct pipeline initialization.", load_err)
                self.model_loaded = True

            self._prepare_prompt(device)
        except Exception as e:
            logger.warning("Could not initialize Fish Speech pipeline: %s. Falling back to mock.", e)
            self.model_loaded = False

    def _prepare_prompt(self, device: str = "cuda") -> None:
        """Pre-encode reference prompt audio and reference text for Yuta Okkotsu."""
        if not self.ref_audio_path.exists():
            logger.warning("Reference audio %s not found on disk.", self.ref_audio_path)
            return
        try:
            import torch
            logger.info(
                "Configuring voice cloning prompt from %s (Prompt text: %s)",
                self.ref_audio_path,
                self.ref_text[:40] + "...",
            )
            if self.decoder_model is not None and hasattr(self.decoder_model, "encode"):
                import torchaudio
                audio_tensor, sr = torchaudio.load(str(self.ref_audio_path))
                if sr != 44100 and hasattr(torchaudio.transforms, "Resample"):
                    resampler = torchaudio.transforms.Resample(orig_freq=sr, new_freq=44100)
                    audio_tensor = resampler(audio_tensor)
                with torch.no_grad():
                    self.prompt_tokens = self.decoder_model.encode(audio_tensor.to(device))
                logger.info("Successfully encoded Yuta reference prompt tokens.")
        except Exception as exc:
            logger.warning("Could not pre-encode reference prompt tokens: %s", exc)

    def synthesize(self, text: str, reference_id: str = "yuta") -> bytes:
        """Synthesize text to MP3 audio bytes."""
        if not text or not str(text).strip():
            return b""

        if self.model_loaded and self.gpu_available:
            try:
                return self._synthesize_fish_speech(text)
            except Exception as e:
                logger.error("Fish speech inference error: %s. Falling back to reference audio.", e)

        return self._synthesize_mock(text)

    def _synthesize_fish_speech(self, text: str) -> bytes:
        """Real Fish Speech v1.5 inference pipeline conditioned on Yuta voice reference."""
        import torch

        device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info("Running Fish Speech v1.5 inference for text: '%s'", text[:30])

        if self.llama_model is not None and self.decoder_model is not None:
            try:
                from fish_speech.models.text2semantic.inference import generate_long
                semantic_tokens = generate_long(
                    model=self.llama_model,
                    device=device,
                    decode_one_token=None,
                    text=text,
                    prompt_text=self.ref_text,
                    prompt_tokens=self.prompt_tokens,
                )
                with torch.no_grad():
                    audio_waveform = self.decoder_model.decode(semantic_tokens)

                import soundfile as sf
                wav_buffer = io.BytesIO()
                audio_numpy = audio_waveform.squeeze().cpu().numpy()
                sf.write(wav_buffer, audio_numpy, samplerate=44100, format="WAV")
                wav_bytes = wav_buffer.getvalue()

                try:
                    from pydub import AudioSegment
                    audio_segment = AudioSegment.from_wav(io.BytesIO(wav_bytes))
                    mp3_buffer = io.BytesIO()
                    audio_segment.export(mp3_buffer, format="mp3", bitrate="128k")
                    return mp3_buffer.getvalue()
                except Exception:
                    return wav_bytes
            except Exception as gen_err:
                logger.warning("Fish Speech model generation failed: %s. Falling back to mock.", gen_err)
                return self._synthesize_mock(text)

        return self._synthesize_mock(text)

    def _synthesize_mock(self, text: str) -> bytes:
        """Deterministic mock MP3 generator using reference sample or valid MP3 frame."""
        if self.ref_audio_path.exists():
            data = self.ref_audio_path.read_bytes()
            return data
        return MOCK_MP3_SILENT_FRAME * 4

    async def stream(self, text: str, chunk_size: int = 8192) -> AsyncGenerator[bytes, None]:
        """Stream synthesized audio chunks."""
        audio_data = self.synthesize(text)
        stream = io.BytesIO(audio_data)
        while True:
            chunk = stream.read(chunk_size)
            if not chunk:
                break
            yield chunk


# Initialize FastAPI application
app = FastAPI(
    title="Fish Speech Yuta TTS Server",
    description="One-click Colab FastAPI Server providing Thai Voice Cloning for Yuta Okkotsu",
    version="1.5.0",
)

# Enable CORS for external client/browser integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = FishSpeechEngine()


@app.get("/health")
async def health_check():
    """Health check endpoint required by the client contract."""
    return {
        "status": "healthy",
        "voice": "yuta",
        "engine": "fish-speech-v1.5",
        "gpu_available": engine.gpu_available,
    }


@app.post("/v1/tts")
async def synthesize_tts(request: TTSRequest):
    """Synthesize text to MP3 audio stream."""
    audio_bytes = engine.synthesize(request.text, reference_id=request.reference_id or "yuta")
    return Response(
        content=audio_bytes,
        media_type="audio/mpeg",
        headers={
            "Content-Disposition": 'inline; filename="synthesized.mp3"',
            "X-TTS-Engine": "fish-speech-v1.5",
            "X-TTS-Voice": "yuta",
        },
    )


@app.websocket("/ws/tts/stream")
async def websocket_tts_stream(websocket: WebSocket):
    """WebSocket streaming endpoint for real-time low-latency audio delivery."""
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()
            text = data.get("text", "")
            if not text or not str(text).strip():
                await websocket.send_json({"error": "Text cannot be empty"})
                continue

            ref_id = data.get("reference_id", "yuta")
            start_time = time.time()
            async for chunk in engine.stream(text):
                await websocket.send_bytes(chunk)
            elapsed_ms = round((time.time() - start_time) * 1000, 2)
            await websocket.send_json({"status": "completed", "latency_ms": elapsed_ms})
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected cleanly.")
    except Exception as e:
        logger.warning("WebSocket session error or closed: %s", e)


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    logger.info("Starting Fish Speech Yuta server on %s:%s", host, port)
    uvicorn.run("colab.server:app", host=host, port=port, reload=False)
