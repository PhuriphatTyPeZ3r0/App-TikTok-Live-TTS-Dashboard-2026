# StreamVox Live: Design Specification & Architecture

**Date:** 2026-11-06  
**Status:** In Review / Ready for Plan  
**Project:** TikTok Live Text-to-Speech (TTS) Bot & Studio  
**Official Brand Name:** **StreamVox Live**  

---

## 1. Intent & The Why

StreamVox Live ถูกออกแบบขึ้นมาเพื่อยกระดับ TikTok Live Text-to-Speech (TTS) Bot ให้ก้าวข้ามจากเครื่องมือทดลองสู่ **แพลตฟอร์มเสียงสังเคราะห์และผู้ช่วยเสียงอัจฉริยะสำหรับการถ่ายทอดสดระดับมืออาชีพ** 

### ปัญหาเดิมที่ต้องแก้ไข (Pain Points)
1. **ชื่อและอัตลักษณ์ยังไม่ชัดเจน:** เดิมใช้ชื่อทั่วไป ("tiktok-live-tts-bot" / "TikFinity Clone") ขาดอัตลักษณ์ที่น่าจดจำและสะท้อนถึงเทคโนโลยีล้ำสมัย
2. **Typography & Iconography ไม่สอดรับกับภาษาไทย:** ฟอนต์ระบบเดิมผสมผสานระหว่าง Kanit และ Roboto ขณะที่ชุดไอคอน Lucide มีข้อจำกัดด้านความหนาแน่นและลูกเล่นที่เหมาะสมกับ UI แบบสตูดิโอ
3. **เสียงเดียวไม่มีตัวเลือก (Single-Voice Bottleneck):** มีเพียงเสียงคุณพิพัฒน์ บุญสิทธิเลิศ (Yuta) เพียงเสียงเดียว ซึ่งแม้จะมีคุณภาพสูง แต่สตรีมเมอร์บางกลุ่มต้องการเสียงสไตล์อื่น (เช่น เสียงผู้หญิงน่ารัก, เสียงดีเจตลก, หรือเสียงทางการ) รวมถึงขาดระบบสำรองเมื่อโควต้า Fish Audio หมด
4. **ความเพี้ยนของเสียงอ่านภาษาไทยบนไลฟ์สตรีม:** แชทของผู้ชมบน TikTok Live เต็มไปด้วยคำแสลง ตัวย่อ ("555", "กุ", "จิง"), คำทับศัพท์ภาษาอังกฤษ ("Live", "Stream", "ROV"), และการพิมพ์ติดกันเป็นพรืด ทำให้โมเดล AI ตัดคำผิดจังหวะหรืออ่านสำเนียงเพี้ยน

---

## 2. Goals, Non-Goals & Anti-Goals

### 🎯 Goals
- **Brand Rebirth:** รีแบรนด์ระบบสู่ **StreamVox Live** ด้วยรูปลักษณ์ Modern Cyberpunk / Streamer Tech พร้อม Palette แดง `#fe2c55` และฟ้า Cyan `#25f4ee`
- **Typography & Icon Polish:** บังคับใช้ Google Font **'Prompt'** ทุกหน้าจอ (Dashboard + OBS Overlay) และแทนที่ไอคอนด้วย **Google Material Symbols (Rounded)**
- **Multi-Voice Architecture:** เพิ่มระบบเลือกโมเดลเสียง 5 โปรไฟล์ (Fish Audio 4 เสียง + Edge-TTS 1 เสียงสำรองความเร็วสูง) พร้อมตัวสลับเสียงในหน้าตั้งค่า
- **PyThaiNLP Precision Pipeline:** ติดตั้ง Pipeline ปรับแต่งคำอ่านภาษาไทยด้วย PyThaiNLP บน FastAPI Backend รองรับการตัดคำ (`newmm`), การแปลงคำแสลง/ตัวย่อ (G2P), และการถอดคำอ่านภาษาอังกฤษ (Loanword Phonetics)

### 🚫 Non-Goals
- ไม่เปลี่ยนโครงสร้างพื้นฐาน WebSocket / ASGI ที่เสถียรอยู่แล้ว
- ไม่บังคับสตรีมเมอร์ฝึกโมเดลเสียงใหม่ด้วยตัวเอง (ใช้โมเดลสำเร็จรูปที่คัดสรรแล้ว)
- ไม่ทำการประมวลผล PyThaiNLP บนเบราว์เซอร์ของ Client เพื่อไม่ให้โหลดเครื่องสตรีมเมอร์

### ⚠️ Anti-Goals (สิ่งที่ห้ามทำ)
- **ห้ามทำให้เสียงแลค (Latency Inflation):** การตัดคำและแปลงคำอ่านด้วย PyThaiNLP ต้องใช้เวลาไม่เกิน 50ms ต่อข้อความ (มี In-Memory Cache รองรับ)
- **ห้ามทิ้งเสียงเดิม:** เสียงคุณพิพัฒน์ บุญสิทธิเลิศ (Yuta) ยังคงเป็น Default Active Voice ของระบบเสมอ

---

## 3. System Architecture & Components

```
                   [ TikTok Live Ingestion ]
                               │
                               ▼
            ┌──────────────────────────────────────┐
            │   StreamVox Live FastAPI Backend    │
            │                                      │
            │  ┌────────────────────────────────┐  │
            │  │  PyThaiNLP Precision Pipeline  │  │
            │  │  1. Slang & G2P Mapping        │  │
            │  │  2. English Loanword Soundex   │  │
            │  │  3. Word Tokenization (newmm)  │  │
            │  └────────────────────────────────┘  │
            │                  │                   │
            │                  ▼                   │
            │  ┌────────────────────────────────┐  │
            │  │      Voice Router Engine       │  │
            │  │  • Fish Audio (Yuta, Hana, DJ) │  │
            │  │  • Edge-TTS (Niwat Neural)     │  │
            │  └────────────────────────────────┘  │
            └──────────────────┬───────────────────┘
                               │
                ┌──────────────┴──────────────┐
                ▼                             ▼
    [ StreamVox Dashboard ]         [ OBS Studio Overlay ]
    • Font: 'Prompt'                • Font: 'Prompt'
    • Icons: Material Symbols       • Real-time Waveform
    • Multi-Voice Selector          • Audio Broadcast Sync
```

---

## 4. Detailed Component Specifications

### 4.1 Brand & Visual Overhaul (StreamVox Live)
- **App Title:** `StreamVox Live - TikTok Live TTS Studio`
- **Design Language:** Modern Cyberpunk / Streamer Tech ผสานโทนสี Dark Slate (`#08090c`, `#0f1117`), TikTok Red (`#fe2c55`) และ Electric Cyan (`#25f4ee`)
- **Typography:**
  - Import Google Fonts `'Prompt'` (Weights: 300, 400, 500, 600, 700) ลงใน `frontend/src/app/layout.tsx`
  - อัปเดต `tailwind.config.js` ให้ `font-sans` มี `'Prompt'` เป็นลำดับแรก
  - ปรับขนาดตัวอักษรและ Line Height ใน `templates/overlay.html` ให้อ่านง่าย คมชัดใน OBS
- **Icons:**
  - Import Google Material Symbols (Rounded) ผ่าน Google Fonts CDN ใน Next.js `<head>`
  - นำไปใช้แทนที่ Lucide Icons ใน Dashboard และ Component หลัก

### 4.2 Multi-Voice Model Architecture
ระบบรองรับ 5 โปรไฟล์เสียงที่คัดเลือกมาอย่างเหมาะสม:
1. **พิพัฒน์ บุญสิทธิเลิศ (Yuta - Primary):** Model ID `9c110ffde8bc42709516395dfbcfb4a2` บน Fish Audio (เสียงมาตรฐานสำหรับพูดคุยทั่วไป)
2. **ฮานะ (Hana Sweet - Anime Female):** โมเดลเสียงสาวหวาน อนิเมะ น่ารัก สดใส (จับคู่กับ `th-TH-PremwadeeNeural` บน Edge-TTS เมื่อต้องการความเร็วสูงหรือสำรองฟรี)
3. **ดีเจโจ๊กเกอร์ (DJ Hype - Comedy):** โมเดลเสียงกระตือรือร้น เฮฮา เหมาะกับการอ่านของขวัญ
4. **ผู้ประกาศข่าว ชาย (News Anchor Pro):** โมเดลเสียงทุ้ม ชัด สุภาพ
5. **นิวัฒน์ นิวรัล (Niwat Neural - Fallback):** Microsoft Edge-TTS (`th-TH-NiwatNeural`) ฟรี ไม่จำกัดโควต้า ค่าความหน่วงต่ำ (<1s)

**Data Contract & State Synchronization:**
- เพิ่ม `selected_voice_id` บน `SessionInstance` ใน Backend เพื่อให้แชทที่ถูก Ingest มาจาก TikTok ทำการสังเคราะห์เสียงด้วยโปรไฟล์ที่สตรีมเมอร์เลือกเสมอ
- หน้า Dashboard ส่งคำสั่งอัปเดตผ่าน WebSocket: `{ "action": "set_voice", "voice_id": "yuta" }` และ REST API `/api/session/{id}/voice`
- บันทึก `selectedVoiceId` ใน `localStorage` ของ Dashboard เพื่อจดจำค่าอัตโนมัติ

### 4.3 PyThaiNLP Text Normalization Pipeline
สร้างโมดูล `src/thai_normalizer.py` โดยมีขั้นตอนการแปลง:
1. **ตำแหน่งการประมวลผล (Pipeline Scope):**
   - ประมวลผลภายใน `TTSEngine.synthesize()` ก่อนส่งเข้า API สังเคราะห์เสียง
   - **หน้าจอ UI, คิว และ OBS Overlay จะยังคงแสดงข้อความต้นฉบับของผู้ใช้ (เช่น "555 Live สนุกมาก")** เพื่อให้สตรีมเมอร์และผู้ชมเห็นแชทจริง แต่เสียงที่พูดออกมาจะเป็นเสียงที่ถอดคำอ่านถูกต้อง ("ห้าห้าห้า ไลฟ์ สนุกมาก")
2. **Slang & Abbreviations Normalization:**
   - แปลงเลขขำ: `r'([5]+)'` -> `"ห้า"` ซ้ำตามจำนวนหรือยุบให้อ่านเป็นธรรมชาติ
   - แปลงคำย่อ: `กุ` -> `กู`, `มุง` -> `มึง`, `จิง` -> `จริง`, `คับ/งับ` -> `ครับ`, `ป่าว/ป้ะ` -> `หรือเปล่า`
3. **English Loanword Transliteration:**
   - พจนานุกรมคำยอดนิยมในไลฟ์: `Live` -> `ไลฟ์`, `Stream` -> `สตรีม`, `Game` -> `เกม`, `PK` -> `พีเค`, `Gift` -> `กิฟต์`, `ROV` -> `อาร์โอวี`
4. **Word Tokenization & Pacing Adjustment:**
   - ใช้ `pythainlp.tokenize.word_tokenize(text, engine='newmm')` เพื่อตัดคำ
   - แทรกเว้นวรรคบางๆ ในจุดที่เหมาะสม เพื่อให้โมเดล AI อ่านเป็นจังหวะจะโคน ไม่รัวหรือกลืนเสียง
5. **Performance & Caching:**
   - ใช้ `@functools.lru_cache(maxsize=2048)` สำหรับประโยคที่พบบ่อย ลดเวลาประมวลผลเหลือ < 1ms

---

## 5. Verification & Test Strategy
- **Unit Tests (`pytest`):**
  - เทสต์ความแม่นยำของ `thai_normalizer.py` ทดสอบคำแสลง, ตัวเลข, คำทับศัพท์ภาษาอังกฤษ
  - ทดสอบ Voice Router สลับ Engine ระหว่าง Fish Audio และ Edge-TTS
- **Contract & Build Tests:**
  - `npx tsc --noEmit` และ `npm run build` ตรวจสอบ Google Font Prompt และ Material Symbols
  - ทดสอบการกดเลือกเสียงใน Dashboard และตรวจสอบเสียงตอบรับ

---

## 6. Implementation Deliverables
1. `src/thai_normalizer.py` (PyThaiNLP Engine & Dictionary)
2. `src/tts_engine.py` (Multi-Voice Switcher & Profile Registry)
3. `src/web_server.py` (Update endpoints with voice routing & PyThaiNLP preprocessing)
4. `frontend/src/types/tikfinity.ts` (Add voice selection schema)
5. `frontend/src/components/VoiceSelector.tsx` (New Multi-Voice Selection Component)
6. `frontend/src/app/layout.tsx` & `page.tsx` (Apply Prompt Font & Material Symbols)
7. `templates/overlay.html` (Apply Prompt Font & Material Symbols for OBS)
