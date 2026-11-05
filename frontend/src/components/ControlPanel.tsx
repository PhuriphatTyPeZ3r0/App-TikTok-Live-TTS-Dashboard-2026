"use client";

/**
 * Red Broadcast Streamer Cockpit Control Panel Component for Next.js 15.
 *
 * Professional Single-Page Application (SPA) control panel communicating with FastAPI
 * Asynchronous Server Gateway Interface (ASGI) backend server, interfacing with the
 * Web Audio Application Programming Interface (Web Audio API) and First-In, First-Out (FIFO) queue.
 *
 * Voice Actor Attribution: คุณพิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)
 * Master Thai Voice Model for Text-to-Speech (TTS) live streaming systems.
 *
 * Red Broadcast Design Specifications:
 * - Pill buttons (36px height, rounded-full / 9999px radius).
 * - Subscribe-styled primary buttons (`bg-[#0F0F0F] dark:bg-white text-white dark:text-[#0F0F0F] rounded-full`).
 * - Master volume slider (0-150% with decibel dB display).
 * - Prominent Broadcast Red emergency flush button: `bg-[#FF0000] hover:bg-[#CC0000] text-white rounded-full`
 *   with exact string "🚨 ตัดเสียงฉุกเฉิน (Emergency Flush)".
 * - Full backward compatibility with existing tests and WebSocket contracts.
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
  Trash2,
} from "lucide-react";
import { motion } from "framer-motion";

export interface ControlPanelProps {
  /** volume: Master volume gain (normalized 0.0 - 1.5 where 1.0 represents 100% nominal gain). */
  volume: number;
  /** onVolumeChange: Volume alteration callback. */
  onVolumeChange: (vol: number) => void;
  /** enableComments: Whether regular chat comments should be parsed and synthesized. */
  enableComments?: boolean;
  /** onToggleComments: Callback toggling regular comment ingestion. */
  onToggleComments?: (val: boolean) => void;
  /** readComments: Alias for whether regular chat comments should be read. */
  readComments?: boolean;
  /** onToggleReadComments: Alias callback toggling regular comment ingestion. */
  onToggleReadComments?: (val: boolean) => void;
  /** enableGifts: Whether gift events should be announced with high-priority audio alerts. */
  enableGifts?: boolean;
  /** onToggleGifts: Callback toggling gift event ingestion. */
  onToggleGifts?: (val: boolean) => void;
  /** readGifts: Alias for whether gift events should be announced. */
  readGifts?: boolean;
  /** onToggleReadGifts: Alias callback toggling gift event ingestion. */
  onToggleReadGifts?: (val: boolean) => void;
  /** onEmergencyFlush: Emergency Flush handler to purge speech buffer and discard pending FIFO queue items. */
  onEmergencyFlush: () => void;
  /** onTestVoice: Trigger test voice speech synthesis. */
  onTestVoice: () => void;
  /** Optional handler to skip the currently playing message. */
  onSkipCurrent?: () => void;
  /** Alias: Optional handler to skip the currently playing message. */
  onSkip?: () => void;
  /** Optional handler to clear all pending items in FIFO queue. */
  onClearQueue?: () => void;
  /** Whether the audio playback is currently paused. */
  isPaused?: boolean;
  /** Callback to toggle pause state. */
  onTogglePause?: () => void;
  /** Whether emergency flush is actively propagating. */
  isFlushing?: boolean;
  /** Whether test voice audio synthesis is currently generating or playing. */
  isTestingVoice?: boolean;
  /** Optional additional CSS class names. */
  className?: string;
}

export function ControlPanel({
  volume,
  onVolumeChange,
  enableComments,
  onToggleComments,
  readComments,
  onToggleReadComments,
  enableGifts,
  onToggleGifts,
  readGifts,
  onToggleReadGifts,
  onEmergencyFlush,
  onTestVoice,
  onSkipCurrent,
  onSkip,
  onClearQueue,
  isPaused = false,
  onTogglePause,
  isFlushing = false,
  isTestingVoice = false,
  className = "",
}: ControlPanelProps) {
  // Normalize volume scale (support 0.0-1.5 or 0-150)
  const normalizedGain = volume > 1.5 ? volume / 100 : volume;
  const volumePercentage = Math.round(normalizedGain * 100);
  const decibels =
    normalizedGain > 0 ? (20 * Math.log10(normalizedGain)).toFixed(1) : "-∞";

  // Effective toggle states supporting both contract names
  const effectiveComments = enableComments ?? readComments ?? true;
  const effectiveGifts = enableGifts ?? readGifts ?? true;

  const handleToggleComments = () => {
    const nextVal = !effectiveComments;
    onToggleComments?.(nextVal);
    onToggleReadComments?.(nextVal);
  };

  const handleToggleGifts = () => {
    const nextVal = !effectiveGifts;
    onToggleGifts?.(nextVal);
    onToggleReadGifts?.(nextVal);
  };

  const handleSkip = () => {
    if (onSkipCurrent) {
      onSkipCurrent();
    } else if (onSkip) {
      onSkip();
    }
  };

  return (
    <div
      className={`bg-white dark:bg-[#0F0F0F] rounded-xl border border-broadcast-border-light dark:border-broadcast-border-dark p-4 md:p-5 transition-colors ${className}`}
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-broadcast-border-light dark:border-broadcast-border-dark mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-wide text-neutral-900 dark:text-white">
              แผงควบคุมหลัก (Streamer Cockpit)
            </h2>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              ควบคุมระดับเสียง ตัวกรองเหตุการณ์ และปุ่มปฏิบัติการด่วน
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Master Volume Attenuation Slider (0 - 150% with decibel dB display) */}
        <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-broadcast-border-light dark:border-broadcast-border-dark">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
              {normalizedGain === 0 ? (
                <VolumeX className="w-3.5 h-3.5 text-red-500" />
              ) : normalizedGain < 0.5 ? (
                <Volume1 className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-neutral-900 dark:text-neutral-100" />
              )}
              ระดับเสียงสตรีม (Master Volume)
            </span>
            <div className="flex items-center gap-2 font-mono">
              <span className="text-neutral-900 dark:text-white font-bold text-xs">
                {volumePercentage}%
              </span>
              <span className="text-neutral-500 dark:text-neutral-400 text-[10px]">
                ({decibels} dB)
              </span>
            </div>
          </div>
          <input
            type="range"
            min={0}
            max={150}
            step={1}
            value={volumePercentage}
            onChange={(e) => onVolumeChange(Number(e.target.value) / 100)}
            className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-[#FF0000]"
          />
        </div>

        {/* Feature Switches: Comments & Gifts (36px Pill Buttons) */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Chat Comments Switch */}
          <button
            type="button"
            onClick={handleToggleComments}
            className={`h-9 px-3.5 rounded-full border flex items-center justify-between transition-colors text-xs font-medium ${
              effectiveComments
                ? "bg-[#0F0F0F] dark:bg-white text-white dark:text-[#0F0F0F] border-transparent"
                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border-broadcast-border-light dark:border-broadcast-border-dark hover:bg-neutral-200 dark:hover:bg-neutral-700"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>ข้อความแชท</span>
            </div>
            <span
              className={`w-2 h-2 rounded-full ${
                effectiveComments
                  ? "bg-emerald-400"
                  : "bg-neutral-400 dark:bg-neutral-600"
              }`}
            />
          </button>

          {/* Gift Priority Switch */}
          <button
            type="button"
            onClick={handleToggleGifts}
            className={`h-9 px-3.5 rounded-full border flex items-center justify-between transition-colors text-xs font-medium ${
              effectiveGifts
                ? "bg-[#0F0F0F] dark:bg-white text-white dark:text-[#0F0F0F] border-transparent"
                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border-broadcast-border-light dark:border-broadcast-border-dark hover:bg-neutral-200 dark:hover:bg-neutral-700"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Gift className="w-3.5 h-3.5" />
              <span>ของขวัญ VIP</span>
            </div>
            <span
              className={`w-2 h-2 rounded-full ${
                effectiveGifts
                  ? "bg-emerald-400"
                  : "bg-neutral-400 dark:bg-neutral-600"
              }`}
            />
          </button>
        </div>

        {/* Quick Streamer Actions (Pill Buttons 36px height) */}
        <div className="grid grid-cols-2 gap-2">
          {/* Pause / Resume */}
          <button
            type="button"
            onClick={onTogglePause}
            className={`h-9 px-3.5 rounded-full border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
              isPaused
                ? "bg-amber-100 dark:bg-amber-950/60 border-amber-400 text-amber-800 dark:text-amber-200"
                : "bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 border-broadcast-border-light dark:border-broadcast-border-dark text-neutral-800 dark:text-neutral-200"
            }`}
          >
            {isPaused ? (
              <Play className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Pause className="w-3.5 h-3.5" />
            )}
            <span>{isPaused ? "เล่นเสียงต่อ" : "พักเสียงชั่วคราว"}</span>
          </button>

          {/* Skip Current Item */}
          <button
            type="button"
            onClick={handleSkip}
            className="h-9 px-3.5 rounded-full border border-broadcast-border-light dark:border-broadcast-border-dark bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-xs font-medium text-neutral-800 dark:text-neutral-200 flex items-center justify-center gap-1.5 transition-colors"
          >
            <SkipForward className="w-3.5 h-3.5" />
            <span>ข้ามข้อความนี้</span>
          </button>
        </div>

        {/* Optional Clear Queue button if onClearQueue is provided */}
        {onClearQueue && (
          <button
            type="button"
            onClick={onClearQueue}
            className="w-full h-9 px-4 rounded-full border border-broadcast-border-light dark:border-broadcast-border-dark bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center justify-center gap-2 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>ล้างคิวรออ่านทั้งหมด</span>
          </button>
        )}

        {/* Test Voice Button (Subscribe-styled Pill Button 36px height) */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={onTestVoice}
          disabled={isTestingVoice}
          className="w-full h-9 px-4 rounded-full bg-[#0F0F0F] dark:bg-white text-white dark:text-[#0F0F0F] text-xs font-semibold flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>🔊 ทดสอบเสียงสังเคราะห์ (Test Voice)</span>
        </motion.button>

        {/* Prominent Broadcast Red Emergency Flush Button (#FF0000) */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={onEmergencyFlush}
          disabled={isFlushing}
          className="w-full h-10 md:h-11 px-5 rounded-full bg-[#FF0000] hover:bg-[#CC0000] text-white text-xs md:text-sm font-bold tracking-wide flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-50"
        >
          <AlertOctagon className="w-4 h-4 text-white animate-pulse" />
          <span>
            {isFlushing
              ? "กำลังล้างคิวและหยุดเสียง..."
              : "🚨 ตัดเสียงฉุกเฉิน (Emergency Flush)"}
          </span>
        </motion.button>
      </div>
    </div>
  );
}
