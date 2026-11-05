---
title: Phiphat Boonsitthilert Voice Engine (Fish Speech v1.5)
emoji: 🎙️
colorFrom: purple
colorTo: blue
sdk: gradio
sdk_version: 4.44.0
app_file: app.py
pinned: false
---

# 🎙️ Fish Speech v1.5 ZeroGPU Inference Server: พิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)

This repository packages the state-of-the-art **Fish Speech v1.5** Text-to-Speech (TTS) voice cloning engine for deployment on **Hugging Face Spaces ZeroGPU** infrastructure. It provides both an interactive web demonstration powered by Gradio and high-throughput Application Programming Interface (API) endpoints compatible with the Asynchronous Server Gateway Interface (ASGI) standard.

---

## 🏛️ System Architecture & Theory

The model leverages a two-stage hybrid neural architecture:
1. **Dual Autoregressive (Dual-AR) Language Model (LLaMA FP16):** Transforms Thai and multilingual input text into discrete acoustic semantic tokens, conditioned on reference voice prompt embeddings.
2. **Firefly-GAN Vector Quantization (VQ) Neural Vocoder:** Reconstructs 44.1 kHz high-fidelity audio waveforms from discrete multi-codebook representations with low latency.

On Hugging Face Spaces, inference workloads are dynamically scheduled using the ZeroGPU runtime with `@spaces.GPU(duration=30)`, ensuring serverless allocation of NVIDIA A100/H100 Graphics Processing Units (GPUs) with zero idle cloud compute costs.

---

## 🚀 API Endpoints

### 1. Health Verification (`GET /health`)
Verifies deployment readiness, active voice identity, and hardware acceleration status.
```json
{
  "status": "ready",
  "voice": "phiphat",
  "alias": "yuta",
  "engine": "fish-speech-v1.5",
  "gpu_available": true,
  "zero_gpu": true
}
```

### 2. Audio Synthesis (`POST /v1/tts`)
Synthesizes speech conditioned on the acoustic reference prompt of พิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert).
- **Request Body (JSON):**
  ```json
  {
    "text": "สวัสดีครับ ผมชื่อพิพัฒน์ บุญสิทธิเลิศ",
    "reference_id": "phiphat",
    "format": "mp3"
  }
  ```
- **Response:** Raw MP3 binary stream (`audio/mpeg`).

### 3. Streaming WebSocket (`/ws/tts` & `/ws/tts/stream`)
Low-latency real-time bidirectional audio streaming for interactive live streaming and conversational artificial intelligence agents.

---

## 📚 References & Academic Citation

1. Fish Audio Team. (2024). *Fish Speech: Advancing Open-Source Multilingual Text-to-Speech Synthesis via Dual-Autoregressive Modeling and Vector Quantization*. arXiv preprint arXiv:2411.01156. [https://arxiv.org/abs/2411.01156](https://arxiv.org/abs/2411.01156)
2. Defossez, A., Copet, J., Synnaeve, G., & Adi, Y. (2022). *High Fidelity Neural Audio Compression*. IEEE Transactions on Audio, Speech, and Language Processing, 31, 2763-2774. [https://doi.org/10.1109/TASLP.2023.3298242](https://doi.org/10.1109/TASLP.2023.3298242)
3. Hugging Face Inc. (2024). *Hugging Face Spaces ZeroGPU: Dynamic Hardware Scheduling for Accelerated AI Applications*. Hugging Face Documentation. [https://huggingface.co/docs/hub/spaces-gpus](https://huggingface.co/docs/hub/spaces-gpus)
