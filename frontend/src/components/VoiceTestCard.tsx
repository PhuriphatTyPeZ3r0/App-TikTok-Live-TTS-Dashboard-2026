"use client";

/**
 * Instant Voice Testing & Preset Chips Component.
 *
 * Provides live streamers with rapid speech synthesis verification, featuring
 * customizable text injection and 3 standard 1-click Streamer Preset Chips.
 *
 * Voice Actor Attribution: พิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)
 */

import React, { useState } from "react";
import { Mic, Send, Loader2, Sparkles, Play } from "lucide-react";

export interface VoiceTestCardProps {
  /** Handler to dispatch speech test synthesis request over WebSocket/REST API. */
  onTestVoice: (text: string) => Promise<void>;
  /** Whether a test synthesis request is actively generating or playing. */
  isTestingVoice?: boolean;
}

const PRESET_MESSAGES = [
  { label: "ยินดีต้อนรับ", text: "ยินดีต้อนรับเข้าสู่ไลฟ์สดครับ ขอให้เพลิดเพลินกับบรรยากาศไลฟ์นะครับ" },
  { label: "ขอบคุณของขวัญ 🎁", text: "ขอบคุณสำหรับของขวัญมากครับ ขอให้มีแต่ความสุข ร่ำรวยเงินทองครับ" },
  { label: "เคาะจอเคาะใจ ❤️", text: "ช่วยกดติดตามและเคาะหน้าจอเป็นกำลังใจให้ด้วยนะครับ ขอบคุณมากครับ" },
];

export function VoiceTestCard({ onTestVoice, isTestingVoice = false }: VoiceTestCardProps) {
  const [customText, setCustomText] = useState<string>("ยินดีต้อนรับเข้าสู่ไลฟ์สดครับ");

  const handleSendTest = async (textToSend: string) => {
    if (!textToSend.trim() || isTestingVoice) return;
    try {
      await onTestVoice(textToSend.trim());
    } catch (err) {
      console.error("Test voice dispatch failed:", err);
    }
  };

  return (
    <div className="liquid-glass specular-border rounded-2xl p-5 shadow-2xl backdrop-blur-2xl transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-white/10 border border-white/10 text-cyan-300">
            <Mic className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-wide text-white">
              ทดสอบเสียงพากย์ (Voice Studio Test)
            </h2>
            <p className="text-[11px] text-white/50">
              เสียงสังเคราะห์: พิพัฒน์ บุญสิทธิเลิศ (AI Voice Engine)
            </p>
          </div>
        </div>
      </div>

      {/* Preset Chips */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {PRESET_MESSAGES.map((preset, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              setCustomText(preset.text);
              handleSendTest(preset.text);
            }}
            disabled={isTestingVoice}
            className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/5 hover:bg-cyan-500/20 text-white/80 hover:text-cyan-200 border border-white/10 hover:border-cyan-400/40 transition-all active:scale-95 disabled:opacity-50"
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Input & Dispatch Bar */}
      <div className="flex items-center gap-2 p-1.5 rounded-xl bg-black/50 border border-white/15 focus-within:border-cyan-400/60 shadow-inner">
        <input
          type="text"
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          placeholder="พิมพ์ข้อความที่ต้องการทดสอบ..."
          className="flex-1 bg-transparent px-2.5 py-1 text-xs text-white placeholder-white/40 outline-none"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSendTest(customText);
          }}
          disabled={isTestingVoice}
        />
        <button
          type="button"
          onClick={() => handleSendTest(customText)}
          disabled={isTestingVoice || !customText.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:brightness-110 active:scale-95 transition-all shadow-md disabled:opacity-50"
        >
          {isTestingVoice ? (
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
