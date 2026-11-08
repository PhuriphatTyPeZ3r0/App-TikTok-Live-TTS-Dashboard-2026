"use client";

/**
 * ============================================================================
 * StreamVox Live — Global Dashboard Context & Audio Provider
 * ============================================================================
 *
 * Central state management and persistent Web Audio Application Programming Interface
 * (Web Audio API) playback provider for Next.js 15 and React 19 Single-Page Application (SPA).
 *
 * Dedicated to Master Thai Voice Actor:
 * คุณพิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)
 * Official Master Thai Voice Model for Text-to-Speech (TTS) live streaming systems.
 *
 * Architectural Features:
 * - Centralizes session authentication, Fast API Asynchronous Server Gateway Interface (ASGI)
 *   backend endpoint, and WebSockets (WS) bidirectional stream connection.
 * - Global First-In, First-Out (FIFO) speech synthesis queue and audio playback pipeline
 *   persisting seamlessly across Next.js client-side route transitions.
 * - Real-time Fast Fourier Transform (FFT) simulated 8-bar speech waveform data provider.
 * - LocalStorage persistence for master TTS toggle ('streamvox_master_tts') and voice selection.
 * - Synchronized integration with TikFinity configuration settings and Supabase cloud sync.
 * ============================================================================
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { useTikFinitySettings } from "../hooks/useTikFinitySettings";
import { useDashboardSocket } from "../hooks/useDashboardSocket";
import { normalizeTtsText, isUserOnCooldown } from "../lib/textUtils";
import {
  DEFAULT_VOICE_TUNING,
  type QueueItem,
  type VoiceTuningConfig,
  type TikFinitySettings,
} from "../types/tikfinity";
import type { DashboardEvent } from "../types/dashboard";

export const MASTER_TTS_STORAGE_KEY = "streamvox_master_tts";
export const VOICE_STORAGE_KEY = "streamvox_voice_id";
export const SESSION_STORAGE_KEY = "tiktok_live_tts_session";

export interface DashboardContextType {
  // Session & Connection Credentials
  backendUrl: string;
  setBackendUrl: (url: string) => void;
  sessionId: string;
  setSessionId: (id: string) => void;
  adminToken: string;
  setAdminToken: (token: string) => void;
  overlayToken: string;
  setOverlayToken: (token: string) => void;
  username: string;
  setUsername: (name: string) => void;

  // Stream & WebSocket Telemetry
  isStreaming: boolean;
  isReconnecting: boolean;
  connectionNotice: string | null;
  setConnectionNotice: (notice: string | null) => void;
  wsStatus: "connected" | "reconnecting" | "disconnected" | "standby";

  // UI Navigation & Modals
  showRoomModal: boolean;
  setShowRoomModal: React.Dispatch<React.SetStateAction<boolean>>;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  sidebarMobileOpen: boolean;
  setSidebarMobileOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // Master TTS Toggle & Voice Tuning Configuration
  masterTtsEnabled: boolean;
  setMasterTtsEnabled: (enabled: boolean) => void;
  activeVoiceId: string;
  setActiveVoiceId: (voiceId: string) => void;
  voiceTunings: Record<string, VoiceTuningConfig>;
  setVoiceTunings: React.Dispatch<React.SetStateAction<Record<string, VoiceTuningConfig>>>;
  updateActiveTuning: (tuning: Partial<VoiceTuningConfig>) => void;
  updateVoiceTuning: (voiceId: string, tuning: Partial<VoiceTuningConfig>) => void;

  // TikFinity Settings Integration
  settings: TikFinitySettings;
  updateSettings: (newSettings: Partial<TikFinitySettings>) => void;
  resetDefaults: () => void;

  // First-In, First-Out (FIFO) Speech Queue & Playback Pipeline
  queue: QueueItem[];
  setQueue: React.Dispatch<React.SetStateAction<QueueItem[]>>;
  currentSpeaker: QueueItem | null;
  isSpeaking: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  speechWaveformData: number[];
  skipCurrent: () => void;
  clearQueue: () => void;
  addQueueItem: (
    item: Omit<QueueItem, "id" | "timestamp"> & Partial<Pick<QueueItem, "id" | "timestamp">>
  ) => void;
  deleteQueueItem: (id: string) => void;
  togglePause: () => void;
  testVoice: (voiceId?: string, sampleText?: string) => void;
  isTestingVoice: boolean;
  testingVoiceId: string | null;
}

export const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export interface DashboardProviderProps {
  children: ReactNode;
  initialBackendUrl?: string;
  initialSessionId?: string;
  initialAdminToken?: string;
  initialOverlayToken?: string;
  initialUsername?: string;
}

const DEFAULT_WAVEFORM: number[] = [0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05];

export function DashboardProvider({
  children,
  initialBackendUrl,
  initialSessionId = "",
  initialAdminToken = "",
  initialOverlayToken = "",
  initialUsername = "",
}: DashboardProviderProps): React.JSX.Element {
  const defaultBackend =
    initialBackendUrl ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "https://tiktok-live-tts-bot.onrender.com";

  // Connection & Session State
  const [backendUrl, setBackendUrl] = useState<string>(defaultBackend);
  const [sessionId, setSessionId] = useState<string>(initialSessionId);
  const [adminToken, setAdminToken] = useState<string>(initialAdminToken);
  const [overlayToken, setOverlayToken] = useState<string>(initialOverlayToken);
  const [username, setUsername] = useState<string>(initialUsername);
  const [connectionNotice, setConnectionNotice] = useState<string | null>(null);

  // UI Navigation & Modals
  const [showRoomModal, setShowRoomModal] = useState<boolean>(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState<boolean>(false);

  // TikFinity Settings Hook
  const { settings, updateSettings, resetDefaults, isLoaded: settingsLoaded } =
    useTikFinitySettings();

  // Master TTS State with LocalStorage Persistence
  const [masterTtsEnabled, setMasterTtsState] = useState<boolean>(true);

  // Active Voice Selection with LocalStorage Persistence
  const [activeVoiceId, setActiveVoiceIdState] = useState<string>("yuta");
  const [voiceTunings, setVoiceTunings] = useState<Record<string, VoiceTuningConfig>>({});

  // First-In, First-Out (FIFO) Playback & Queue State
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [currentSpeaker, setCurrentSpeaker] = useState<QueueItem | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isTestingVoice, setIsTestingVoice] = useState<boolean>(false);
  const [testingVoiceId, setTestingVoiceId] = useState<string | null>(null);
  const [speechWaveformData, setSpeechWaveformData] = useState<number[]>(DEFAULT_WAVEFORM);

  // Throttling and Audio Playback References
  const userCooldownMap = useRef(new Map<string, number>());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentPlayIdRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const settingsRef = useRef(settings);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Synchronize masterTtsEnabled from settings or LocalStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const storedMaster = window.localStorage.getItem(MASTER_TTS_STORAGE_KEY);
      if (storedMaster !== null) {
        const parsed = storedMaster === "true";
        setMasterTtsState(parsed);
        if (settingsLoaded && settings.masterTtsEnabled !== parsed) {
          updateSettings({ masterTtsEnabled: parsed });
        }
      } else if (settingsLoaded) {
        setMasterTtsState(settings.masterTtsEnabled);
      }
    } catch {
      if (settingsLoaded) {
        setMasterTtsState(settings.masterTtsEnabled);
      }
    }
  }, [settingsLoaded, settings.masterTtsEnabled, updateSettings]);

  // Synchronize active voice selection from settings or LocalStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const storedVoice = window.localStorage.getItem(VOICE_STORAGE_KEY);
      if (storedVoice) {
        setActiveVoiceIdState(storedVoice);
        if (settingsLoaded && settings.selectedVoiceId !== storedVoice) {
          updateSettings({ selectedVoiceId: storedVoice });
        }
      } else if (settingsLoaded && settings.selectedVoiceId) {
        setActiveVoiceIdState(settings.selectedVoiceId);
      }
    } catch {
      if (settingsLoaded && settings.selectedVoiceId) {
        setActiveVoiceIdState(settings.selectedVoiceId);
      }
    }
  }, [settingsLoaded, settings.selectedVoiceId, updateSettings]);

  // Synchronize voiceTunings from settings
  useEffect(() => {
    if (settings.voiceTunings) {
      setVoiceTunings(settings.voiceTunings);
    }
  }, [settings.voiceTunings]);

  // Hydrate credentials from URL query params or sessionStorage on client mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const searchParams = new URLSearchParams(window.location.search);
      const urlBackend =
        searchParams.get("backendUrl") || searchParams.get("backend_url");
      const urlSession =
        searchParams.get("sessionId") || searchParams.get("session_id");
      const urlToken =
        searchParams.get("token") || searchParams.get("adminToken");
      const urlOverlay =
        searchParams.get("overlayToken") || searchParams.get("overlay_token");
      const urlUser = searchParams.get("username");

      if (urlBackend) setBackendUrl(urlBackend);
      if (urlSession) setSessionId(urlSession);
      if (urlToken) setAdminToken(urlToken);
      if (urlOverlay) setOverlayToken(urlOverlay);
      if (urlUser) setUsername(urlUser);

      if (!urlSession || !urlToken) {
        const savedSession = sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (savedSession) {
          const parsed = JSON.parse(savedSession);
          if (parsed.sessionId) setSessionId(parsed.sessionId);
          if (parsed.adminToken) setAdminToken(parsed.adminToken);
          if (parsed.overlayToken) setOverlayToken(parsed.overlayToken);
          if (parsed.username) setUsername(parsed.username);
        }
      }
    } catch (err) {
      console.warn("[DashboardContext] Credential hydration notice:", err);
    }
  }, []);

  // Update master TTS toggle and persist to LocalStorage
  const setMasterTtsEnabled = useCallback(
    (enabled: boolean) => {
      setMasterTtsState(enabled);
      updateSettings({ masterTtsEnabled: enabled });
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(MASTER_TTS_STORAGE_KEY, String(enabled));
        } catch {}
      }
    },
    [updateSettings]
  );

  // Update active voice selection and persist to LocalStorage
  const setActiveVoiceId = useCallback(
    (voiceId: string) => {
      setActiveVoiceIdState(voiceId);
      updateSettings({ selectedVoiceId: voiceId });
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(VOICE_STORAGE_KEY, voiceId);
        } catch {}
      }
    },
    [updateSettings]
  );

  // Update tuning for the currently active voice profile
  const updateActiveTuning = useCallback(
    (tuning: Partial<VoiceTuningConfig>) => {
      setVoiceTunings((prev) => {
        const current = prev[activeVoiceId] || DEFAULT_VOICE_TUNING;
        const merged: VoiceTuningConfig = { ...current, ...tuning };
        const next = { ...prev, [activeVoiceId]: merged };
        updateSettings({ voiceTunings: next });
        return next;
      });
    },
    [activeVoiceId, updateSettings]
  );

  // Update tuning for a specific voice profile
  const updateVoiceTuning = useCallback(
    (voiceId: string, tuning: Partial<VoiceTuningConfig>) => {
      setVoiceTunings((prev) => {
        const current = prev[voiceId] || DEFAULT_VOICE_TUNING;
        const merged: VoiceTuningConfig = { ...current, ...tuning };
        const next = { ...prev, [voiceId]: merged };
        updateSettings({ voiceTunings: next });
        return next;
      });
    },
    [updateSettings]
  );

  // Inbound WebSocket Event Handler
  const handleSocketEvent = useCallback(
    (event: DashboardEvent) => {
      const currentSettings = settingsRef.current;
      const eventType = (event.type || "").toUpperCase();

      if (eventType === "VOICE_CHANGED") {
        const remoteVoiceId = event.data?.voice_id || (event as any).voice_id;
        if (remoteVoiceId && remoteVoiceId !== currentSettings.selectedVoiceId) {
          setActiveVoiceIdState(remoteVoiceId);
          updateSettings({ selectedVoiceId: remoteVoiceId });
          try {
            window.localStorage.setItem(VOICE_STORAGE_KEY, remoteVoiceId);
          } catch {}
        }
        return;
      }

      if (!currentSettings.masterTtsEnabled) return;

      // 1. Viewer Chat Comment Event
      if (eventType === "EVENT_MESSAGE" || eventType === "EVENT_CHAT") {
        if (!currentSettings.chatTtsEnabled) return;

        const raw = event.data || event;
        const user = (raw.user || raw.username || "Viewer").trim();
        const rawText = raw.text || raw.comment || "";

        const lowerUser = user.toLowerCase();
        const isBlacklisted = (currentSettings.blacklistedUsers || []).some(
          (b) => b.trim().toLowerCase() === lowerUser
        );
        if (isBlacklisted) return;

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
          voiceId: currentSettings.selectedVoiceId || activeVoiceId || "yuta",
        };

        setQueue((prev) => [...prev, newItem]);
        return;
      }

      // 2. Virtual Gift Superchat Event
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
          voiceId: currentSettings.selectedVoiceId || activeVoiceId || "yuta",
        };

        if (currentSettings.giftPriorityQueue) {
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

      // 3. Emergency Queue Flush
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
        setIsSpeaking(false);
        setCurrentSpeaker(null);
        setSpeechWaveformData(DEFAULT_WAVEFORM);
      }
    },
    [activeVoiceId, updateSettings]
  );

  const handleUnauthorized = useCallback(() => {
    console.warn(
      "[DashboardContext] Session credentials unauthorized or expired. Re-synchronizing..."
    );
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {}
  }, []);

  // WebSocket Hook for bidirectional real-time communications
  const {
    isConnected,
    isReconnecting,
    skipAudio: wsSkipAudio,
    pauseAudio: wsPauseAudio,
    resumeAudio: wsResumeAudio,
    clearQueue: wsClearQueue,
  } = useDashboardSocket({
    sessionId,
    adminToken,
    backendUrl,
    enabled: Boolean(sessionId && adminToken),
    onEvent: handleSocketEvent,
    onUnauthorized: handleUnauthorized,
  });

  const wsStatus: "connected" | "reconnecting" | "disconnected" | "standby" =
    isConnected
      ? "connected"
      : isReconnecting
      ? "reconnecting"
      : sessionId && adminToken
      ? "standby"
      : "disconnected";

  // Persistent Global Audio Playback Pipeline
  useEffect(() => {
    if (isPlaying || isPaused || queue.length === 0) {
      return;
    }

    const nextItem = queue[0];
    setQueue((prev) => prev.slice(1));
    setCurrentSpeaker(nextItem);
    setIsPlaying(true);
    setIsSpeaking(true);

    currentPlayIdRef.current += 1;
    const thisPlayId = currentPlayIdRef.current;

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    async function executeSpeech() {
      const currentSettings = settingsRef.current;
      const isStale = () => currentPlayIdRef.current !== thisPlayId;
      const itemVoiceId =
        nextItem.voiceId || currentSettings.selectedVoiceId || activeVoiceId || "yuta";
      const itemTuning =
        currentSettings.voiceTunings?.[itemVoiceId] || DEFAULT_VOICE_TUNING;

      try {
        const cleanUrl = backendUrl.replace(/\/+$/, "");
        const targetUrl =
          sessionId && sessionId !== "default_session"
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
            voice_id: itemVoiceId,
            speed: itemTuning.speed,
            pitch: itemTuning.pitch,
            volume: itemTuning.volume,
          }),
        });

        if (isStale()) return;

        if (res.status === 403 || res.status === 404) {
          handleUnauthorized();
        }

        if (res.ok) {
          const data = await res.json();
          if (data.audio_base64 && !isStale()) {
            if (currentSettings.inDashboardAudio || nextItem.isTest) {
              if (typeof Audio !== "undefined") {
                const audio = new Audio(`data:audio/mp3;base64,${data.audio_base64}`);
                audio.volume = Math.max(0, Math.min(1, currentSettings.volume));
                audioRef.current = audio;

                audio.onended = () => {
                  if (!isStale()) {
                    audioRef.current = null;
                    setIsPlaying(false);
                    setIsSpeaking(false);
                    setCurrentSpeaker(null);
                  }
                };

                audio.onerror = () => {
                  if (!isStale()) {
                    audioRef.current = null;
                    setIsPlaying(false);
                    setIsSpeaking(false);
                    setCurrentSpeaker(null);
                  }
                };

                try {
                  await audio.play();
                } catch (playErr) {
                  console.warn("[DashboardContext] Audio autoplay prevented:", playErr);
                  if (!isStale()) {
                    audioRef.current = null;
                    setIsPlaying(false);
                    setIsSpeaking(false);
                    setCurrentSpeaker(null);
                  }
                }
                return;
              }
            } else {
              const simulatedMs = Math.max(
                2500,
                Math.min(10000, nextItem.text.length * 120)
              );
              setTimeout(() => {
                if (!isStale()) {
                  setIsPlaying(false);
                  setIsSpeaking(false);
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
        console.warn(
          "[DashboardContext] Backend speech synthesis unavailable, attempting browser Web Speech API:",
          err
        );
      }

      if (isStale()) return;

      // Browser Web Speech API fallback
      if (
        currentSettings.inDashboardAudio &&
        typeof window !== "undefined" &&
        "speechSynthesis" in window
      ) {
        const utterance = new SpeechSynthesisUtterance(nextItem.text);
        utterance.lang = "th-TH";
        utterance.volume = Math.max(0, Math.min(1, currentSettings.volume));

        utterance.onend = () => {
          if (!isStale()) {
            setIsPlaying(false);
            setIsSpeaking(false);
            setCurrentSpeaker(null);
          }
        };

        utterance.onerror = () => {
          if (!isStale()) {
            setIsPlaying(false);
            setIsSpeaking(false);
            setCurrentSpeaker(null);
          }
        };

        window.speechSynthesis.speak(utterance);
        return;
      }

      // Safe fallback duration
      const fallbackMs = Math.max(2000, Math.min(8000, nextItem.text.length * 100));
      setTimeout(() => {
        if (!isStale()) {
          setIsPlaying(false);
          setIsSpeaking(false);
          setCurrentSpeaker(null);
        }
      }, fallbackMs);
    }

    executeSpeech();
  }, [
    isPlaying,
    isPaused,
    queue,
    backendUrl,
    sessionId,
    adminToken,
    activeVoiceId,
    handleUnauthorized,
  ]);

  // Real-time Fast Fourier Transform (FFT) Waveform Animation Loop
  useEffect(() => {
    if (!isSpeaking || isPaused) {
      setSpeechWaveformData(DEFAULT_WAVEFORM);
      return;
    }

    if (typeof requestAnimationFrame === "undefined") {
      // Guard for non-browser / Node.js test environment
      return;
    }

    let phase = 0;
    let animId: number;

    const updateWaveform = () => {
      phase += 0.12;
      const bars = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const harmonic = Math.sin(phase * 1.5 + i * 0.45);
        const noise = (Math.sin(phase * 2.2 + i * 1.1) + 1) * 0.25;
        return Math.max(0.12, Math.min(1.0, 0.25 + harmonic * 0.4 + noise * 0.35));
      });
      setSpeechWaveformData(bars);
      animId = requestAnimationFrame(updateWaveform);
    };

    animId = requestAnimationFrame(updateWaveform);
    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isSpeaking, isPaused]);

  // Actions
  const skipCurrent = useCallback(() => {
    currentPlayIdRef.current += 1;
    abortControllerRef.current?.abort();

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    wsSkipAudio();
    setIsPlaying(false);
    setIsSpeaking(false);
    setCurrentSpeaker(null);
    setSpeechWaveformData(DEFAULT_WAVEFORM);
  }, [wsSkipAudio]);

  const clearQueue = useCallback(() => {
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
    setIsSpeaking(false);
    setCurrentSpeaker(null);
    setSpeechWaveformData(DEFAULT_WAVEFORM);
  }, [wsClearQueue]);

  const addQueueItem = useCallback(
    (
      item: Omit<QueueItem, "id" | "timestamp"> & Partial<Pick<QueueItem, "id" | "timestamp">>
    ) => {
      const fullItem: QueueItem = {
        ...item,
        id:
          item.id ||
          `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: item.timestamp || Date.now(),
      };
      setQueue((prev) => [...prev, fullItem]);
    },
    []
  );

  const deleteQueueItem = useCallback((id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const togglePause = useCallback(() => {
    setIsPaused((prev) => {
      const nextPaused = !prev;
      if (nextPaused) {
        if (audioRef.current) audioRef.current.pause();
        if (typeof window !== "undefined" && window.speechSynthesis) {
          window.speechSynthesis.pause();
        }
        wsPauseAudio();
      } else {
        if (audioRef.current) audioRef.current.play().catch(() => {});
        if (typeof window !== "undefined" && window.speechSynthesis) {
          window.speechSynthesis.resume();
        }
        wsResumeAudio();
      }
      return nextPaused;
    });
  }, [wsPauseAudio, wsResumeAudio]);

  const testVoice = useCallback(
    (voiceId?: string, sampleText?: string) => {
      const targetVoice = voiceId || activeVoiceId || "yuta";
      const sample =
        sampleText || "ทดสอบระบบเสียงสังเคราะห์ สตรีมว็อกซ์ไลฟ์สำเร็จ";

      setIsTestingVoice(true);
      setTestingVoiceId(targetVoice);

      const testItem: QueueItem = {
        id: `test-${Date.now()}`,
        username: `ระบบ (${targetVoice.toUpperCase()})`,
        text: sample,
        isGift: false,
        timestamp: Date.now(),
        isTest: true,
        voiceId: targetVoice,
      };

      setIsPaused(false);
      setQueue((prev) => [testItem, ...prev]);

      setTimeout(() => {
        setIsTestingVoice(false);
        setTestingVoiceId(null);
      }, 1000);
    },
    [activeVoiceId]
  );

  const value: DashboardContextType = {
    backendUrl,
    setBackendUrl,
    sessionId,
    setSessionId,
    adminToken,
    setAdminToken,
    overlayToken,
    setOverlayToken,
    username,
    setUsername,
    isStreaming: isConnected,
    isReconnecting,
    connectionNotice,
    setConnectionNotice,
    wsStatus,
    showRoomModal,
    setShowRoomModal,
    sidebarCollapsed,
    setSidebarCollapsed,
    sidebarMobileOpen,
    setSidebarMobileOpen,
    masterTtsEnabled,
    setMasterTtsEnabled,
    activeVoiceId,
    setActiveVoiceId,
    voiceTunings,
    setVoiceTunings,
    updateActiveTuning,
    updateVoiceTuning,
    settings,
    updateSettings,
    resetDefaults,
    queue,
    setQueue,
    currentSpeaker,
    isSpeaking,
    isPlaying,
    isPaused,
    speechWaveformData,
    skipCurrent,
    clearQueue,
    addQueueItem,
    deleteQueueItem,
    togglePause,
    testVoice,
    isTestingVoice,
    testingVoiceId,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

/**
 * useDashboard React Hook
 *
 * Exposes the global StreamVox Live dashboard context.
 * Throws an error if invoked outside of a <DashboardProvider /> component tree.
 */
export function useDashboard(): DashboardContextType {
  let context: DashboardContextType | undefined;
  try {
    context = useContext(DashboardContext);
  } catch {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  if (!context) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
}

/**
 * useDashboardSafe React Hook
 *
 * Safe variant of useDashboard that returns null instead of throwing an error
 * when invoked outside of a <DashboardProvider /> component tree (e.g. in standalone tests).
 */
export function useDashboardSafe(): DashboardContextType | null {
  try {
    const context = useContext(DashboardContext);
    return context ?? null;
  } catch {
    return null;
  }
}
