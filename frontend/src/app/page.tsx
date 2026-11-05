"use client";

/**
 * Red Broadcast Streamer Cockpit Studio Dashboard for Next.js 15.
 *
 * Professional Single-Page Application (SPA) dashboard communicating with FastAPI
 * Asynchronous Server Gateway Interface (ASGI) backend server, coordinating with
 * the Web Audio Application Programming Interface (Web Audio API) and First-In, First-Out (FIFO) queue.
 *
 * Streamer Cockpit Layout:
 * - Collapsible Navigation Drawer (240px expanded ↔ 72px icon rail)
 * - Sticky Top Navigation Bar (56px) with real-time multi-system telemetry
 * - Top Category Chips filter bar
 * - Fluid Canvas Container adapting smoothly up to 2200px (max-w-[2200px])
 * - 2-Column Cockpit Grid:
 *     - Left Column (7 cols): NowSpeakingCard 16:9 Video Spotlight atop QueueFeed
 *     - Right Column (5 cols): ControlPanel master controls, OBSIntegrationCard wizard,
 *       VoiceTestCard presets, and ColabStatusCard GPU telemetry
 *
 * Voice Actor Attribution: คุณพิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)
 * Master Thai Voice Model for Text-to-Speech (TTS) live streaming systems.
 */

import React, { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Navbar } from "../components/Navbar";
import { Sidebar } from "../components/Sidebar";
import { CategoryChips } from "../components/CategoryChips";
import { NowSpeakingCard } from "../components/NowSpeakingCard";
import { QueueFeed } from "../components/QueueFeed";
import { ControlPanel } from "../components/ControlPanel";
import { OBSIntegrationCard } from "../components/OBSIntegrationCard";
import { VoiceTestCard } from "../components/VoiceTestCard";
import { ColabStatusCard } from "../components/ColabStatusCard";
import { AudioVisualizer } from "../components/AudioVisualizer";
import { useDashboardSocket } from "../hooks/useDashboardSocket";
import { motion, AnimatePresence } from "framer-motion";
import { Radio, Sparkles, UserPlus, Loader2, X, Play } from "lucide-react";

function RedBroadcastCockpitContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const defaultBackend =
    process.env.NEXT_PUBLIC_BACKEND_URL || "https://tiktok-live-tts-bot.onrender.com";
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

  // Navigation & Category Filter State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [activeNavTab, setActiveNavTab] = useState<string>("cockpit");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

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

  // Real-time WebSocket hook with lazy activation upon session discovery
  const isSessionValid = Boolean(
    sessionId &&
    adminToken &&
    sessionId !== "default_session" &&
    adminToken !== "admin_token"
  );

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
    sessionId: isSessionValid ? sessionId : "",
    adminToken: isSessionValid ? adminToken : "",
    backendUrl,
    enabled: isSessionValid,
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
  const isColabConnected = Boolean(
    colabSettings?.colab_tunnel_url && stats.active_engine?.toLowerCase().includes("colab")
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#F9F9F9] dark:bg-[#0F0F0F] text-[#0F0F0F] dark:text-white transition-colors">
      {/* Top: Sticky Navigation Bar */}
      <Navbar
        username={username || "@tiktok_creator"}
        isConnected={isConnected}
        isReconnecting={isReconnecting}
        backendUrl={backendUrl}
        sessionId={sessionId}
        overlayToken={overlayToken}
        obsConnected={isOBSConnected}
        colabConnected={isColabConnected}
        activeEngine={stats.active_engine}
        onOpenRoomModal={() => setShowRoomModal(true)}
        onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
      />

      {/* Main Container with Collapsible Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Collapsible Sidebar Navigation */}
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          activeTab={activeNavTab}
          onSelectTab={setActiveNavTab}
        />

        {/* Fluid Canvas Main Content Area (Max Width: 2200px) */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          <div className="max-w-[2200px] w-full mx-auto p-4 md:p-6 flex flex-col gap-5">
            {/* Top Filter Category Chips */}
            <CategoryChips
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />

            {/* Floating Connection Notice Banner */}
            <AnimatePresence>
              {connectionNotice && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="px-4 py-2.5 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-medium text-center shadow-md"
                >
                  {connectionNotice}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quick Setup Banner if no session is configured */}
            {!sessionId && (
              <div className="p-4 md:p-5 rounded-xl bg-white dark:bg-[#0F0F0F] border border-broadcast-border-light dark:border-broadcast-border-dark flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
                    <Radio className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                      เริ่มต้นการใช้งาน TikTok Live TTS
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      ใส่ชื่อช่อง TikTok ของคุณเพื่อเชื่อมต่อห้อง Live สดและรับข้อความทันที
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRoomModal(true)}
                  className="h-9 px-5 rounded-full bg-[#0F0F0F] dark:bg-white text-white dark:text-[#0F0F0F] text-xs font-semibold flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>เชื่อมต่อห้อง Live ตอนนี้</span>
                </button>
              </div>
            )}

            {/* 2-Column Cockpit Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Column (7 cols): Video Spotlight Player atop Priority Speech Queue */}
              <div className="lg:col-span-7 flex flex-col gap-5">
                {/* 16:9 Now Speaking Spotlight Video Card */}
                <NowSpeakingCard
                  currentSpeaker={speakingItem}
                  isSpeaking={Boolean(speakingItem)}
                  onSkip={() => speakingItem && skipItem(speakingItem.id)}
                />

                {/* Queue Feed Playlist */}
                <QueueFeed
                  queue={queue}
                  speakingItem={speakingItem}
                  onSkipItem={skipItem}
                  onClearQueue={sendControlFlush}
                  activeFilter={selectedCategory}
                  onSelectFilter={setSelectedCategory}
                />
              </div>

              {/* Right Column (5 cols): Controls, OBS Wizard, Voice Test, GPU Telemetry */}
              <div className="lg:col-span-5 flex flex-col gap-5">
                {/* Streamer Master Cockpit Controls */}
                <ControlPanel
                  volume={volume}
                  onVolumeChange={setVolume}
                  enableComments={enableComments}
                  onToggleComments={setEnableComments}
                  enableGifts={enableGifts}
                  onToggleGifts={setEnableGifts}
                  onEmergencyFlush={sendControlFlush}
                  onTestVoice={() =>
                    handleTestVoice(
                      "ยินดีต้อนรับเข้าสู่ไลฟ์สดครับ ระบบเสียงสังเคราะห์ทำงานได้อย่างถูกต้อง"
                    )
                  }
                  onSkipCurrent={() => speakingItem && skipItem(speakingItem.id)}
                  onClearQueue={sendControlFlush}
                  isPaused={isPaused}
                  onTogglePause={() => setIsPaused(!isPaused)}
                  isTestingVoice={isTestingVoice}
                />

                {/* 1-Click OBS Studio Setup Wizard */}
                <OBSIntegrationCard
                  backendUrl={backendUrl}
                  sessionId={sessionId}
                  overlayToken={overlayToken}
                  connectedClients={stats.connected_clients}
                  obsConnected={isOBSConnected}
                />

                {/* Instant Voice Test & Presets */}
                <VoiceTestCard
                  onTestVoice={handleTestVoice}
                  isTestingVoice={isTestingVoice}
                  isSpeaking={Boolean(speakingItem)}
                />

                {/* Live Audio Spectrum Telemetry Card */}
                <div className="bg-white dark:bg-[#0F0F0F] rounded-xl border border-broadcast-border-light dark:border-broadcast-border-dark p-4 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-neutral-500" />
                      <span>คลื่นเสียงสด (Live Audio Spectrum)</span>
                    </span>
                    <span className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400">
                      {speakingItem ? "กำลังสังเคราะห์เสียง..." : "สแตนด์บาย"}
                    </span>
                  </div>
                  <AudioVisualizer
                    isSpeaking={Boolean(speakingItem)}
                    accentColor="#FF0000"
                    height={40}
                    barCount={28}
                    className="w-full"
                  />
                </div>

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
          </div>
        </main>
      </div>

      {/* Room Connection Modal */}
      <AnimatePresence>
        {showRoomModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white dark:bg-[#0F0F0F] rounded-2xl border border-broadcast-border-light dark:border-broadcast-border-dark p-6 shadow-2xl relative"
            >
              <button
                type="button"
                onClick={() => setShowRoomModal(false)}
                className="absolute top-4 right-4 p-1 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
                  <Radio className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                    เชื่อมต่อ TikTok Live
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    ระบุชื่อผู้ใช้ TikTok สำหรับดึงข้อความไลฟ์
                  </p>
                </div>
              </div>

              <form onSubmit={handleStartSession} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                    ชื่อช่อง TikTok (TikTok Username)
                  </label>
                  <input
                    type="text"
                    required
                    value={inputUsername}
                    onChange={(e) => setInputUsername(e.target.value)}
                    placeholder="เช่น @streamer_channel หรือ streamer_channel"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-broadcast-border-light dark:border-broadcast-border-dark focus:border-neutral-900 dark:focus:border-white text-sm text-neutral-900 dark:text-white placeholder-neutral-400 outline-none transition-colors"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowRoomModal(false)}
                    className="h-9 px-4 rounded-full text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isStartingSession || !inputUsername.trim()}
                    className="h-9 px-5 rounded-full bg-[#0F0F0F] dark:bg-white text-white dark:text-[#0F0F0F] text-xs font-semibold flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-sm disabled:opacity-50"
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
    </div>
  );
}

export default function BentoDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#F9F9F9] dark:bg-[#0F0F0F] text-neutral-900 dark:text-white font-sans">
          <div className="w-10 h-10 rounded-full border-2 border-neutral-300 dark:border-neutral-700 border-t-[#FF0000] animate-spin mb-4" />
          <h2 className="text-base font-medium tracking-wide">
            กำลังโหลด TikTok Live TTS Studio...
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            เสียงพากย์: คุณพิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)
          </p>
        </div>
      }
    >
      <RedBroadcastCockpitContent />
    </Suspense>
  );
}
