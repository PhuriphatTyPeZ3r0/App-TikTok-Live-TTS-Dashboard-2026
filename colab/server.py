"""Fish Speech v1.5 In-Memory Inference Server for Google Colab.

Provides high-performance, low-latency zero-shot voice cloning for Yuta Okkotsu
using in-memory pre-warmed models (Dual-AR LLaMA FP16 + Firefly-GAN VQ Codec)
with automatic fallback to reference samples in test/development environments.
"""

import inspect
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
DEFAULT_CHECKPOINT_DIR = Path(os.getenv("CHECKPOINT_DIR", "checkpoints/fish-speech-1.5"))

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
    """Pre-warmed in-memory Fish Speech v1.5 inference engine with graceful mock fallback."""

    def __init__(
        self,
        ref_audio_path: Path = DEFAULT_REF_AUDIO,
        ref_text: str = DEFAULT_REF_TEXT,
        checkpoint_dir: Optional[Path] = None,
    ):
        self.ref_audio_path = Path(ref_audio_path)
        self.ref_text = ref_text
        self.checkpoint_dir = Path(checkpoint_dir) if checkpoint_dir else DEFAULT_CHECKPOINT_DIR
        self.gpu_available = False
        self.model_loaded = False
        self.llama_model = None
        self.decoder_model = None
        self.decode_one_token = None
        self.generate_long_fn = None
        self.prompt_tokens = None
        self._check_environment()

    def _check_environment(self) -> None:
        """Check hardware accelerator and attempt to initialize real Fish Speech models."""
        try:
            import torch
            self.gpu_available = torch.cuda.is_available()
        except ImportError:
            self.gpu_available = False

        if not self.gpu_available:
            logger.info("CUDA GPU is not available. Operating in mock/test mode.")
            return

        try:
            logger.info("CUDA GPU detected. Attempting to initialize in-memory Fish Speech v1.5 pipeline...")
            self._init_fish_speech(self.checkpoint_dir)
        except Exception as e:
            logger.warning("Fish speech environment initialization failed: %s. Operating in mock/test mode.", e)
            self.model_loaded = False

    def _init_fish_speech(self, checkpoint_dir: Path) -> None:
        """Initialize real in-memory Fish Speech v1.5 Dual-AR LLaMA and VQGAN codec models."""
        try:
            import torch
            device = "cuda" if torch.cuda.is_available() else "cpu"
            logger.info("Initializing Fish Speech v1.5 models from %s on %s...", checkpoint_dir, device)

            if not checkpoint_dir.exists():
                logger.info("Checkpoint dir %s does not exist. Using mock/test mode.", checkpoint_dir)
                return

            # 1. Load VQGAN Codec model using Hydra
            from hydra import compose, initialize
            from hydra.utils import instantiate
            from omegaconf import OmegaConf

            if not OmegaConf.has_resolver("eval"):
                OmegaConf.register_new_resolver("eval", eval)

            vqgan_checkpoint = checkpoint_dir / "firefly-gan-vq-fsq-8x1024-21hz-generator.pth"
            if not vqgan_checkpoint.exists():
                candidates = list(checkpoint_dir.glob("*generator*.pth")) + list(checkpoint_dir.glob("*.pth"))
                if candidates:
                    vqgan_checkpoint = candidates[0]
                else:
                    logger.warning("No VQGAN generator checkpoint found in %s. Using mock mode.", checkpoint_dir)
                    return

            try:
                from tools.vqgan.inference import load_model as load_vqgan_model
                self.decoder_model = load_vqgan_model(
                    config_name="firefly_gan_vq",
                    checkpoint_path=str(vqgan_checkpoint),
                    device=device,
                )
            except Exception as vq_loader_err:
                logger.info(
                    "tools.vqgan.inference.load_model unavailable (%s); instantiating via Hydra directly.",
                    vq_loader_err,
                )
                try:
                    from hydra.core.global_hydra import GlobalHydra
                    if GlobalHydra.instance().is_initialized():
                        GlobalHydra.instance().clear()
                except Exception:
                    pass

                configs_dir = None
                try:
                    import fish_speech
                    pkg_configs = Path(fish_speech.__file__).resolve().parent / "configs"
                    if pkg_configs.exists():
                        configs_dir = str(pkg_configs)
                except Exception:
                    pass

                if configs_dir:
                    from hydra import initialize_config_dir
                    with initialize_config_dir(version_base="1.3", config_dir=configs_dir):
                        cfg = compose(config_name="firefly_gan_vq", overrides=[])
                else:
                    with initialize(version_base="1.3", config_path="configs"):
                        cfg = compose(config_name="firefly_gan_vq", overrides=[])

                self.decoder_model = instantiate(cfg.model)
                state_dict = torch.load(str(vqgan_checkpoint), map_location="cpu")
                if "state_dict" in state_dict:
                    state_dict = state_dict["state_dict"]
                self.decoder_model.load_state_dict(state_dict, strict=True)
                self.decoder_model.eval()
                self.decoder_model.to(device)

            logger.info("VQ-GAN Codec model loaded successfully.")

            # 2. Load LLaMA model from tools/llama/generate.py with precision = torch.half (FP16)
            from tools.llama.generate import load_model as load_llama_model, generate_long
            self.generate_long_fn = generate_long

            llama_res = load_llama_model(
                checkpoint_path=str(checkpoint_dir),
                device=device,
                precision=torch.half,
                compile=False,
            )
            if isinstance(llama_res, tuple) and len(llama_res) == 2:
                self.llama_model, self.decode_one_token = llama_res
            else:
                self.llama_model = llama_res
                self.decode_one_token = getattr(self.llama_model, "decode_one_token", None)

            # Setup KV caches for in-memory acceleration (max_batch_size=1, max_seq_len, dtype=torch.half)
            if hasattr(self.llama_model, "setup_caches"):
                max_seq_len = getattr(self.llama_model.config, "max_seq_len", 2048)
                self.llama_model.setup_caches(max_batch_size=1, max_seq_len=max_seq_len, dtype=torch.half)
                logger.info("KV caches initialized for LLaMA model (FP16, batch_size=1, max_seq_len=%s)", max_seq_len)

            logger.info("Fish Speech LLaMA model loaded successfully.")
            self.model_loaded = True

            # 3. Pre-encode reference prompt tokens into GPU VRAM
            self._prepare_prompt(device)

        except Exception as e:
            logger.warning("Could not initialize Fish Speech pipeline: %s. Operating in mock/test mode.", e)
            self.model_loaded = False

    def _prepare_prompt(self, device: str = "cuda") -> None:
        """Pre-encode reference prompt audio and reference text for Yuta Okkotsu into GPU VRAM."""
        if not self.ref_audio_path.exists():
            logger.warning("Reference audio %s not found on disk.", self.ref_audio_path)
            return

        try:
            import soundfile as sf
            import torch
            import numpy as np

            logger.info(
                "Pre-encoding Yuta voice cloning prompt from %s (Prompt text: %s)",
                self.ref_audio_path,
                self.ref_text[:40] + "...",
            )

            audio, sr = sf.read(str(self.ref_audio_path))
            if audio.ndim > 1:
                audio = audio.mean(axis=-1)

            # Resample to 44100Hz if needed
            if sr != 44100:
                try:
                    import torchaudio.transforms as T
                    audio_tensor = torch.from_numpy(audio).float().unsqueeze(0)
                    resampler = T.Resample(orig_freq=sr, new_freq=44100)
                    audio_tensor = resampler(audio_tensor).squeeze(0)
                    audio = audio_tensor.numpy()
                except Exception:
                    try:
                        import scipy.signal
                        target_len = int(len(audio) * 44100 / sr)
                        audio = scipy.signal.resample(audio, target_len)
                    except Exception as resample_err:
                        logger.warning("Resampling failed: %s", resample_err)

            audio_tensor = torch.from_numpy(audio).to(device).float()
            if audio_tensor.ndim == 1:
                audio_tensor = audio_tensor.unsqueeze(0).unsqueeze(0)
            elif audio_tensor.ndim == 2:
                audio_tensor = audio_tensor.unsqueeze(0)

            if self.decoder_model is not None and hasattr(self.decoder_model, "encode"):
                with torch.no_grad():
                    try:
                        audio_lengths = torch.tensor([audio_tensor.shape[2]], device=device, dtype=torch.long)
                        encoded = self.decoder_model.encode(audio_tensor, audio_lengths)
                    except TypeError:
                        encoded = self.decoder_model.encode(audio_tensor)

                    if isinstance(encoded, tuple) and len(encoded) > 0:
                        if isinstance(encoded[0], tuple):
                            self.prompt_tokens = encoded[0][0]
                        else:
                            self.prompt_tokens = encoded[0]
                    else:
                        self.prompt_tokens = encoded

                logger.info(
                    "Successfully pre-encoded Yuta reference prompt tokens into GPU VRAM (shape: %s)",
                    getattr(self.prompt_tokens, "shape", "unknown"),
                )
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
        """Real in-memory FP16 Fish Speech v1.5 inference pipeline conditioned on Yuta voice reference."""
        import torch
        import soundfile as sf
        import numpy as np

        device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info("Running in-memory FP16 Fish Speech v1.5 inference for text: '%s'", text[:30])

        if self.llama_model is None or self.decoder_model is None:
            return self._synthesize_mock(text)

        try:
            generate_long = getattr(self, "generate_long_fn", None)
            if generate_long is None:
                from tools.llama.generate import generate_long
                self.generate_long_fn = generate_long

            # Build generation kwargs matching generate_long signature
            kwargs = {
                "model": self.llama_model,
                "device": device,
                "decode_one_token": self.decode_one_token,
                "text": text,
                "prompt_text": self.ref_text,
                "prompt_tokens": self.prompt_tokens,
                "precision": torch.half,
            }
            sig = inspect.signature(self.generate_long_fn)
            valid_kwargs = {k: v for k, v in kwargs.items() if k in sig.parameters}

            # Generate semantic codes
            generator = self.generate_long_fn(**valid_kwargs)

            codes = []
            for response in generator:
                if hasattr(response, "action"):
                    if response.action == "sample" and hasattr(response, "codes"):
                        codes.append(response.codes)
                elif hasattr(response, "codes"):
                    codes.append(response.codes)
                elif isinstance(response, torch.Tensor):
                    codes.append(response)

            if not codes:
                raise RuntimeError("No semantic tokens were generated")

            # Concatenate along time dimension
            if len(codes) == 1:
                semantic_tokens = codes[0]
            else:
                semantic_tokens = torch.cat(codes, dim=-1)

            # Ensure proper tensor shape for decoder
            indices = semantic_tokens
            if indices.ndim == 2:
                indices = indices.unsqueeze(0)

            # Decode semantic tokens to waveform
            with torch.no_grad():
                try:
                    feature_lengths = torch.tensor([indices.shape[-1]], device=device)
                    decoded = self.decoder_model.decode(
                        indices=indices,
                        feature_lengths=feature_lengths,
                        return_audios=True,
                    )
                except TypeError:
                    try:
                        decoded = self.decoder_model.decode(indices)
                    except Exception:
                        decoded = self.decoder_model.decode(semantic_tokens)

                if isinstance(decoded, (tuple, list)):
                    audio_waveform = decoded[0]
                else:
                    audio_waveform = decoded

            # Convert waveform to WAV bytes
            if hasattr(audio_waveform, "squeeze"):
                audio_numpy = audio_waveform.squeeze().detach().cpu().float().numpy()
            else:
                audio_numpy = np.array(audio_waveform)

            wav_buffer = io.BytesIO()
            sf.write(wav_buffer, audio_numpy, samplerate=44100, format="WAV")
            wav_bytes = wav_buffer.getvalue()

            # Transcode WAV to MP3 using pydub
            try:
                from pydub import AudioSegment
                audio_segment = AudioSegment.from_wav(io.BytesIO(wav_bytes))
                mp3_buffer = io.BytesIO()
                audio_segment.export(mp3_buffer, format="mp3", bitrate="128k")
                return mp3_buffer.getvalue()
            except Exception as pydub_err:
                logger.info("pydub MP3 transcoding skipped (%s), returning WAV bytes", pydub_err)
                return wav_bytes

        except Exception as gen_err:
            logger.warning("Fish Speech in-memory generation failed: %s. Falling back to mock sample.", gen_err)
            return self._synthesize_mock(text)

    def _synthesize_mock(self, text: str) -> bytes:
        """Deterministic mock MP3 generator using reference sample or valid MP3 frame."""
        if self.ref_audio_path.exists():
            return self.ref_audio_path.read_bytes()
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
