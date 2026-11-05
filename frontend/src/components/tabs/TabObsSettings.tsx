"use client";

/**
 * TabObsSettings Component
 *
 * TikFinity-style Open Broadcaster Software (OBS Studio) and Audio Output configuration tab.
 * Provides live streamers with a 1-click copy OBS Browser Source Overlay URL,
 * in-dashboard direct audio toggle (to prevent OBS desktop audio echoes), and volume slider.
 */

import React, { useState, useEffect } from "react";
import { TikFinitySettings } from "../../types/tikfinity";
import { ToggleSwitch } from "./ToggleSwitch";
import { Copy, Check } from "lucide-react";

export interface TabObsSettingsProps {
  settings: TikFinitySettings;
  onUpdate: (partial: Partial<TikFinitySettings>) => void;
  sessionId?: string;
}

export function TabObsSettings({
  settings,
  onUpdate,
  sessionId,
}: TabObsSettingsProps) {
  const [copied, setCopied] = useState<boolean>(false);
  const [overlayUrl, setOverlayUrl] = useState<string>("");

  useEffect(() => {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin.replace("3000", "8000")
        : "https://tiktok-live-tts-bot.onrender.com";
    const cleanSession = sessionId || "default_session";
    setOverlayUrl(`${origin}/overlay/${cleanSession}?volume=${settings.volume}`);
  }, [sessionId, settings.volume]);

  const handleCopy = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(overlayUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch (err) {
      console.error("Failed to copy OBS overlay URL:", err);
    }
  };

  const volumePercent = Math.round(settings.volume * 100);

  return (
    <div className="flex flex-col gap-4">
      {/* 1. OBS Browser Source Overlay URL */}
      <div className="flex flex-col gap-2 p-3.5 bg-[#181b24] border border-[#1e222d] rounded-lg">
        <label className="text-sm font-semibold text-slate-100">
          OBS Browser Source Overlay URL
        </label>
        <div className="flex items-center justify-between gap-2.5 p-2.5 bg-[#0d0f14] border border-dashed border-[#1e222d] rounded-lg">
          <span className="font-mono text-xs text-[#25f4ee] truncate select-all">
            {overlayUrl ||
              `https://tiktok-live-tts-bot.onrender.com/overlay/${
                sessionId || "default_session"
              }?volume=${settings.volume}`}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#181b24] border border-[#1e222d] text-xs font-medium text-slate-200 hover:border-[#25f4ee] hover:text-white transition-colors flex-shrink-0"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">คัดลอกแล้ว!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>คัดลอก</span>
              </>
            )}
          </button>
        </div>
        <div className="text-xs text-slate-400">
          นำ URL นี้ไปใส่ใน Browser Source ของ OBS Studio หรือ TikTok LIVE Studio พร้อมติ๊กเลือก &quot;Control audio via OBS&quot;
        </div>
      </div>

      {/* 2. เล่นเสียงในแดชบอร์ดโดยตรง (In-Dashboard Audio) */}
      <div className="flex items-center justify-between gap-4 p-3.5 bg-[#181b24] border border-[#1e222d] rounded-lg">
        <div>
          <div className="text-sm font-semibold text-slate-100">
            เล่นเสียงในแดชบอร์ดโดยตรง (In-Dashboard Audio)
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            เปิดให้เสียงดังในหูฟังของสตรีมเมอร์ผ่านเว็บเบราว์เซอร์นี้ทันที{" "}
            <span className="text-amber-400/90">
              (ปิดหากเปิดเสียงผ่าน OBS Desktop Audio เพื่อป้องกันเสียงสะท้อน)
            </span>
          </div>
        </div>
        <ToggleSwitch
          ariaLabel="เล่นเสียงในแดชบอร์ดโดยตรง (In-Dashboard Audio)"
          checked={settings.inDashboardAudio}
          onChange={(checked) => onUpdate({ inDashboardAudio: checked })}
        />
      </div>

      {/* 3. ระดับเสียง (Volume Slider) */}
      <div className="flex flex-col gap-2 p-3.5 bg-[#181b24] border border-[#1e222d] rounded-lg">
        <div className="flex items-center justify-between">
          <label
            htmlFor="volume-slider"
            className="text-sm font-semibold text-slate-100"
          >
            ระดับเสียง (Volume)
          </label>
          <span className="text-xs font-bold font-mono text-[#fe2c55] bg-[#fe2c55]/10 px-2.5 py-0.5 rounded-full border border-[#fe2c55]/30">
            {volumePercent}%
          </span>
        </div>
        <input
          id="volume-slider"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={settings.volume}
          onChange={(e) =>
            onUpdate({ volume: Math.round(parseFloat(e.target.value) * 100) / 100 })
          }
          className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#fe2c55]"
        />
        <div className="text-xs text-slate-400">
          ควบคุมระดับเสียงสังเคราะห์ Text-to-Speech (TTS) ในแดชบอร์ดและ Overlay
        </div>
      </div>
    </div>
  );
}
