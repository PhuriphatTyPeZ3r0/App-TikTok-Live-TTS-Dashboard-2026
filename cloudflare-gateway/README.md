# 🛡️ Cloudflare Worker Edge Gateway for TikTok Live TTS Bot

This gateway provides a global edge reverse-proxy with Cloudflare DDoS protection, automatic SSL/TLS encryption, and full Secure WebSocket (WSS) pass-through for the **TikTok Live Text-to-Speech (TTS) Cloud Web Platform**.

---

## 🌟 Key Features
- **Zero-Cost & Zero-Local:** Runs 100% on Cloudflare Workers Free Tier (100,000 requests/day).
- **Global Anycast Edge:** Sub-millisecond routing across 300+ Cloudflare edge locations worldwide.
- **Full Secure WebSockets (WSS):** Transparently proxies both OBS Studio overlay alerts and Streamer Dashboard control channels.
- **OBS Studio & TikTok LIVE Studio Compatibility:** Prevents Mixed Content browser warnings by ensuring all traffic is HTTPS/WSS.
- **Enterprise-Grade Defense:** Automatically inherits Cloudflare's Web Application Firewall (WAF), DDoS protection, and Bot Fight Mode.

---

## 🚀 Quick Deployment Guide

### วิธีที่ 1: Deploy ผ่าน Cloudflare Dashboard Web UI (ทำผ่านหน้าเว็บ 100% ไม่ต้องลงโปรแกรม)

1. เข้าสู่ระบบที่ [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. ในแถบเมนูด้านซ้าย เลือก **Compute (Workers & Pages)** $\rightarrow$ กด **Create** $\rightarrow$ เลือก **Workers**
3. ตั้งชื่อ Worker เช่น `tiktok-live-tts` $\rightarrow$ กด **Deploy**
4. คลิก **Edit Code**
5. คัดลอกโค้ดทั้งหมดจากไฟล์ [`src/worker.js`](src/worker.js) ไปวางทับโค้ดเดิม
6. (ตัวเลือกเสริม) ไปที่แท็บ **Settings $\rightarrow$ Variables and Secrets** $\rightarrow$ เพิ่ม Environment Variable:
   - Variable Name: `BACKEND_URL`
   - Value: URL ของเซิร์ฟเวอร์ Backend คุณ (เช่น `https://<your-username>-tiktok-live-tts.hf.space`)
7. กด **Save and Deploy**
8. **เสร็จสิ้น!** คุณจะได้ URL สาธารณะของ Cloudflare ทันที เช่น:
   ```text
   https://tiktok-live-tts.<your-subdomain>.workers.dev
   ```

---

### วิธีที่ 2: Deploy ผ่าน Wrangler Command-Line Interface (CLI)

หากคุณติดตั้ง Node.js อยู่แล้ว สามารถสั่ง Deploy ผ่านคำสั่งได้ทันที:

```bash
cd cloudflare-gateway
npx wrangler deploy
```

เมื่อเสร็จสิ้น Wrangler จะพิมพ์ URL ที่พร้อมใช้งานออกมาทางเทอร์มินัล.
