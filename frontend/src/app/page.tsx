"use client";

/**
 * Apple visionOS Frosted Liquid Glass Streamer Cockpit Studio Dashboard for Next.js 15.
 *
 * Professional Single-Page Application (SPA) dashboard communicating with FastAPI
 * Asynchronous Server Gateway Interface (ASGI) server, coordinating with
 * the Web Audio Application Programming Interface (Web Audio API) and First-In, First-Out (FIFO) queue.
 *
 * Professional 2-Column Streamer Cockpit layout:
 * - Left Column (7 cols): Ingestion Feed & First-In, First-Out (FIFO) Speech Queue
 * - Right Column (5 cols): Audio Visualizer, 1-Click OBS Studio Integration Wizard,
 *   Tactile Master Controls & Emergency Panic Flush, Instant Voice Test & Presets,
 *   and Google Colaboratory (Tesla T4 GPU) Telemetry.
 *
 * Features automatic backend active session discovery and streamlined onboarding workflow.
 *
 * Voice Actor Attribution: พิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)
 */

import React, { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Navbar } from "../components/Navbar";
import { AudioVisualizer } from "../components/AudioVisualizer";
import { ControlPanel } from "../components/ControlPanel";
import { QueueFeed } from "../components/QueueFeed";
import { OBSIntegrationCard } from "../components/OBSIntegrationCard";
import { VoiceTestCard } from "../components/VoiceTestCard";
import { ColabStatusCard } from "../components/ColabStatusCard";
import { useDashboardSocket } from "../hooks/useDashboardSocket";
import { motion, AnimatePresence } from "framer-motion";
import { Radio, Sparkles, UserPlus, Loader2, X, Play } from "lucide-react";

function BentoDashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const defaultBackend = process.env.NEXT_PUBLIC_BACKEND_URL || "https://tiktok-live-tts-bot.onrender.com";
  const [backendUrl, setBackendUrl] = useState<string>(
    searchParams.get("backendUrl") || searchParams.get("backend_url") || defaultBackend
  );

  const [sessionId, setSessionId] = useState<string>(
    searchParams.get("sessionId") || searchParams.get("session_id") || ""
  );
  const [adminToken, setAdminToken] = useState<string>(
    searchParams.get("token") || searchParams.get("adminToken") || ""
  );
  const [overlayToken, setOverlayToken] = useState<string>(
    searchParams.get("overlayToken") || searchParams.get("overlay_token") || ""
  );
  const [username, setUsername] = useState<string>(
    searchParams.get("username") || ""
  );

  // Modal / Onboarding input state
  const [showRoomModal, setShowRoomModal] = useState<boolean>(false);
  const [inputUsername, setInputUsername] = useState<string>("");
  const [isStartingSession, setIsStartingSession] = useState<boolean>(false);
  const [connectionNotice, setConnectionNotice] = useState<string | null>(null);

  // Stream moderation local toggles & volume state
  const [volume, setVolume] = useState<number>(1.0);
  const [enableComments, setEnableComments] = useState<boolean>(true);
  const [enableGifts, setEnableGifts] = useState<boolean>(true);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isTestingVoice, setIsTestingVoice] = useState<boolean>(false);

  // Auto-discover active session from backend if none in URL
  useEffect(() => {
    async function autoDiscoverSession() {
      if (sessionId && adminToken) return;

      // Check browser sessionStorage first
      try {
        const saved = sessionStorage.getItem("tiktok_live_tts_session");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.sessionId && parsed.adminToken) {
            setSessionId(parsed.sessionId);
            setAdminToken(parsed.adminToken);
            setOverlayToken(parsed.overlayToken || "");
            setUsername(parsed.username || "@tiktok_creator");
            return;
          }
        }
      } catch (e) {
        // Ignore JSON error
      }

      // Query Render backend for active session
      try {
        const res = await fetch(`${backendUrl.replace(/\/+$/, "")}/api/sessions/active`);
        if (res.ok) {
          const data = await res.json();
          if (data.has_active_session && data.session_id) {
            setSessionId(data.session_id);
            setAdminToken(data.admin_token || "");
            setOverlayToken(data.overlay_token || "");
            setUsername(data.tiktok_username || "@tiktok_creator");
            setConnectionNotice(`พบห้องสตรีมที่กำลังรันอยู่: ${data.tiktok_username}`);
            setTimeout(() => setConnectionNotice(null), 4000);
          }
        }
      } catch (err) {
        console.warn("Backend active session check:", err);
      }
    }

    autoDiscoverSession();
  }, [backendUrl, sessionId, adminToken]);

  // Real-time WebSocket hook
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
    sessionId: sessionId || "default_session",
    adminToken: adminToken || "admin_token",
    backendUrl,
  });

  // Handle creating a new live session
  const handleStartSession = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputUsername.trim()) return;

    setIsStartingSession(true);
    setConnectionNotice(null);

    const cleanUser = inputUsername.startsWith("@") ? inputUsername : `@${inputUsername}`;

    try {
      const res = await fetch(`${backendUrl.replace(/\/+$/, "")}/api/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tiktok_username: cleanUser,
          fish_audio_api_key: "",
          enable_comments: enableComments,
          enable_gifts: enableGifts,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const data = await res.json();
      setSessionId(data.session_id);
      setAdminToken(data.admin_token);
      setOverlayToken(data.overlay_token);
      setUsername(cleanUser);

      // Save to sessionStorage
      sessionStorage.setItem(
        "tiktok_live_tts_session",
        JSON.stringify({
          sessionId: data.session_id,
          adminToken: data.admin_token,
          overlayToken: data.overlay_token,
          username: cleanUser,
        })
      );

      setShowRoomModal(false);
      setConnectionNotice(`เชื่อมต่อห้อง ${cleanUser} สำเร็จ!`);
      setTimeout(() => setConnectionNotice(null), 4000);
    } catch (err: any) {
      setConnectionNotice(`เชื่อมต่อไม่สำเร็จ: ${err.message}`);
    } finally {
      setIsStartingSession(false);
    }
  };

  // Voice test handler
  const handleTestVoice = async (text: string) => {
    setIsTestingVoice(true);
    try {
      await testVoice(text);
    } catch (err) {
      console.error("Test voice failed:", err);
    } finally {
      setIsTestingVoice(false);
    }
  };

  const isOBSConnected = (stats.connected_clients || 0) > 0;

  return (
    <main className="min-h-screen ambient-glow p-4 sm:p-6 lg:p-8 flex flex-col justify-between max-w-7xl mx-auto">
      {/* Top: Header & Live System Status Telemetry */}
      <Navbar
        username={username || "@tiktok_creator"}
        isConnected={isConnected}
        isReconnecting={isReconnecting}
        backendUrl={backendUrl}
        sessionId={sessionId}
        obsConnected={isOBSConnected}
        activeEngine={stats.active_engine}
        onOpenRoomModal={() => setShowRoomModal(true)}
      />

      {/* Floating Connection Notice Banner */}
      <AnimatePresence>
        {connectionNotice && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 px-4 py-2 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 text-xs font-medium text-center backdrop-blur-md shadow-lg"
          >
            {connectionNotice}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Setup Banner if no session is configured */}
      {!sessionId && (
        <div className="mb-6 p-5 rounded-2xl liquid-glass specular-border border-cyan-400/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-tr from-[#fe2c55]/30 to-[#00f2fe]/30 border border-white/20 text-white">
              <Radio className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">เริ่มต้นการใช้งาน TikTok Live TTS</h3>
              <p className="text-xs text-white/60">
                ใส่ชื่อช่อง TikTok ของคุณเพื่อเชื่อมต่อห้อง Live สดและรับข้อความทันที
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowRoomModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 text-white text-xs font-semibold shadow-lg active:scale-95 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>เชื่อมต่อห้อง Live ตอนนี้</span>
          </button>
        </div>
      )}

      {/* Main Streamer Cockpit: 2-Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-start">
        {/* Left Column (7 cols): Ingestion Feed & Priority Speech Queue */}
        <div className="lg:col-span-7 h-full flex flex-col gap-6">
          <QueueFeed
            queue={queue}
            speakingItem={speakingItem}
            onSkipItem={skipItem}
            onClearQueue={sendControlFlush}
          />
        </div>

        {/* Right Column (5 cols): Controls, Waveform, OBS Integration & Voice Studio */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* Audio Visualizer Waveform Card */}
          <div className="liquid-glass specular-border rounded-2xl p-4 shadow-xl backdrop-blur-2xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-white/80 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>คลื่นเสียงสด (Live Audio Spectrum)</span>
              </span>
              <span className="text-[10px] font-mono text-cyan-300">
                {speakingItem ? "กำลังสังเคราะห์เสียง..." : "สแตนด์บาย"}
              </span>
            </div>
            <AudioVisualizer
              isSpeaking={Boolean(speakingItem)}
              accentColor="#00f2fe"
              height={70}
              barCount={28}
              className="w-full"
            />
          </div>

          {/* 1-Click OBS Studio Setup Card */}
          <OBSIntegrationCard
            backendUrl={backendUrl}
            sessionId={sessionId}
            overlayToken={overlayToken}
            connectedClients={stats.connected_clients}
          />

          {/* Master Streamer Controls & Emergency Flush */}
          <ControlPanel
            volume={volume}
            onVolumeChange={setVolume}
            enableComments={enableComments}
            onToggleComments={setEnableComments}
            enableGifts={enableGifts}
            onToggleGifts={setEnableGifts}
            onEmergencyFlush={sendControlFlush}
            onTestVoice={() => handleTestVoice("สวัสดีครับ ระบบเสียงสังเคราะห์ทำงานได้อย่างถูกต้อง")}
            onSkipCurrent={() => speakingItem && skipItem(speakingItem.id)}
            isPaused={isPaused}
            onTogglePause={() => setIsPaused(!isPaused)}
            isTestingVoice={isTestingVoice}
          />

          {/* Instant Voice Test & Quick Presets */}
          <VoiceTestCard
            onTestVoice={handleTestVoice}
            isTestingVoice={isTestingVoice}
          />

          {/* AI GPU Server & Colab Tunnel Telemetry Accordion */}
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

      {/* Room Connection Modal */}
      <AnimatePresence>
        {showRoomModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md liquid-glass specular-border rounded-2xl p-6 shadow-2xl relative"
            >
              <button
                type="button"
                onClick={() => setShowRoomModal(false)}
                className="absolute top-4 right-4 p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300">
                  <Radio className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">เชื่อมต่อ TikTok Live</h3>
                  <p className="text-xs text-white/50">ระบุชื่อผู้ใช้ TikTok สำหรับดึงข้อความไลฟ์</p>
                </div>
              </div>

              <form onSubmit={handleStartSession} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-white/80 mb-1.5">
                    ชื่อช่อง TikTok (TikTok Username)
                  </label>
                  <input
                    type="text"
                    required
                    value={inputUsername}
                    onChange={(e) => setInputUsername(e.target.value)}
                    placeholder="เช่น @streamer_channel หรือ streamer_channel"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/20 focus:border-cyan-400 text-sm text-white placeholder-white/30 outline-none transition-colors"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowRoomModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-white/70 hover:text-white transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isStartingSession || !inputUsername.trim()}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 text-white text-xs font-semibold shadow-md active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isStartingSession ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>กำลังเชื่อมต่อ...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>เริ่มเชื่อมต่อไลฟ์</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}

export default function BentoDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen ambient-glow flex flex-col items-center justify-center p-6 text-white font-sans">
          <div className="w-12 h-12 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin mb-4" />
          <h2 className="text-base font-medium tracking-wide">กำลังโหลด TikTok Live TTS Studio...</h2>
          <p className="text-xs text-white/50 mt-1">เสียงพากย์: พิพัฒน์ บุญสิทธิเลิศ</p>
        </div>
      }
    >
      <BentoDashboardContent />
    </Suspense>
  );
}
