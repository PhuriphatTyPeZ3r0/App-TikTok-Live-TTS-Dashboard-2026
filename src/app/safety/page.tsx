"use client";

/**
 * ============================================================================
 * StreamVox Live — Safety & Content Moderation Page (Next.js 15 App Router)
 * ============================================================================
 *
 * Dedicated Content Moderation, Profanity Filtering, and Blacklist Management page.
 * Communicates with FastAPI Asynchronous Server Gateway Interface (ASGI) backend.
 *
 * Layout Specification:
 * - Flowbite AppShell layout wrapper
 * - Content Moderation & Safety Filters via `TabSafetySettings`:
 *     - Banned Profanities & Sensitive Keyword Filtering
 *     - Viewer Account Blacklist Management
 * - Direct state synchronization with `DashboardContext`
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
import { TabSafetySettings } from "../../components/tabs/TabSafetySettings";
import { useDashboard } from "../../context/DashboardContext";
import { Shield } from "lucide-react";

export default function SafetySettingsPage(): React.JSX.Element {
  const dashboard = useDashboard();

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto bg-[#161822] border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-6">
        {/* Section Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>ความปลอดภัยและตัวกรอง (Safety & Moderation)</span>
              </h2>
              <p className="text-xs text-slate-400">
                จัดการรายการคำหยาบคาย คำต้องห้าม และรายชื่อบัญชีผู้ใช้ที่ไม่ต้องการให้อ่านออกเสียง
              </p>
            </div>
          </div>
        </div>

        {/* TabSafetySettings Component */}
        <TabSafetySettings
          settings={dashboard.settings}
          onUpdate={dashboard.updateSettings}
        />
      </div>
    </AppShell>
  );
}
