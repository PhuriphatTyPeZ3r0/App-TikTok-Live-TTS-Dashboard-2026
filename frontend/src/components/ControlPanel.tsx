"use client";

/**
 * Apple visionOS Frosted Liquid Glass Control Panel Component for Next.js 15.
 *
 * Provides live stream moderators and creators with tactile controls for speech synthesis,
 * Master Volume attenuation with decibel (dB) metrics, comment/gift ingestion toggles,
 * and high-priority Emergency Flush panic button dispatch over WebSockets (WS).
 * Built for Single-Page Application (SPA) dashboard communicating with FastAPI
 * Asynchronous Server Gateway Interface (ASGI) backend, interfacing with the
 * Web Audio Application Programming Interface (Web Audio API) and First-In, First-Out (FIFO) queue.
 *
 * Voice actor attribution: พิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)
 */

import React from "react";
import { Volume2, VolumeX, MessageSquare, Gift, AlertOctagon, Volume1, Loader2, Sparkles } from "lucide-react";
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
  /** Whether the emergency flush command is actively propagating. */
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
  isFlushing = false,
  isTestingVoice = false,
}: ControlPanelProps) {
  // Normalize volume percentage (0 - 150%) and compute decibel (dB) representation
  const normalizedGain = volume > 1.5 ? volume / 100 : volume;
  const volumePercentage = Math.round(normalizedGain * 100);
  const decibels =
    normalizedGain > 0
      ? (20 * Math.log10(normalizedGain)).toFixed(1)
      : "-∞";

  return (
    <div className="flex flex-col h-full liquid-glass specular-border rounded-2xl p-5 shadow-2xl backdrop-blur-2xl transition-all duration-300">
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-white/10 border border-white/10 text-cyan-300">
            <Volume2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold tracking-wide text-white">
              แผงควบคุมหลัก (Control Station)
            </h2>
            <p className="text-xs text-white/50">
              ควบคุมระดับเสียงและลำดับคิว First-In, First-Out (FIFO)
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5 flex-1 justify-between">
        {/* Master Volume Attenuation Slider */}
        <div className="flex flex-col gap-2.5 p-4 rounded-xl bg-black/30 border border-white/10 shadow-inner">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-white/80 flex items-center gap-1.5">
              {normalizedGain === 0 ? (
                <VolumeX className="w-3.5 h-3.5 text-rose-400" />
              ) : normalizedGain < 0.5 ? (
                <Volume1 className="w-3.5 h-3.5 text-white/60" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
              )}
              ระดับเสียงหลัก (Master Volume)
            </span>
            <div className="flex items-center gap-2 font-mono">
              <span className="text-cyan-300 font-bold">{volumePercentage}%</span>
              <span className="text-white/40 text-[10px]">({decibels} dB)</span>
            </div>
          </div>

          <div className="relative flex items-center w-full">
            <input
              type="range"
              min="0"
              max="150"
              step="1"
              value={volumePercentage}
              onChange={(e) => {
                const newPercent = Number(e.target.value);
                onVolumeChange(newPercent / 100);
              }}
              className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#00f2fe] focus:outline-none focus:ring-2 focus:ring-[#00f2fe]/40"
              aria-label="Master Volume Slider"
            />
          </div>

          <div className="flex justify-between text-[10px] text-white/40 font-mono px-0.5">
            <span>0% (เงียบ)</span>
            <span>100% (ปกติ)</span>
            <span>150% (ขยายพิเศษ)</span>
          </div>
        </div>

        {/* Feature Stream Ingestion Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Comments Toggle */}
          <button
            type="button"
            onClick={() => onToggleComments(!enableComments)}
            className={`flex items-center justify-between p-3.5 rounded-xl border transition-all duration-200 text-left ${
              enableComments
                ? "bg-cyan-500/10 border-cyan-500/30 text-white shadow-[0_0_15px_rgba(0,242,254,0.1)]"
                : "bg-white/[0.03] border-white/10 text-white/50 hover:bg-white/[0.06]"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <MessageSquare className={`w-4 h-4 ${enableComments ? "text-cyan-300" : "text-white/40"}`} />
              <div>
                <div className="text-xs font-medium">อ่านคอมเมนต์</div>
                <div className="text-[10px] text-white/40">TTS Chat Comments</div>
              </div>
            </div>
            <div
              className={`w-9 h-5 flex items-center rounded-full p-1 transition-colors duration-200 ${
                enableComments ? "bg-cyan-500 justify-end" : "bg-white/20 justify-start"
              }`}
            >
              <motion.div
                layout
                className="w-3.5 h-3.5 rounded-full bg-white shadow-md"
              />
            </div>
          </button>

          {/* Gifts Toggle */}
          <button
            type="button"
            onClick={() => onToggleGifts(!enableGifts)}
            className={`flex items-center justify-between p-3.5 rounded-xl border transition-all duration-200 text-left ${
              enableGifts
                ? "bg-amber-500/10 border-amber-500/30 text-white shadow-[0_0_15px_rgba(245,158,11,0.1)]"
                : "bg-white/[0.03] border-white/10 text-white/50 hover:bg-white/[0.06]"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Gift className={`w-4 h-4 ${enableGifts ? "text-amber-300" : "text-white/40"}`} />
              <div>
                <div className="text-xs font-medium">อ่านของขวัญ</div>
                <div className="text-[10px] text-white/40">VIP Gift TTS Alerts</div>
              </div>
            </div>
            <div
              className={`w-9 h-5 flex items-center rounded-full p-1 transition-colors duration-200 ${
                enableGifts ? "bg-amber-500 justify-end" : "bg-white/20 justify-start"
              }`}
            >
              <motion.div
                layout
                className="w-3.5 h-3.5 rounded-full bg-white shadow-md"
              />
            </div>
          </button>
        </div>

        {/* Action Buttons: Voice Test & Emergency Flush */}
        <div className="flex flex-col gap-3 pt-2">
          {/* Test Voice Trigger Button */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={onTestVoice}
            disabled={isTestingVoice}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs font-medium shadow-md transition-all duration-200 backdrop-blur-md disabled:opacity-50"
          >
            {isTestingVoice ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-cyan-300" />
                <span>กำลังสังเคราะห์เสียงทดสอบ...</span>
              </>
            ) : (
              <>
                <span>🔊 ทดสอบเสียงสังเคราะห์ (Test Voice)</span>
              </>
            )}
          </motion.button>

          {/* Emergency Flush Panic Button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onEmergencyFlush}
            disabled={isFlushing}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold tracking-wide shadow-[0_0_20px_rgba(244,63,94,0.15)] transition-all duration-200 backdrop-blur-md disabled:opacity-50"
          >
            <AlertOctagon className="w-4 h-4 text-rose-400 animate-pulse" />
            <span>🚨 ตัดเสียงฉุกเฉิน (Emergency Flush)</span>
          </motion.button>
        </div>
      </div>
    </div>
  );
}
