# 🎨 Workspace Directives: UI/UX Design System & Architectural Standard

**Scope:** ข้อบังคับระดับ Workspace สำหรับการพัฒนาส่วนติดต่อผู้ใช้งาน (User Interface: UI) และประสบการณ์ผู้ใช้ (User Experience: UX) ในโครงการวิจัยและพัฒนาระบบสตรีมมิ่งและแดชบอร์ดสังเคราะห์เสียงอัจฉริยะ (Capstone Project 1321205) สาขาวิชาวิศวกรรมคอมพิวเตอร์และปัญญาประดิษฐ์ (Computer Engineering and Artificial Intelligence) สถาบันการจัดการปัญญาภิวัฒน์ (Panyapiwat Institute of Management: PIM)

---

## 📌 Directives & Mandatory Rules (ข้อบังคับเด็ดขาด)

ตัวแทนปัญญาประดิษฐ์ (AI Agents) และวิศวกรซอฟต์แวร์ทุกคน **ต้องปฏิบัติตามกฎเหล่านี้อย่างเคร่งครัด 100% ทุกครั้งที่มีการสร้าง แก้ไข หรือปรับแต่งไฟล์โค้ด UI/UX** ใน Workspace นี้ โดยไม่มีข้อยกเว้น

---

### 1. Mandatory Technical Terminology & Acronyms (ข้อบังคับการระบุชื่อเต็มควบคู่ตัวย่อ)
ทุกครั้งที่มีการกล่าวถึงคำศัพท์เชิงเทคนิคด้านวิศวกรรมคอมพิวเตอร์ การออกแบบส่วนติดต่อผู้ใช้งาน และมาตรฐานซอฟต์แวร์ในเอกสาร หรือคอมเมนต์อธิบายสถาปัตยกรรม **ต้องระบุชื่อเต็มภาษาอังกฤษควบคู่กับตัวย่อเสมอ**:
- ส่วนติดต่อผู้ใช้งาน (User Interface: UI)
- ประสบการณ์ผู้ใช้ (User Experience: UX)
- ระบบการออกแบบ (Design System: DS)
- แนวทางปฏิบัติมาตรฐาน (Standard Operating Procedure: SOP)
- แนวทางการเข้าถึงเนื้อหาเว็บ (Web Content Accessibility Guidelines: WCAG)
- แคสเคดดิงสไตล์ชีตส์ (Cascading Style Sheets: CSS)
- แอปพลิเคชันหน้าเดียว (Single-Page Application: SPA)
- การพัฒนาโดยขับเคลื่อนด้วยคอมโพเนนต์ (Component-Driven Development: CDD)
- โอเพนบรอดแคสเตอร์ซอฟต์แวร์ (Open Broadcaster Software: OBS)
- ระบบสังเคราะห์เสียงพูดจากข้อความ (Text-to-Speech: TTS)
- ส่วนต่อประสานโปรแกรมประยุกต์ (Application Programming Interface: API)
- โมเดลภาษาขนาดใหญ่ (Large Language Model: LLM)

---

### 2. Zero Hardcoded Colors Mandate (กฎเหล็กห้ามใส่รหัสสีคงที่เด็ดขาด)
1. **ข้อห้ามเด็ดขาด:**
   - ห้ามใส่รหัสสีแบบ Hex Code (เช่น `#ffffff`, `#000000`, `#2563eb`, `#1e293b`) ลงในโค้ดคอมโพเนนต์ มาร์กอัป TSX/JSX หรือสไตล์ชีตโดยตรง
   - ห้ามใส่คลาสสีคงที่ของ Tailwind CSS (เช่น `bg-blue-500`, `text-slate-900`, `border-gray-200`, `bg-zinc-800`) โดยเด็ดขาด
2. **ข้อบังคับปฏิบัติ:**
   - ต้องใช้ **Semantic Design Tokens** ที่แมปมาจากตัวแปร HSL CSS เท่านั้น:
     - พื้นหลังหลัก: `bg-background` คู่กับสีข้อความ `text-foreground`
     - พื้นหลังการ์ดและพาเนล: `bg-card` คู่กับสีข้อความ `text-card-foreground`
     - พื้นหลังหน้าต่างผุดและเมนูลอย: `bg-popover` คู่กับสีข้อความ `text-popover-foreground`
     - แอ็กชันหลักและปุ่มยืนยัน: `bg-primary` คู่กับสีข้อความ `text-primary-foreground`
     - แอ็กชันรองและปุ่มควบคุมทั่วไป: `bg-secondary` คู่กับสีข้อความ `text-secondary-foreground`
     - พื้นที่ลดความสำคัญ/คำอธิบายรอง: `bg-muted` คู่กับสีข้อความ `text-muted-foreground`
     - ไฮไลต์การเลือกหรือ Hover: `bg-accent` คู่กับสีข้อความ `text-accent-foreground`
     - ข้อผิดพลาดและการกระทำอันตราย: `bg-destructive` คู่กับสีข้อความ `text-destructive-foreground`
     - เส้นขอบและฟอร์ม: `border-border`, `border-input`
     - วงแหวนโฟกัสสำหรับการเข้าถึง: `ring-ring` พร้อม `ring-offset-background`
     - ความโค้งมนมาตรฐาน: `rounded-lg` หรือ `rounded-md` อิงตัวแปร `--radius`
3. **การกำหนดความโปร่งแสง (Opacity Channel):**
   - ใช้วากยสัมพันธ์ HSL Alpha: เช่น `hsl(var(--background) / 0.8)` หรือ Tailwind class `bg-background/80`

---

### 3. Layout Centering & Modal Dialog Mandate (กฎการจัดกึ่งกลางหน้าต่างแบบผุด 100%)
1. **ข้อบังคับโครงสร้างไดอะล็อก:**
   - หน้าต่างแบบผุด (Modal Dialog), ป็อปอัป (Pop-up), หรือ Alert Dialog ทุกตัว **ต้องถูกจัดวางไว้ที่กึ่งกลางหน้าจอ 100% เสมอ**
   - ใช้เทคนิค Grid Centering ร่วมกับ Overlay:
     ```tsx
     <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4">
       <div 
         role="dialog" 
         aria-modal="true" 
         className="w-full max-w-lg bg-card text-card-foreground rounded-lg border border-border shadow-lg p-6 max-h-[90dvh] overflow-y-auto"
       >
         {/* Dialog Content */}
       </div>
     </div>
     ```
2. **การป้องกันข้อผิดพลาดการแสดงผล:**
   - ต้องไม่ตกขอบหน้าจอ (No Off-Screen Clipping) ไม่เลื่อนหายไปบนหน้าจอขนาดเล็ก หรือหน้าจอสมาร์ตโฟน
   - ต้องมีฉากหลังเบลอ (Backdrop Blur: `backdrop-blur-sm` หรือ `backdrop-blur-md`) เสมอ
   - ต้องใช้ระบบกักกันโฟกัส (Focus Trapping) และรองรับการปิดผ่านปุ่ม `Escape` ผ่าน Radix UI Headless Primitives

---

### 4. Responsive Navigation Mandate (กฎแถบนำทางแบบปรับตัวตามขนาดหน้าจอ)
1. **บนคอมพิวเตอร์ตั้งโต๊ะ (Desktop >= 1024px):**
   - ต้องแสดงผลเป็นแถบเมนูด้านข้างแบบถาวร (Persistent Collapsible Sidebar) ขนาดกว้าง `w-64` หรือ `w-72`
   - ต้องมีฟังก์ชันย่อขนาดเป็นแถบไอคอน (Mini/Icon Sidebar: `w-16`) เพื่อเพิ่มพื้นที่การทำงาน
   - พื้นที่ทำงานหลักต้องกำหนดขอบเขตสูงสุด เช่น `max-w-7xl` หรือ `max-w-[1600px]` พร้อมจัดกึ่งกลาง `mx-auto` ป้องกันเนื้อหายืดบนหน้าจอ Ultra-Wide
2. **บนแท็บเล็ตและอุปกรณ์พกพา (Mobile & Tablet < 1024px):**
   - แถบเมนูต้องถูกแปลงเป็น Off-canvas Drawer หรือ Bottom Sheet ที่เลื่อนเปิด-ปิดได้อย่างราบรื่น
   - ต้องมี Backdrop Overlay เพื่อแยกชั้นสายตาและป้องกันไม่ให้เมนูบดบังพื้นที่ทำงานหลักถาวร

---

### 5. Mobile Ergonomics & Viewport Rules (กฎการยศาสตร์และขนาดหน้าจออุปกรณ์พกพา)
1. **ความสูงเต็มหน้าจอแบบไดนามิก (Dynamic Viewport Height):**
   - **ห้ามใช้ `100vh` ใน Layout เต็มหน้าจอบนอุปกรณ์พกพาเด็ดขาด** เพื่อป้องกันแถบ URL และแถบเครื่องมือของ Safari / Chrome ทับซ้อนเนื้อหา
   - **ต้องใช้ `100dvh` หรือ `h-[100dvh]` เสมอ**
2. **การป้องกันการเลื่อนแนวนอน (Zero Horizontal Overflow):**
   - โครงสร้างคอนเทนเนอร์ระดับบนสุดต้องระบุ `w-full max-w-full overflow-x-hidden` เพื่อป้องกันปัญหาการส่ายหรือเลื่อนแนวนอนโดยไม่ตั้งใจ
3. **พื้นที่ปลอดภัยของฮาร์ดแวร์ (Hardware Safe-Area Insets):**
   - ต้องเผื่อระยะขอบสำหรับรอยบาก (Notch), Dynamic Island, และแถบควบคุมระบบปฏิบัติการ:
     ```css
     padding-top: env(safe-area-inset-top);
     padding-bottom: env(safe-area-inset-bottom);
     padding-left: env(safe-area-inset-left);
     padding-right: env(safe-area-inset-right);
     ```
   - บน Android ต้องเว้นระยะด้านล่างอย่างน้อย `pb-6` หรือใช้ `env(safe-area-inset-bottom)` เพื่อป้องกัน System Gesture Navigation Bar ทับซ้อนปุ่มคำสั่ง
4. **ขนาดพื้นที่สัมผัสขั้นต่ำ (Minimum Touch Targets):**
   - ทุกปุ่มคำสั่ง ไอคอนคลิกได้ และอินพุตบน Mobile ต้องมีพื้นที่สัมผัสจริงไม่ต่ำกว่า **`44x44 CSS Pixels`** (แนะนำ `48x48px` สำหรับมาตรฐาน Android Material)

---

### 6. OBS Studio Browser Source Standard (มาตรฐานแหล่งสัญญาณเบราว์เซอร์ OBS Studio)
เมื่อคอมโพเนนต์หรือหน้าจอถูกเรียกใช้งานในฐานะ Overlay สำหรับโปรแกรม Open Broadcaster Software (OBS) Studio:
1. **ความโปร่งใสสมบูรณ์แบบ (Alpha Transparency `#00000000`):**
   - คลาส `.obs-overlay` ต้องกำหนดพื้นหลังเป็นโปร่งใส 100%:
     ```css
     body.obs-overlay,
     html.obs-overlay {
       background-color: transparent !important;
       background-image: none !important;
       overflow: hidden !important;
     }
     ```
2. **การเร่งความเร็วด้วยฮาร์ดแวร์ 60 FPS (Hardware Acceleration):**
   - คอมโพเนนต์แอนิเมชัน การแจ้งเตือน (Alert Overlay) และ Visualizer ต้องระบุคลาส `transform-gpu will-change-transform` เพื่อบังคับให้ Chromium Embedded Framework (CEF) เรนเดอร์ผ่านหน่วยประมวลผลกราฟิก (GPU) อย่างลื่นไหล
3. **การขจัดแถบเลื่อน (Scrollbar Elimination):**
   - ต้องซ่อน Scrollbars ทั้งหมดบน OBS Overlay:
     ```css
     .obs-overlay::-webkit-scrollbar,
     .obs-overlay *::-webkit-scrollbar {
       display: none !important;
     }
     ```
4. **ความละเอียดการแสดงผลคู่ขนาน:**
   - รองรับโหมดแนวนอน (Landscape): `1920x1080` (16:9) สำหรับการถ่ายทอดสดหลัก
   - รองรับโหมดแนวตั้ง (Vertical): `1080x1920` (9:16) สำหรับ TikTok Live / YouTube Shorts

---

### 7. Master Voice Actor Attribution & TTS Controls (การเชื่อมโยงระบบเสียงต้นแบบ คุณพิพัฒน์ บุญสิทธิเลิศ)
ในส่วนของการพัฒนาส่วนติดต่อผู้ใช้งานและเครื่องมือควบคุมการสังเคราะห์เสียงพูด (TTS Audio Controls):
1. **การแสดงป้ายกำกับอัตลักษณ์เสียงอย่างเป็นทางการ (Official Attribution Badge):**
   - ทุกการ์ดหรือแผงควบคุมที่มีการเลือกใช้งานเสียงหลัก ต้องแสดงป้ายกำกับ:
     - ภาษาไทย: `เสียงพากย์หลัก: คุณพิพัฒน์ บุญสิทธิเลิศ`
     - ภาษาอังกฤษ: `Master Voice: Phiphat Boonsitthilert (Official Profile)`
2. **ตัวชี้วัดคลื่นเสียงและความดัง (Visual Waveform & VU Peak Meter):**
   - ต้องแสดงผลกราฟิกคลื่นเสียง (Waveform Visualizer) และตัววัดสัญญาณเสียง (Peak Meter) แบบเรียลไทม์ขณะเล่นตัวอย่างเสียง
3. **สไลเดอร์ปรับแต่งพารามิเตอร์เสียง (Accessible Parameter Sliders):**
   - Speaking Rate: `0.5x` ถึง `2.0x` (ค่ามาตรฐาน `1.0x`)
   - Pitch Frequency: `-5.0` ถึง `+5.0` เซมิโทน
   - Emotion Inflection Presets: ทางการ (Formal), ตื่นเต้น/ภาพยนตร์ (Excited/Cinematic), สดใส/สนทนาทั่วไป (Casual Live)

---

### 8. Accessibility & Quality Gates (มาตรฐานการเข้าถึงตาม WCAG 2.1 & 2.2 Level AA)
1. **อัตราส่วนความคมชัดของสี (Color Contrast Ratio):**
   - ข้อความปกติ (Normal Text): ต้องผ่านเกณฑ์ขั้นต่ำ **4.5:1**
   - ข้อความขนาดใหญ่ (Large Text >= 18pt หรือ 14pt bold): ต้องผ่านเกณฑ์ขั้นต่ำ **3.0:1**
   - คอนโทรลเลอร์และไอคอนสถานะ (UI Components & State Indicators): ต้องผ่านเกณฑ์ขั้นต่ำ **3.0:1**
2. **การนำทางด้วยคีย์บอร์ดอย่างสมบูรณ์ (Complete Keyboard Navigation):**
   - ทุกอินเทอร์แอ็กทีฟคอมโพเนนต์ต้องโฟกัสได้ด้วยปุ่ม `Tab` และเปิดใช้งานได้ด้วยปุ่ม `Enter` หรือ `Space`
   - เมื่อโฟกัส ต้องแสดงผลวงแหวนโฟกัสชัดเจนเสมอ: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background`
   - ห้ามใส่ `outline-none` ลอยๆ โดยไม่มี Focus Ring ทดแทน
3. **การจัดการสถานะความไม่พร้อมเพรียง (Tri-State Asynchronous Pattern):**
   - สถานะกำลังโหลด: ต้องแสดงคอมโพเนนต์ `<Skeleton />` ที่มีขนาดตรงกับข้อมูลจริง
   - สถานะเกิดข้อผิดพลาด: แสดงกล่องข้อความแจ้งเตือนที่ใช้สี `text-destructive` / `border-destructive/50` พร้อมปุ่ม "ลองใหม่อีกครั้ง (Retry)"
   - สถานะข้อมูลว่างเปล่า (Empty State): แสดงไอคอน ข้อความชี้แจง และปุ่มกระตุ้นการดำเนินการ (CTA)

---

### 9. Component Architecture & Helper Utilities (สถาปัตยกรรมคอมโพเนนต์)
1. **การรวมคลาสด้วย `cn()` Utility:**
   - ทุกคอมโพเนนต์ต้องใช้ฟังก์ชันยูทิลิตี `cn()` ที่ผสาน `clsx` และ `tailwind-merge` เพื่อความปลอดภัยในการสืบทอดสไตล์:
     ```ts
     import { clsx, type ClassValue } from "clsx";
     import { twMerge } from "tailwind-merge";

     export function cn(...inputs: ClassValue[]) {
       return twMerge(clsx(inputs));
     }
     ```
2. **การใช้ Radix UI Headless Primitives & Slot Pattern:**
   - แยกตรรกะ Accessibility ออกจากมาร์กอัปด้วย Radix UI
   - ใช้ `Slot` จาก `@radix-ui/react-slot` เพื่อสนับสนุนการแปลงแท็ก HTML โดยไม่สูญเสียการจัดแต่งสไตล์ (Polymorphic Component)

---

### 10. Five-Step SOP Workflow for AI Agents (กระบวนการปฏิบัติงาน 5 ขั้นตอน)
เมื่อได้รับมอบหมายให้พัฒนาหรือแก้ไขคอมโพเนนต์ UI/UX:
1. **Step A (Ideation & Structure):** วางสัดส่วนตาม 8-Point Spatial Grid (Godly) และแบบแผนเลย์เอาต์ที่เป็นมิตรต่อผู้ใช้ (Mobbin)
2. **Step B (Token Verification):** ตรวจสอบว่าคลาสสีทั้งหมดเป็น Semantic Tokens ที่แมปจาก HSL CSS Variables (Coolors) ไม่มีการใส่รหัสสีแบบฮาร์ดโค้ด
3. **Step C (Component Engineering):** เขียนคอมโพเนนต์ React TypeScript ร่วมกับ Tailwind CSS และฟังก์ชัน `cn()` โดยระบุ ARIA Attributes ให้ครบถ้วน (21st.dev)
4. **Step D (Primitive Composition):** ผสาน Headless Primitives เช่น Dialog, DropdownMenu, Tooltip จาก Radix UI / shadcn/ui
5. **Step E (Quality Gates Audit):** ทดสอบบน 5 สภาพแวดล้อม (Desktop, Tablet, iPhone, Samsung Android, OBS Studio) และตรวจสอบ Contrast Ratio ตามเกณฑ์ WCAG 2.1 AA

---

## 📚 Academic References (เอกสารอ้างอิงทางวิชาการ พ.ศ. 2567–2569 / 2024–2026)

1. **W3C (World Wide Web Consortium). (2024).** *Web Content Accessibility Guidelines (WCAG) 2.2*. W3C Recommendation. [https://www.w3.org/TR/WCAG22/](https://www.w3.org/TR/WCAG22/)
2. **McGrane, J. (2025).** *Optimising Design Tokens for Accessibility in UI Design*. Master's Thesis, Faculty of Film, Art and Creative Technologies, Institute of Art, Design & Technology (IADT Cartlann), Dublin, Ireland. [https://iadt.ie/research/cartlann/](https://iadt.ie/research/cartlann/)
3. **de Oliveira, M. G., Marques, A. B., & Rivero, L. (2024).** Evaluating Accessibility in Component-Based Software Engineering: An Empirical Study on Modern Design Systems. *IEEE Software*, 41(3), 45-54. DOI: [10.1109/MS.2024.3359124](https://doi.org/10.1109/MS.2024.3359124)
4. **He, E., Ding, Y., Fan, C., & Wohn, D. Y. (2024).** Understanding Third-Party Tool Development Ecosystem in Live Streaming Platforms. In *Proceedings of the 2024 CHI Conference on Human Factors in Computing Systems (CHI '24)* (pp. 1-17). ACM, New York, NY, USA. DOI: [10.1145/3613904.3642456](https://doi.org/10.1145/3613904.3642456)
5. **Park, S., & Gajos, K. Z. (2025).** Design Theater: Real-Time Layout Adaptation and Cognitive Load Balancing in Multi-Window Creator Workspaces. In *Proceedings of the 2025 CHI Conference on Human Factors in Computing Systems (CHI '25)* (pp. 1-19). ACM, New York, NY, USA. DOI: [10.1145/3706598.3713421](https://doi.org/10.1145/3706598.3713421)
6. **Zeroheight. (2025).** *The International State of Design Systems Report 2025: Component Reliability, Multi-Platform Theming, and Automated Governance*. Digital Industry Research Publication. [https://zeroheight.com/research/state-of-design-systems-2025/](https://zeroheight.com/research/state-of-design-systems-2025/)
7. **Santos, F., Silva, E., & Dantas, R. (2024).** Component-Driven Development in Modern Web Engineering: A Systematic Literature Review on Scalability and Accessibility. *IEEE Transactions on Software Engineering*, 50(4), 892-911. DOI: [10.1109/TSE.2024.3364921](https://doi.org/10.1109/TSE.2024.3364921)
