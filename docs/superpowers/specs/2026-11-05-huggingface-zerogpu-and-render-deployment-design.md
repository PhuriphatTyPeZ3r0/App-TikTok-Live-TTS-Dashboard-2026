# Free-Tier Cloud Architecture: Hugging Face Spaces ZeroGPU & Render Deployment Design

## 1. Intent & The Why

Streamers want an **Always-On, Zero-Cost ($0/month)** solution that eliminates Google Colab's 1-2 hour timeout and randomized Cloudflare Quick Tunnel URLs. The system must provide a **Permanent HTTPS Endpoint** for the Fish Speech v1.5 AI voice model (**พิพัฒน์ บุญสิทธิเลิศ**), maintain sub-1.5s GPU inference speeds during live streams, and host the web dashboard and TikTok Live listener 24/7 on the cloud.

This design implements a **Cloud Hybrid Architecture (100% Free Tier)**:
1. **AI Voice Model Engine:** Deployed to **Hugging Face Spaces** using **ZeroGPU (`@spaces.GPU`)**, providing on-demand NVIDIA A100/T4 acceleration with a permanent Direct API URL (`https://<username>-phiphat-tts.hf.space`).
2. **TikTok Ingestion & Web Dashboard:** Deployed to **Render Free Web Service**, hosting the live stream listener, stream queue, and TikFinity-style `/overlay` endpoint 24/7.
3. **Voice Continuity Failover:** If Hugging Face Space is cold or throttled, automatically fail over to **Fish Audio Cloud API** (free developer tier) to preserve Phiphat's authentic voice timbre.

---

## 2. Goals, Non-Goals, and Anti-Goals

### Goals
- **Zero Cost ($0/month):** Exclusively leverage permanent Free Tiers (Hugging Face Spaces ZeroGPU + Render Free Web Service + Fish Audio Free Tier + Edge-TTS).
- **Permanent URL Architecture:** Eliminate Cloudflare Quick Tunnel random URLs (`*.trycloudflare.com`). The bot talks directly to a static Hugging Face endpoint.
- **Fast Live Inference (< 1.5s):** Hugging Face ZeroGPU dynamically mounts an NVIDIA A100 or T4 GPU upon receiving a synthesis request, executing in FP16.
- **Voice Timbre Preservation:** Tier 2 fallback routes to Fish Audio Cloud API using model `9c110ffde8bc42709516395dfbcfb4a2` before degrading to Edge-TTS.
- **24/7 Streamer Dashboard:** Streamers can access the dashboard and copy the `/overlay` Browser Source URL at any time without running local terminal scripts.

### Non-Goals
- **Paid Dedicated Cloud Instances:** No paid AWS, RunPod, or Railway instances; the system must stay within free quotas.
- **Local Heavy Compute:** Streamer PCs do not need NVIDIA GPUs or local Python environments if using the cloud deployment.

### Anti-Goals
- **Cold Boot Timeouts:** If Hugging Face ZeroGPU is sleeping, the system must not hang the live stream. A 4.0s timeout immediately triggers Tier 2 (Fish Audio API) or Tier 3 (Edge-TTS).
- **Out of Memory (OOM) Crashes on Render:** Render Free Tier (512MB RAM) must NEVER load PyTorch or model weights; all AI model compute stays on Hugging Face.

---

## 3. System Architecture & Component Interactions

```mermaid
flowchart TD
    subgraph Streamer["TikTok Streamer Client"]
        LiveRoom["TikTok Live Room (@username)"]
        OBS["TikTok Studio / OBS (Browser Source)"]
        DashboardUI["Web Dashboard (Mobile / PC Browser)"]
    end

    subgraph RenderCloud["Render Cloud Free Web Service (24/7)"]
        WebBot["FastAPI Bot Server (src/web_server.py)"]
        Ingest["TikTokLive Ingestion Listener"]
        QueueMgr["Prioritized FIFO Queue Manager"]
        Normalizer["Thai Profanity & Spam Filter"]
        OverlayRoute["TikFinity Audio-Only Overlay (/overlay)"]
    end

    subgraph HFCloud["Hugging Face Spaces (Free ZeroGPU)"]
        SpaceApp["FastAPI Inference Server (app.py)"]
        ZeroGPU["@spaces.GPU (Dynamic A100 / T4 Allocation)"]
        FishModel["Fish Speech v1.5 FP16 (checkpoints/fish-speech-1.5)"]
        RefAudio["Phiphat Sample Audio (yuta_sample.mp3)"]
    end

    subgraph Fallbacks["External Free Fallbacks"]
        FishCloud["Tier 2: Fish Audio Cloud API (Free Tier)"]
        EdgeTTS["Tier 3: Microsoft Edge-TTS (Niwat/Premwadee)"]
    end

    LiveRoom -->|WebSocket Events| Ingest
    Ingest --> Normalizer
    Normalizer --> QueueMgr
    QueueMgr -->|HTTP POST /v1/tts (Permanent URL)| SpaceApp
    SpaceApp --> ZeroGPU
    ZeroGPU --> FishModel
    RefAudio --> FishModel
    FishModel -->|MP3 Audio Stream| QueueMgr

    QueueMgr -.->|Timeout > 4s| FishCloud
    FishCloud -.->|Quota Exceeded| EdgeTTS

    QueueMgr -->|WebSocket /ws/audio| OverlayRoute
    OverlayRoute -->|Direct Live Sound| OBS
    QueueMgr -->|Status & Queue Update| DashboardUI
```

---

## 4. Technical Specifications & Deployment Structure

### 4.1 Hugging Face Space Repository Structure (`phiphat-tts-space`)
- **Space Type:** Docker / Python with ZeroGPU enabled (`app_file: app.py`, `sdk: gradio` or `docker`).
- **Files:**
  - `README.md`: Space metadata with YAML frontmatter specifying ZeroGPU:
    ```yaml
    ---
    title: Phiphat Boonsitthilert Voice Engine (Fish Speech v1.5)
    emoji: 🎙️
    colorFrom: purple
    colorTo: blue
    sdk: docker
    pinned: false
    ---
    ```
  - `Dockerfile`: Debian/Ubuntu base with Python 3.10, PyTorch CUDA 12.1+, system audio packages (`portaudio19-dev`, `ffmpeg`, `libsox-dev`).
  - `app.py`: FastAPI server wrapped with `@spaces.GPU(duration=15)` to request GPU allocation per synthesis request.
  - `checkpoints/`: Downloaded automatically via `snapshot_download("fishaudio/fish-speech-1.5")` during Docker build or cached on Space storage.
  - `assets/yuta_sample.mp3`: Reference prompt audio for Phiphat Boonsitthilert.

### 4.2 Render Web Service Configuration
- **Build Command:** `pip install -r requirements.txt` (or Docker build via existing `Dockerfile`).
- **Start Command:** `python -m uvicorn src.web_server:app --host 0.0.0.0 --port 10000`
- **Environment Variables:**
  - `COLAB_TUNNEL_URL=https://<your-hf-username>-phiphat-tts.hf.space` (Permanent HF Space URL)
  - `PREFER_COLAB_TTS=true`
  - `COLAB_TTS_TIMEOUT_SECONDS=4.0`
  - `FISH_AUDIO_API_KEY=your_key`
  - `FISH_AUDIO_MODEL_ID=9c110ffde8bc42709516395dfbcfb4a2`
  - `ENABLE_FALLBACK_TTS=true`

---

## 5. What's Left to the Builder

- Create the Hugging Face Space package template in a `huggingface-space/` directory within this repository for easy deployment.
- Add `render.yaml` blueprint for 1-click Render web service deployment.
- Integrate `@spaces.GPU` decorator in the Hugging Face `app.py` for ZeroGPU compatibility.

---

## 6. Architectural Rulings from Cloud Builder Check (Technical Specifications)

1. **Hugging Face ZeroGPU Invocation & SDK (`sdk: gradio`):**
   - ZeroGPU requires native Gradio integration; the Space will use `sdk: gradio` with FastAPI mounted via `gr.mount_gradio_app(app, ...)` or a lightweight Gradio Client / REST endpoint.
   - The synthesis endpoint function is decorated with `@spaces.GPU(duration=30)`.
   - Render passes `Authorization: Bearer <HF_TOKEN>` if the Space is private or to prevent anonymous datacenter rate limiting.
2. **Render Spin-Down Lifecycle Management:**
   - Active streaming sessions maintain open WebSocket connections from the TikTok Studio / OBS Browser Source (`/overlay`) and Web Dashboard, generating continuous inbound traffic that keeps Render awake throughout the live broadcast.
   - When the stream ends, allowing Render to sleep is advantageous, preserving the free 750 compute hours/month quota.
3. **Cold-Boot Pre-Warming & Adaptive Timeouts:**
   - On session startup, Render fires a non-blocking asynchronous wake-up ping (`GET /health`) to the Hugging Face Space.
   - The first request adopts an extended 25s timeout; once the Space reports warm, subsequent inferences enforce the strict 4.0s SLA before falling back to Tier 2 (Fish Audio API).
4. **Auto-Bootstrapping Lifecycle:**
   - The FastAPI application lifespan checks for `TIKTOK_USERNAME` in environment variables. If present, it automatically provisions and starts the default live listener session without requiring manual button clicks in the browser.

