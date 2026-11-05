"use client";

/**
 * ============================================================================
 * Red Broadcast Video Spotlight Player Card (Now Speaking)
 * ============================================================================
 *
 * Professional 16:9 aspect ratio spotlight player card designed for the Red Broadcast
 * design system in Next.js 15 Single-Page Application (SPA) dashboard.
 * Interfacing with FastAPI Asynchronous Server Gateway Interface (ASGI) backend,
 * Web Audio Application Programming Interface (Web Audio API), Fast Fourier Transform (FFT)
 * audio spectrum simulation, High-Definition Audio (HD Audio) rendering, and
 * First-In, First-Out (FIFO) queue states.
 *
 * Voice Actor Attribution: คุณพิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)
 * Master Thai Voice Actor Model for Text-to-Speech (TTS) live streaming systems.
 *
 * Design Specifications:
 * - 16:9 aspect ratio (`aspect-video` / `aspect-[16/9]`) video player container.
 * - Broadcast Red `[● LIVE]` badge (`bg-[#FF0000] text-white font-bold text-xs px-2 py-0.5 rounded-[2px] tracking-wider uppercase`).
 * - Top-right: Streamer/Session status indicator ("สตรีมสด AI เสียงพากย์").
 * - Center area: Integrated audio waveform visualizer via `<AudioVisualizer isSpeaking={isSpeaking} />`.
 * - Bottom overlay of player: Audio Progress Bar in Broadcast Red (`h-1 bg-[#FF0000] transition-all duration-300`).
 * - Bottom metadata row:
 *     - 36px circular avatar (`h-9 w-9 rounded-full bg-neutral-200 dark:bg-neutral-800`).
 *     - Title & Speaker details: Speaker username, message text clamped to 2 lines (`line-clamp-2 text-sm text-[#0F0F0F] dark:text-white`).
 *     - Subtitle: "เสียงพากย์: คุณพิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)".
 *     - Actions: Pill Skip button ("ข้าม", `rounded-full px-4 py-1.5 text-xs font-medium bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700`).
 * - Idle state: Clean 16:9 standby screen with "รอข้อความเสียงพากย์สด (Standby for Live Stream Speech)".
 * ============================================================================
 */

import React, { useState, useEffect } from "react";
import { AudioVisualizer } from "./AudioVisualizer";
import { SkipForward, Radio, User, Volume2, Sparkles, Gem } from "lucide-react";
import type { QueueItem, SpeakingItem } from "../types/dashboard";

export interface NowSpeakingCardProps {
  /**
   * Currently active speaker payload (SpeakingItem or QueueItem), or null if idle.
   */
  currentSpeaker?: SpeakingItem | QueueItem | null;
  /**
   * Whether the Text-to-Speech (TTS) synthesis engine is actively outputting audio.
   */
  isSpeaking?: boolean;
  /**
   * Callback to skip the current speaker item.
   */
  onSkip?: () => void;
  /**
   * Optional manual progress percentage (0 - 100) for the audio playback bar.
   */
  progressPercent?: number;
  /**
   * Additional Cascading Style Sheets (CSS) class names.
   */
  className?: string;
}

export function NowSpeakingCard({
  currentSpeaker = null,
  isSpeaking = false,
  onSkip,
  progressPercent,
  className = "",
}: NowSpeakingCardProps): React.JSX.Element {
  // Synthesize simulated playback progress when actively speaking without explicit percent
  const [internalProgress, setInternalProgress] = useState<number>(0);

  useEffect(() => {
    if (!isSpeaking || !currentSpeaker) {
      setInternalProgress(0);
      return;
    }

    if (typeof progressPercent === "number") {
      setInternalProgress(progressPercent);
      return;
    }

    // Auto-progress simulation for smooth broadcast visual feedback
    const startTime = Date.now();
    // Estimate speaking duration based on text length (~120ms per character, min 2s, max 15s)
    const estimatedDuration = Math.min(
      Math.max((currentSpeaker.text?.length || 20) * 120, 2000),
      15000
    );

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / estimatedDuration) * 100, 98);
      setInternalProgress(pct);
    }, 100);

    return () => clearInterval(interval);
  }, [isSpeaking, currentSpeaker, progressPercent]);

  const activeProgress = typeof progressPercent === "number" ? progressPercent : internalProgress;

  // Determine gift metadata if speaker is from QueueItem
  const isGift = currentSpeaker && "is_gift" in currentSpeaker && Boolean((currentSpeaker as QueueItem).is_gift);
  const giftName = currentSpeaker && "gift_name" in currentSpeaker ? (currentSpeaker as QueueItem).gift_name : undefined;
  const diamonds = currentSpeaker && "diamonds" in currentSpeaker ? (currentSpeaker as QueueItem).diamonds : undefined;

  // Extract avatar initial safely
  const initial = currentSpeaker?.user
    ? currentSpeaker.user.replace(/^@/, "").charAt(0).toUpperCase()
    : "AI";

  return (
    <article
      className={`rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-broadcast-dark shadow-sm overflow-hidden flex flex-col transition-all duration-300 ${className}`}
      aria-label="Now Speaking Player Spotlight"
    >
      {/* ==================================================================== */}
      {/* 16:9 Video Player Container Viewport                                  */}
      {/* ==================================================================== */}
      <div className="relative w-full aspect-video aspect-[16/9] bg-neutral-950 flex flex-col justify-between overflow-hidden select-none">
        {/* Subtle background gradient & scanline effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/90 pointer-events-none z-10" />

        {/* Top Overlay Controls Row */}
        <div className="relative z-20 flex items-center justify-between p-3 sm:p-4">
          {/* Top-left: Broadcast Red [● LIVE] Badge */}
          <div className="flex items-center gap-2">
            <span className="bg-[#FF0000] text-white font-bold text-xs px-2 py-0.5 rounded-[2px] tracking-wider uppercase flex items-center gap-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span>LIVE</span>
            </span>
            {isSpeaking && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-white/70 bg-white/10 backdrop-blur-md px-2 py-0.5 rounded-[2px]">
                <Volume2 className="w-3 h-3 text-[#FF0000]" />
                <span>กำลังพากย์เสียง</span>
              </span>
            )}
          </div>

          {/* Top-right: Streamer/Session Status Indicator */}
          <div className="flex items-center gap-2">
            <div className="text-xs text-white/90 bg-neutral-900/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-broadcast-red animate-pulse" />
              <span className="font-medium text-[11px] sm:text-xs tracking-tight">
                สตรีมสด AI เสียงพากย์
              </span>
            </div>
          </div>
        </div>

        {/* Center Area: Integrated Audio Waveform Visualizer or Standby State */}
        <div className="relative z-20 flex-1 flex flex-col items-center justify-center px-4">
          {currentSpeaker ? (
            <div className="w-full flex flex-col items-center justify-center">
              <AudioVisualizer
                isSpeaking={isSpeaking}
                accentColor="#00f2fe"
                height={96}
                barCount={32}
                hideHeader={true}
                className="w-full bg-transparent border-0 shadow-none p-0 max-w-lg"
              />
            </div>
          ) : (
            /* Idle Standby Screen */
            <div className="flex flex-col items-center justify-center text-center py-4 px-3">
              <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-2.5">
                <Radio className="w-6 h-6 text-white/40 animate-pulse" />
              </div>
              <p className="text-xs sm:text-sm font-medium text-white/80 tracking-wide">
                รอข้อความเสียงพากย์สด (Standby for Live Stream Speech)
              </p>
              <p className="text-[11px] text-white/40 mt-1 max-w-xs">
                ข้อความและของขวัญจาก TikTok Live จะถูกส่งเข้ามาอ่านแบบเรียลไทม์
              </p>
            </div>
          )}
        </div>

        {/* Bottom Overlay: Audio Progress Bar in Broadcast Red (#FF0000) */}
        <div className="relative z-20 w-full h-1 bg-white/15 overflow-hidden">
          <div
            className="h-1 bg-[#FF0000] transition-all duration-300 ease-linear"
            style={{
              width: `${Math.max(0, Math.min(100, activeProgress))}%`,
            }}
            role="progressbar"
            aria-valuenow={activeProgress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>

      {/* ==================================================================== */}
      {/* Bottom Metadata & Controls Row                                        */}
      {/* ==================================================================== */}
      <div className="p-4 flex items-start justify-between gap-3 bg-white dark:bg-broadcast-dark">
        {/* Left: 36px Circular Avatar and Details */}
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {/* 36px Circular Avatar */}
          <div className="h-9 w-9 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center shrink-0 font-bold text-xs text-neutral-700 dark:text-neutral-300 border border-neutral-300/40 dark:border-neutral-700/50">
            {currentSpeaker ? initial : <User className="w-4 h-4 text-neutral-400" />}
          </div>

          {/* Title, Speaker and Message Clamped to 2 lines */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-semibold text-xs text-neutral-900 dark:text-neutral-100 truncate">
                {currentSpeaker ? currentSpeaker.user : "พร้อมรับข้อความใหม่ (Ready for Messages)"}
              </span>

              {isGift && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  <Gem className="w-2.5 h-2.5 fill-current" />
                  <span>{giftName || "VIP Gift"}</span>
                  {diamonds ? <span>({diamonds})</span> : null}
                </span>
              )}
            </div>

            <p className="line-clamp-2 text-sm text-[#0F0F0F] dark:text-white font-normal leading-snug break-words">
              {currentSpeaker
                ? currentSpeaker.text
                : "รอข้อความเสียงพากย์สด (Standby for Live Stream Speech)"}
            </p>

            {/* Voice Identity Subtitle */}
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 flex items-center gap-1.5 flex-wrap">
              <span>เสียงพากย์: คุณพิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)</span>
              {currentSpeaker && "engine" in currentSpeaker && (
                <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500 uppercase">
                  · {currentSpeaker.engine}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Action: Pill Skip Button ("ข้าม") */}
        <div className="shrink-0 self-center">
          <button
            type="button"
            onClick={onSkip}
            disabled={!currentSpeaker || !onSkip}
            title="ข้ามข้อความนี้ (Skip)"
            className="rounded-full px-4 py-1.5 text-xs font-medium bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <SkipForward className="w-3.5 h-3.5" />
            <span>ข้าม</span>
          </button>
        </div>
      </div>
    </article>
  );
}

export default NowSpeakingCard;
