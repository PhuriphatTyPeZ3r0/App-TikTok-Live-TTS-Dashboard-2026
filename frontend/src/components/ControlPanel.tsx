"use client";

/**
 * Apple visionOS Frosted Liquid Glass Control Panel Component for Next.js 15.
 *
 * Single-Page Application (SPA) control station communicating with FastAPI
 * Asynchronous Server Gateway Interface (ASGI) server, interfacing with the
 * Web Audio Application Programming Interface (Web Audio API) and First-In, First-Out (FIFO) queue.
 *
 * Voice Actor Attribution: พิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)
 */

import React from "react";
import {
  Volume2,
  VolumeX,
  Volume1,
  MessageSquare,
  Gift,
  AlertOctagon,
  Pause,
  Play,
  SkipForward,
  Sliders,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";

export interface ControlPanelProps {
  /** Master volume gain (normalized 0.0 - 1.5 where 1.0 represents 100% nominal gain). */
  volume: number;
  /** Volume alteration callback. */
  onVolumeChange: (vol: number) => void;
  /** Whether regular chat comments should be parsed and synthesized. */
  enableComments: boolean;
  /** Callback toggling regular comment ingestion. */
  onToggleComments: (val: boolean) => void;
  /** Whether gift events should be announced with high-priority audio alerts. */
  enableGifts: boolean;
  /** Callback toggling gift event ingestion. */
  onToggleGifts: (val: boolean) => void;
  /** Emergency Flush handler to purge speech buffer and discard pending FIFO queue items. */
  onEmergencyFlush: () => void;
  /** Trigger test voice speech synthesis. */
  onTestVoice: () => void;
  /** Optional handler to skip the currently playing message. */
  onSkipCurrent?: () => void;
  /** Whether the audio playback is currently paused. */
  isPaused?: boolean;
  /** Callback to toggle pause state. */
  onTogglePause?: () => void;
  /** Whether emergency flush is actively propagating. */
  isFlushing?: boolean;
  /** Whether test voice audio synthesis is currently generating or playing. */
  isTestingVoice?: boolean;
}

export function ControlPanel({
  volume,
  onVolumeChange,
  enableComments,
  onToggleComments,
  enableGifts,
  onToggleGifts,
  onEmergencyFlush,
  onTestVoice,
  onSkipCurrent,
  isPaused = false,
  onTogglePause,
  isFlushing = false,
  isTestingVoice = false,
}: ControlPanelProps) {
  const normalizedGain = volume > 1.5 ? volume / 100 : volume;
  const volumePercentage = Math.round(normalizedGain * 100);
  const decibels =
    normalizedGain > 0 ? (20 * Math.log10(normalizedGain)).toFixed(1) : "-∞";

  return (
    <div className="liquid-glass specular-border rounded-2xl p-5 shadow-2xl backdrop-blur-2xl transition-all duration-300">
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-white/10 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-white/10 border border-white/10 text-cyan-300">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-wide text-white">
              แผงควบคุมหลัก (Streamer Cockpit)
            </h2>
            <p className="text-[11px] text-white/50">
              ควบคุมระดับเสียง ตัวกรองเหตุการณ์ และปุ่มปฏิบัติการด่วน
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Master Volume Attenuation Slider */}
        <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 shadow-inner">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-medium text-white/80 flex items-center gap-1.5">
              {normalizedGain === 0 ? (
                <VolumeX className="w-3.5 h-3.5 text-rose-400" />
              ) : normalizedGain < 0.5 ? (
                <Volume1 className="w-3.5 h-3.5 text-white/60" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
              )}
              ระดับเสียงสตรีม (Master Volume)
            </span>
            <div className="flex items-center gap-2 font-mono">
              <span className="text-cyan-300 font-bold text-xs">{volumePercentage}%</span>
              <span className="text-white/40 text-[10px]">({decibels} dB)</span>
            </div>
          </div>
          <input
            type="range"
            min={0}
            max={150}
            step={1}
            value={volumePercentage}
            onChange={(e) => onVolumeChange(Number(e.target.value) / 100)}
            className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </div>

        {/* Feature Switches: Comments & Gifts */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Chat Comments Switch */}
          <button
            type="button"
            onClick={() => onToggleComments(!enableComments)}
            className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
              enableComments
                ? "bg-cyan-500/15 border-cyan-400/40 text-cyan-200"
                : "bg-white/[0.03] border-white/10 text-white/40"
            }`}
          >
            <div className="flex items-center gap-2 text-left">
              <MessageSquare className="w-4 h-4" />
              <div>
                <div className="text-xs font-semibold">ข้อความแชท</div>
                <div className="text-[10px] text-white/50">อ่านคอมเมนต์สด</div>
              </div>
            </div>
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                enableComments ? "bg-cyan-400 shadow-[0_0_8px_rgba(0,242,254,0.8)]" : "bg-white/20"
              }`}
            />
          </button>

          {/* Gift Priority Switch */}
          <button
            type="button"
            onClick={() => onToggleGifts(!enableGifts)}
            className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
              enableGifts
                ? "bg-amber-500/15 border-amber-400/40 text-amber-200"
                : "bg-white/[0.03] border-white/10 text-white/40"
            }`}
          >
            <div className="flex items-center gap-2 text-left">
              <Gift className="w-4 h-4 text-amber-300" />
              <div>
                <div className="text-xs font-semibold">ของขวัญ VIP</div>
                <div className="text-[10px] text-white/50">ลัดคิวอ่านทันที</div>
              </div>
            </div>
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                enableGifts ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" : "bg-white/20"
              }`}
            />
          </button>
        </div>

        {/* Quick Streamer Action Grid */}
        <div className="grid grid-cols-2 gap-2">
          {/* Pause / Resume */}
          <button
            type="button"
            onClick={onTogglePause}
            className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-medium transition-all ${
              isPaused
                ? "bg-amber-500/20 border-amber-400/50 text-amber-200"
                : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10"
            }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isPaused ? "เล่นเสียงต่อ" : "พักเสียงชั่วคราว"}</span>
          </button>

          {/* Skip Current Item */}
          <button
            type="button"
            onClick={onSkipCurrent}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-medium text-white/80 transition-all active:scale-95"
          >
            <SkipForward className="w-3.5 h-3.5" />
            <span>ข้ามข้อความนี้</span>
          </button>
        </div>

        {/* Test Voice Button */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={onTestVoice}
          disabled={isTestingVoice}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 text-xs font-semibold border border-cyan-400/40 shadow-sm transition-all"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>🔊 ทดสอบเสียงสังเคราะห์ (Test Voice)</span>
        </motion.button>

        {/* Emergency Panic Flush Button */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={onEmergencyFlush}
          disabled={isFlushing}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold tracking-wide uppercase border border-rose-400/50 shadow-[0_0_20px_rgba(244,63,94,0.4)] transition-all disabled:opacity-50"
        >
          <AlertOctagon className="w-4 h-4 text-white animate-pulse" />
          <span>{isFlushing ? "กำลังล้างคิวและหยุดเสียง..." : "🚨 ตัดเสียงฉุกเฉิน (Emergency Flush)"}</span>
        </motion.button>
      </div>
    </div>
  );
}
