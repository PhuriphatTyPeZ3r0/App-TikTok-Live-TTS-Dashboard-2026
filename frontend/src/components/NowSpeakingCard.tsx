"use client";

/**
 * NowSpeakingCard Component
 *
 * TikFinity-style Now Speaking Card for TikTok Live stream Text-to-Speech (TTS) speech synthesis.
 * Features dark glassmorphism styling, real-time speaker spotlight, animated 8-bar
 * audio waveform visualizer, speech bubble, and streamer quick controls (Skip, Pause, Clear).
 *
 * Voice Actor Model: คุณพิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)
 */

import React from "react";
import { QueueItem } from "../types/tikfinity";
import type { SpeakingItem } from "../types/dashboard";
import { Radio, Mic } from "lucide-react";

export interface NowSpeakingCardProps {
  currentSpeaker: QueueItem | SpeakingItem | any | null;
  isPlaying?: boolean;
  isPaused?: boolean;
  onSkip?: () => void;
  onTogglePause?: () => void;
  onClearQueue?: () => void;
  // Legacy prop compatibility
  isSpeaking?: boolean;
  className?: string;
}

export function NowSpeakingCard({
  currentSpeaker = null,
  isPlaying = false,
  isPaused = false,
  onSkip = () => {},
  onTogglePause = () => {},
  onClearQueue = () => {},
  isSpeaking,
  className = "",
}: NowSpeakingCardProps): React.JSX.Element {
  // Resolve unified playing state across legacy and TikFinity props
  const activeIsPlaying = isPlaying || (isSpeaking ?? false);

  // Extract speaker attributes safely supporting both TikFinity & legacy models
  const username =
    currentSpeaker?.username || currentSpeaker?.user || "TikTok Viewer";
  const text = currentSpeaker?.text || "";
  const isGift = Boolean(currentSpeaker?.isGift || currentSpeaker?.is_gift);
  const giftName = currentSpeaker?.giftName || currentSpeaker?.gift_name;
  const giftAmount = currentSpeaker?.giftAmount;
  const coins = currentSpeaker?.coins ?? currentSpeaker?.diamonds;

  // Extract avatar initial
  const avatarInitial = username.replace(/^@/, "").charAt(0).toUpperCase() || "T";

  return (
    <div
      className={`bg-gradient-to-br from-[#161822] to-[#0d0f14] border border-slate-800 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 relative overflow-hidden ${className}`}
      aria-label="Now Speaking Player Spotlight"
    >
      {/* Waveform Keyframe Animation Styles */}
      <style>{`
        @keyframes tikFinityWave {
          0%, 100% {
            height: 8px;
            opacity: 0.45;
          }
          50% {
            height: 32px;
            opacity: 1;
          }
        }
        .tik-wave-active {
          animation: tikFinityWave 1.1s ease-in-out infinite;
        }
      `}</style>

      {/* Top Header Row with Status Tags & Waveform Visualizer */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Status Indicators */}
        <div className="flex items-center gap-2 flex-wrap">
          {currentSpeaker ? (
            <>
              {/* Green Live Broadcasting Tag */}
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#00e676]/10 text-[#00e676] border border-[#00e676]/30 shadow-[0_0_12px_rgba(0,230,118,0.2)]">
                <span className="w-2 h-2 rounded-full bg-[#00e676] animate-pulse" />
                <span>🟢 กำลังอ่านออกอากาศ</span>
              </span>

              {/* Amber Gift Priority Tag */}
              {isGift && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#ffb300]/15 text-[#ffb300] border border-[#ffb300]/40 shadow-[0_0_10px_rgba(255,179,0,0.25)]">
                  <span>⚡ GIFT PRIORITY</span>
                </span>
              )}
            </>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-800/80 text-slate-400 border border-slate-700/60">
              <span className="w-2 h-2 rounded-full bg-slate-500" />
              <span>⚪ สแตนด์บาย (Standby)</span>
            </span>
          )}
        </div>

        {/* 8-Bar Waveform Visualizer */}
        <div
          className="flex items-center gap-1 h-9 px-3 py-1 bg-black/40 rounded-xl border border-slate-800/80"
          aria-label="Audio Waveform"
        >
          {[0.12, 0.28, 0.44, 0.18, 0.36, 0.52, 0.22, 0.4].map((delay, idx) => {
            const isBarActive = currentSpeaker && activeIsPlaying && !isPaused;
            const isBarPaused = currentSpeaker && isPaused;

            return (
              <div
                key={idx}
                className={`w-1.5 rounded-full transition-all duration-300 ${
                  isBarActive
                    ? "bg-gradient-to-t from-[#25f4ee] to-[#fe2c55] tik-wave-active"
                    : isBarPaused
                    ? "bg-amber-400/70"
                    : "bg-slate-700/50"
                }`}
                style={{
                  height: isBarActive ? undefined : isBarPaused ? "18px" : "6px",
                  animationDelay: isBarActive ? `${delay}s` : undefined,
                  animationDuration: isBarActive
                    ? `${0.85 + (idx % 3) * 0.2}s`
                    : undefined,
                  animationPlayState: isPaused ? "paused" : "running",
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Main Content Area: Active Speaker vs Peaceful Standby */}
      {currentSpeaker ? (
        <div className="flex flex-col gap-3.5">
          {/* User Info Row */}
          <div className="flex items-center gap-3">
            {/* Avatar (Emoji or Initials) */}
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border shadow-md ${
                isGift
                  ? "bg-gradient-to-br from-amber-400/20 to-amber-600/30 border-amber-400/50 text-amber-300 text-lg"
                  : "bg-gradient-to-br from-cyan-400/20 to-blue-600/30 border-cyan-400/40 text-cyan-300"
              }`}
            >
              {isGift ? "🎁" : avatarInitial}
            </div>

            {/* Username & Metadata */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm text-white tracking-wide truncate">
                  {username}
                </span>

                {isGift && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-400/10 text-amber-300 border border-amber-400/30">
                    <span>🎁 {giftName || "VIP Gift"}</span>
                    {giftAmount && giftAmount > 1 ? <span>x{giftAmount}</span> : null}
                    {typeof coins === "number" && <span>({coins} เหรียญ)</span>}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isGift ? "ส่งของขวัญสนับสนุนสตรีมเมอร์" : "แชทสด TikTok LIVE"}
              </p>
            </div>
          </div>

          {/* Speech Bubble with Cyan Left Accent Border */}
          <div className="relative bg-[#1a1f2c]/70 border border-slate-800/80 border-l-4 border-l-[#25f4ee] rounded-r-xl rounded-bl-xl p-4 shadow-inner">
            <p className="text-slate-100 text-sm leading-relaxed break-words font-medium">
              &ldquo;{text}&rdquo;
            </p>
            <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5 text-slate-400">
                <Mic className="w-3 h-3 text-[#25f4ee]" />
                <span>เสียงพากย์: คุณพิพัฒน์ บุญสิทธิเลิศ (Yuta)</span>
              </span>
              {currentSpeaker?.timestamp && (
                <span className="text-[10px] font-mono text-slate-500">
                  {new Date(currentSpeaker.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Peaceful Standby State */
        <div className="flex flex-col items-center justify-center py-7 text-center">
          <div className="w-14 h-14 rounded-full bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-slate-400 mb-3 shadow-inner">
            <Radio className="w-7 h-7 animate-pulse text-[#25f4ee]/70" />
          </div>
          <p className="text-sm font-semibold text-slate-200">
            รอข้อความจาก TikTok LIVE...
          </p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            เมื่อมีข้อความแชทหรือของขวัญเข้ามา ระบบจะสังเคราะห์เสียงและเล่นออกอากาศสดทันที
          </p>
        </div>
      )}

      {/* Action Buttons Row */}
      <div className="flex items-center gap-2 pt-3 border-t border-slate-800/80">
        {/* ⏭️ Skip */}
        <button
          type="button"
          onClick={onSkip}
          disabled={!currentSpeaker}
          className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center gap-1.5 shadow-sm"
          title="ข้ามข้อความปัจจุบัน (Skip)"
        >
          <span>⏭️</span>
          <span>Skip</span>
        </button>

        {/* ⏸️ Pause / ▶️ Resume */}
        <button
          type="button"
          onClick={onTogglePause}
          disabled={!currentSpeaker}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center gap-1.5 shadow-sm border ${
            isPaused
              ? "bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25"
              : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 hover:border-slate-600"
          }`}
          title={isPaused ? "เล่นต่อ (Resume)" : "พักชั่วคราว (Pause)"}
        >
          <span>{isPaused ? "▶️" : "⏸️"}</span>
          <span>{isPaused ? "Resume" : "Pause"}</span>
        </button>

        {/* 🗑️ Clear Queue */}
        <button
          type="button"
          onClick={onClearQueue}
          className="ml-auto px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 hover:border-rose-500/50 transition-all active:scale-95 flex items-center gap-1.5 shadow-sm"
          title="ล้างคิวทั้งหมด (Clear Queue)"
        >
          <span>🗑️</span>
          <span>Clear Queue</span>
        </button>
      </div>
    </div>
  );
}

export default NowSpeakingCard;
