# 🎙️ Google Colab Backend: Fish Speech v1.5 (Yuta Okkotsu)

คู่มือการใช้งาน **Google Colab One-Click Backend** สำหรับรันโมเดล **Fish Speech v1.5** เพื่อโคลนเสียงพากย์ภาษาไทยของตัวละคร **ยูตะ อคคทสึ (Yuta Okkotsu - Jujutsu Kaisen 0)** บน Google Colab ฟรี (GPU T4) และเชื่อมต่อกับ `tiktok-live-tts-bot` ผ่าน Cloudflare Quick Tunnel

---

## 🌟 คุณสมบัติเด่น (Features)

- **1-Click Launch**: รันเพียงคลิกเดียว ระบบจะติดตั้ง Dependencies, โหลดโมเดล Fish Speech v1.5, สตาร์ท FastAPI Server และเปิด Cloudflare Tunnel ให้พร้อมใช้งานทันที
- **Zero Configuration Tunneling**: ใช้ Cloudflare Quick Tunnel (`*.trycloudflare.com`) โดยไม่ต้องสมัครบัญชี ไม่ต้องใช้ Token และไม่ต้องเปิด Port Forwarding
- **Full Fallback Protection**: หาก Colab หลุดการเชื่อมต่อหรือ Sleep ตัวบอท `tiktok-live-tts-bot` จะสลับไปใช้ Fish Audio Cloud API หรือ Edge-TTS โดยอัตโนมัติ สตรีมไม่สะดุด
- **Dual-Mode Inference Engine**: รองรับทั้ง GPU Inference แบบ Real-time บน Colab และ Mock/Test Mode สำหรับ Unit Testing บนเครื่อง Local

---

## 🚀 ขั้นตอนการใช้งาน (Step-by-Step Guide)

### 1. เปิดสมุดบันทึกบน Google Colab
1. เข้าไปที่ [Google Colab](https://colab.research.google.com/)
2. เลือกแท็บ **Upload** แล้วอัปโหลดไฟล์ `colab/fish_speech_yuta.ipynb` (หรือเปิดผ่าน GitHub)
3. ไปที่เมนูด้านบน: `Runtime` -> `Change runtime type` -> เลือก Hardware accelerator เป็น **T4 GPU** -> กด Save

### 2. รันเซลล์ One-Click Launch
1. กดปุ่ม **Run All** หรือกดรันเซลล์ที่ชื่อ **`🚀 1-Click Launch Fish Speech Yuta Server & Cloudflare Tunnel`**
2. รอประมาณ 1-2 นาที เมื่อระบบเตรียมความพร้อมเสร็จสิ้น จะแสดงผลข้อความในคอนโซล:

```text
================================================================
🎉 Cloudflare Quick Tunnel is ONLINE and READY!
================================================================

👉 Tunnel Public URL: https://random-subdomain.trycloudflare.com

📋 Copy the line below and paste it into your local .env file:
   COLAB_TUNNEL_URL=https://random-subdomain.trycloudflare.com
   PREFER_COLAB_TTS=true

================================================================
```

### 3. นำ URL ไปใส่ใน `.env` ของบอท
เปิดไฟล์ `.env` ในโฟลเดอร์หลักของโปรเจกต์ `tiktok-live-tts-bot` แล้วอัปเดตค่า:

```env
# ตั้งค่าให้ใช้งาน Colab TTS เป็นอันดับแรก
PREFER_COLAB_TTS=true
COLAB_TUNNEL_URL=https://random-subdomain.trycloudflare.com
COLAB_TTS_TIMEOUT_SECONDS=6.0

# ระบบสำรองกรณี Colab หลุดการเชื่อมต่อ (Auto Fallback)
ENABLE_FALLBACK_TTS=true
FALLBACK_VOICE=th-TH-NiwatNeural
```

### 4. รันบอทตามปกติ
```powershell
python main.py
```
บอทจะเชื่อมต่อไปยัง Colab Server และสร้างเสียงยูตะความละเอียดสูงแบบฟรีไม่มีโควตารายวัน!

---

## 📡 API Contract & Endpoints

เซิร์ฟเวอร์บน Colab ให้บริการ REST API และ WebSocket ผ่าน FastAPI ดังนี้:

### 1. `GET /health`
ตรวจสอบสถานะความพร้อมของเซิร์ฟเวอร์และฮาร์ดแวร์ GPU
- **Response:**
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
- **Request Body (JSON):**
  ```json
  {
    "text": "สวัสดีครับทุกคน ผมยูตะครับ",
    "reference_id": "yuta",
    "format": "mp3"
  }
  ```
- **Response:**
  - `Content-Type: audio/mpeg`
  - Audio binary bytes

### 3. `WebSocket /ws/tts/stream`
สตรีมมิ่งเสียงความเร็วสูงแบบ Real-time Chunking
- **Client ส่ง:**
  ```json
  {
    "text": "ข้อความสำหรับสตรีม",
    "reference_id": "yuta"
  }
  ```
- **Server ตอบ:**
  - สตรีมไบนารีเสียง Chunks ละ 8192 bytes จนจบข้อความ

---

## 🧪 การทดสอบระบบ (Local Testing & TDD)

สามารถรัน Contract Tests ของ Colab Server ได้ในเครื่องโดยไม่ต้องใช้ GPU:

```powershell
pytest tests/test_colab_server_contract.py -v
```
เซิร์ฟเวอร์ได้รับการออกแบบตามหลัก Dual-mode เมื่อไม่มี GPU หรือ Library ไม่ครบ ระบบจะจำลองและส่งข้อมูล Mock MP3 ที่ถูกต้องตามมาตรฐานเพื่อตรวจสอบความสมบูรณ์ของ API Contract
