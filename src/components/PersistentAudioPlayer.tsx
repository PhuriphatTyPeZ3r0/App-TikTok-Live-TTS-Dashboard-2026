"use client";

/**
 * ============================================================================
 * StreamVox Live — Global Docked Persistent Mini-Player Component
 * ============================================================================
 *
 * Implements a global, fixed bottom docked audio control bar for Next.js 15
 * and React 19 Single-Page Application (SPA) dashboard architecture.
 *
 * Architectural Features:
 * - Fixed bottom dock: `fixed bottom-0 left-0 right-0 z-30 sm:left-64 h-16`
 *   seamlessly integrating with desktop aside navigation and mobile viewport.
 * - Direct integration with `useDashboard()` from `../context/DashboardContext`
 *   with safe fallback `useDashboardSafe()` for standalone testing and SSR.
 * - Real-time Fast Fourier Transform (FFT) simulated 8-bar audio waveform
 *   visualizer synchronizing with speech playback telemetry.
 * - Tri-zone control layout:
 *     1. Left Zone: Speaker avatar, username, Chat vs Gift badge, 8-bar waveform
 *     2. Center Zone: Truncated spoken message quote and voice actor attribution
 *     3. Right Zone: Skip action button, FIFO queue link pill, and volume slider
 * - High-accessibility touch targets >= 44x44px compliant with Web Content
 *   Accessibility Guidelines (WCAG) 2.1 & 2.2 Level AA.
 * - Clean Minimal Enterprise & Apple visionOS Liquid Glass aesthetic with
 *   zero verbose descriptive paragraph fluff.
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
 * - Fast Fourier Transform (FFT)
 * - Application Programming Interface (API)
 *
 * Master Thai Voice Actor Attribution:
 * Dedicated to Master Voice Actor: คุณพิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)
 * Official Master Thai Voice Model for StreamVox Live TTS synthesis systems.
 * ============================================================================
 */

import React, { useState, useRef, useCallback } from "react";
import Link from "next/link";
import {
  SkipForward,
  ListOrdered,
  Volume2,
  Volume1,
  VolumeX,
  Mic,
  Gift,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import {
  useDashboard,
  useDashboardSafe as contextUseDashboardSafe,
  type DashboardContextType,
} from "../context/DashboardContext";
import type { QueueItem } from "../types/tikfinity";

/**
 * Safe fallback hook for DashboardContext consumption.
 * Returns null when rendered outside of a <DashboardProvider /> component tree.
 */
export function useDashboardSafe(): DashboardContextType | null {
  try {
    return contextUseDashboardSafe ? contextUseDashboardSafe() : useDashboard();
  } catch {
    return null;
  }
}

export interface PersistentAudioPlayerProps {
  /** Current active speaker queue item override. */
  currentSpeaker?: QueueItem | null;
  /** Whether speech synthesis is actively playing voice audio. */
  isSpeaking?: boolean;
  /** Legacy or alias playback state. */
  isPlaying?: boolean;
  /** Whether playback pipeline is temporarily paused. */
  isPaused?: boolean;
  /** Fast Fourier Transform (FFT) 8-bar normalized amplitude data array. */
  speechWaveformData?: number[];
  /** First-In, First-Out (FIFO) pending speech queue list. */
  queue?: QueueItem[];
  /** Master volume float level (0.0 to 1.0). */
  volume?: number;
  /** Callback triggered to skip current speaking item. */
  onSkip?: () => void;
  /** Callback triggered to toggle playback pause/resume state. */
  onTogglePause?: () => void;
  /** Callback triggered when volume slider or mute toggle changes. */
  onVolumeChange?: (volume: number) => void;
  /** Optional custom CSS classes. */
  className?: string;
}

const DEFAULT_WAVEFORM_BARS = [0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08];

export function PersistentAudioPlayer({
  currentSpeaker: currentSpeakerProp,
  isSpeaking: isSpeakingProp,
  isPlaying: isPlayingProp,
  isPaused: isPausedProp,
  speechWaveformData: speechWaveformDataProp,
  queue: queueProp,
  volume: volumeProp,
  onSkip,
  onTogglePause,
  onVolumeChange,
  className = "",
}: PersistentAudioPlayerProps): React.JSX.Element {
  const dashboard = useDashboardSafe();

  // Resolve active states: explicit prop takes precedence over DashboardContext
  const currentSpeaker =
    currentSpeakerProp !== undefined
      ? currentSpeakerProp
      : (dashboard?.currentSpeaker ?? null);

  const isSpeaking =
    isSpeakingProp !== undefined
      ? isSpeakingProp
      : isPlayingProp !== undefined
      ? isPlayingProp
      : (dashboard?.isSpeaking ?? dashboard?.isPlaying ?? false);

  const isPaused =
    isPausedProp !== undefined ? isPausedProp : (dashboard?.isPaused ?? false);

  const speechWaveformData =
    speechWaveformDataProp !== undefined
      ? speechWaveformDataProp
      : (dashboard?.speechWaveformData ?? DEFAULT_WAVEFORM_BARS);

  const queue =
    queueProp !== undefined ? queueProp : (dashboard?.queue ?? []);

  const volume =
    volumeProp !== undefined
      ? volumeProp
      : (dashboard?.settings?.volume ?? 1.0);

  // Volume restoration cache for mute toggle
  const prevVolumeRef = useRef<number>(volume > 0 ? volume : 1.0);
  if (volume > 0) {
    prevVolumeRef.current = volume;
  }

  // Action handlers with fallback to DashboardContext
  const handleSkip = useCallback(() => {
    if (onSkip) {
      onSkip();
    } else if (dashboard?.skipCurrent) {
      dashboard.skipCurrent();
    }
  }, [onSkip, dashboard]);

  const handleTogglePause = useCallback(() => {
    if (onTogglePause) {
      onTogglePause();
    } else if (dashboard?.togglePause) {
      dashboard.togglePause();
    }
  }, [onTogglePause, dashboard]);

  const handleVolumeChange = useCallback(
    (newVolume: number) => {
      const clamped = Math.max(0, Math.min(1, newVolume));
      if (onVolumeChange) {
        onVolumeChange(clamped);
      } else if (dashboard?.updateSettings) {
        dashboard.updateSettings({ volume: clamped });
      }
    },
    [onVolumeChange, dashboard]
  );

  const handleToggleMute = useCallback(() => {
    if (volume > 0) {
      prevVolumeRef.current = volume;
      handleVolumeChange(0);
    } else {
      handleVolumeChange(prevVolumeRef.current || 1.0);
    }
  }, [volume, handleVolumeChange]);

  // Speaker metadata helpers
  const isGift = Boolean(currentSpeaker?.isGift);
  const username = currentSpeaker?.username || "TikTok Viewer";
  const avatarInitial = username.replace(/^@/, "").charAt(0).toUpperCase() || "T";
  const spokenText = currentSpeaker?.text || "";

  return (
    <aside
      id="persistent-audio-player"
      role="region"
      aria-label="เครื่องเล่นเสียงสังเคราะห์ถาวร (Persistent Audio Player)"
      className={`fixed bottom-0 left-0 right-0 z-30 sm:left-64 h-16 bg-card/95 backdrop-blur-md border-t border-border flex items-center justify-between px-3 sm:px-6 gap-2 sm:gap-4 shadow-lg select-none pb-safe transition-all duration-200 ${className}`}
    >
      {/* ================================================================== */}
      {/* Zone 1 (Left): Speaker Info, Gift/Chat Badge & 8-Bar Waveform      */}
      {/* ================================================================== */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 max-w-[45%] sm:max-w-xs shrink-0">
        {currentSpeaker ? (
          <>
            {/* Avatar / Category Icon */}
            <div
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 border shadow-sm transition-colors ${
                isGift
                  ? "bg-amber-500/15 text-amber-400 border-amber-500/40"
                  : "bg-primary/15 text-primary border-primary/30"
              }`}
              title={isGift ? "Virtual Gift Superchat" : "Viewer Chat"}
            >
              {isGift ? (
                <Gift className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
              ) : (
                <span className="font-bold">{avatarInitial}</span>
              )}
            </div>

            {/* Username & Badge */}
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="text-xs sm:text-sm font-semibold text-foreground truncate max-w-[85px] sm:max-w-[120px]"
                  title={username}
                >
                  {username}
                </span>
                {isGift ? (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                    GIFT
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shrink-0">
                    CHAT
                  </span>
                )}
              </div>

              {/* Mobile text snippet fallback for ultra-compact screens */}
              <span className="text-[11px] text-muted-foreground truncate max-w-[120px] md:hidden">
                {spokenText}
              </span>
            </div>
          </>
        ) : (
          <>
            {/* Standby Idle Mic Icon */}
            <div
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-muted/60 border border-border flex items-center justify-center text-muted-foreground shrink-0"
              title="สแตนด์บาย (Standby)"
            >
              <Mic className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground/70" />
            </div>

            {/* Standby Status Text */}
            <div className="flex flex-col min-w-0">
              <span className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
                รอข้อความเสียงจาก TikTok LIVE...
              </span>
            </div>
          </>
        )}

        {/* Real-time Fast Fourier Transform (FFT) 8-Bar Waveform Visualizer */}
        <div
          className="hidden xs:flex items-center gap-0.5 sm:gap-1 h-7 px-1.5 sm:px-2 bg-background/50 rounded-lg border border-border/60 shrink-0"
          aria-label="Audio Waveform Telemetry"
        >
          {[0, 1, 2, 3, 4, 5, 6, 7].map((idx) => {
            const rawAmp = speechWaveformData[idx] ?? 0.08;
            const isBarActive = Boolean(currentSpeaker && isSpeaking && !isPaused);
            const isBarPaused = Boolean(currentSpeaker && isPaused);

            // Calculate dynamic pixel height within bounds (4px to 22px)
            const barHeightPx = isBarActive
              ? Math.max(4, Math.min(22, Math.round(rawAmp * 22)))
              : isBarPaused
              ? 10
              : 4;

            return (
              <span
                key={idx}
                style={{ height: `${barHeightPx}px` }}
                className={`w-1 sm:w-1.5 rounded-full transition-all duration-150 ${
                  isBarActive
                    ? "bg-gradient-to-t from-primary to-accent"
                    : isBarPaused
                    ? "bg-amber-400/80"
                    : "bg-muted-foreground/25"
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* ================================================================== */}
      {/* Zone 2 (Center): Spoken Quote & Voice Actor Attribution Context    */}
      {/* ================================================================== */}
      <div className="hidden md:flex flex-col items-center justify-center text-center max-w-xs lg:max-w-md xl:max-w-lg min-w-0 px-2 flex-1">
        {currentSpeaker ? (
          <>
            <p
              className="text-xs sm:text-sm font-medium italic text-foreground truncate max-w-full"
              title={spokenText}
            >
              &ldquo;{spokenText}&rdquo;
            </p>
            <span className="text-[11px] text-muted-foreground truncate max-w-full">
              เสียงสังเคราะห์: {currentSpeaker.voiceId?.toUpperCase() || "YUTA"} • คุณพิพัฒน์ บุญสิทธิเลิศ
            </span>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground/80 tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>StreamVox Live Voice Studio</span>
            </div>
            <span className="text-[11px] text-muted-foreground truncate max-w-full">
              ต้นแบบเสียงพากย์: คุณพิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)
            </span>
          </>
        )}
      </div>

      {/* ================================================================== */}
      {/* Zone 3 (Right): Skip Button, Queue Link Pill & Volume Slider        */}
      {/* ================================================================== */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Skip Current Voice Message Button (WCAG 2.1 AA >= 44x44px target) */}
        <button
          type="button"
          onClick={handleSkip}
          disabled={!currentSpeaker}
          className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-foreground hover:bg-muted active:scale-95 transition-all disabled:text-zinc-400 disabled:border disabled:border-border/60 disabled:cursor-not-allowed disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="ข้ามข้อความเสียงปัจจุบัน (Skip Voice Message)"
          title="ข้ามข้อความเสียงปัจจุบัน (Skip)"
        >
          <SkipForward className="w-5 h-5" />
        </button>

        {/* Live FIFO Queue Count Pill with Link to /queue (WCAG 2.1 AA >= 44x44px) */}
        <Link
          href="/queue"
          className="min-w-[44px] min-h-[44px] h-11 px-2.5 sm:px-3 rounded-xl flex items-center justify-center gap-1.5 bg-secondary/80 hover:bg-secondary border border-border text-foreground text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`คิวอ่านสด ${queue.length} รายการ (FIFO Live Queue)`}
          title="ดูคิวอ่านสดทั้งหมด (Live Queue)"
        >
          <ListOrdered className="w-4 h-4 text-primary shrink-0" />
          <span className="font-mono text-xs font-bold leading-none">{queue.length}</span>
        </Link>

        {/* Volume & Mute Controls (WCAG 2.1 AA >= 44x44px touch target) */}
        <div className="flex items-center gap-1 pl-1">
          <button
            type="button"
            onClick={handleToggleMute}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-foreground hover:bg-muted active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={volume === 0 ? "เปิดเสียงสังเคราะห์ (Unmute)" : "ปิดเสียงสังเคราะห์ (Mute)"}
            title={volume === 0 ? "เปิดเสียง (Unmute)" : "ปิดเสียง (Mute)"}
          >
            {volume === 0 ? (
              <VolumeX className="w-5 h-5 text-destructive" />
            ) : volume < 0.5 ? (
              <Volume1 className="w-5 h-5 text-muted-foreground" />
            ) : (
              <Volume2 className="w-5 h-5 text-foreground" />
            )}
          </button>

          {/* Volume Range Slider */}
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            className="hidden sm:block w-16 md:w-20 lg:w-24 h-1.5 rounded-lg bg-muted accent-primary cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="ระดับเสียงสังเคราะห์ (TTS Volume Slider)"
          />
        </div>
      </div>
    </aside>
  );
}

export default PersistentAudioPlayer;
