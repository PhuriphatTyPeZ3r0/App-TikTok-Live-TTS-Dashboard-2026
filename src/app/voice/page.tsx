"use client";

/**
 * ============================================================================
 * StreamVox Live — Voice Studio Page (Next.js 15 App Router)
 * ============================================================================
 *
 * Dedicated Multi-Voice Ecosystem and Acoustic Parameter Tuning Studio.
 * Interfaces with FastAPI Asynchronous Server Gateway Interface (ASGI) backend.
 *
 * Layout Specification:
 * - Flowbite AppShell layout wrapper
 * - Full Voice Ecosystem with `VoiceSelector`:
 *     - Multi-Voice Card Grid (พิพัฒน์ Yuta, ฮานะ Hana, ดีเจโจ๊กเกอร์ DJ Joker, ผู้ประกาศข่าว Anchor, นิวัฒน์ Niwat)
 *     - Real-time Acoustic Parameter Tuning (Speed, Pitch, Volume)
 *     - Audition Sample Trigger ("ฟังตัวอย่างเสียง")
 * - Voice Model Persistence and Active Profile Switching
 *
 * Full Academic Terminology & Acronyms:
 * - User Interface (UI)
 * - User Experience (UX)
 * - Design System (DS)
 * - Web Content Accessibility Guidelines (WCAG)
 * - Single-Page Application (SPA)
 * - Asynchronous Server Gateway Interface (ASGI)
 * - First-In, First-Out (FIFO)
 * - Open Broadcaster Software (OBS)
 * - Text-to-Speech (TTS)
 * - Role-Based Access Control (RBAC)
 * - Application Programming Interface (API)
 *
 * Master Thai Voice Actor Attribution:
 * Dedicated to Master Voice Actor คุณพิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert).
 * Official voice model for StreamVox Live Text-to-Speech (TTS) live streaming systems.
 * ============================================================================
 */

import React from "react";
import { AppShell } from "../../components/AppShell";
import { VoiceSelector } from "../../components/VoiceSelector";
import { useDashboard } from "../../context/DashboardContext";
import { Mic } from "lucide-react";

export default function VoiceStudioPage(): React.JSX.Element {
  const dashboard = useDashboard();

  return (
    <AppShell>
      {/* Voice Ecosystem Container */}
      <div className="bg-[#161822] border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-6">
        {/* Section Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>ระบบโมเดลเสียงพากย์ (Voice Studio)</span>
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 uppercase">
                  {dashboard.activeVoiceId}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                เลือกโปรไฟล์เสียงสังเคราะห์และปรับแต่งความเร็ว ความถี่ และระดับเสียง
              </p>
            </div>
          </div>
        </div>

        {/* Voice Selector Component */}
        <VoiceSelector
          selectedVoiceId={dashboard.activeVoiceId}
          onSelectVoice={dashboard.setActiveVoiceId}
          onTestVoice={dashboard.testVoice}
          voiceTunings={dashboard.voiceTunings}
          onChangeTuning={dashboard.updateVoiceTuning}
          backendUrl={dashboard.backendUrl}
          testingVoiceId={dashboard.testingVoiceId}
        />
      </div>
    </AppShell>
  );
}
