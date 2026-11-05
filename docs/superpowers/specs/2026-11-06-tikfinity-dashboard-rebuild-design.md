# Design Document: TikFinity-Style TTS Dashboard Rebuild & Cleansing

**Document Version:** 1.1.0 (Post-Builder Check & Confirmed)  
**Date:** 2026-11-06  
**Author:** Antigravity AI Engineering Team (Senior Software Engineer & User)  
**Status:** Approved for Implementation Planning  
**Project:** TikTok Live Text-to-Speech (TTS) Bot (`tiktok-live-tts-bot`)  

---

## 1. Intent & Context (ที่มาและวัตถุประสงค์)

ระบบแดชบอร์ดควบคุมเสียงพากย์สดบน TikTok Live ในปัจจุบันมีองค์ประกอบที่ซับซ้อนเกินความจำเป็นและเชื่อมโยงกับสถาปัตยกรรมเดิม (เช่น การ์ดตรวจสอบสถานะ Google Colab GPU, การกรอก Session Token ด้วยตนเอง, และหน้าจอแสดง Log ทางเทคนิคที่รกสายตาสตรีมเมอร์)

เนื่องจากระบบสังเคราะห์เสียงหลักได้รับการยกระดับสู่ **Fish Audio Cloud API 24/7** โดยใช้เสียงจำลองของ **คุณพิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert / Yuta)** รหัส `9c110ffde8bc42709516395dfbcfb4a2` ภายใต้โควตา Free Developer Tier (`s2.1-pro-free`) อย่างสมบูรณ์ จึงต้องการสร้างและปรับโครงสร้าง Dashboard ใหม่ทั้งหมด (Rebuild) ให้มีฟังก์ชันระดับสตรีมเมอร์มืออาชีพสไตล์ **TikFinity TTS Console** (`https://tikfinity.zerody.one/tiktok/tts`) พร้อมทั้งกำจัดส่วนประกอบที่ไม่จำเป็น (Cleansing) ออกไปอย่างหมดจด

---

## 2. Goals, Non-Goals & Anti-Goals

### 2.1 Goals (เป้าหมายหลัก)
1. **TikFinity-Style Tabbed Configuration (Left Panel):**
   - **Chat TTS:** สวิตช์เปิด/ปิด, สวิตช์อ่านชื่อผู้ส่ง (`{user} บอกว่า:`), ระบบกรองตัวอักษรลากยาวและตัด URL ลิงก์ (Anti-Spam), ตัวปรับจำกัดความยาวข้อความ (Max Chars Slider: 30-250 ตัวอักษร), และคูลดาวน์รายคน (User Cooldown).
   - **Gift Alerts & TTS:** สวิตช์เปิด/ปิด, ระบบ **Priority Queue** (แทรกคิวของขวัญแซง Chat ปกติเสมอ), เกณฑ์ขั้นต่ำของเหรียญ (Minimum Coin Threshold), และกล่องตั้งค่า Template ข้อความขอบคุณ (เช่น `"ขอบคุณ {user} ที่ส่ง {amount}x {gift} ให้ยูตะนะครับ!"`).
   - **Safety & Filters:** กล่องระบุคำต้องห้าม (Banned Words) และรายชื่อผู้ใช้ที่ถูกบล็อก (Blacklist Users).
   - **OBS & Output:** ลิงก์ OBS Browser Source Overlay URL พร้อมปุ่ม 1-Click Copy และสวิตช์เปิด/ปิดเสียงเล่นบนแดชบอร์ดโดยตรง (In-Dashboard Audio) เพื่อป้องกันเสียงสะท้อน (Echo Prevention).
2. **Live Queue & Real-time Console (Right Panel):**
   - **Now Speaking Card:** แสดงข้อความที่กำลังเล่นสด, สัญลักษณ์ระบุประเภท (Chat vs Gift Priority), Waveform Visualizer เคลื่อนไหว, และปุ่มควบคุมด่วน (⏭️ Skip Current, ⏸️ Pause, 🗑️ Clear Queue).
   - **Live Queue Feed:** แสดงรายการคิวที่กำลังรออ่าน พร้อมปุ่มกากบาทลบทีละรายการ.
3. **100% Cleansing of Legacy Artifacts:**
   - นำการ์ดสถานะ Google Colab GPU ออกทั้งหมด.
   - ตัดขั้นตอนการคัดลอกหรือกรอก Token ด้วยตนเอง ยุบรวมเป็นการเชื่อมต่ออัตโนมัติ (1-Click Auto-Connect).
   - ตัด Debug Logs เชิงเทคนิคและแถบ Category Chips ที่ซ้ำซ้อนออก.
4. **Hybrid Master Controller Architecture:**
   - แดชบอร์ดทำหน้าที่เป็น Master Controller จัดการคิวและการกรอง และส่งสัญญาณประสานงาน (Sync) ไปยัง Open Broadcaster Software (OBS) Studio Overlay ผ่าน WebSocket แบบ Real-time.
   - เมื่อกดปุ่ม Skip/Pause/Clear บนแดชบอร์ด เสียงใน OBS Overlay จะหยุดพร้อมกันทันที.
   - บันทึกการตั้งค่าทั้งหมดลงใน `localStorage` ของเบราว์เซอร์ เพื่อความต่อเนื่องและคงสถานะเดิมเมื่อเปิดใหม่ (Zero Cost Persistence).

### 2.2 Non-Goals (สิ่งที่ไม่อยู่ในขอบเขตของงานนี้)
- การสร้างโมเดลเสียงพากย์ใหม่เพิ่มเติม (ใช้โมเดลเสียงคุณพิพัฒน์ บุญสิทธิเลิศ เป็นแกนหลัก).
- การทำระบบฐานข้อมูลภายนอก (Database-backed auth) สำหรับเก็บการตั้งค่า.
- การทำระบบแปลภาษาคอมเมนต์แบบ Real-time (คงภาษาต้นฉบับของผู้พิมพ์).

### 2.3 Anti-Goals (สิ่งที่ไม่พึงประสงค์อย่างเด็ดขาด)
- **Zero Cost Violation:** ห้ามใช้บริการหรือฟีเจอร์ที่ก่อให้เกิดค่าใช้จ่ายคลาวด์เพิ่มเติม.
- **Audio Overlap / Stutter / Double-Audio Echo:** ห้ามให้เสียง Chat ปกติและเสียง Gift ดังทับซ้อนกัน และห้ามเกิดเสียงสะท้อนระหว่างแดชบอร์ดกับ OBS.
- **Wasted API Quota:** ห้ามทำการ Eager Synthesis ข้อความทั้งหมดในคิวก่อนเวลาอันควร หากสตรีมเมอร์กดลบข้อความในคิวทิ้ง ต้องไม่เสียโควตาสังเคราะห์เสียง Fish Audio.

---

## 3. Architecture & Confirmed Technical Decisions

### 3.1 Orchestration & Authority Model
- **Hybrid Controller:** แดชบอร์ด Next.js เป็นตัวคุมคิวอัจฉริยะ (Smart Queue Orchestrator):
  1. รับ Real-time Events (`EVENT_CHAT`, `EVENT_GIFT`) จาก Backend WebSocket (`/ws/dashboard/{session_id}`)
  2. กรองคำหยาบ (Banned Words), Anti-Spam (ตัดตัวอักษรลากยาวและ URL), คูลดาวน์รายคน, และเกณฑ์เหรียญของขวัญ
  3. จัดลำดับเข้าสู่ **Priority Queue** โดยข้อความ Gift ได้รับสิทธิ์ขึ้นหัวแถวก่อน Chat
  4. ทำการ Just-in-Time (JIT) Synthesis เมื่อข้อความถึงคิวอ่าน เพื่อประหยัดโควตา Fish Audio และรองรับการกดลบข้อความทิ้งโดยไม่สูญเสียเครดิต
  5. ควบคุมการเล่นเสียงทั้งในแดชบอร์ด และส่งสัญญาณคำสั่ง (`CONTROL_PLAY`, `CONTROL_SKIP`, `CONTROL_PAUSE`, `CONTROL_CLEAR`) ไปยัง Backend เพื่อกระจายต่อให้ `/ws/overlay/{session_id}` (OBS Browser Source)

### 3.2 OBS Synchronization & Echo Prevention
- ในแท็บ **OBS & Output** จะมีตัวเลือก:
  - `In-Dashboard Audio Toggle`: เปิดเมื่อต้องการฟังเสียงในเครื่องสตรีมเมอร์ หรือปิดหากใช้ OBS Desktop Audio เพื่อป้องกันเสียงสะท้อน (Echo Prevention)
  - `OBS Overlay Browser Source URL`: `https://tiktok-live-tts-bot.onrender.com/overlay/{session_id}?volume=1.0`
- เมื่อสตรีมเมอร์กดปุ่ม **⏭️ Skip Current** หรือ **🗑️ Clear Queue** แดชบอร์ดจะส่ง WebSocket Action:
  ```json
  { "action": "control_skip", "session_id": "active" }
  ```
  Backend จะส่งต่อคำสั่ง `STOP_AUDIO` ไปยัง OBS Overlay ทันที ทำให้เสียงตัดจบพร้อมกันอย่างแม่นยำ

### 3.3 Settings Persistence
- ใช้ React Hook / Zustand ร่วมกับ `localStorage`:
  - `tikfinity_tts_settings_v1`: บันทึกค่าเปิด/ปิด, ค่า Slider ความยาวข้อความ, Template ขอบคุณ, รายการคำต้องห้าม, และบัญชีผู้ใช้ที่ถูกบล็อก
  - รีโหลดหน้าเว็บหรือเปิดในวันถัดไป การตั้งค่าทั้งหมดจะถูกโหลดกลับมาทันทีโดยอัตโนมัติ

---

## 4. Component Tree & Structure

```
frontend/src/app/page.tsx                        # Master Streamer Console Container
├── components/Navbar.tsx                       # Brand logo, Live Status, Engine badge, Master TTS toggle
├── components/TikFinitySettings.tsx            # Left Panel (Tab-based Settings)
│   ├── TabChatSettings.tsx                    # Chat TTS toggles, Max Chars slider, Anti-spam
│   ├── TabGiftSettings.tsx                    # Gift TTS toggle, Priority Queue, Coin Threshold, Template
│   ├── TabSafetySettings.tsx                  # Banned words textarea, Blacklist users
│   └── TabObsSettings.tsx                     # Overlay URL box (1-Click Copy), In-Dashboard Audio switch
└── components/LiveQueueConsole.tsx             # Right Panel (Real-time Live Feed & Player)
    ├── NowSpeakingCard.tsx                    # Current speaker info, Speech bubble, Waveform visualizer, Skip/Pause/Clear
    └── QueueFeed.tsx                          # Priority Gift & Chat queue list with individual delete buttons
```

---

## 5. Implementation Roadmap (สิ่งที่ส่งมอบให้ผู้ลงมือทำ)

1. **Frontend Refactoring & Component Rebuild:**
   - สร้าง Component แท็บการตั้งค่าสไตล์ TikFinity: `TikFinitySettings.tsx`, `TabChatSettings.tsx`, `TabGiftSettings.tsx`, `TabSafetySettings.tsx`, `TabObsSettings.tsx`
   - ปรับปรุง `NowSpeakingCard.tsx` และ `QueueFeed.tsx` ให้เป็นสไตล์ Dark Glassmorphism ตาม Interactive Mockup
   - ปรับปรุง `frontend/src/app/page.tsx` ให้ใช้ Layout 2 คอลัมน์ (Settings ซ้าย, Live Queue ขวา)
   - ปลด Components เดิมออก (`ColabStatusCard.tsx`, `CategoryChips.tsx`)
2. **Smart Priority Queue & Audio Engine:**
   - พัฒนา Queue Manager ในฝั่ง Frontend รองรับ Priority Gift แทรกคิวแซง Chat
   - ปรับปรุง Hook `useDashboardSocket` ให้รองรับคำสั่ง `control_skip`, `control_pause`, `control_clear`
   - รองรับ Text Normalization (ตัดตัวอักษรลากยาว เช่น "สวัสดีค้าบบบบบ" -> "สวัสดีครับ", ลบ URL)
3. **Backend Overlay Synchronization:**
   - ตรวจสอบ `src/web_server.py` ให้ Broadcast ข้อความควบคุม (`control_skip`, `control_clear`) ไปยัง Overlay WebSocket เพื่อให้ OBS หยุดเสียงพร้อมกัน
4. **Build, Test & Deployment:**
   - ตรวจสอบ `npm run build` ผ่าน 100% ไม่มี TypeScript หรือ Tailwind Lint Errors
   - Deploy ขึ้น Vercel และ Render Production พร้อมทดสอบสด
