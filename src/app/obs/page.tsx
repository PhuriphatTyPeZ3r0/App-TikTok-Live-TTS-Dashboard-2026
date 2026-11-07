"use client";

/**
 * ============================================================================
 * StreamVox Live — OBS Studio Integration Page (Next.js 15 App Router)
 * ============================================================================
 *
 * Dedicated Open Broadcaster Software (OBS Studio) Browser Source configuration.
 * Communicates with FastAPI Asynchronous Server Gateway Interface (ASGI) backend.
 *
 * Layout Specification:
 * - Flowbite AppShell layout wrapper
 * - OBS Browser Source Overlay URL Generation & 1-Click Copy
 * - In-Dashboard Audio Mute Configuration (Prevent Audio Echo in OBS)
 * - Volume Gain Control and Recommended Display Specifications (600x240px)
 * - Direct state synchronization via `TabObsSettings` and `DashboardContext`
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
import { TabObsSettings } from "../../components/tabs/TabObsSettings";
import { useDashboard } from "../../context/DashboardContext";
import { Tv } from "lucide-react";

export default function ObsSettingsPage(): React.JSX.Element {
  const dashboard = useDashboard();

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto bg-[#161822] border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-6">
        {/* Section Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>เชื่อมต่อ OBS Studio (Browser Source)</span>
              </h2>
              <p className="text-xs text-slate-400">
                คัดลอกลิงก์ Browser Source Overlay สำหรับนำไปใส่ในโปรแกรมสตรีมมิ่ง OBS Studio
              </p>
            </div>
          </div>
        </div>

        {/* TabObsSettings Component */}
        <TabObsSettings
          settings={dashboard.settings}
          onUpdate={dashboard.updateSettings}
          sessionId={dashboard.sessionId}
          backendUrl={dashboard.backendUrl}
          overlayToken={dashboard.overlayToken}
        />
      </div>
    </AppShell>
  );
}
