# 🎙️ StreamVox Live — Frontend Dashboard

[![Next.js](https://img.shields.io/badge/Next.js-15.0-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb?logo=react)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-GoTrue%20Auth-3ecf8e?logo=supabase)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?logo=vercel)](https://vercel.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> **เสียงพากย์ต้นแบบ (Voice Actor Attribution):** โครงงานนี้ใช้เสียงพากย์ต้นแบบของ **คุณพิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)** นักพากย์เสียงมืออาชีพผู้ให้เสียงภาษาไทยตัวละคร Yuta Okkotsu จากภาพยนตร์ *Jujutsu Kaisen 0* โดยใช้สำหรับสังเคราะห์เสียงปัญญาประดิษฐ์เพื่อการศึกษาและวิจัยทางวิศวกรรมคอมพิวเตอร์

---

## 📌 ภาพรวมสถาปัตยกรรม (Architecture Overview)

**`App-TikTok-Live-TTS-Dashboard-2026`** คือแอปพลิเคชันเว็บส่วนหน้าแบบหน้าเดียว (Single-Page Application: SPA) พัฒนาด้วย Next.js 15 (App Router) และ React 19 ออกแบบด้วยปรัชญา **Apple visionOS Frosted Liquid Glass Design System** สำหรับเป็นศูนย์ควบคุมและบริหารจัดการระบบสังเคราะห์เสียงสด (Live Speech Synthesis Control Station)

แอปพลิเคชันนี้ทำงานประสานงานแบบแยกส่วนเด็ดขาด (Decoupled Microservices) ร่วมกับเซิร์ฟเวอร์ส่วนหลัง **[`Tool-TikTok-Live-TTS-Bot-2026`](https://github.com/PhuriphatTyPeZ3r0/Tool-TikTok-Live-TTS-Bot-2026)** ที่ทำงานบน Render Managed Cloud (สิงคโปร์) ผ่านโพรโทคอล WebSocket สองทาง และส่งมอบหน้าเว็บผ่านเครือข่ายกระจายเนื้อหา (Content Delivery Network: CDN) ของ Vercel

```mermaid
flowchart LR
    A["👤 ผู้ดูแลระบบ / สตรีมเมอร์"] -->|HTTPS / WSS| B["⚡ Next.js 15 Dashboard\n(Vercel Edge CDN)"]
    B -->|OAuth / JWT Session| C["🔐 Supabase GoTrue Auth\n(RBAC: admin / streamer / viewer)"]
    B -->|Bidirectional WebSocket| D["⚙️ FastAPI Backend Services\n(Tool-TikTok-Live-TTS-Bot-2026)"]
    D -->|Internal VPC Connection| E[("🐘 Render Managed PostgreSQL\n(streamvox-db / Singapore)")]
    B -->|Telemetry & System Logs| E
```

---

## 🚀 ฟีเจอร์หลัก (Key Features)

1. **Apple visionOS Frosted Liquid Glass UI:**
   - ดีไซน์ระดับพรีเมียมด้วยเอฟเฟกต์แก้วขัดฝ้า (Frosted Glass), เส้นขอบสะท้อนแสง (Specular Highlight Rim Border) และ Ambient Studio Glow
   - รองรับ Light Mode และ Dark Mode อย่างสมบูรณ์แบบ
   - ควบคุมการแสดงผลตามหลักสรีรศาสตร์และ UX แบบ Bento Grid

2. **ระบบยืนยันตัวตนและการควบคุมสิทธิ์ (Supabase Auth & RBAC):**
   - รองรับการเข้าสู่ระบบ 3 ช่องทาง: Email/Password, Google OAuth, และ TikTok Login Kit
   - สถาปัตยกรรม Role-Based Access Control (RBAC) 3 ระดับ:
     - `admin`: สิทธิ์เต็มรูปแบบ เข้าถึง Console การจัดการคิว การปรับแต่งเสียง และ System Log Monitor (Whitelist อัตโนมัติ: `phuriphathem@gmail.com`)
     - `streamer`: ปรับแต่งเสียงและข้อความสตรีมสด
     - `viewer`: รับชมสถานะและคิวแบบ Read-only
   - ระบบ RoleGate ตรวจสอบสิทธิ์แบบ Client & Server-side ป้องกัน Unauthorized Route Access

3. **ศูนย์มอนิเตอร์และตรวจติดตามบันทึกระบบสด (Real-Time System Log Monitor):**
   - แท็บมอนิเตอร์ (Tab 6) บันทึก Structured Logs พร้อมระดับความรุนแรง (`INFO`, `WARNING`, `ERROR`, `CRITICAL`)
   - อ่านและซิงก์ข้อมูลจาก Render Managed PostgreSQL (`dpg-dbnmn07f3r2c73935nog-a`) และเชื่อมโยง REST API ของ FastAPI Backend
   - กรองบันทึกตาม Severity และค้นหาข้อความได้ทันที

4. **การประสานงานกับ OBS Studio (OBS Overlay Integration):**
   - พร็อกซี URL อัตโนมัติไปยังเซิร์ฟเวอร์ส่วนหลังสำหรับ Browser Source Overlay (`/overlay/index.html`)
   - รองรับการปรับแต่งการแจ้งเตือนของขวัญและข้อความแชตแบบ Real-time

---

## 🛠️ โครงสร้างโปรเจกต์ (Repository Directory Layout)

```
App-TikTok-Live-TTS-Dashboard-2026/
├── src/
│   ├── app/
│   │   ├── globals.css              # Apple visionOS CSS utilities & typography tokens
│   │   ├── layout.tsx               # Root layout & Google Fonts (Prompt, JetBrains Mono)
│   │   └── page.tsx                 # Main dashboard Bento Grid & SPA tabs controller
│   ├── components/
│   │   ├── AudioVisualizer.tsx      # Real-time Web Audio API waveform visualizer
│   │   ├── ControlPanel.tsx         # Ingestion start/pause/resume & hotkey control
│   │   ├── LiveQueueConsole.tsx     # Smart queue inspector & priority queue feed
│   │   ├── Navbar.tsx               # Header, connection badge & user profile button
│   │   ├── NowSpeakingCard.tsx      # Active TTS speaker card with voice profile
│   │   ├── OBSIntegrationCard.tsx   # OBS Browser Source URL copy & preview
│   │   ├── QueueFeed.tsx            # Live chat/gift history feed
│   │   ├── Sidebar.tsx              # Quick navigation drawer
│   │   ├── TikFinitySettings.tsx    # TikFinity webhook connection settings
│   │   ├── VoiceSelector.tsx        # Voice model switcher (Yuta Okkotsu / Edge Neural)
│   │   ├── VoiceTestCard.tsx        # Test synthesis audio trigger
│   │   ├── auth/                    # Supabase Auth components & RoleGate
│   │   │   ├── AuthModal.tsx
│   │   │   ├── GoogleLoginButton.tsx
│   │   │   ├── RoleGate.tsx
│   │   │   ├── TikTokLoginButton.tsx
│   │   │   └── UserProfileButton.tsx
│   │   └── tabs/                    # Tab settings components
│   │       ├── TabChatSettings.tsx
│   │       ├── TabGiftSettings.tsx
│   │       ├── TabLogMonitor.tsx    # Live System Log Monitor (Tab 6)
│   │       ├── TabObsSettings.tsx
│   │       ├── TabSafetySettings.tsx
│   │       └── ToggleSwitch.tsx
│   ├── context/
│   │   └── ThemeContext.tsx         # Dark / Light mode provider
│   ├── hooks/
│   │   ├── useDashboardSocket.ts    # Bidirectional WebSocket connector to FastAPI
│   │   ├── useSupabaseAuth.ts       # Supabase GoTrue Auth & session hook
│   │   ├── useSupabaseSync.ts       # Cloud config sync hook
│   │   └── useTikFinitySettings.ts  # LocalStorage fallback settings
│   ├── lib/
│   │   ├── logger.ts                # Client-side structured logger & backend dispatcher
│   │   ├── textUtils.ts             # Thai text processing helpers
│   │   └── supabase/
│   │       ├── client.ts            # Supabase browser client factory
│   │       └── server.ts            # Supabase server client factory
│   └── types/
│       ├── auth.ts                  # User profile & RBAC types
│       ├── dashboard.ts             # WebSocket payload types
│       ├── logger.ts                # Structured log schemas
│       └── tikfinity.ts             # Webhook event contracts
├── next.config.ts                   # Next.js configuration & FastAPI reverse proxy rules
├── package.json                     # Node.js project manifest & dependencies
├── postcss.config.mjs               # PostCSS Tailwind engine configuration
├── tailwind.config.ts               # visionOS & Red Broadcast design tokens
├── tsconfig.json                    # Strict TypeScript compiler options
└── vercel.json                      # Vercel zero-config deployment manifest
```

---

## ⚙️ ตัวแปรสภาพแวดล้อม (Environment Variables)

คัดลอกไฟล์ `.env.example` ไปเป็น `.env.local` สำหรับการรันในเครื่อง:

```bash
cp .env.example .env.local
```

| Key | คำอธิบาย | ตัวอย่างค่า |
|---|---|---|
| `NEXT_PUBLIC_BACKEND_URL` | URL ของเซิร์ฟเวอร์ FastAPI Backend บน Render | `https://tiktok-live-tts-bot.onrender.com` |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL ของเซิร์ฟเวอร์ FastAPI Backend | `wss://tiktok-live-tts-bot.onrender.com/ws` |
| `NEXT_PUBLIC_SUPABASE_URL` | URL ของ Supabase Project GoTrue Auth | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public Anon API Key ของ Supabase | `eyJhbGciOi...` |
| `DATABASE_URL` | Connection String ของ Render Managed PostgreSQL | `postgresql://user:pass@dpg-xxx.singapore-postgres.render.com:5432/streamvox_db` |

---

## 📦 การติดตั้งและการรันในเครื่อง (Local Development)

```bash
# 1. ติดตั้ง Dependencies
npm install

# 2. รันโหมด Development
npm run dev

# 3. ตรวจสอบการคอมไพล์สำหรับ Production
npm run build

# 4. รันโหมด Production Server ในเครื่อง
npm run start
```

เข้าถึงหน้าเว็บได้ที่ `http://localhost:3000`

---

## 🚀 การ Deploy สู่ Vercel (Production Deployment)

โครงสร้างโฟลเดอร์ของ Repository นี้ได้รับการจัดวางไว้ที่ Root Directory (`.`) เพื่อรองรับการ Deploy ผ่าน Vercel โดยตรง:

1. เชื่อมต่อ GitHub Repository **`PhuriphatTyPeZ3r0/App-TikTok-Live-TTS-Dashboard-2026`** เข้ากับ Vercel
2. ตั้งค่า **Framework Preset:** `Next.js`
3. ตั้งค่า **Root Directory:** `./`
4. กรอก Environment Variables ทั้งหมดจากตารางด้านบนใน Vercel Dashboard
5. คลิก **Deploy**

---

## 🔗 Repository ที่เกี่ยวข้อง (Related Repositories)

- **Backend Services Repository:** [PhuriphatTyPeZ3r0/Tool-TikTok-Live-TTS-Bot-2026](https://github.com/PhuriphatTyPeZ3r0/Tool-TikTok-Live-TTS-Bot-2026)
  *(FastAPI, ZeroGPU Client, PyTorch, Colab Fish Speech, WebSocket Ingestion, Render PostgreSQL)*

---

## 📄 ลิขสิทธิ์ (License)

โปรเจกต์นี้เผยแพร่ภายใต้สัญญาอนุญาต [MIT License](LICENSE)
