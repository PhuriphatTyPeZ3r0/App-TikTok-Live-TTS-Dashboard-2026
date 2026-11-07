"use client";

/**
 * ============================================================================
 * StreamVox Live — Chat TTS Configuration Page (Next.js 15 App Router)
 * ============================================================================
 *
 * Dedicated Chat Text-to-Speech (TTS) configuration page for live streamers.
 * Communicates with FastAPI Asynchronous Server Gateway Interface (ASGI) backend.
 *
 * Layout Specification:
 * - Flowbite AppShell layout wrapper
 * - Chat Comment Ingestion, Username Prefixing, Anti-Spam, Max Characters, and Cooldown Limits
 * - Direct state synchronization via `TabChatSettings` and `DashboardContext`
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
import { TabChatSettings } from "../../components/tabs/TabChatSettings";
import { useDashboard } from "../../context/DashboardContext";
import { MessageSquare } from "lucide-react";

export default function ChatSettingsPage(): React.JSX.Element {
  const dashboard = useDashboard();

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto bg-[#161822] border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-6">
        {/* Section Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>ตั้งค่าแชทสด (Chat TTS Settings)</span>
              </h2>
              <p className="text-xs text-slate-400">
                กำหนดการอ่านคอมเมนต์ การอ่านชื่อผู้ส่ง ระบบป้องกันสแปม และคูลดาวน์
              </p>
            </div>
          </div>
        </div>

        {/* TabChatSettings Component */}
        <TabChatSettings
          settings={dashboard.settings}
          onUpdate={dashboard.updateSettings}
        />
      </div>
    </AppShell>
  );
}
