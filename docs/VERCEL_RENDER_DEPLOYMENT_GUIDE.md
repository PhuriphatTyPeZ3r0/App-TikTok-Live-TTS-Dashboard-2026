# 💎 คู่มือการติดตั้งสถาปัตยกรรมแยกส่วน Vercel และ Render ฟรี 100% (Decoupled Vercel & Render Deployment Guide)
### Apple visionOS Frosted Liquid Glass Streamer Dashboard ร่วมกับ FastAPI Backend และ GPU Inference
#### TikTok Live Text-to-Speech (TTS) Bot & Cloud Web Platform (Version 2.5)

> **บทสรุปสำหรับผู้บริหารและวิศวกรระบบ (Executive Summary):**  
> เอกสารฉบับนี้อธิบายขั้นตอนการติดตั้งและกำหนดค่าสถาปัตยกรรมแบบแยกส่วน (Decoupled Micro-Frontend & Backend Architecture) สำหรับระบบแปลงข้อความเป็นเสียงสังเคราะห์ (Text-to-Speech: TTS) แบบเรียลไทม์บน TikTok LIVE โดยเชื่อมโยงหน้าจอแดชบอร์ด **Apple visionOS Frosted Liquid Glass** ที่พัฒนาด้วย **Next.js 15 (App Router)** บนเครือข่ายกระจายเนื้อหา **Content Delivery Network (CDN)** ระดับโลกของ **Vercel** เข้ากับเว็บเซิร์ฟเวอร์ส่วนหลัง **FastAPI** บน **Render Free Web Service** และคลัสเตอร์ประมวลผลปัญญาประดิษฐ์ **Fish Speech v1.5** บน **Google Colaboratory (Colab) Tesla T4 GPU** หรือ **Hugging Face Spaces ZeroGPU** ภายใต้งบประมาณ **0 บาทต่อเดือน ($0/month)** ตลอดอายุการใช้งาน

---

## 🏛️ สถาปัตยกรรมระบบไฮบริดแบบแยกส่วน (Decoupled Hybrid Architecture)

ระบบถูกออกแบบตามสถาปัตยกรรมคลาวด์แบบไร้เซิร์ฟเวอร์และแยกส่วนอิสระ (Decoupled Cloud Architecture) เพื่อให้การส่งมอบหน้าเว็บแบบ **Single-Page Application (SPA)** มีความเร็วในการโหลดสูงที่สุดผ่าน Edge Network พร้อมรองรับการเชื่อมต่อสื่อสารแบบสองทิศทาง (Bidirectional Communication) แบบเรียลไทม์:

```mermaid
flowchart TD
    subgraph EdgeCDN ["1. Global Edge Content Delivery Network (Vercel Platform)"]
        VercelEdge["Vercel Global Edge Content Delivery Network (CDN)"]
        NextApp["Next.js 15 Single-Page Application (SPA)\n(Apple visionOS Frosted Liquid Glass Dashboard)"]
        Visualizer["Canvas Web Audio Application Programming Interface (Web Audio API)\nReal-Time Waveform & Frequency Visualizer"]
        VercelEdge --> NextApp
        NextApp --> Visualizer
    end

    subgraph StreamerClient ["2. Streamer & Broadcast Ingestion (เครื่องของสตรีมเมอร์)"]
        OBS["Open Broadcaster Software (OBS) Studio /\nTikTok LIVE Studio Browser Source (/overlay)"]
        StreamerBrowser["Streamer Control Center (Next.js Dashboard on Edge CDN)"]
    end

    subgraph RenderBackend ["3. Application Web Server (Render Free Web Service)"]
        FastAPIApp["FastAPI Asynchronous Server Gateway Interface (ASGI) Web Server\n(Python 3.11 on Port $PORT)"]
        TikTokConnector["TikTokLive WebSocket (WS) Ingestion Service"]
        ModerationFilter["Thai Phonetic Normalizer & Profanity Regex Filter"]
        PriorityQueue["Priority First-In, First-Out (FIFO) Event Queue"]
        MultiTierTTS["Multi-Tier Fallback Text-to-Speech (TTS) Engine"]

        FastAPIApp --> TikTokConnector
        TikTokConnector --> ModerationFilter
        ModerationFilter --> PriorityQueue
        PriorityQueue --> MultiTierTTS
    end

    subgraph GPUInferenceCluster ["4. High-Performance AI Inference (Zero-Cost GPU Clusters)"]
        subgraph ColabNode ["Primary Node: Google Colab GPU"]
            ColabTunnel["Cloudflare Quick Tunnel (HTTPS Ingress)"]
            ColabT4["Fish Speech v1.5 Dual-AR Transformer & VQ-GAN\n(NVIDIA Tesla T4 GPU FP16)"]
            ColabTunnel --> ColabT4
        end

        subgraph HFSpaceNode ["Alternative Node: Hugging Face Spaces"]
            HFZeroGPU["Hugging Face Spaces ZeroGPU (A100/H100)\n@spaces.GPU Dynamic Hardware Allocation"]
        end

        subgraph CloudFallbacks ["Fallback Services"]
            FishAPI["Tier 2: Fish Audio Developer API"]
            EdgeTTSAPI["Tier 3: Microsoft Edge Neural TTS"]
        end
    end

    %% Communication Channels
    StreamerBrowser <==>|Secure WebSocket (WSS /ws/dashboard)| FastAPIApp
    StreamerBrowser -->|REST API /api/settings/colab| FastAPIApp
    OBS <==>|Secure WebSocket (WSS /ws/stream/{session_id})| FastAPIApp
    TikTokLiveNet["TikTok LIVE Event Cluster"] -->|Chat & Gifts Stream| TikTokConnector
    MultiTierTTS -->|HTTPS POST /v1/tts| ColabTunnel
    MultiTierTTS -.->|Fallback HTTPS POST| HFZeroGPU
    MultiTierTTS -.->|Fallback HTTPS POST| FishAPI
    MultiTierTTS -.->|Fallback WebSocket| EdgeTTSAPI
```

---

## 🎭 การระบุเอกลักษณ์เสียงพากย์ต้นฉบับ (Voice Attribution & Identity)

> 🎙️ **การอ้างอิงเสียงพากย์อย่างเป็นทางการ (Official Voice Identity Attribution):**  
> เสียงสังเคราะห์หลักในระบบทั้งหมดถูกสร้างขึ้นจากเอกลักษณ์เสียงของ **"พิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)"** นักพากย์ภาพยนตร์ ซีรีส์ และอนิเมะชั้นนำของประเทศไทย ผู้ให้เสียงพากย์ภาษาไทยของตัวละคร *ยูตะ อคคทสึ (Yuta Okkotsu)* ในภาพยนตร์อนิเมชั่นระดับโลก *Jujutsu Kaisen 0 (มหาเวทย์ผนึกมาร 0)*  
> 
> * **รหัสอ้างอิงเสียงหลัก (Primary Voice ID):** `phiphat`
> * **รหัสอ้างอิงเดิมเพื่อความเข้ากันได้ย้อนหลัง (Backward-Compatible Alias):** `yuta`
> * **สถาปัตยกรรมโครงข่ายประสาทเทียม:** โมเดล Fish Speech v1.5 ซึ่งขับเคลื่อนด้วยสถาปัตยกรรม **Dual Autoregressive (Dual-AR)** Transformer ร่วมกับเทคโนโลยี **Vector Quantization (VQ)** และตัวสังเคราะห์เสียง **Generative Adversarial Network (GAN)** ทำงานบนความแม่นยำ Half-Precision Floating-Point Format (FP16) ที่ความถี่สุ่มตัวอย่าง (Sampling Rate) 44.1 kHz ส่งผลให้เสียงมีความเป็นธรรมชาติ ชัดถ้อยชัดคำ และมีเวลาแฝง (Latency) ต่ำกว่า 1.5 วินาที

---

## 🚀 ขั้นตอนที่ 1: การติดตั้ง Backend บน Render Free Web Service

Render ทำหน้าที่เป็นโฮสต์สำหรับระบบ **Asynchronous Server Gateway Interface (ASGI)** ของ FastAPI โดยจัดการระบบคิว **First-In, First-Out (FIFO)**, การเชื่อมต่อไปยัง TikTok LIVE Ingress, และการสตรีมเสียงผ่าน **Web Audio Application Programming Interface (Web Audio API)**

### 1.1 การสร้าง Web Service ด้วย Blueprint (`render.yaml`) แบบ 1-Click

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/PhuriphatTyPeZ3r0/tiktok-live-tts-bot)

1. คลิกปุ่ม **Deploy to Render** ด้านบน หรือเข้าสู่ระบบ [Render Dashboard](https://dashboard.render.com/) แล้วเลือก **Blueprints $\rightarrow$ New Blueprint Instance**
2. เลือกเชื่อมต่อไปยังคลังโค้ด `https://github.com/PhuriphatTyPeZ3r0/tiktok-live-tts-bot`
3. ไฟล์พิมพ์เขียว `render.yaml` จะโหลดการตั้งค่าอัตโนมัติ:
   - **Environment:** `python` (Python 3.11.9)
   - **Plan:** `free` ($0/month)
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn src.web_server:app --host 0.0.0.0 --port $PORT`

### 1.2 การกำหนดตัวแปรสภาพแวดล้อม (Environment Variables) บน Render

ในหน้าการตั้งค่า **Environment** ของ Web Service ให้กำหนดตัวแปรดังนี้:

| ตัวแปร (Key) | ตัวอย่างค่า (Value) | คำอธิบาย |
| :--- | :--- | :--- |
| `TIKTOK_USERNAME` | `@your_tiktok_handle` | ชื่อผู้ใช้ TikTok ที่ต้องการให้บอทเชื่อมต่อห้องไลฟ์อัตโนมัติทันทีเมื่อเปิดเซิร์ฟเวอร์ |
| `COLAB_TUNNEL_URL` | `https://xxxx.trycloudflare.com` | URL สำหรับเรียกใช้งานโมเดล AI Inference บน Google Colab หรือ Hugging Face Spaces |
| `FISH_AUDIO_API_KEY` | `your_api_key_optional` | *(ทางเลือกเสริม)* API Key สำหรับระบบสำรอง Tier 2 จาก Fish Audio Cloud |
| `ENABLE_FALLBACK_TTS` | `true` | เปิดใช้งานระบบสำรองอัตโนมัติ 3-Tier เมื่อการ์ดจอออฟไลน์ |
| `FALLBACK_VOICE` | `th-TH-NiwatNeural` | เสียงสำรอง Tier 3 Microsoft Edge Neural TTS |
| `CORS_ORIGINS` | `*` หรือ `https://your-app.vercel.app` | โดเมนของ Vercel Frontend ที่อนุญาตให้ส่งคำขอ Cross-Origin |

4. คลิก **Apply** หรือ **Create Web Service** และรอให้สถานะเปลี่ยนเป็น **Live**
5. คัดลอก URL ของ Render Backend เช่น: `https://tiktok-live-tts-bot.onrender.com`

---

## ⚡ ขั้นตอนที่ 2: การติดตั้ง Frontend แดชบอร์ดบน Vercel Global Edge CDN

Vercel ทำหน้าที่เป็นเครือข่ายส่งมอบเนื้อหา **Content Delivery Network (CDN)** ระดับสากล สำหรับโฮสต์หน้าจอ **Single-Page Application (SPA)** แดชบอร์ดสตรีมเมอร์สไตล์ Apple visionOS Liquid Glass

### 2.1 การ Deploy ขึ้น Vercel ด้วย 1-Click Button

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/PhuriphatTyPeZ3r0/tiktok-live-tts-bot&root-directory=frontend)

1. คลิกปุ่ม **Deploy with Vercel** ด้านบน
2. ระบบจะนำท่านไปยังหน้า **Create Git Repository** บน Vercel:
   - ตั้งชื่อ Repository สำหรับบันทึก Frontend เช่น `tiktok-live-tts-dashboard`
   - ตรวจสอบว่า **Root Directory** ถูกตั้งเป็น `frontend` โดยอัตโนมัติ (ไฟล์ `vercel.json` ในรากโปรเจกต์จะควบคุมให้ Vercel บิลด์จากโฟลเดอร์นี้)
3. ในส่วน **Configure Project $\rightarrow$ Environment Variables**:
   - เพิ่มตัวแปร:
     - **Name:** `NEXT_PUBLIC_BACKEND_URL`
     - **Value:** URL ของ Render Backend ที่ได้จากขั้นตอนที่ 1 เช่น `https://tiktok-live-tts-bot.onrender.com` (ไม่ต้องใส่เครื่องหมาย `/` ปิดท้าย)
4. คลิกปุ่ม **Deploy**
5. รอระบบบิลด์ Next.js 15 App Router ประมาณ 1-2 นาที เมื่อเสร็จสิ้น Vercel จะมอบโดเมนระดับ Production เช่น:
   ```text
   https://tiktok-live-tts-dashboard.vercel.app
   ```

---

## 🎬 ขั้นตอนที่ 3: เวิร์กโฟลว์การใช้งานของสตรีมเมอร์และการตั้งค่า OBS Studio

สถาปัตยกรรมนี้ใช้รูปแบบ TikFinity-Style Audio Streaming โดยส่งสัญญาณเสียงและข้อมูลภาพผ่าน **Web Audio Application Programming Interface (Web Audio API)** โดยตรงสู่ซอฟต์แวร์กระจายสัญญาณ:

### 3.1 การเชื่อมต่อ Browser Source เข้ากับ OBS Studio / TikTok LIVE Studio

1. เปิดหน้าแดชบอร์ด Vercel: `https://tiktok-live-tts-dashboard.vercel.app`
2. ระบบจะสร้าง `session_id` และ `overlay_token` ปลอดภัยเฉพาะตัว
3. ใน Navbar หรือ Control Panel คลิกปุ่ม **Copy OBS URL** ซึ่งมีรูปแบบ:
   ```text
   https://<your-render-app>.onrender.com/overlay/{session_id}?token={overlay_token}
   ```
4. เปิด **Open Broadcaster Software (OBS) Studio** หรือ **TikTok LIVE Studio**:
   - เพิ่ม Source ใหม่ $\rightarrow$ เลือก **Browser** (เบราว์เซอร์)
   - วาง URL ที่คัดลอกลงในช่อง **URL**
   - กำหนดขนาด: ความกว้าง `600` x ความสูง `250` พิกเซล (หรือ `1920` x `1080` พิกเซลสำหรับจอเต็ม)
   - ติ๊กถูกที่ช่อง **Control Audio via OBS** (ควบคุมเสียงผ่าน OBS)
   - ในหน้าต่าง **Advanced Audio Properties** ของ OBS ให้ตั้งค่าเสียงของ Browser Source เป็น **Monitor and Output** เพื่อให้เสียงพากย์ของ พิพัฒน์ บุญสิทธิเลิศ ออกลำโพง/หูฟังของสตรีมเมอร์พร้อมกับส่งไปยังผู้ชมการถ่ายทอดสด

### 3.2 การควบคุมสดผ่าน Bento Grid Dashboard

- **Status & Reconnect Indicator:** แสดงสถานะการเชื่อมต่อ WebSocket สีเขียวมรกต (Connected) หรือสีเหลืองอำพัน (Reconnecting) พร้อมกลไกพยายามเชื่อมต่อใหม่อัตโนมัติ (Exponential Backoff)
- **Live Waveform Spectrum:** แสดงการขยับของคลื่นเสียงสดแบบเรียลไทม์ด้วย Canvas และ Web Audio API เมื่อมีการพูด
- **Priority First-In, First-Out (FIFO) Feed:** คอมเมนต์ทั่วไปและของขวัญ (Gift) จะถูกจัดคิวตามลำดับความสำคัญ โดยของขวัญจะได้รับเหรียญทอง VIP และข้ามคิวขึ้นมาอ่านก่อนทันที
- **Emergency Panic Button (`CONTROL_FLUSH`):** สตรีมเมอร์สามารถกดปุ่มสีแดงฉุกเฉินบนหน้าจอ หรือกดปุ่มคีย์ลัดระดับระบบปฏิบัติการเพื่อหยุดเสียงพูดทันทีและล้างคิวที่ค้างทั้งหมดภายในเวลาไม่เกิน 50 มิลลิวินาที

---

## 🛠️ ขั้นตอนที่ 4: การแก้ไขปัญหาและความเสถียรของระบบ (Troubleshooting & Reliability)

### 4.1 การจัดการ Cross-Origin Resource Sharing (CORS)

เนื่องจากหน้าบ้านทำงานบนโดเมน Vercel (`*.vercel.app`) ขณะที่หลังบ้านทำงานบน Render (`*.onrender.com`) ตัวเซิร์ฟเวอร์ FastAPI จึงต้องเปิดใช้งาน CORS Middleware:
- ตัวเซิร์ฟเวอร์ `src/web_server.py` มีการกำหนดค่า `CORSMiddleware` ให้อนุญาตคำขอจากทุก Origin (`allow_origins=["*"]`) หรือสามารถระบุเฉพาะเจาะจงโดเมน Vercel ของท่านผ่านตัวแปรสภาพแวดล้อมได้
- หากพบข้อผิดพลาด `CORS request blocked`:
  1. เข้าหน้าแดชบอร์ด Render $\rightarrow$ ไปที่ Web Service $\rightarrow$ **Environment**
  2. เพิ่มตัวแปร `CORS_ORIGINS` = `https://your-dashboard.vercel.app`
  3. กด **Save Changes** เพื่อให้ Render ปรับใช้คอนฟิกใหม่

### 4.2 การจัดการเมื่อ WebSocket หลุดและการเชื่อมต่ออัตโนมัติ (Exponential Backoff)

- หน้าจอแดชบอร์ด `useDashboardSocket` มาพร้อมอัลกอริทึม **Exponential Backoff** (หน่วงเวลา 1s, 2s, 4s, 8s, สูงสุด 16s)
- หากอินเทอร์เน็ตของสตรีมเมอร์กระตุก หรือ Render รีสตาร์ท ตัว Client จะไม่ทำให้หน้าเว็บค้างหรือเกิด White Screen แต่จะแสดงสถานะ Reconnecting และเชื่อมต่อกลับเข้ามาทันทีที่เซิร์ฟเวอร์พร้อม

### 4.3 การป้องกัน Render Free Tier พักการทำงาน (Cold Start Mitigations)

Render Free Web Service จะเข้าสู่โหมดพักการทำงาน (Spin Down / Sleep) หากไม่มีการส่งคำขอเข้ามาเป็นเวลา 15 นาที ซึ่งทำให้การเริ่มเซิร์ฟเวอร์ครั้งแรกในรอบวันอาจใช้เวลาประมาณ 50 วินาที (Cold Start):
- **วิธีบรรเทาปัญหาที่ 1 (Ping Keep-Alive):** ใช้งานบริการฟรีเช่น [UptimeRobot (https://uptimerobot.com)](https://uptimerobot.com) หรือ [Cron-Job.org](https://cron-job.org) เพื่อตั้งเวลาส่งคำขอ Hypertext Transfer Protocol (HTTP) แบบ `GET` ไปยัง Endpoint สุขภาพ:
  ```text
  https://<your-render-app>.onrender.com/health
  ```
  ทุกๆ 10 นาที เพื่อให้เซิร์ฟเวอร์ตื่นตัวตลอดช่วงเวลาถ่ายทอดสด
- **วิธีบรรเทาปัญหาที่ 2 (Web Auto-Bootstrap):** เมื่อสตรีมเมอร์เปิดหน้า Vercel Dashboard ตัวเบราว์เซอร์จะทำการ Ping ไปยัง `/health` ของ Render ล่วงหน้าเพื่อปลุกเซิร์ฟเวอร์ให้ตื่นก่อนเริ่มเปิดสตรีมจริง

---

## 📚 เอกสารอ้างอิงและมาตรฐานวิชาการ (References & Academic Citations)

1. **Fish Audio Research Team.** (2024). *Fish Speech: Advancing Open-Source Multilingual Text-to-Speech Synthesis via Dual-Autoregressive Modeling and Vector Quantization*. arXiv preprint arXiv:2411.01156. [https://arxiv.org/abs/2411.01156](https://arxiv.org/abs/2411.01156)
2. **Vercel Engineering Team.** (2025). *Next.js 15 Server and Client Composition Architecture on Global Edge Networks*. Vercel Documentation. [https://nextjs.org/docs](https://nextjs.org/docs)
3. **Render Cloud Platform.** (2024). *Render Infrastructure as Code: Blueprint Specification and Deployment Architecture*. Render Documentation. [https://render.com/docs/blueprint-spec](https://render.com/docs/blueprint-spec)
4. **World Wide Web Consortium (W3C).** (2024). *Web Audio API: W3C Recommendation for Hypertext Markup Language 5 Audio Processing and Synthesis*. W3C Audio Working Group. [https://www.w3.org/TR/webaudio/](https://www.w3.org/TR/webaudio/)
5. **Internet Engineering Task Force (IETF).** (2011). *The WebSocket Protocol*. RFC 6455. [https://datatracker.ietf.org/doc/html/rfc6455](https://datatracker.ietf.org/doc/html/rfc6455)
6. **Tiangolo, S.** (2024). *FastAPI: High performance, easy to learn, fast to code, ready for production ASGI framework*. [https://fastapi.tiangolo.com/](https://fastapi.tiangolo.com/)

---

## 📄 ลิขสิทธิ์และสัญญาอนุญาต (License)

โครงงานนี้เผยแพร่ภายใต้สัญญาอนุญาตแบบ [MIT License](LICENSE)  
Copyright (c) 2026 Phuriphat Hemakul. Voice model attribution: พิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert).
