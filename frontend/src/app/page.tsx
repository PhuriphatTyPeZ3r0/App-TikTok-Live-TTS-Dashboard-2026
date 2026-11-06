"use client";

/**
 * TikFinity-Style Streamer Cockpit & TTS Console for Next.js 15.
 *
 * Professional Single-Page Application (SPA) dashboard communicating with FastAPI
 * Asynchronous Server Gateway Interface (ASGI) backend server over WebSockets (WS).
 *
 * Rebuilt to TikFinity 2-Column Console Layout:
 * - Top Navigation Bar (TikFinity Style) with Master TTS switch and Quick Voice Test
 * - Left Panel (1.15fr): TikFinitySettings tabbed configuration panel
 *     (Chat TTS, Gift Alerts & TTS, Safety & Moderation Filters, OBS Studio Integration)
 * - Right Panel (0.85fr): LiveQueueConsole
 *     (NowSpeakingCard spotlight player with 8-bar audio waveform, QueueFeed priority FIFO queue)
 *
 * Voice Actor Attribution: คุณพิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)
 * Master Thai Voice Model for Text-to-Speech (TTS) live streaming systems.
 */

import React, { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Navbar } from "../components/Navbar";
import { TikFinitySettings } from "../components/TikFinitySettings";
import { LiveQueueConsole } from "../components/LiveQueueConsole";
import { useTikFinitySettings } from "../hooks/useTikFinitySettings";
import { useDashboardSocket } from "../hooks/useDashboardSocket";
import { normalizeTtsText, isUserOnCooldown } from "../lib/textUtils";
import type { QueueItem } from "../types/tikfinity";
import type { DashboardEvent } from "../types/dashboard";
import { Loader2, X } from "lucide-react";

function TikFinityDashboardContent() {
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
    searchParams.get("username") || "phuriphat_live"
  );

  // Modal / Onboarding input state
  const [showRoomModal, setShowRoomModal] = useState<boolean>(false);
  const [inputUsername, setInputUsername] = useState<string>("");
  const [isStartingSession, setIsStartingSession] = useState<boolean>(false);
  const [connectionNotice, setConnectionNotice] = useState<string | null>(null);

  // TikFinity Settings Hook
  const { settings, updateSettings, isLoaded: settingsLoaded } = useTikFinitySettings();

  // Playback & Priority Queue state
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [currentSpeaker, setCurrentSpeaker] = useState<QueueItem | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isTestingVoice, setIsTestingVoice] = useState<boolean>(false);

  // In-memory spam throttling and user cooldown map
  const userCooldownMap = useRef(new Map<string, number>());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Playback execution generation ID and inflight fetch abort controller
  const currentPlayIdRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Suppress harmless third-party browser extension message-channel unhandled rejections
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const msg = event?.reason?.message || String(event?.reason || "");
      if (
        msg.includes("message channel closed before a response was received") ||
        msg.includes("A listener indicated an asynchronous response")
      ) {
        event.preventDefault();
      }
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      currentPlayIdRef.current += 1;
      abortControllerRef.current?.abort();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Sync refs to avoid stale closures in event listeners
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Periodic cleanup of userCooldownMap
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const threshold = (settings.userCooldownSeconds || 15) * 1000;
      userCooldownMap.current.forEach((timestamp, user) => {
        if (now - timestamp > threshold) {
          userCooldownMap.current.delete(user);
        }
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [settings.userCooldownSeconds]);

  // Auto-discover active session from backend or browser sessionStorage if none in URL
  const refreshActiveSession = useCallback(async (force = false) => {
    try {
      const cleanUrl = backendUrl.replace(/\/+$/, "");
      const res = await fetch(`${cleanUrl}/api/sessions/active`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.has_active_session && data.session_id) {
          if (force || !sessionId || sessionId !== data.session_id || !adminToken || adminToken !== data.admin_token) {
            console.info(`[TikFinity Dashboard] Synchronizing with active backend session: ${data.session_id}`);
            setSessionId(data.session_id);
            setAdminToken(data.admin_token);
            setOverlayToken(data.overlay_token || "");
            if (data.tiktok_username) setUsername(data.tiktok_username);

            try {
              sessionStorage.setItem(
                "tiktok_live_tts_session",
                JSON.stringify({
                  sessionId: data.session_id,
                  adminToken: data.admin_token,
                  overlayToken: data.overlay_token || "",
                  username: data.tiktok_username || "phuriphat_live",
                })
              );
            } catch (e) {}

            if (typeof window !== "undefined") {
              const url = new URL(window.location.href);
              url.searchParams.set("sessionId", data.session_id);
              url.searchParams.set("token", data.admin_token);
              if (data.overlay_token) url.searchParams.set("overlayToken", data.overlay_token);
              if (data.tiktok_username) url.searchParams.set("username", data.tiktok_username);
              window.history.replaceState({}, "", url.toString());
            }
          }
          return data;
        }
      }
    } catch (err) {
      console.warn("[TikFinity Dashboard] Failed auto-discovering active session:", err);
    }
    return null;
  }, [backendUrl, sessionId, adminToken]);

  const handleUnauthorized = useCallback(() => {
    console.warn("[TikFinity Dashboard] Unauthorized or session expired. Clearing stale cache and re-syncing...");
    try {
      sessionStorage.removeItem("tiktok_live_tts_session");
    } catch (e) {}
    refreshActiveSession(true);
  }, [refreshActiveSession]);

  // Synchronize and validate active session on mount
  useEffect(() => {
    // 1. Try sessionStorage first as instant cache
    let cachedSessionId = sessionId;
    let cachedToken = adminToken;
    if (!cachedSessionId || !cachedToken) {
      try {
        const saved = sessionStorage.getItem("tiktok_live_tts_session");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.sessionId && parsed.adminToken) {
            cachedSessionId = parsed.sessionId;
            cachedToken = parsed.adminToken;
            setSessionId(parsed.sessionId);
            setAdminToken(parsed.adminToken);
            setOverlayToken(parsed.overlayToken || "");
            if (parsed.username) setUsername(parsed.username);
          }
        }
      } catch (e) {}
    }

    // 2. Validate against /api/sessions/active to ensure backend session has not recycled
    async function validateActiveSession() {
      try {
        const cleanUrl = backendUrl.replace(/\/+$/, "");
        const res = await fetch(`${cleanUrl}/api/sessions/active`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.has_active_session && data.session_id) {
            if (!cachedSessionId || cachedSessionId !== data.session_id || cachedToken !== data.admin_token) {
              console.info(`[TikFinity Dashboard] Synchronizing with active backend session: ${data.session_id}`);
              setSessionId(data.session_id);
              setAdminToken(data.admin_token);
              setOverlayToken(data.overlay_token || "");
              if (data.tiktok_username) setUsername(data.tiktok_username);

              try {
                sessionStorage.setItem(
                  "tiktok_live_tts_session",
                  JSON.stringify({
                    sessionId: data.session_id,
                    adminToken: data.admin_token,
                    overlayToken: data.overlay_token || "",
                    username: data.tiktok_username || "phuriphat_live",
                  })
                );
              } catch (e) {}

              if (typeof window !== "undefined") {
                const url = new URL(window.location.href);
                url.searchParams.set("sessionId", data.session_id);
                url.searchParams.set("token", data.admin_token);
                if (data.overlay_token) url.searchParams.set("overlayToken", data.overlay_token);
                if (data.tiktok_username) url.searchParams.set("username", data.tiktok_username);
                window.history.replaceState({}, "", url.toString());
              }
            }
          }
        }
      } catch (err) {
        console.warn("[TikFinity Dashboard] Active session probe error:", err);
      }
    }

    validateActiveSession();
  }, [backendUrl]);

  // Inbound WebSocket Event Handler with Anti-Spam Normalization & Priority Queue
  const handleSocketEvent = useCallback((event: DashboardEvent) => {
    const currentSettings = settingsRef.current;
    if (!currentSettings.masterTtsEnabled) return;

    const eventType = (event.type || "").toUpperCase();

    // 1. Chat Comment Event (EVENT_MESSAGE or EVENT_CHAT)
    if (eventType === "EVENT_MESSAGE" || eventType === "EVENT_CHAT") {
      if (!currentSettings.chatTtsEnabled) return;

      const raw = event.data || event;
      const user = (raw.user || raw.username || "Viewer").trim();
      const rawText = raw.text || raw.comment || "";

      // Blacklist filter
      const lowerUser = user.toLowerCase();
      const isBlacklisted = (currentSettings.blacklistedUsers || []).some(
        (b) => b.trim().toLowerCase() === lowerUser
      );
      if (isBlacklisted) return;

      // Anti-spam viewer cooldown check
      if (
        currentSettings.antiSpamEnabled &&
        isUserOnCooldown(
          user,
          currentSettings.userCooldownSeconds,
          userCooldownMap.current
        )
      ) {
        return;
      }

      // Normalization & Moderation filter
      const norm = normalizeTtsText(rawText, {
        maxCharacters: currentSettings.maxCharacters,
        bannedWords: currentSettings.bannedWords,
        readUsername: currentSettings.readUsername,
        username: user,
      });

      if (norm.isBlocked || !norm.text.trim()) {
        return;
      }

      const newItem: QueueItem = {
        id: raw.id || `chat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        username: user,
        text: norm.text,
        isGift: false,
        timestamp: raw.timestamp || Date.now(),
      };

      setQueue((prev) => [...prev, newItem]);
      return;
    }

    // 2. Virtual Gift Superchat Event (EVENT_GIFT)
    if (eventType === "EVENT_GIFT") {
      if (!currentSettings.giftTtsEnabled) return;

      const raw = event.data || event;
      const user = (raw.user || raw.username || "Supporter").trim();
      const giftName = raw.gift_name || raw.giftName || "ของขวัญ";
      const giftAmount = Number(raw.gift_count || raw.giftAmount || 1);
      const coins = Number(raw.diamonds || raw.coins || raw.diamond_count || giftAmount);

      if (coins < (currentSettings.giftMinCoins || 1)) {
        return;
      }

      // Format text using settings.giftTemplate substituting placeholders
      const template =
        currentSettings.giftTemplate ||
        "ขอบคุณคุณ {user} ที่ส่ง {amount}x {gift} ให้ยูตะนะครับ!";
      const formattedText = template
        .replace(/{user}/g, user)
        .replace(/{gift}/g, giftName)
        .replace(/{amount}/g, String(giftAmount))
        .replace(/{coins}/g, String(coins));

      const newGiftItem: QueueItem = {
        id: raw.id || `gift-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        username: user,
        text: formattedText,
        isGift: true,
        giftName,
        giftAmount,
        coins,
        timestamp: raw.timestamp || Date.now(),
      };

      if (currentSettings.giftPriorityQueue) {
        // Prepend gift ahead of chat while maintaining FIFO order among multiple gifts
        setQueue((prev) => {
          const firstChatIdx = prev.findIndex((item) => !item.isGift);
          if (firstChatIdx === -1) {
            return [...prev, newGiftItem];
          }
          return [
            ...prev.slice(0, firstChatIdx),
            newGiftItem,
            ...prev.slice(firstChatIdx),
          ];
        });
      } else {
        setQueue((prev) => [...prev, newGiftItem]);
      }
      return;
    }

    // 3. Emergency Queue Flush (CONTROL_FLUSH)
    if (eventType === "CONTROL_FLUSH") {
      currentPlayIdRef.current += 1;
      abortControllerRef.current?.abort();
      setQueue([]);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setIsPlaying(false);
      setCurrentSpeaker(null);
    }
  }, []);

  // Real-time WebSocket hook with live controls
  const {
    isConnected,
    isReconnecting,
    stats,
    error: socketError,
    testVoice,
    skipAudio,
    pauseAudio,
    resumeAudio,
    clearQueue: wsClearQueue,
  } = useDashboardSocket({
    sessionId,
    adminToken,
    backendUrl,
    enabled: Boolean(sessionId && adminToken),
    onEvent: handleSocketEvent,
    onUnauthorized: handleUnauthorized,
  });

  // Playback & Audio Routing Engine
  useEffect(() => {
    if (isPlaying || isPaused || queue.length === 0) {
      return;
    }

    const nextItem = queue[0];
    setQueue((prev) => prev.slice(1));
    setCurrentSpeaker(nextItem);
    setIsPlaying(true);

    // Increment play ID for this specific playback turn
    currentPlayIdRef.current += 1;
    const thisPlayId = currentPlayIdRef.current;

    // Abort any prior inflight fetch and create a new AbortController
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    async function executeSpeech() {
      const currentSettings = settingsRef.current;
      const isStale = () => currentPlayIdRef.current !== thisPlayId;

      // Always dispatch synthesis request to backend so OBS Overlay receives audio via WebSocket broadcast
      try {
        const cleanUrl = backendUrl.replace(/\/+$/, "");
        const targetUrl = sessionId && sessionId !== "default_session"
          ? `${cleanUrl}/api/session/${encodeURIComponent(sessionId)}/test-voice?token=${encodeURIComponent(adminToken || "")}`
          : `${cleanUrl}/api/session/test-voice`;

        const res = await fetch(targetUrl, {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            "X-Admin-Token": adminToken || "",
            Authorization: adminToken ? `Bearer ${adminToken}` : "",
          },
          body: JSON.stringify({
            sessionId,
            adminToken,
            text: nextItem.text,
            user: nextItem.username,
          }),
        });

        // Discard result if skipped or superseded while fetch was inflight
        if (isStale()) return;

        if (res.status === 403 || res.status === 404) {
          console.warn(`[TikFinity Dashboard] Speech synthesis HTTP ${res.status}. Requesting active session re-sync.`);
          handleUnauthorized();
        }

        if (res.ok) {
          const data = await res.json();
          if (data.audio_base64 && !isStale()) {
            if (currentSettings.inDashboardAudio || nextItem.isTest) {
              const audio = new Audio(`data:audio/mp3;base64,${data.audio_base64}`);
              audio.volume = Math.max(0, Math.min(1, currentSettings.volume));
              audioRef.current = audio;

              audio.onended = () => {
                if (!isStale()) {
                  audioRef.current = null;
                  setIsPlaying(false);
                  setCurrentSpeaker(null);
                }
              };

              audio.onerror = () => {
                if (!isStale()) {
                  audioRef.current = null;
                  setIsPlaying(false);
                  setCurrentSpeaker(null);
                }
              };

              await audio.play();
              return;
            } else {
              // In-Dashboard Audio is disabled (echo prevention): OBS Overlay handles playback.
              // Wait for simulated playback duration then advance queue smoothly.
              const simulatedMs = Math.max(2500, Math.min(10000, nextItem.text.length * 120));
              setTimeout(() => {
                if (!isStale()) {
                  setIsPlaying(false);
                  setCurrentSpeaker(null);
                }
              }, simulatedMs);
              return;
            }
          }
        }
      } catch (err: any) {
        if (err.name === "AbortError" || isStale()) {
          return;
        }
        console.warn("[TikFinity Dashboard] Remote audio synthesis failed, using Web Speech fallback:", err);
      }

      if (isStale()) return;

      // Fallback: Web Speech API synthesis in browser (only if inDashboardAudio is enabled)
      if (currentSettings.inDashboardAudio && typeof window !== "undefined" && "speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(nextItem.text);
        utterance.lang = "th-TH";
        utterance.volume = Math.max(0, Math.min(1, currentSettings.volume));

        utterance.onend = () => {
          if (!isStale()) {
            setIsPlaying(false);
            setCurrentSpeaker(null);
          }
        };

        utterance.onerror = () => {
          if (!isStale()) {
            setIsPlaying(false);
            setCurrentSpeaker(null);
          }
        };

        window.speechSynthesis.speak(utterance);
        return;
      }

      // Safe fallback timer (if inDashboardAudio is false or synthesis failed)
      const fallbackMs = Math.max(2000, Math.min(8000, nextItem.text.length * 100));
      setTimeout(() => {
        if (!isStale()) {
          setIsPlaying(false);
          setCurrentSpeaker(null);
        }
      }, fallbackMs);
    }

    executeSpeech();
    // Decoupled: incoming queue changes must NOT cancel the active playback completion handler
  }, [isPlaying, isPaused, queue, backendUrl, sessionId, adminToken]);

  // Streamer Control Actions
  const handleSkip = useCallback(() => {
    // Invalidate active or inflight playback turn immediately
    currentPlayIdRef.current += 1;
    abortControllerRef.current?.abort();

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    skipAudio();
    setIsPlaying(false);
    setCurrentSpeaker(null);
  }, [skipAudio]);

  const handleTogglePause = useCallback(() => {
    setIsPaused((prev) => {
      const nextPaused = !prev;
      if (nextPaused) {
        if (audioRef.current) audioRef.current.pause();
        if (typeof window !== "undefined" && window.speechSynthesis) {
          window.speechSynthesis.pause();
        }
        pauseAudio();
      } else {
        if (audioRef.current) audioRef.current.play().catch(() => {});
        if (typeof window !== "undefined" && window.speechSynthesis) {
          window.speechSynthesis.resume();
        }
        resumeAudio();
      }
      return nextPaused;
    });
  }, [pauseAudio, resumeAudio]);

  const handleClearQueue = useCallback(() => {
    // Invalidate active or inflight playback turn immediately
    currentPlayIdRef.current += 1;
    abortControllerRef.current?.abort();

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setQueue([]);
    wsClearQueue();
    setIsPlaying(false);
    setCurrentSpeaker(null);
  }, [wsClearQueue]);

  const handleDeleteItem = useCallback((id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleQuickVoiceTest = useCallback(() => {
    setIsTestingVoice(true);
    const sampleText = "ทดสอบระบบเสียงสังเคราะห์ ติ๊กต็อกไลฟ์สำเร็จ";
    const testItem: QueueItem = {
      id: `test-${Date.now()}`,
      username: "ระบบ (System)",
      text: sampleText,
      isGift: false,
      timestamp: Date.now(),
      isTest: true,
    };

    // If queue is currently paused, unpause so playback begins immediately
    setIsPaused(false);

    // Prepend to front of queue for instant processing
    setQueue((prev) => [testItem, ...prev]);

    setTimeout(() => {
      setIsTestingVoice(false);
    }, 1000);
  }, []);

  // Start or Connect to TikTok Room
  const handleStartRoomSession = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = inputUsername.replace(/^@/, "").trim();
    if (!cleanUser) return;

    setIsStartingSession(true);
    setConnectionNotice(null);

    try {
      const res = await fetch(`${backendUrl.replace(/\/+$/, "")}/api/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tiktok_username: cleanUser }),
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const data = await res.json();
      setSessionId(data.session_id);
      setAdminToken(data.admin_token);
      setOverlayToken(data.overlay_token || "");
      setUsername(cleanUser);

      sessionStorage.setItem(
        "tiktok_live_tts_session",
        JSON.stringify({
          sessionId: data.session_id,
          adminToken: data.admin_token,
          overlayToken: data.overlay_token || "",
          username: cleanUser,
        })
      );

      const params = new URLSearchParams(window.location.search);
      params.set("sessionId", data.session_id);
      params.set("token", data.admin_token);
      params.set("overlayToken", data.overlay_token || "");
      params.set("username", cleanUser);
      router.replace(`/?${params.toString()}`);

      setShowRoomModal(false);
    } catch (err: any) {
      setConnectionNotice(`ไม่สามารถเชื่อมต่อห้อง @${cleanUser} ได้: ${err.message}`);
    } finally {
      setIsStartingSession(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0b0e] text-slate-100 flex flex-col font-sans selection:bg-[#fe2c55]/30 selection:text-white">
      {/* TikFinity Style Sticky Top Navigation Bar */}
      <Navbar
        username={username}
        isConnected={isConnected}
        isReconnecting={isReconnecting}
        backendUrl={backendUrl}
        sessionId={sessionId}
        overlayToken={overlayToken}
        masterTtsEnabled={settings.masterTtsEnabled}
        onToggleMaster={(enabled) => updateSettings({ masterTtsEnabled: enabled })}
        onTestVoice={handleQuickVoiceTest}
        isTestingVoice={isTestingVoice}
        onOpenRoomModal={() => setShowRoomModal(true)}
        onSwitchAccount={() => setShowRoomModal(true)}
      />

      {/* Main 2-Column Master Console Layout */}
      <main className="max-w-[1540px] mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-6 w-full flex-1">
        {/* Left Column (1.15fr): TikFinity Tabbed Settings Panel */}
        <TikFinitySettings
          settings={settings}
          onUpdate={updateSettings}
          sessionId={sessionId}
        />

        {/* Right Column (0.85fr): Live Queue & Playback Console */}
        <LiveQueueConsole
          currentSpeaker={currentSpeaker}
          isPlaying={isPlaying}
          isPaused={isPaused}
          queue={queue}
          onSkip={handleSkip}
          onTogglePause={handleTogglePause}
          onClearQueue={handleClearQueue}
          onDeleteItem={handleDeleteItem}
        />
      </main>

      {/* Room Switcher Modal Dialog */}
      {showRoomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[#12141a] border border-[#1e222d] rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
            <button
              type="button"
              onClick={() => setShowRoomModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#fe2c55] to-[#25f4ee] flex items-center justify-center text-black font-extrabold text-base">
                TF
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  สลับห้อง TikTok LIVE
                </h3>
                <p className="text-xs text-slate-400">
                  ระบุชื่อบัญชี TikTok เพื่อเชื่อมต่อและรับฟังแชท/ของขวัญ
                </p>
              </div>
            </div>

            <form onSubmit={handleStartRoomSession} className="flex flex-col gap-4 mt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  TikTok Username (@handle)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 font-mono text-sm">
                    @
                  </span>
                  <input
                    type="text"
                    value={inputUsername}
                    onChange={(e) => setInputUsername(e.target.value)}
                    placeholder="phuriphat_live"
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-[#181b24] border border-[#1e222d] focus:border-[#25f4ee] text-sm text-white placeholder-slate-500 focus:outline-none transition-colors"
                    required
                    autoFocus
                  />
                </div>
              </div>

              {connectionNotice && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs leading-relaxed">
                  {connectionNotice}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRoomModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isStartingSession || !inputUsername.trim()}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-[#fe2c55] to-[#25f4ee] text-black hover:opacity-90 transition-opacity flex items-center gap-2 font-bold disabled:opacity-50"
                >
                  {isStartingSession && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  <span>เชื่อมต่อไลฟ์สตรีม</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TikFinityDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0b0e] flex items-center justify-center text-slate-400">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#fe2c55] to-[#25f4ee] flex items-center justify-center text-black font-extrabold text-sm animate-pulse">
              TF
            </div>
            <p className="text-xs font-mono text-slate-500">
              Loading TikFinity Console...
            </p>
          </div>
        </div>
      }
    >
      <TikFinityDashboardContent />
    </Suspense>
  );
}
