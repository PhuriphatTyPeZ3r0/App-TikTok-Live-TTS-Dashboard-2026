"use client";

/**
 * ============================================================================
 * StreamVox Live — Gift Alerts & Superchat Page (Next.js 15 App Router)
 * ============================================================================
 *
 * Dedicated TikTok Live Virtual Gift Alerts and Superchat TTS configuration.
 * Communicates with FastAPI Asynchronous Server Gateway Interface (ASGI) backend.
 *
 * Layout Specification:
 * - Flowbite AppShell layout wrapper
 * - Virtual Gift Superchat configuration via `TabGiftSettings`:
 *     - Gift TTS alerts toggle
 *     - Priority Queue bypass toggle
 *     - Minimum coin threshold configuration
 *     - Dynamic appreciation template customization
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
import { TabGiftSettings } from "../../components/tabs/TabGiftSettings";
import { useDashboard } from "../../context/DashboardContext";
import { Gift } from "lucide-react";

export default function GiftAlertsPage(): React.JSX.Element {
  const dashboard = useDashboard();

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto bg-[#161822] border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-6">
        {/* Section Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>การแจ้งเตือนของขวัญ (Gift Alerts & Superchat)</span>
              </h2>
              <p className="text-xs text-slate-400">
                กำหนดการแจ้งเตือนของขวัญ คิวบุริมภาพ (Priority Queue) และข้อความขอบคุณ
              </p>
            </div>
          </div>
        </div>

        {/* TabGiftSettings Component */}
        <TabGiftSettings
          settings={dashboard.settings}
          onUpdate={dashboard.updateSettings}
        />
      </div>
    </AppShell>
  );
}
