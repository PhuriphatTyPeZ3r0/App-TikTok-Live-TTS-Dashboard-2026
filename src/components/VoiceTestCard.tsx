"use client";

/**
 * Instant Voice Testing & Preset Chips Component.
 *
 * Professional Single-Page Application (SPA) card communicating with FastAPI
 * Asynchronous Server Gateway Interface (ASGI) server, coordinating with
 * the Web Audio Application Programming Interface (Web Audio API) and First-In, First-Out (FIFO) queue.
 *
 * Provides live streamers with rapid speech synthesis verification, featuring
 * customizable text injection and 3 standard 1-click Streamer Preset Chips.
 *
 * Design System: Red Broadcast Studio (Level 0 Elevation, 12px radius, 1px border)
 * Voice Actor Attribution: คุณพิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)
 */

import React, { useState } from "react";
import { Mic, Send, Loader2, Sparkles, Play } from "lucide-react";

export interface VoiceTestCardProps {
  /** Handler to dispatch speech test synthesis request over WebSocket/REST API. */
  onTestVoice: (text: string) => Promise<void> | void;
  /** Whether a test synthesis request is actively generating or playing. */
  isTestingVoice?: boolean;
  /** Alias: Whether synthesis audio is currently active. */
  isSpeaking?: boolean;
  /** Alias: Whether testing interactions are disabled. */
  disabled?: boolean;
  /** Optional additional CSS class names. */
  className?: string;
}

export const PRESET_MESSAGES = [
  {
    label: "ยินดีต้อนรับ",
    icon: "waving_hand",
    text: "ยินดีต้อนรับเข้าสู่ไลฟ์สดครับ ขอให้เพลิดเพลินกับบรรยากาศไลฟ์นะครับ",
  },
  {
    label: "ขอบคุณของขวัญ",
    icon: "redeem",
    text: "ขอบคุณสำหรับของขวัญมากครับ ขอให้มีแต่ความสุข ร่ำรวยเงินทองครับ",
  },
  {
    label: "เคาะจอเคาะใจ",
    icon: "favorite",
    text: "ช่วยกดติดตามและเคาะหน้าจอเป็นกำลังใจให้ด้วยนะครับ ขอบคุณมากครับ",
  },
];

export function VoiceTestCard({
  onTestVoice,
  isTestingVoice = false,
  isSpeaking = false,
  disabled = false,
  className = "",
}: VoiceTestCardProps) {
  const [customText, setCustomText] = useState<string>("ยินดีต้อนรับเข้าสู่ไลฟ์สดครับ");

  const isBusy = isTestingVoice || isSpeaking || disabled;

  const handleSendTest = async (textToSend: string) => {
    if (!textToSend.trim() || isBusy) return;
    try {
      await onTestVoice(textToSend.trim());
    } catch (err) {
      console.error("Test voice dispatch failed:", err);
    }
  };

  return (
    <div
      className={`bg-white dark:bg-[#0F0F0F] rounded-xl border border-broadcast-border-light dark:border-broadcast-border-dark p-4 md:p-5 transition-colors ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-broadcast-border-light dark:border-broadcast-border-dark mb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
            <Mic className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-wide text-neutral-900 dark:text-white">
              ทดสอบเสียงพากย์ (Voice Studio Test)
            </h2>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              เสียงสังเคราะห์: คุณพิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)
            </p>
          </div>
        </div>
      </div>

      {/* Preset Chips (3 Streamer Presets) */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {PRESET_MESSAGES.map((preset, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              setCustomText(preset.text);
              handleSendTest(preset.text);
            }}
            disabled={isBusy}
            className="px-3 py-1 rounded-full text-[11px] font-medium bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 border border-broadcast-border-light dark:border-broadcast-border-dark transition-colors active:scale-95 disabled:opacity-50 inline-flex items-center gap-1"
          >
            <span className="material-symbols-rounded text-xs leading-none select-none">
              {preset.icon}
            </span>
            <span>{preset.label}</span>
          </button>
        ))}
      </div>

      {/* Input & Dispatch Bar */}
      <div className="flex items-center gap-2 p-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-broadcast-border-light dark:border-broadcast-border-dark">
        <input
          type="text"
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          placeholder="พิมพ์ข้อความที่ต้องการทดสอบ..."
          className="flex-1 bg-transparent px-2.5 py-1 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 outline-none"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSendTest(customText);
          }}
          disabled={isBusy}
        />
        <button
          type="button"
          onClick={() => handleSendTest(customText)}
          disabled={isBusy || !customText.trim()}
          className="h-9 px-4 rounded-full text-xs font-semibold bg-[#0F0F0F] dark:bg-white text-white dark:text-[#0F0F0F] hover:opacity-90 active:scale-95 transition-all shadow-sm disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
        >
          {isBusy ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>กำลังสร้างเสียง...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>ทดสอบ</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
