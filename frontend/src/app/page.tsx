"use client";

/**
 * Apple visionOS Frosted Liquid Glass Bento Grid Studio Dashboard for Next.js 15.
 *
 * This primary Single-Page Application (SPA) entrypoint orchestrates the visualizer,
 * First-In, First-Out (FIFO) speech queue, live streaming moderation control station,
 * and Google Colab GPU neural synthesis telemetry. It maintains real-time bidirectional
 * WebSockets (WS) communication with the FastAPI Asynchronous Server Gateway Interface (ASGI)
 * server, driving real-time audio simulation via the
 * Web Audio Application Programming Interface (Web Audio API).
 *
 * Voice actor attribution: พิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)
 */

import React, { Suspense, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Navbar } from "../components/Navbar";
import { AudioVisualizer } from "../components/AudioVisualizer";
import { ControlPanel } from "../components/ControlPanel";
import { QueueFeed } from "../components/QueueFeed";
import { ColabStatusCard } from "../components/ColabStatusCard";
import { useDashboardSocket } from "../hooks/useDashboardSocket";
import { motion } from "framer-motion";
import { Activity, Radio, Sparkles } from "lucide-react";

/**
 * Inner Dashboard client component reading search parameters and assembling the Bento Grid.
 */
function BentoDashboardContent() {
  const searchParams = useSearchParams();

  // Search parameter extraction with safe fallback defaults
  const sessionId = searchParams.get("sessionId") || searchParams.get("session_id") || "default_live_session";
  const adminToken = searchParams.get("token") || searchParams.get("adminToken") || "admin_secret";
  const overlayToken = searchParams.get("overlayToken") || searchParams.get("overlay_token") || "";
  const defaultBackend = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:7860";
  const backendUrl = searchParams.get("backendUrl") || searchParams.get("backend_url") || defaultBackend;
  const username = searchParams.get("username") || "@tiktok_creator";

  // Stream moderation local toggles & volume state
  const [volume, setVolume] = useState<number>(1.0);
  const [enableComments, setEnableComments] = useState<boolean>(true);
  const [enableGifts, setEnableGifts] = useState<boolean>(true);
  const [isTestingVoice, setIsTestingVoice] = useState<boolean>(false);

  // Initialize real-time WebSocket state synchronizer
  const {
    isConnected,
    isReconnecting,
    queue,
    speakingItem,
    stats,
    colabSettings,
    error,
    sendControlFlush,
    testVoice,
    updateColabSettings,
    skipItem,
  } = useDashboardSocket({
    sessionId,
    adminToken,
    backendUrl,
  });

  // Handle voice synthesis test dispatch
  const handleTestVoice = async () => {
    setIsTestingVoice(true);
    try {
      await testVoice("สวัสดีครับ ระบบเสียงสังเคราะห์ทำงานได้อย่างถูกต้อง พร้อมถ่ายทอดสดบน TikTok Live");
    } catch (err) {
      console.error("Test voice failed:", err);
    } finally {
      setIsTestingVoice(false);
    }
  };

  return (
    <main className="min-h-screen ambient-glow p-4 sm:p-6 lg:p-8 flex flex-col justify-between max-w-7xl mx-auto">
      {/* Top: Header & OBS Overlay Link Distribution */}
      <Navbar
        username={username}
        isConnected={isConnected}
        isReconnecting={isReconnecting}
        backendUrl={backendUrl}
        sessionId={sessionId}
        overlayToken={overlayToken}
      />

      {/* Main Studio Bento Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-start">
        {/* Center / Hero Spectrum Visualizer: Span 12 cols on mobile/tablet, full-width hero */}
        <div className="lg:col-span-12">
          <div className="relative">
            <AudioVisualizer
              isSpeaking={Boolean(speakingItem)}
              accentColor="#00f2fe"
              height={140}
              barCount={36}
              className="w-full shadow-2xl"
            />

            {/* Quick Live Telemetry Ribbon */}
            <div className="absolute top-4 right-4 hidden md:flex items-center gap-3 px-3 py-1.5 rounded-full bg-black/40 border border-white/10 text-xs font-mono text-white/70 backdrop-blur-md">
              <span className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span>สังเคราะห์แล้ว: {stats.total_synthesized}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-400" />
                <span>ผู้ชม: {stats.connected_clients}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Left Column: Tactile Control Panel (5 cols) */}
        <div className="lg:col-span-5 h-full">
          <ControlPanel
            volume={volume}
            onVolumeChange={setVolume}
            enableComments={enableComments}
            onToggleComments={setEnableComments}
            enableGifts={enableGifts}
            onToggleGifts={setEnableGifts}
            onEmergencyFlush={sendControlFlush}
            onTestVoice={handleTestVoice}
            isTestingVoice={isTestingVoice}
          />
        </div>

        {/* Right Column: First-In, First-Out (FIFO) Queue Feed (7 cols) */}
        <div className="lg:col-span-7 h-full">
          <QueueFeed
            queue={queue}
            speakingItem={speakingItem}
            onSkipItem={skipItem}
          />
        </div>

        {/* Bottom Section: AI GPU Server & Colab Tunnel Settings (12 cols) */}
        <div className="lg:col-span-12">
          <ColabStatusCard
            colabSettings={colabSettings}
            activeEngine={stats.active_engine}
            onUpdateSettings={async (settings) => {
              const ok = await updateColabSettings(settings);
              if (!ok) {
                throw new Error("Failed to update Colab tunnel configuration");
              }
            }}
          />
        </div>
      </div>

      {/* Footer Attribution & Rigor Note */}
      <footer className="mt-8 pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-[11px] text-white/40 gap-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400/60" />
          <span>
            TikTok Live TTS Studio • พากย์เสียงภาษาไทยโดย พิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)
          </span>
        </div>
        <div className="font-mono text-[10px]">
          Next.js 15 visionOS • FastAPI Asynchronous Server Gateway Interface (ASGI)
        </div>
      </footer>
    </main>
  );
}

/**
 * Root Dashboard Page wrapped with React Suspense boundary for Next.js 15 App Router compatibility.
 */
export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen ambient-glow flex items-center justify-center text-white">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
            <span className="text-xs font-mono text-cyan-300">
              กำลังโหลดระบบ TikTok Live TTS Studio...
            </span>
          </div>
        </div>
      }
    >
      <BentoDashboardContent />
    </Suspense>
  );
}
