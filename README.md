---
title: StreamVox Live - TikTok Live TTS Studio
emoji: 🎙️
colorFrom: red
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
---

# 🎙️ StreamVox Live — TikTok Live Text-to-Speech (TTS) Studio & Cloud Web Platform

[![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/drive/1f4t-Q0H9QRwQwK4XlJS_DHwfsRPkEMz1)
[![Hugging Face Spaces](https://img.shields.io/badge/%F0%9F%A4%97%20Hugging%20Face-Spaces%20ZeroGPU-orange?style=for-the-badge&logo=huggingface&logoColor=white)](huggingface-space/)
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/PhuriphatTyPeZ3r0/tiktok-live-tts-bot)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/PhuriphatTyPeZ3r0/tiktok-live-tts-bot&root-directory=frontend)
[![Python](https://img.shields.io/badge/Python-3.10%20%7C%203.11%20%7C%203.12-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-309%20passed-success?style=for-the-badge&logo=pytest&logoColor=white)](tests/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Cloudflare Tunnel](https://img.shields.io/badge/Cloudflare-Tunnel-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)

**StreamVox Live (TikTok Live Text-to-Speech Studio)** is a high-performance, zero-cost, and robust asynchronous Text-to-Speech (TTS) studio and multi-tenant cloud platform for TikTok LIVE creators. It transforms incoming live chat comments and monetary gift events into natural real-time Thai speech using a **PyThaiNLP Natural Language Processing (NLP) Precision Speech Pipeline**, a **5-Profile Multi-Voice Ecosystem**, and a serverless **Hugging Face Spaces Zero-cost Graphics Processing Unit (ZeroGPU)** or self-hosted **Google Colaboratory (Colab)** Fish Speech v1.5 backend, backed by an automated 3-tier fallback engine (Fish Audio Free Developer Tier and Microsoft Edge Neural Text-to-Speech). Audio is delivered seamlessly via a **TikFinity-style Browser Source Overlay** (no Virtual Audio Cable driver required) or locally through a Virtual Audio Cable (VAC). Fully deployable 100% free ($0/month) on **Vercel**, **Render Free Web Service**, and **Hugging Face Spaces ZeroGPU**.

---

## 🎭 Voice Model Attribution (ผู้ให้เสียงต้นฉบับ)

> 🎙️ **Official Voice Attribution:**  
> โมเดลเสียงพากย์ปัญญาประดิษฐ์หลัก (Primary Artificial Intelligence (AI) Voice Clone) ในระบบ **StreamVox Live** ได้รับการเทรนและสังเคราะห์จากเสียงของ **"พิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)"** นักพากย์ภาพยนตร์และอนิเมะมืออาชีพของประเทศไทย (เป็นที่รู้จักอย่างกว้างขวางในฐานะผู้พากย์เสียงภาษาไทยของตัวละคร *ยูตะ อคคทสึ (Yuta Okkotsu)* ในภาพยนตร์ Jujutsu Kaisen 0)  
> * **รหัสเสียงหลัก (Primary Default Voice ID):** `yuta` (และรองรับ `phiphat`)  
> ตัวโมเดลประมวลผลด้วยสถาปัตยกรรม Dual Autoregressive (Dual-AR) Large Language Model (LLM) และ Firefly-Generative Adversarial Network (Firefly-GAN) Vector Quantization Finite Scalar Quantization (VQ-FSQ) ของ Fish Speech v1.5 บน **Hugging Face Spaces Zero-cost Graphics Processing Unit (ZeroGPU)** และ **Google Colaboratory (Colab) Tesla T4 GPU** ในฟอร์แมต Half-Precision Floating-Point Format (FP16) ให้ความเร็วในการสังเคราะห์เสียงต่ำกว่า 1.5 วินาที

---

## 🚀 StreamVox Live v2.1 PRO — Four Core Architectural Pillars

### 1. 🎨 StreamVox Live Brand & Studio User Interface (UI)
- **Modern Cyberpunk / Streamer Studio Aesthetics:** โทนสี Dark Slate (`#08090c`, `#0f1117`) ผสานสีเอกลักษณ์ TikTok Red (`#fe2c55`) และ Electric Cyan (`#25f4ee`)
- **Unified Thai-Latin Typography (`Prompt`):** บังคับใช้ฟอนต์ **Google Font 'Prompt'** (Weights: 300, 400, 500, 600, 700) ทั้งบนแดชบอร์ด Next.js 15 Single-Page Application (SPA) และหน้าจอ Open Broadcaster Software (OBS) Studio Overlay (`templates/overlay.html`) เพื่อความคมชัดในการอ่านภาษาไทยบนไลฟ์สตรีม
- **Google Material Symbols (Rounded):** ระบบไอคอนสตูดิโอความละเอียดสูง (`material-symbols-rounded`) แทนที่ไอคอนแบบเดิมทั้งหมด รองรับการแสดงสถานะเสียงและการควบคุมแบบเรียลไทม์

### 2. 🎙️ Multi-Voice Ecosystem (5 Curated Voice Profiles)
สตรีมเมอร์สามารถสลับเปลี่ยนคาแรกเตอร์เสียงพากย์ได้แบบเรียลไทม์ผ่านคอมโพเนนต์ `<VoiceSelector>` พร้อมระบบ **Colab Routing Isolation** (ส่งเฉพาะเสียง `yuta` ไปยัง Colab/ZeroGPU เพื่อไม่ให้เสียงโปรไฟล์อื่นถูกเขียนทับ):

| Voice ID | ชื่อโปรไฟล์ (Display Name) | คาแรกเตอร์และสไตล์เสียง | Primary Engine | Fallback / Edge-TTS Voice |
| :--- | :--- | :--- | :--- | :--- |
| **`yuta`** *(Default)* | **พิพัฒน์ (Yuta)** | เสียงมาตรฐาน อบอุ่น เป็นธรรมชาติ (คุณพิพัฒน์ บุญสิทธิเลิศ) | Colab Fish Speech v1.5 / Fish Audio (`9c110ffde8bc42709516395dfbcfb4a2`) | `th-TH-NiwatNeural` |
| **`hana`** | **ฮานะ (Hana Sweet)** | เสียงสาวหวาน สไตล์อนิเมะ น่ารักสดใส เหมาะกับไลฟ์พูดคุยและเกมมิ่ง | Fish Audio (`FISH_AUDIO_HANA_MODEL_ID`) | `th-TH-PremwadeeNeural` |
| **`joker`** | **ดีเจโจ๊กเกอร์ (DJ Joker)** | เสียงดีเจสายเอ็นเตอร์เทน กระตือรือร้น เฮฮา สร้างสีสันในไลฟ์สตรีม | Fish Audio (`FISH_AUDIO_JOKER_MODEL_ID`) | `th-TH-NiwatNeural` |
| **`anchor`** | **ผู้ประกาศข่าว ชาย (News Anchor)** | เสียงทุ้ม ชัดเจน สุภาพ เป็นทางการ เหมาะสำหรับไลฟ์สาระและความรู้ | Fish Audio (`FISH_AUDIO_ANCHOR_MODEL_ID`) | `th-TH-NiwatNeural` |
| **`niwat`** | **นิวัฒน์ (Niwat Edge)** | เสียง Microsoft Neural ความเร็วสูง ฟรีไม่จำกัดโควต้า (Zero-Quota Fallback) | Microsoft Edge Neural Text-to-Speech (TTS) | `th-TH-NiwatNeural` |

### 3. 🧠 PyThaiNLP Precision Speech Pipeline (`src/thai_normalizer.py`)
แก้ปัญหาเสียงอ่านภาษาไทยเพี้ยนจากภาษาแชทบน TikTok Live ด้วยไปป์ไลน์ Natural Language Processing (NLP) ความเร็วสูงก่อนส่งเข้าโมเดลสังเคราะห์เสียง:
- **Dictionary-Based Word Tokenization (`newmm`):** ตัดคำภาษาไทยด้วยอัลกอริทึม Maximal Matching (`newmm`) ของ **PyThaiNLP** ร่วมกับพจนานุกรมโครงสร้างต้นไม้ (`dict_trie`) ที่ผสานคำศัพท์มาตรฐานและคำแสลงสตรีมเมอร์
- **Grapheme-to-Phoneme (G2P) Slang & Laugh Expansion:** แปลงคำย่อและคำแสลงให้เป็นคำอ่านที่ถูกต้อง (เช่น `คับ/งับ` $\rightarrow$ `ครับ`, `จิงดิ` $\rightarrow$ `จริงดิ`, `ป่าว/ป้ะ` $\rightarrow$ `หรือเปล่า`, `555+` $\rightarrow$ `ห้าห้าห้า`) และลดทอนตัวอักษรลากยาว (`มากกกก` $\rightarrow$ `มาก`)
- **English Loanword Transliteration:** ถอดคำอ่านทับศัพท์ภาษาอังกฤษยอดฮิตในวงการสตรีมเป็นภาษาไทยอัตโนมัติ (เช่น `Live` $\rightarrow$ `ไลฟ์`, `Stream` $\rightarrow$ `สตรีม`, `Streamer` $\rightarrow$ `สตรีมเมอร์`, `Game` $\rightarrow$ `เกม`, `Gift` $\rightarrow$ `กิฟต์`, `ROV` $\rightarrow$ `อาร์โอวี`, `PK` $\rightarrow$ `พีเค`)
- **Acoustic Pacing Heuristic:** ป้องกันเสียงอ่านกระตุกแบบหุ่นยนต์โดยไม่เว้นวรรคทุกคำ แต่แทรกจังหวะหายใจเฉพาะรอบคำเชื่อมประโยค (`และ`, `หรือ`, `แต่`) และคำทับศัพท์
- **Least Recently Used (LRU) In-Memory Cache & Raw Display Isolation:** แคชผลลัพธ์ด้วย `@functools.lru_cache(maxsize=4096)` ใช้เวลาประมวลผลต่ำกว่า 1 มิลลิวินาที (<1ms) พร้อมแยกส่วนการแสดงผล (**Raw Display Isolation**) ให้หน้าจอ UI และ OBS Overlay แสดงข้อความแชทจริงของผู้ชม ในขณะที่เครื่องยนต์ TTS ได้รับข้อความที่ถอดเสียงอ่านแล้ว

### 4. 🔌 Voice Switching Representational State Transfer (REST) & WebSocket (WS) API
- **`GET /api/voices`**: ดึงรายการโปรไฟล์เสียงทั้งหมด 5 โปรไฟล์ พร้อมรายละเอียด Engine และสถานะ Default
- **`POST /api/session/{session_id}/voice`** (และ `POST /api/session/voice`): เปลี่ยนโปรไฟล์เสียงของเซสชันปัจจุบัน (ต้องใช้ `admin_token`) และกระจายสัญญาณ `VOICE_CHANGED` ไปยังทุก Dashboard และ Overlay ที่เชื่อมต่ออยู่
- **WebSocket Action `set_voice`**: ส่งคำสั่ง `{"action": "set_voice", "voice_id": "hana"}` ผ่าน `/ws/dashboard/{session_id}` เพื่อสลับเสียงแบบไร้รอยต่อ (Zero-Latency Switching)

### 5. 🛡️ Supabase Authentication, 3-Tier RBAC & Real-Time Log Monitor
- **3-Tier Role-Based Access Control (RBAC):** กำหนดระดับสิทธิ์การเข้าถึงอย่างเคร่งครัดบน PostgreSQL (`public.user_profiles`) ผ่าน Row Level Security (RLS) และ Trigger ป้องกันการยกระดับสิทธิ์ (`prevent_role_escalation`):
  * `admin`: สิทธิ์ผู้ดูแลระบบสูงสุด สามารถตรวจสอบประวัติการทำงานและ System Telemetry ทั้งหมดของระบบ
  * `streamer`: สิทธิ์ผู้ถ่ายทอดสด สามารถจัดการโปรไฟล์ คอนฟิกเสียงพากย์ และซิงก์การตั้งค่าส่วนบุคคล
  * `viewer`: สิทธิ์ผู้ชมทั่วไป สำหรับเปิดดูหน้าจอ OBS Browser Source Overlay แบบ Read-Only
- **Debounced Cloud Settings Sync (`useSupabaseSync`):** ซิงก์ค่าการปรับแต่งเสียง (`voice_tunings`), เสียงพากย์ที่เลือก (`selected_voice_id`), และการตั้งค่า TikFinity Settings ขึ้นสู่ Supabase Cloud โดยอัตโนมัติด้วยดีเลย์ 1000ms พร้อมระบบตรวจจับการเปลี่ยนแปลงแบบลูปป้องกัน (Loop Prevention)
- **In-Dashboard Real-Time Log Monitor (Tab 6):** หน้าต่างสังเกตการณ์ระบบถ่ายทอดสดและตรวจจับข้อผิดพลาดแบบเรียลไทม์ผ่าน Circular Ring Buffer (500 รายการ) ตัวกรองระดับความรุนแรง (`ALL`, `ERROR`, `WARN`, `INFO`, `DEBUG`), ตัวกรอง Subsystem (`TTS`, `TIKTOK_WS`, `AUTH`, `NETWORK`, `OVERLAY`, `SYSTEM`), ค้นหาข้อความสด, Export ไฟล์ JSON, และโหมดดึงข้อมูล Remote Backend Telemetry สำหรับผู้ดูแลระบบ
- **Resilient Local Offline Fallback:** ทำงานได้อย่างสมบูรณ์แบบในโหมดโลคอลและออฟไลน์ แม้ยังไม่ได้ใส่ Supabase API Keys ระบบจะไม่ Error หรือบล็อกการใช้งานสตรีมเมอร์

---

## ⚡ 3-Step 60-Second Quickstart (เริ่มสตรีมใน 60 วินาที)

เริ่มต้นใช้งานระบบได้ทันทีโดยไม่ต้องมีความรู้ด้านการเขียนโปรแกรมลึกซึ้ง:

| ขั้นตอน | การดำเนินการ | คำสั่ง / ลิงก์ |
| :--- | :--- | :--- |
| **Step 1: รัน GPU Backend บน Colab** | เปิดสมุดบันทึก Google Colab แล้วคลิกเมนู **Runtime $\rightarrow$ Run All** (ระบบจะโหลดโมเดล Fish Speech v1.5 และเปิด Cloudflare Quick Tunnel ให้อัตโนมัติ) | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/drive/1f4t-Q0H9QRwQwK4XlJS_DHwfsRPkEMz1) |
| **Step 2: ติดตั้ง Dependencies บน Windows** | ดับเบิลคลิกไฟล์ติดตั้งอัตโนมัติ `install.bat` (ระบบจะสร้าง Virtual Environment `.venv`, ติดตั้งแพ็กเกจ, และสร้างไฟล์คอนฟิก `.env`) | `install.bat` |
| **Step 3: เริ่มต้นใช้งานบอท** | รันบอทด้วย `run.bat` แล้วคัดลอก Browser Source URL ไปวางใน TikTok Studio หรือ Open Broadcaster Software (OBS) Studio | `run.bat` $\rightarrow$ `http://localhost:8000/overlay` |

---

## 🌟 Key Features Showcase

- **TikFinity-Style Browser Source Audio Routing (No VAC Required):**  
  ส่งสัญญาณเสียงผ่าน Hypertext Markup Language 5 (HTML5) Web Audio Application Programming Interface (Web Audio API) และ WebSocket (WS) ตรงเข้าสู่ TikTok LIVE Studio หรือ Open Broadcaster Software (OBS) Studio ทันที ไม่จำเป็นต้องลงไดรเวอร์ VB-Audio Virtual Audio Cable (VAC) ให้ยุ่งยาก
- **Priority Gift Queue (Donors Jump Queue):**  
  ระบบคิวลำดับความสำคัญ First-In, First-Out (FIFO) อัจฉริยะ ให้สิทธิ์ของขวัญและผู้สนับสนุน (Gift Events) แทรกคิวขึ้นมาอ่านก่อนคอมเมนต์ทั่วไปทันที พร้อมเอฟเฟกต์เสียงแจ้งเตือนพิเศษ
- **Advanced Thai Profanity & Spam Moderation:**  
  ระบบกรองคำหยาบคายภาษาไทยระดับสูง ดักจับการสะกดแบบหลบเลี่ยงคำหยาบ (Regex & Evasion Pattern Detection), การตัดข้อความยาวเกินพิกัด, การป้องกันข้อความซ้ำ (Anti-Spam Flooding) และ Per-User Cooldown ป้องกันการป่วนสตรีม
- **Emergency F9 Hotkey Kill-Switch:**  
  ปุ่มตัดเสียงฉุกเฉินระดับ Operating System (OS) Global Hotkey กด `F9` เพื่อหยุดการพูดทันทีและล้างคิวคอมเมนต์ที่ค้างอยู่ หรือกดปุ่ม `CONTROL_FLUSH` บน Web Dashboard ได้ในคลิกเดียว
- **StreamVox Live Studio Web Dashboard (`http://localhost:8000`):**  
  แดชบอร์ดควบคุมสดบนเว็บเบราว์เซอร์ด้วยฟอนต์ `Prompt` และ `Material Symbols Rounded` แสดงประวัติคอมเมนต์แบบ Real-Time, สลับโมเดลเสียง 5 โปรไฟล์, ปรับระดับเสียง (Volume), ความเร็วเสียง (Speech Speed) และทดสอบเสียงพากย์ได้ทันที

---

## 🏗️ System Architecture (สถาปัตยกรรมระบบ)

```mermaid
flowchart TD
    subgraph IngestionLayer ["1. Event Ingestion & Moderation"]
        TikTokLive["TikTok Live Broadcast (Live Chat & Virtual Gifts)"]
        Ingestion["TikTokLive WebSocket (WS) Ingestion Service"]
        Normalizer["Profanity Regex Filter & Username Sanitizer"]
        Queue["Priority First-In, First-Out (FIFO) Queue & Anti-Spam\n(Preserves Raw Display Text for UI & OBS Overlay)"]

        TikTokLive --> Ingestion
        Ingestion --> Normalizer
        Normalizer --> Queue
    end

    subgraph NLPLayer ["2. PyThaiNLP Precision Speech Pipeline"]
        Queue --> PyThaiNLP["PyThaiNLP Normalization (newmm + Custom Trie)\n• Grapheme-to-Phoneme (G2P) Slang Expansion\n• English Loanword Transliteration\n• Acoustic Pacing Heuristic & LRU Cache (4096)"]
    end

    subgraph TTSLayer ["3. Multi-Voice Router & Three-Tier Fallback TTS Engine"]
        PyThaiNLP -->|Voice: yuta| ServerlessTTS["Tier 1: Hugging Face Spaces ZeroGPU / Google Colab T4 GPU\nFish Speech v1.5 (Dual-AR FP16 & Firefly-GAN VQ)\nVoice: พิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)"]
        PyThaiNLP -->|Voices: yuta, hana, joker, anchor| CloudTTS["Tier 2: Fish Audio Free Developer Cloud API"]
        ServerlessTTS -.->|Network Timeout / Offline Fallback| CloudTTS
        PyThaiNLP -->|Voice: niwat (Direct) or Quota Fallback| EdgeTTS["Tier 3: Microsoft Edge Neural TTS\n(th-TH-NiwatNeural / th-TH-PremwadeeNeural)"]
        CloudTTS -.->|Quota Limit / Error Fallback| EdgeTTS
    end

    subgraph AudioDeliveryLayer ["4. Real-Time Audio Delivery & Studio UI"]
        ServerlessTTS --> AudioRouter["Audio Distribution Router"]
        CloudTTS --> AudioRouter
        EdgeTTS --> AudioRouter

        AudioRouter -->|Option A: TikFinity-Style Web Audio API| BrowserSource["TikTok Studio / OBS Browser Source Overlay\n(Font: Prompt | /overlay/<session_id>)"]
        AudioRouter -->|Option B: Local Virtual Audio Cable| VAC["VB-Audio Virtual Audio Cable (VAC) Input"]
        AudioRouter -->|Option C: StreamVox Live Studio| Dashboard["StreamVox Live Next.js 15 Dashboard\n(Font: Prompt & Material Symbols Rounded)"]

        BrowserSource --> Viewers["Live Stream Audience (Broadcast Audio)"]
        BrowserSource -.->|Monitor & Output| Headphones["Streamer Headphones (Audio Monitoring)"]
        VAC --> Viewers
        Dashboard --> Headphones
    end
```

---

## 📚 Documentation & Guides (เอกสารคู่มือการใช้งาน)

| Document | Description | Format | Target Audience |
| :--- | :--- | :---: | :--- |
| 💎 [**Vercel & Render Decoupled Deployment Guide**](docs/VERCEL_RENDER_DEPLOYMENT_GUIDE.md) | คู่มือติดตั้ง StreamVox Live Next.js 15 Apple Liquid Glass Dashboard บน Vercel Edge CDN คู่กับ Render Backend ฟรี 100% | Markdown | สตรีมเมอร์และนักพัฒนาที่ต้องการแดชบอร์ดระดับพรีเมียม |
| ☁️ [**Hugging Face ZeroGPU & Render Deployment Guide**](docs/HUGGINGFACE_RENDER_DEPLOYMENT_GUIDE.md) | คู่มือติดตั้งบนคลาวด์ฟรี 100% ($0/month) ด้วย Render Web Service ร่วมกับ Hugging Face Spaces ZeroGPU | Markdown | สตรีมเมอร์และนักพัฒนาที่ต้องการรันบนคลาวด์ตลอด 24 ชม. |
| ⚡ [**Quick Start Guide (เริ่มสตรีมใน 60 วินาที)**](docs/QUICK_START.md) | สรุปขั้นตอนด่วน 1 หน้าจบ สำหรับเริ่มสตรีมทันที ตั้งค่า OBS / TikTok Studio | Markdown | สตรีมเมอร์ที่ต้องการเริ่มใช้งานทันที |
| 📖 [**Official User Manual (คู่มือการใช้งานฉบับสมบูรณ์)**](docs/USER_MANUAL.md) | คู่มือภาษาไทยแบบละเอียด ตั้งค่า Browser Source, Advanced Audio, Dashboard & FAQ | Markdown | สตรีมเมอร์และผู้ดูแลระบบถ่ายทอดสด |
| 🎙️ [**Google Colab Backend Guide**](colab/README.md) | คู่มือการรัน Fish Speech v1.5 บน Google Colab T4 GPU ฟรีผ่าน Cloudflare Tunnel | Markdown | นักพัฒนาและผู้ใช้งานขั้นสูง |

---

## 💎 StreamVox Live — Apple Liquid Glass Streamer Dashboard (Next.js 15 + Vercel)

แดชบอร์ดควบคุมการสตรีมสดระดับพรีเมียม **StreamVox Live** ออกแบบตามหลักปรัชญา **Apple visionOS Frosted Liquid Glass Design System** ผสานฟอนต์ **Google Font 'Prompt'** และ **Google Material Symbols (Rounded)** พัฒนาขึ้นด้วยเทคโนโลยี **Next.js 15 (App Router)**, **React 19**, **Tailwind CSS**, และ **Framer Motion** ส่งมอบผ่านเครือข่ายกระจายเนื้อหา **Content Delivery Network (CDN)** ระดับโลกของ **Vercel** แบบไร้ค่าใช้จ่าย ($0/month):

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/PhuriphatTyPeZ3r0/tiktok-live-tts-bot&root-directory=frontend)

- **Decoupled Architecture:** ทำงานเป็น **Single-Page Application (SPA)** แยกจาก Backend อิสระ โดยเชื่อมต่อผ่าน WebSocket ความเร็วสูงไปยัง FastAPI บน Render
- **Multi-Voice Selector Studio:** เลือกสลับโมเดลเสียงทั้ง 5 โปรไฟล์ (`yuta`, `hana`, `joker`, `anchor`, `niwat`) พร้อมปุ่มกดฟังตัวอย่างเสียง (`ฟังตัวอย่าง`) และการซิงค์สถานะแบบเรียลไทม์ผ่าน `/api/voices` และ `/api/session/{id}/voice`
- **Audio Spectrum & Waveform Visualizer:** แสดงภาพคลื่นเสียงแบบเรียลไทม์ผ่าน **Web Audio Application Programming Interface (Web Audio API)** และ HTML5 Canvas
- **Bento Grid Control Panel:** จัดการระดับเสียง (Master Volume), สวิตช์ปิด/เปิดการอ่านคอมเมนต์หรือของขวัญ, การทดสอบเสียงพากย์ของ **พิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)**, และปุ่มหยุดฉุกเฉิน Panic Button (`CONTROL_FLUSH`)
- **Priority Queue Live Feed:** แสดงรายการคิวคอมเมนต์และของขวัญสดตามลำดับความสำคัญ First-In, First-Out (FIFO) พร้อมระบบป้ายทอง VIP Gift Badges
- **1-Click OBS Studio Integration:** คัดลอก Overlay URL ไปวางใน Open Broadcaster Software (OBS) Studio หรือ TikTok LIVE Studio ได้ทันที

> 📖 อ่านคู่มือการติดตั้งแบบละเอียดพร้อมไดอะแกรมระบบได้ที่: [**docs/VERCEL_RENDER_DEPLOYMENT_GUIDE.md**](docs/VERCEL_RENDER_DEPLOYMENT_GUIDE.md)

---

## ☁️ Zero-Cost Cloud Deployment (Hugging Face ZeroGPU + Render)

ติดตั้งและปรับใช้ระบบบนระบบคลาวด์แบบไร้เซิร์ฟเวอร์ (Serverless) สมบูรณ์แบบ **ฟรี 100% ($0/เดือน)** โดยไม่ต้องเปิดคอมพิวเตอร์ทิ้งไว้ และไม่ต้องเสียค่าเช่า GPU รายชั่วโมง:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/PhuriphatTyPeZ3r0/tiktok-live-tts-bot)
[![Hugging Face Spaces](https://img.shields.io/badge/%F0%9F%A4%97%20Deploy%20to%20Hugging%20Face-Spaces%20ZeroGPU-orange?style=for-the-badge&logo=huggingface&logoColor=white)](huggingface-space/)

### 🚀 ขั้นตอนการติดตั้งด่วน (Quick Deployment Steps)

1. **ติดตั้ง AI Inference Engine บน Hugging Face Spaces:**
   * สร้าง New Space บน [Hugging Face Spaces](https://huggingface.co/new-space) $\rightarrow$ เลือก SDK เป็น **Gradio** และเลือกฮาร์ดแวร์ **ZeroGPU (Free)**
   * อัปโหลดไฟล์จากโฟลเดอร์ `huggingface-space/` (ได้แก่ `README.md`, `app.py`, `requirements.txt`, `assets/yuta_sample.mp3`)
   * คัดลอก Direct Application Programming Interface (API) URL เช่น: `https://<your_username>-<space_name>.hf.space`

2. **ติดตั้ง Web Platform บน Render ด้วย 1-Click Blueprint:**
   * กดปุ่ม **Deploy to Render** หรือสร้าง New Blueprint Instance บน [Render.com](https://render.com/) โดยชี้ไปที่คลังโค้ดนี้
   * ไฟล์พิมพ์เขียว `render.yaml` จะสร้าง Web Service บน Python 3.11.9 และผูกพอร์ต `$PORT` ให้อัตโนมัติ
   * ระบุตัวแปรสภาพแวดล้อม:
     * `TIKTOK_USERNAME`: `@your_tiktok_username` (ระบบจะทำการเริ่มเชื่อมต่อห้องไลฟ์อัตโนมัติทันทีที่เซิร์ฟเวอร์บูต)
     * `COLAB_TUNNEL_URL`: Direct API URL ของ Hugging Face Space จากข้อ 1
     * `HF_TOKEN`: *(ทางเลือกเสริม)* Hugging Face Personal Access Token หาก Space เป็นแบบ Private
     * `FISH_AUDIO_API_KEY`: *(ทางเลือกเสริม)* คีย์สำรอง Tier 2 จาก [fish.audio](https://fish.audio)
   * กด **Apply** เพื่อเริ่มการทำงาน

3. **นำ Overlay URL ไปใส่ใน OBS Studio หรือ TikTok LIVE Studio:**
   * เข้าหน้าเว็บ Render ของคุณเพื่อคัดลอก Overlay URL หรือเปิด Streamer Web Dashboard
   * เพิ่ม **Browser Source** ใน OBS Studio $\rightarrow$ วาง Overlay URL $\rightarrow$ ติ๊กถูก **Control Audio via OBS** และตั้งค่าเสียงเป็น **Monitor and Output**

> 📖 อ่านคู่มือการติดตั้งบนคลาวด์ฉบับสมบูรณ์ พร้อมไดอะแกรมระบบและวิธีป้องกัน Render หลับได้ที่: [**HUGGINGFACE_RENDER_DEPLOYMENT_GUIDE.md**](docs/HUGGINGFACE_RENDER_DEPLOYMENT_GUIDE.md)

---

## ☁️ Google Colab GPU Backend Setup

Google Colab ทำหน้าที่เป็นเซิร์ฟเวอร์ประมวลผล Text-to-Speech (TTS) ประสิทธิภาพสูง โดยไม่ต้องใช้การ์ดจอแรงบนเครื่องสตรีมเมอร์:

1. คลิกปุ่ม **Open in Colab** เพื่อเปิดสมุดบันทึก:  
   [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/drive/1f4t-Q0H9QRwQwK4XlJS_DHwfsRPkEMz1)
2. ไปที่เมนู **Runtime** $\rightarrow$ **Change runtime type** แล้วเลือก **T4 GPU**
3. กด **Runtime $\rightarrow$ Run All** ระบบจะดาวน์โหลด Checkpoint โมเดล Fish Speech v1.5, เตรียมหน่วยความจำ Half-Precision Floating-Point Format (FP16), และสร้าง Cloudflare Quick Tunnel
4. เมื่อสำเร็จ คอนโซลจะแสดง Tunnel URL:
   ```text
   👉 Tunnel Public URL: https://random-subdomain.trycloudflare.com
   ```
5. คัดลอก URL ไปใส่ในไฟล์ `.env` บนเครื่องของคุณ:
   ```ini
   PREFER_COLAB_TTS=true
   COLAB_TUNNEL_URL=https://random-subdomain.trycloudflare.com
   ```

---

## 💻 Local Desktop Mode & Audio Routing Options

### ตัวเลือกที่ 1: TikFinity-Style Browser Source (แนะนำสูงสุด - ไม่ต้องลงไดรเวอร์)

1. รันเว็บเซิร์ฟเวอร์ด้วยคำสั่ง:
   ```powershell
   run.bat --web --port 8000
   ```
2. ใน **TikTok LIVE Studio** หรือ **Open Broadcaster Software (OBS) Studio**:
   - เพิ่ม Source ชนิด **Browser Source** (หรือ **ลิงก์หน้าเว็บ**)
   - กำหนด URL เป็น: `http://localhost:8000/overlay`
   - กำหนดขนาดกว้าง-ยาว: `600` x `250` (หรือ `1920` x `1080`)
   - ติ๊กถูกที่ช่อง **Control audio via OBS** (ควบคุมเสียงผ่าน OBS)
   - ในส่วนการตั้งค่าเสียงขั้นสูง (Advanced Audio Properties) เลือกเป็น **Monitor and Output** เพื่อให้ได้ยินเสียงในหูฟังพร้อมกับผู้ชม

### ตัวเลือกที่ 2: Virtual Audio Cable (VAC) Local Driver

หากต้องการรันบอทผ่านคอนโซล Terminal แบบดั้งเดิม:
1. ติดตั้งไดรเวอร์ฟรี [VB-Audio Virtual Cable](https://vb-audio.com/Cable/)
2. ใน OBS Studio หรือ TikTok Studio เพิ่ม Audio Input Capture ชนิด `CABLE Output (VB-Audio Virtual Cable)`
3. แก้ไข `.env`:
   ```ini
   AUDIO_OUTPUT_DEVICE_NAME=CABLE Input (VB-Audio Virtual Cable)
   ```
4. รันบอท:
   ```powershell
   run.bat
   ```

---

## ⚙️ Configuration Reference (`.env`)

```ini
# TikTok Live Creator Target
TIKTOK_USERNAME=@your_channel_handle

# Google Colab GPU Backend (Fish Speech v1.5 - เสียงพิพัฒน์ บุญสิทธิเลิศ)
PREFER_COLAB_TTS=true
COLAB_TUNNEL_URL=https://your-tunnel.trycloudflare.com
COLAB_TTS_TIMEOUT_SECONDS=6.0

# Tier 2 Fallback & Multi-Voice Profiles: Fish Audio Cloud API
FISH_AUDIO_API_KEY=your_fish_audio_api_key_here
FISH_AUDIO_MODEL_ID=9c110ffde8bc42709516395dfbcfb4a2
FISH_AUDIO_HANA_MODEL_ID=optional_hana_model_id
FISH_AUDIO_JOKER_MODEL_ID=optional_joker_model_id
FISH_AUDIO_ANCHOR_MODEL_ID=optional_anchor_model_id

# Tier 3 Fallback: Microsoft Edge Neural TTS
ENABLE_FALLBACK_TTS=true
FALLBACK_VOICE=th-TH-NiwatNeural

# Moderation & Playback Controls
MAX_COMMENT_LENGTH=80
USER_COOLDOWN_SECONDS=15
MAX_QUEUE_SIZE=10
MIN_GIFT_COINS=1

# Emergency Hotkey (Operating System Global)
EMERGENCY_HOTKEY=f9

# Supabase Authentication & RBAC (Optional - Falls back to local offline mode)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## 🧪 Testing & Automated Verification

ระบบได้รับการพัฒนาภายใต้ระเบียบวิธี Test-Driven Development (TDD) ครอบคลุม Unit Tests, PyThaiNLP Speech Normalization Tests, Multi-Voice Registry Tests, Contract Tests, WebSocket Tests, Supabase RBAC & Client Tests, Structured Logger Ingest Tests, Cloud Sync Tests, Log Monitor Tests และ End-to-End (E2E) Pipeline Verification รวมทั้งสิ้น 309 การทดสอบ (100% Pass Rate):

```powershell
# รันการทดสอบทั้งหมดผ่าน pytest
pytest tests/ -v
```

---

## 📚 References & Academic Standards

1. **Fish Audio Research Team.** (2024). *Fish Speech: Advancing Open-Source Multilingual Text-to-Speech Synthesis via Dual-Autoregressive Modeling and Vector Quantization*. arXiv preprint arXiv:2411.01156. [https://arxiv.org/abs/2411.01156](https://arxiv.org/abs/2411.01156)
2. **Phatthiyaphaibun, W., Chaovavanich, K., Polpanumas, C., Suriyawongkul, A., Lowphansirikul, L., & Chormai, P.** (2024). *PyThaiNLP: Thai Natural Language Processing in Python*. Zenodo / GitHub Repository (v5.0+). [https://github.com/PyThaiNLP/pythainlp](https://github.com/PyThaiNLP/pythainlp)
3. **Hugging Face Inc.** (2024). *Hugging Face Spaces ZeroGPU: Dynamic Hardware Scheduling for Accelerated AI Applications*. Hugging Face Documentation. [https://huggingface.co/docs/hub/spaces-gpus](https://huggingface.co/docs/hub/spaces-gpus)
4. **Render Services Inc.** (2024). *Render Infrastructure as Code: Blueprint Specification and Deployment Architecture*. Render Documentation. [https://render.com/docs/blueprint-spec](https://render.com/docs/blueprint-spec)
5. **Microsoft Azure Cognitive Services.** (2024). *Microsoft Edge Neural Text-to-Speech (TTS) Voice Roster and Synthesizer Engine Specification*. Microsoft Corporation. [https://learn.microsoft.com/azure/ai-services/speech-service/](https://learn.microsoft.com/azure/ai-services/speech-service/)
6. **World Wide Web Consortium (W3C).** (2024). *Web Audio API Standard Specification*. W3C Audio Working Group. [https://www.w3.org/TR/webaudio/](https://www.w3.org/TR/webaudio/)
7. **Cloudflare Inc.** (2025). *Cloudflare Tunnel: Zero-Trust Connect and Ingress Architecture*. Cloudflare Network Systems. [https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
8. **Open Broadcaster Software Community.** (2024). *OBS Studio Browser Source and Audio Routing Integration Guide*. OBS Project. [https://obsproject.com/](https://obsproject.com/)
9. **VB-Audio Software.** (2024). *VB-Audio Virtual Cable Specification and Inter-Process Audio Routing Architecture*. [https://vb-audio.com/Cable/](https://vb-audio.com/Cable/)

---

## 📄 License

This project is licensed under the terms of the [MIT License](LICENSE).  
Copyright (c) 2026 Phuriphat Hemakul. Voice attribution to พิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert).
