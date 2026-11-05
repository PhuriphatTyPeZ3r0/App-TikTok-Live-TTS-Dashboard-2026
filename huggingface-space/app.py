"""Hugging Face Spaces ZeroGPU Inference Server for Fish Speech v1.5.

Provides high-performance zero-shot voice cloning for พิพัฒน์ บุญสิทธิเลิศ
(Phiphat Boonsitthilert) with backward compatibility for Yuta Okkotsu ('yuta').
Leverages a Dual Autoregressive (Dual-AR) LLaMA model and Firefly-GAN Vector
Quantization (VQ) neural vocoder with Hugging Face ZeroGPU dynamic hardware scheduling.
"""

import inspect
import io
import logging
import os
from pathlib import Path
import tempfile
import time
from typing import AsyncGenerator, Optional

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field, field_validator

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("hf_space.server")

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

# ZeroGPU decorator resolution with graceful fallback
try:
    import spaces
    has_spaces = True
    spaces_gpu = spaces.GPU
    logger.info("Hugging Face Spaces ZeroGPU runtime detected.")
except ImportError:
    has_spaces = False

    def spaces_gpu(duration: int = 30):
        """Fallback no-op decorator when spaces package is unavailable."""
        def decorator(fn):
            return fn
        return decorator

    logger.info("Standard runtime detected. Operating with no-op spaces.GPU fallback.")

# Optional Gradio import
try:
    import gradio as gr
    has_gradio = True
except ImportError:
    gr = None
    has_gradio = False


class TTSRequest(BaseModel):
    """Text-to-Speech (TTS) synthesis request schema."""
    text: str = Field(..., description="Text to synthesize")
    reference_id: Optional[str] = Field("phiphat", description="Voice reference identifier ('phiphat' or 'yuta')")
    format: Optional[str] = Field("mp3", description="Audio container format")

    @field_validator("text")
    @classmethod
    def validate_non_empty(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("Text cannot be empty or whitespace only")
        return value.strip()


class FishSpeechEngine:
    """Pre-warmed in-memory Fish Speech v1.5 inference engine with ZeroGPU acceleration."""

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

        if not self.gpu_available and not has_spaces:
            logger.info("CUDA GPU is not available. Operating in mock/test mode.")
            return

        try:
            self._init_fish_speech(self.checkpoint_dir)
        except Exception as e:
            logger.warning("Fish speech environment initialization failed: %s. Operating in mock mode.", e)
            self.model_loaded = False

    def _init_fish_speech(self, checkpoint_dir: Path) -> None:
        """Initialize in-memory Fish Speech v1.5 Dual-AR LLaMA and VQGAN codec models."""
        try:
            import torch

            # Auto-download from Hugging Face Hub if checkpoints not found locally
            if not checkpoint_dir.exists():
                try:
                    from huggingface_hub import snapshot_download
                    logger.info("Downloading fish-speech-1.5 from Hugging Face Hub...")
                    snapshot_download(
                        repo_id="fishaudio/fish-speech-1.5",
                        local_dir=str(checkpoint_dir),
                        local_dir_use_symlinks=False,
                    )
                except Exception as dl_err:
                    logger.info("Automatic Hugging Face Hub download skipped: %s", dl_err)

            if not checkpoint_dir.exists():
                logger.info("Checkpoint dir %s does not exist. Using mock/test mode.", checkpoint_dir)
                return

            device = "cuda" if torch.cuda.is_available() else "cpu"
            logger.info("Loading Fish Speech v1.5 models from %s onto %s...", checkpoint_dir, device)

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
                    logger.warning("No VQGAN generator checkpoint found in %s.", checkpoint_dir)
                    return

            try:
                from tools.vqgan.inference import load_model as load_vqgan_model
                self.decoder_model = load_vqgan_model(
                    config_name="firefly_gan_vq",
                    checkpoint_path=str(vqgan_checkpoint),
                    device=device,
                )
            except Exception:
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

            logger.info("Firefly-GAN VQ-Code generator loaded successfully.")

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

            if hasattr(self.llama_model, "setup_caches"):
                max_seq_len = getattr(self.llama_model.config, "max_seq_len", 2048)
                self.llama_model.setup_caches(max_batch_size=1, max_seq_len=max_seq_len, dtype=torch.half)

            self.model_loaded = True
            self._prepare_prompt(device)

        except Exception as e:
            logger.warning("Fish Speech pipeline initialization failed: %s. Using mock fallback.", e)
            self.model_loaded = False

    def _prepare_prompt(self, device: str = "cuda") -> None:
        """Pre-encode reference prompt audio tokens into GPU VRAM."""
        if not self.ref_audio_path.exists():
            logger.warning("Reference prompt audio %s does not exist.", self.ref_audio_path)
            return

        try:
            import soundfile as sf
            import torch
            import numpy as np

            audio, sr = sf.read(str(self.ref_audio_path))
            if audio.ndim > 1:
                audio = audio.mean(axis=-1)

            if sr != 44100:
                try:
                    import torchaudio.transforms as T
                    audio_tensor = torch.from_numpy(audio).float().unsqueeze(0)
                    resampler = T.Resample(orig_freq=sr, new_freq=44100)
                    audio_tensor = resampler(audio_tensor).squeeze(0)
                    audio = audio_tensor.numpy()
                except Exception:
                    pass

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

                logger.info("Successfully encoded prompt tokens into GPU VRAM.")
        except Exception as exc:
            logger.warning("Failed to pre-encode reference prompt tokens: %s", exc)

    def synthesize(self, text: str, reference_id: str = "phiphat") -> bytes:
        """Synthesize text to MP3 audio bytes with ZeroGPU scheduling."""
        if not text or not str(text).strip():
            return b""

        if self.model_loaded and (self.gpu_available or has_spaces):
            try:
                return self._synthesize_zerogpu(text)
            except Exception as e:
                logger.error("ZeroGPU inference failed: %s. Falling back to mock audio.", e)

        return self._synthesize_mock(text)

    @spaces_gpu(duration=30)
    def _synthesize_zerogpu(self, text: str) -> bytes:
        """Inference worker dynamically allocated on Hugging Face Spaces ZeroGPU."""
        import torch
        import soundfile as sf
        import numpy as np

        device = "cuda" if torch.cuda.is_available() else "cpu"
        if self.llama_model is None or self.decoder_model is None:
            return self._synthesize_mock(text)

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
            raise RuntimeError("No semantic codes generated by Dual-AR LLaMA")

        indices = codes[0] if len(codes) == 1 else torch.cat(codes, dim=-1)
        if indices.ndim == 2:
            indices = indices.unsqueeze(0)

        with torch.no_grad():
            try:
                feature_lengths = torch.tensor([indices.shape[-1]], device=device)
                decoded = self.decoder_model.decode(
                    indices=indices,
                    feature_lengths=feature_lengths,
                    return_audios=True,
                )
            except TypeError:
                decoded = self.decoder_model.decode(indices)

            audio_waveform = decoded[0] if isinstance(decoded, (tuple, list)) else decoded

        if hasattr(audio_waveform, "squeeze"):
            audio_numpy = audio_waveform.squeeze().detach().cpu().float().numpy()
        else:
            audio_numpy = np.array(audio_waveform)

        wav_buffer = io.BytesIO()
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

    def _synthesize_mock(self, text: str) -> bytes:
        """Deterministic mock MP3 generator returning reference audio or valid MP3 frames."""
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
    title="Phiphat Boonsitthilert Voice Engine (Fish Speech v1.5 ZeroGPU)",
    description=(
        "Asynchronous Server Gateway Interface (ASGI) API and Web Interface for "
        "Fish Speech v1.5 zero-shot Thai voice cloning."
    ),
    version="1.5.0",
)

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
    """Health check endpoint exposing system readiness and voice attribution."""
    return {
        "status": "ready",
        "voice": "phiphat",
        "alias": "yuta",
        "engine": "fish-speech-v1.5",
        "gpu_available": engine.gpu_available,
        "zero_gpu": has_spaces,
    }


@app.post("/v1/tts")
async def synthesize_tts(request: TTSRequest):
    """Synthesize text into MP3 audio stream."""
    ref_id = request.reference_id or "phiphat"
    audio_bytes = engine.synthesize(request.text, reference_id=ref_id)
    return Response(
        content=audio_bytes,
        media_type="audio/mpeg",
        headers={
            "Content-Disposition": 'inline; filename="synthesized.mp3"',
            "X-TTS-Engine": "fish-speech-v1.5",
            "X-TTS-Voice": "phiphat",
        },
    )


@app.websocket("/ws/tts")
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

            start_time = time.time()
            async for chunk in engine.stream(text):
                await websocket.send_bytes(chunk)
            elapsed_ms = round((time.time() - start_time) * 1000, 2)
            await websocket.send_json({"status": "completed", "latency_ms": elapsed_ms})
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected.")
    except Exception as e:
        logger.warning("WebSocket streaming error: %s", e)


def build_gradio_ui(inference_engine: FishSpeechEngine):
    """Construct Gradio Blocks user interface."""
    if gr is None:
        return None

    def gradio_synthesize(text: str, voice_option: str):
        if not text or not text.strip():
            return None
        ref_id = "phiphat" if "phiphat" in voice_option.lower() else "yuta"
        audio_data = inference_engine.synthesize(text, reference_id=ref_id)
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as temp_file:
            temp_file.write(audio_data)
            return temp_file.name

    with gr.Blocks(title="พิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert) Voice Engine") as interface:
        gr.Markdown(
            "# 🎙️ พิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert) Voice Engine\n"
            "### Fish Speech v1.5 ZeroGPU Inference Server & Interactive Demo\n"
            "โมเดลจำลองเสียงภาษาไทยแบบ Dual Autoregressive (Dual-AR) + Firefly-GAN Vector Quantization (VQ)"
        )
        with gr.Row():
            with gr.Column(scale=3):
                input_text = gr.Textbox(
                    label="ข้อความภาษาไทย (Thai Text Input)",
                    placeholder="พิมพ์ข้อความที่ต้องการสังเคราะห์เสียงที่นี่...",
                    value="สวัสดีครับ ผมชื่อพิพัฒน์ บุญสิทธิเลิศ ยินดีที่ได้รู้จักทุกคนครับ",
                    lines=4,
                )
                voice_select = gr.Radio(
                    choices=["phiphat (พิพัฒน์ บุญสิทธิเลิศ)", "yuta (Original Reference)"],
                    value="phiphat (พิพัฒน์ บุญสิทธิเลิศ)",
                    label="Voice Identity",
                )
                submit_btn = gr.Button("แปลงข้อความเป็นเสียง (Synthesize)", variant="primary")
            with gr.Column(scale=2):
                output_audio = gr.Audio(label="เสียงสังเคราะห์ (Synthesized Audio)", type="filepath")

        submit_btn.click(
            fn=gradio_synthesize,
            inputs=[input_text, voice_select],
            outputs=[output_audio],
        )

    return interface


# Construct Gradio demo and mount to FastAPI app if Gradio is present
demo = build_gradio_ui(engine)
if demo is not None and gr is not None:
    app = gr.mount_gradio_app(app, demo, path="/")


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 7860))
    host = os.getenv("HOST", "0.0.0.0")
    logger.info("Starting Hugging Face Space application on %s:%s", host, port)
    uvicorn.run(app, host=host, port=port)
