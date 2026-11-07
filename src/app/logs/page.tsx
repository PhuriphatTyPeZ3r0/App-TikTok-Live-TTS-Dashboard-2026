"use client";

/**
 * ============================================================================
 * StreamVox Live — Broadcast Logs & System Telemetry Page (Next.js 15 App Router)
 * ============================================================================
 *
 * Dedicated Real-Time Diagnostic Event and System Audit Logs Console.
 * Communicates with FastAPI Asynchronous Server Gateway Interface (ASGI) backend.
 *
 * Layout Specification:
 * - Flowbite AppShell layout wrapper
 * - In-Dashboard Real-Time Telemetry and Event Stream via `TabLogMonitor`:
 *     - Severity Filtering (INFO, WARN, ERROR, DEBUG)
 *     - Category Filtering (WEBSOCKET, TTS, AUDIO, AUTH, SYSTEM)
 *     - Free-text search, auto-scroll, pause/resume, and JSON export
 * - Direct connection with backend host URL from `DashboardContext`
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
import { TabLogMonitor } from "../../components/tabs/TabLogMonitor";
import { useDashboard } from "../../context/DashboardContext";
import { ScrollText } from "lucide-react";

export default function BroadcastLogsPage(): React.JSX.Element {
  const dashboard = useDashboard();

  return (
    <AppShell>
      <div className="bg-[#161822] border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-6">
        {/* Section Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <ScrollText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>บันทึกระบบและเทเลเมทรี (Broadcast & System Logs)</span>
              </h2>
              <p className="text-xs text-slate-400">
                ติดตามเหตุการณ์การสังเคราะห์เสียง WebSocket และการแจ้งเตือนแบบเรียลไทม์
              </p>
            </div>
          </div>
        </div>

        {/* TabLogMonitor Component */}
        <TabLogMonitor backendUrl={dashboard.backendUrl} />
      </div>
    </AppShell>
  );
}
