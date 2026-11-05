# 🎙️ Google Colab Backend: Fish Speech v1.5 (พิพัฒน์ บุญสิทธิเลิศ / Phiphat Boonsitthilert)

[![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/drive/1f4t-Q0H9QRwQwK4XlJS_DHwfsRPkEMz1)
[![Python](https://img.shields.io/badge/Python-3.10%20%7C%203.11%20%7C%203.12-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.2%2B-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white)](https://pytorch.org/)
[![Cloudflare Tunnel](https://img.shields.io/badge/Cloudflare-Quick%20Tunnel-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)

คู่มือการใช้งาน **Google Colab One-Click Backend** สำหรับรันโมเดล **Fish Speech v1.5** เพื่อโคลนเสียงพากย์ภาษาไทยของ **"คุณพิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)"** (นักพากย์มืออาชีพ ผู้ให้เสียงภาษาไทยของ *ยูตะ อคคทสึ / Yuta Okkotsu* ใน Jujutsu Kaisen 0) บน Google Colab ฟรี ด้วยการประมวลผลผ่านฮาร์ดแวร์เร่งความเร็ว **Tesla T4 Graphics Processing Unit (GPU)** และส่งข้อมูลกลับไปยังเครื่องสตรีมเมอร์ผ่าน Cloudflare Quick Tunnel

---

## 🎭 Voice Attribution & Reference Aliasing

> 🎙️ **Official Voice Attribution:**  
> โมเดลนี้ได้รับการฝึกฝนและสกัดลักษณะเสียงเฉพาะตัว (Voice Clone Profile) จากเสียงของ **คุณพิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)**  
> เพื่อความเข้ากันได้ย้อนหลัง (Backward Compatibility) ระบบรองรับตัวระบุเสียง (`reference_id`) ทั้งชื่อ `"phiphat"` และ `"yuta"` สลับกันได้โดยสมบูรณ์

---

## 🌟 คุณสมบัติเด่นของระบบ (Key Architectural Highlights)

- **In-Memory Pre-Warmed Pipeline (Half-Precision Floating-Point Format: FP16):**  
  โหลดโมเดล Dual Autoregressive (Dual-AR) Large Language Model (LLM) และ Firefly-Generative Adversarial Network (Firefly-GAN) Vector Quantization Finite Scalar Quantization (VQ-FSQ) เข้าสู่ Video Random-Access Memory (VRAM) บน Tesla T4 GPU ตั้งแต่ตอนเริ่มระบบ ทำให้ลดเวลาหน่วง (Latency) ในการสร้างเสียงเหลือเพียง $< 1.5$ วินาที
- **Tesla T4 GPU Hardware Acceleration:**  
  ใช้ประโยชน์จาก Tensor Cores บนการ์ดจอ Nvidia Tesla T4 ใน Google Colab (ระดับ Free Tier) ประมวลผล Waveform เสียงความละเอียด 44.1 kHz แบบ Real-time
- **Zero-Configuration Cloudflare Quick Tunnel:**  
  สร้างช่องทางการเชื่อมต่อ Hypertext Transfer Protocol Secure (HTTPS) และ Secure WebSocket (WSS) ผ่าน `*.trycloudflare.com` โดยอัตโนมัติ ไม่ต้องสมัครสมาชิก ไม่ต้องเปิด Port Forwarding และไม่มีค่าใช้จ่าย
- **Dual-Mode Inference & Graceful Degradation:**  
  รองรับทั้งการสังเคราะห์เสียงจริงผ่าน GPU และโหมดจำลอง (Mock Inference Fallback) เมื่อทดสอบบนเครื่อง Local โดยไม่ต้องมี GPU ทำให้สามารถทำ Unit Testing และ Integration Testing ได้ 100%
- **Seamless 3-Tier Fallback Integration:**  
  หากเซิร์ฟเวอร์ Colab หยุดทำงานหรือขาดการเชื่อมต่อ ตัวบอทฝั่ง Client จะสลับไปใช้ Fish Audio Free Developer Tier Cloud API หรือ Microsoft Edge Neural Text-to-Speech (Edge-TTS) ทันทีโดยที่สตรีมไม่สะดุด

---

## 🚀 ขั้นตอนการเปิดใช้งาน (1-Click Launch Guide)

### 1. เปิดสมุดบันทึกบน Google Colab
คลิกที่ปุ่มด้านล่างเพื่อเปิดสมุดบันทึกโดยตรง:  
[![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/drive/1f4t-Q0H9QRwQwK4XlJS_DHwfsRPkEMz1)

*(หรือเข้าไปที่ [Google Colab](https://colab.research.google.com/) แล้วอัปโหลดไฟล์ `colab/fish_speech_yuta.ipynb`)*

### 2. ตรวจสอบการเลือกฮาร์ดแวร์ GPU
1. ไปที่เมนูด้านบนของ Colab: **Runtime** $\rightarrow$ **Change runtime type**
2. เลือก Hardware accelerator เป็น **T4 GPU**
3. กด **Save**

### 3. รันเซลล์ One-Click Launch
1. กดปุ่ม **Runtime $\rightarrow$ Run All** หรือคลิกปุ่ม Play ที่เซลล์หลัก
2. ระบบจะทำการ:
   - ดาวน์โหลดและคอมไพล์ Dependencies ที่จำเป็น
   - ดาวน์โหลด Checkpoint โมเดล Fish Speech v1.5 และโหลดเข้าสู่หน่วยความจำ GPU ในรูปแบบ FP16
   - เริ่มต้น FastAPI Application Server
   - ดาวน์โหลดและเริ่ม Cloudflare Tunnel Client
3. รอประมาณ 1-2 นาที เมื่อระบบพร้อมทำงานอย่างสมบูรณ์ จะแสดงข้อความในคอนโซล:

```text
================================================================
🎉 Cloudflare Quick Tunnel is ONLINE and READY!
================================================================

👉 Tunnel Public URL: https://random-subdomain.trycloudflare.com

📋 Copy the lines below and paste them into your local .env file:
   PREFER_COLAB_TTS=true
   COLAB_TUNNEL_URL=https://random-subdomain.trycloudflare.com
   COLAB_TTS_TIMEOUT_SECONDS=6.0

================================================================
```

### 4. อัปเดตการตั้งค่าในไฟล์ `.env` บนเครื่องของสตรีมเมอร์
เปิดไฟล์ `.env` ในโฟลเดอร์หลักของโปรเจกต์ `tiktok-live-tts-bot` แล้ววาง URL ที่ได้จาก Colab:

```ini
# กำหนดให้ใช้งาน Colab GPU Backend เป็นลำดับแรก
PREFER_COLAB_TTS=true
COLAB_TUNNEL_URL=https://random-subdomain.trycloudflare.com
COLAB_TTS_TIMEOUT_SECONDS=6.0

# ระบบสำรองอัตโนมัติหาก Colab ขาดการเชื่อมต่อ
ENABLE_FALLBACK_TTS=true
FALLBACK_VOICE=th-TH-NiwatNeural
```

### 5. รันบอทตามปกติ
```powershell
run.bat --web --port 8000
```

---

## 📡 API Contract & Endpoints

FastAPI Server บน Colab ให้บริการ Application Programming Interface (API) ทั้งรูปแบบ REST และ WebSocket ดังนี้:

### 1. `GET /health`
ตรวจสอบสถานะความพร้อมของเซิร์ฟเวอร์และฮาร์ดแวร์ Graphics Processing Unit (GPU)
- **Response Headers:** `Content-Type: application/json`
- **Response Payload:**
  ```json
  {
    "status": "healthy",
    "voice": "yuta",
    "engine": "fish-speech-v1.5",
    "gpu_available": true
  }
  ```

### 2. `POST /v1/tts`
แปลงข้อความเป็นไฟล์เสียง MP3 (Binary Stream)
- **Request Headers:** `Content-Type: application/json`
- **Request Body (JSON):**
  ```json
  {
    "text": "ขอบคุณสำหรับของขวัญและกำลังใจที่ส่งให้มากๆ นะครับ!",
    "reference_id": "phiphat",
    "format": "mp3"
  }
  ```
  *(หมายเหตุ: `reference_id` สามารถส่งเป็น `"phiphat"` หรือ `"yuta"` ก็ได้)*
- **Response:**
  - Status: `200 OK`
  - `Content-Type: audio/mpeg`
  - Header: `X-TTS-Engine: fish-speech-v1.5`
  - Payload: ไบนารีข้อมูลเสียง MP3

### 3. `WebSocket /ws/tts/stream`
สตรีมมิ่งข้อมูลเสียงแบบ Real-time Chunks สำหรับการเล่นเสียงแบบ Low-Latency
- **Client Frame (JSON):**
  ```json
  {
    "text": "ยินดีต้อนรับเข้าสู่ไลฟ์สตรีมครับ",
    "reference_id": "phiphat"
  }
  ```
- **Server Stream:**
  - สตรีมไบนารีข้อมูลเสียง Chunks ละ 8192 bytes อย่างต่อเนื่อง
  - ส่ง JSON Frame ปิดท้าย: `{"status": "completed", "latency_ms": 1120.45}`

---

## 🧪 การทดสอบระบบฝั่ง Client (Local Testing & TDD)

คุณสามารถทดสอบความเข้ากันได้ของระบบ Local Bot กับ Colab API Contract ได้โดยไม่ต้องเชื่อมต่อ GPU จริง ผ่านระบบ Mock Fallback อัตโนมัติ:

```powershell
# รัน Contract Tests สำหรับ Colab Server
pytest tests/test_colab_server_contract.py -v

# รัน Client Integration Tests สำหรับ Colab TTS
pytest tests/test_tts_colab.py -v
```

---

## 📚 References & Standards

1. **Fish Audio Research Team.** (2024). *Fish Speech: Open-Source Dual-AR and VQ-GAN Speech Synthesis Architecture*. Fish Audio Inc. [https://fish.audio](https://fish.audio)
2. **Cloudflare Inc.** (2025). *Cloudflare Tunnel: Zero-Trust Connect and Ingress Architecture*. [https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
3. **Tiangolo, S.** (2024). *FastAPI: Modern, High-Performance Web Framework for Python APIs*. [https://fastapi.tiangolo.com/](https://fastapi.tiangolo.com/)
