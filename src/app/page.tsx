"use client";

/**
 * ============================================================================
 * StreamVox Live — Streamer Cockpit Page (Next.js 15 App Router)
 * ============================================================================
 *
 * Professional Single-Page Application (SPA) streamer cockpit communicating with
 * FastAPI Asynchronous Server Gateway Interface (ASGI) backend server.
 *
 * Layout Specification:
 * - Flowbite AppShell layout wrapper
 * - Top Metric Cards: Queue Count, TTS Master Status, TikTok Live Room, Selected Voice Model
 * - 2-Column Cockpit Layout:
 *     - Left Column (1.15fr): Quick stream controls & TikFinitySettings configuration panel
 *     - Right Column (0.85fr): LiveQueueConsole (NowSpeakingCard + QueueFeed)
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
import { AppShell } from "../components/AppShell";
import { TikFinitySettings } from "../components/TikFinitySettings";
import { LiveQueueConsole } from "../components/LiveQueueConsole";
import { useDashboard } from "../context/DashboardContext";
import {
  ListOrdered,
  Radio,
  Volume2,
  Mic,
} from "lucide-react";

export default function CockpitPage(): React.JSX.Element {
  const dashboard = useDashboard();

  return (
    <AppShell>
      {/* 1. Quick Metrics Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Queue Count */}
        <div className="bg-[#161822] border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-md">
          <div>
            <div className="text-xs font-semibold text-slate-400">คิวรออ่าน (FIFO)</div>
            <div className="text-2xl font-black text-white mt-0.5">
              {dashboard.queue.length}
              <span className="text-xs text-slate-400 font-normal ml-1.5">ข้อความ</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <ListOrdered className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 2: Master TTS Status */}
        <div className="bg-[#161822] border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-md">
          <div>
            <div className="text-xs font-semibold text-slate-400">สถานะเสียงสังเคราะห์ (TTS)</div>
            <div className="text-sm font-bold mt-1 flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  dashboard.masterTtsEnabled ? "bg-emerald-400 animate-pulse" : "bg-rose-500"
                }`}
              />
              <span className={dashboard.masterTtsEnabled ? "text-emerald-400" : "text-rose-400"}>
                {dashboard.masterTtsEnabled ? "เปิดใช้งาน (Active)" : "ปิดชั่วคราว (Disabled)"}
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Volume2 className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 3: Connected TikTok Live Room */}
        <div className="bg-[#161822] border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-md">
          <div>
            <div className="text-xs font-semibold text-slate-400">ห้องไลฟ์สตรีม (Room)</div>
            <div className="text-base font-bold text-white mt-0.5 font-mono truncate max-w-[130px]">
              {dashboard.username ? `@${dashboard.username.replace(/^@/, "")}` : "@username"}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#fe2c55]/10 border border-[#fe2c55]/20 flex items-center justify-center text-[#fe2c55]">
            <Radio className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 4: Selected Voice Model */}
        <div className="bg-[#161822] border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-md">
          <div>
            <div className="text-xs font-semibold text-slate-400">โมเดลเสียงหลัก (Voice)</div>
            <div className="text-base font-bold text-cyan-300 mt-0.5 uppercase tracking-wide">
              {dashboard.activeVoiceId}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
            <Mic className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2. Streamer Cockpit 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (1.15fr ~ 7 cols): Quick Controls & TikFinitySettings */}
        <div className="lg:col-span-7 space-y-6">
          <TikFinitySettings
            settings={dashboard.settings}
            onUpdate={dashboard.updateSettings}
            onSelectVoice={dashboard.setActiveVoiceId}
            onChangeTuning={dashboard.updateVoiceTuning}
            onTestVoice={dashboard.testVoice}
            backendUrl={dashboard.backendUrl}
            testingVoiceId={dashboard.testingVoiceId}
            sessionId={dashboard.sessionId}
            overlayToken={dashboard.overlayToken}
          />
        </div>

        {/* Right Column (0.85fr ~ 5 cols): LiveQueueConsole (NowSpeakingCard + QueueFeed) */}
        <div className="lg:col-span-5 space-y-6 sticky top-24">
          <LiveQueueConsole
            currentSpeaker={dashboard.currentSpeaker}
            isPlaying={dashboard.isPlaying}
            isPaused={dashboard.isPaused}
            onSkip={dashboard.skipCurrent}
            onTogglePause={dashboard.togglePause}
            onClearQueue={dashboard.clearQueue}
            queue={dashboard.queue}
            onDeleteItem={dashboard.deleteQueueItem}
          />
        </div>
      </div>
    </AppShell>
  );
}
