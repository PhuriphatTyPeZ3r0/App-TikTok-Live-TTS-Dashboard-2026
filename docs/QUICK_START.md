# ⚡ คู่มือเริ่มสตรีมใน 60 วินาที (Quick Start Guide)
### TikTok Live Text-to-Speech (TTS) Cloud Web Platform (Version 2.0)

> **คู่มือฉบับย่อ 1 หน้าจบ สำหรับสตรีมเมอร์ที่ต้องการนำเสียงอ่านแชทขึ้นหน้าจอไลฟ์สดทันที**  
> ใช้งานได้ทั้งบน **Open Broadcaster Software (OBS) Studio** และ **TikTok LIVE Studio** ไม่ต้องลงโปรแกรม ไม่ต้องลงไดรเวอร์

---

## ⏱️ ขั้นตอน 1-2-3 เริ่มต้นใน 60 วินาที

```mermaid
flowchart LR
    A["1️⃣ เปิดเว็บ & กรอก @ช่อง\n(30 วินาที)"] --> B["2️⃣ แปะ Overlay URL ใน OBS\n(20 วินาที)"] --> C["3️⃣ กดทดสอบ & เริ่มไลฟ์!\n(10 วินาที)"]
```

### 1️⃣ เปิดหน้าเว็บและสร้างเซสชัน (30 วินาที)
1. เปิดหน้าเว็บระบบ **TikTok Live TTS Cloud Web Platform**
2. ระบุ **TikTok Creator Username** ของท่าน เช่น `@fb.jachamch`
3. วาง **Fish Audio Application Programming Interface (API) Key** (รับฟรีได้จาก [fish.audio](https://fish.audio))
4. คลิกปุ่ม **"🚀 เริ่มต้นการสตรีม (Start Live Session)"**
5. คลิกปุ่ม **"📋 คัดลอก OBS Overlay URL"**

---

### 2️⃣ ตั้งค่าในซอฟต์แวร์สตรีมมิ่ง (20 วินาที)

เลือกระหว่าง **Open Broadcaster Software (OBS) Studio** หรือ **TikTok LIVE Studio**:

#### กรณีใช้ Open Broadcaster Software (OBS) Studio:
1. ในกล่อง **Sources** คลิก `+` $\rightarrow$ เลือก **Browser**
2. ตั้งชื่อ `TikTok TTS` แล้วกด OK
3. กำหนดค่าดังนี้:
   * **URL:** วาง Overlay URL ที่คัดลอกมา
   * **Width (ความกว้าง):** `600`
   * **Height (ความสูง):** `250`
   * **Control Audio via OBS:** ติ๊กถูก **`[✓]`**
4. กด **OK** จากนั้นไปที่ **Advanced Audio Properties** $\rightarrow$ ตั้งเป็น **Monitor and Output**

#### กรณีใช้ TikTok LIVE Studio:
1. คลิก **`+ Add Source`** $\rightarrow$ เลือก **`Link / Web Page`**
2. วาง Overlay URL ลงในช่อง Link Address
3. ปรับขนาดความกว้าง `600` และความสูง `250` แล้วจัดวางเลเยอร์ตามต้องการ

---

### 3️⃣ ทดสอบเสียงและเริ่มสตรีมสด (10 วินาที)
1. เปิดหน้า **Streamer Web Dashboard** บนมือถือหรือจอเสริม
2. คลิกปุ่ม **`🔊 ทดสอบเสียง (Test Voice)`** เพื่อตรวจสอบว่าเสียงสังเคราะห์และกล่องแจ้งเตือนทำงานสมบูรณ์
3. เริ่มต้นการถ่ายทอดสด (Go LIVE) บน TikTok ได้ทันที!

---

### 💡 ทางเลือกเสริม: ปลดล็อกเสียงพากย์ยูตะฟรีไม่จำกัดด้วย Google Colab (Zero-Cost Yuta Voice)

หากท่านต้องการใช้เสียงพากย์อนิเมะ **ยูตะ อคคทสึ (Yuta Okkotsu)** แบบคมชัดระดับสตูดิโอและไม่จำกัดโควต้าประจำวัน:
1. อัปโหลดและเปิดไฟล์ `colab/fish_speech_yuta.ipynb` บน [Google Colab (https://colab.research.google.com/)](https://colab.research.google.com/)
2. เลือกประเภทรันไทม์เป็น **T4 Graphics Processing Unit (GPU)** แล้วกด **Runtime $\rightarrow$ Run all** (ปุ่มลัด `Ctrl + F9`)
3. คัดลอกที่อยู่เว็บ **Cloudflare Quick Tunnel URL** ที่ปรากฏในคอนโซล (เช่น `https://random-subdomain.trycloudflare.com`)
4. นำไปวางในช่อง **"Google Colab Tunnel URL"** บน Streamer Web Dashboard แล้วกด **บันทึกการตั้งค่า (Save Settings)**
5. *ระบบมีเกราะป้องกันล่ม (Automatic Failover) หาก Colab หลุดหรือติด Timeout ระบบจะสลับไปใช้ Edge Neural TTS ให้อัตโนมัติทันทีโดยที่สตรีมไม่เงียบหาย*

---

## 📋 สรุปตารางการตั้งค่าสำคัญ (Quick Reference Matrix)

| รายการตั้งค่า | ค่าที่แนะนำ | วัตถุประสงค์และการทำงาน |
| :--- | :---: | :--- |
| **OBS Browser Source Width** | `600` พิกเซล | สัดส่วนความกว้างที่เหมาะสมของ Alert Card |
| **OBS Browser Source Height** | `250` พิกเซล | ป้องกันไม่ให้บังพื้นที่หน้าจอเกมของสตรีมเมอร์ |
| **Control Audio via OBS** | `[✓] ติ๊กถูกเสมอ` | ให้เสียงผ่าน Web Audio Application Programming Interface (Web Audio API) เข้าสู่ไลฟ์ |
| **OBS Monitoring Device** | หูฟัง (Headphones) | ป้องกันเสียงบอทวนลูปเข้าไมโครโฟนของสตรีมเมอร์ |
| **Dashboard Audio Monitor** | `ปิด (Muted by Default)` | ป้องกันเสียงสะท้อน (Echo Loop) หากเปิดแดชบอร์ดบนคอมเครื่องเดียวกับ OBS |
| **Colab Tunnel URL (Option)** | `https://*.trycloudflare.com` | เสียงพากย์ยูตะคุณภาพสูงโควต้าไม่จำกัดผ่าน Google Colab T4 GPU |
| **Fallback Engine** | `th-TH-NiwatNeural` | สลับใช้ Microsoft Edge Neural Text-to-Speech (TTS) อัตโนมัติเมื่อโควต้าหมดหรือเน็ตหลุด |

---

## 🛑 ปุ่มฉุกเฉิน (Emergency Actions)

* **พบข้อความสแปม / คำหยาบคายที่หลุดรอด:**  
  กดปุ่มสีแดง **`🛑 หยุดเสียงทันที / ล้างคิว (Emergency Mute)`** บน Streamer Web Dashboard เพื่อตัดเสียงที่กำลังเล่นและล้างคิวรออ่านทั้งหมดทันที

---

> 📖 สำหรับคู่มือการใช้งานและแก้ปัญหาเชิงลึก โปรดอ่าน [คู่มือฉบับเต็ม (Full User Manual)](USER_MANUAL.md)
