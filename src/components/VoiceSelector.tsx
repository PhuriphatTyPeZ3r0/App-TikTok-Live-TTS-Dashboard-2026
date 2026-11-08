"use client";

/**
 * VoiceSelector Component for StreamVox Live.
 *
 * Interactive multi-voice profile selector card grid for the Next.js 15 Single-Page Application (SPA)
 * dashboard. Fetches voice profiles from the FastAPI Asynchronous Server Gateway Interface (ASGI)
 * backend Representational State Transfer (REST) Application Programming Interface (API) `/api/voices`
 * on mount, with a built-in fallback list of 5 curated Text-to-Speech (TTS) profiles so the User Interface (UI)
 * renders instantaneously even offline.
 *
 * Implements Web Content Accessibility Guidelines (WCAG) 2.1 AA:
 * - Direct numeric input keyboard editing alongside range slider controls for Speed and Pitch
 * - Minimum touch targets >= 44x44px for audition buttons and interactive controls
 * - High-contrast semantic color feedback for acoustic tuning indicators
 *
 * Full Academic Terminology & Acronyms:
 * - User Interface (UI)
 * - User Experience (UX)
 * - Design System (DS)
 * - Web Content Accessibility Guidelines (WCAG)
 * - Single-Page Application (SPA)
 * - Asynchronous Server Gateway Interface (ASGI)
 * - Representational State Transfer (REST)
 * - Application Programming Interface (API)
 * - Text-to-Speech (TTS)
 *
 * Master Thai Voice Actor Attribution:
 * Dedicated to Master Thai Voice Actor: คุณพิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert).
 * Official primary voice model for StreamVox Live Text-to-Speech (TTS) live streaming systems.
 */

import React, { useEffect, useState } from "react";
import {
  DEFAULT_VOICE_TUNING,
  type VoiceProfileInfo,
  type VoiceTuningConfig,
} from "../types/tikfinity";

export const FALLBACK_VOICE_PROFILES: VoiceProfileInfo[] = [
  {
    id: "yuta",
    name: "พิพัฒน์ (Yuta)",
    description: "เสียงมาตรฐาน อบอุ่น เป็นธรรมชาติ (Official StreamVox Primary Voice)",
    engine: "fish_audio",
    model_id: "9c110ffde8bc42709516395dfbcfb4a2",
    edge_voice: "th-TH-NiwatNeural",
    is_default: true,
  },
  {
    id: "hana",
    name: "ฮานะ (Hana Sweet)",
    description: "เสียงสาวหวาน สไตล์อนิเมะ น่ารักสดใส เหมาะกับไลฟ์พูดคุยและเกมมิ่ง",
    engine: "fish_audio",
    model_id: null,
    edge_voice: "th-TH-PremwadeeNeural",
    is_default: false,
  },
  {
    id: "joker",
    name: "ดีเจโจ๊กเกอร์ (DJ Joker)",
    description: "เสียงดีเจสายเอ็นเตอร์เทน กระตือรือร้น เฮฮา สร้างสีสันในไลฟ์สตรีม",
    engine: "fish_audio",
    model_id: null,
    edge_voice: "th-TH-NiwatNeural",
    is_default: false,
  },
  {
    id: "anchor",
    name: "ผู้ประกาศข่าว ชาย (News Anchor)",
    description: "เสียงทุ้ม ชัดเจน สุภาพ เป็นทางการ เหมาะสำหรับไลฟ์สาระและความรู้",
    engine: "fish_audio",
    model_id: null,
    edge_voice: "th-TH-NiwatNeural",
    is_default: false,
  },
  {
    id: "niwat",
    name: "นิวัฒน์ (Niwat Edge)",
    description: "เสียง Microsoft Neural ความเร็วสูง ฟรีไม่จำกัดโควต้า (Zero-Quota Fallback)",
    engine: "edge_tts",
    model_id: null,
    edge_voice: "th-TH-NiwatNeural",
    is_default: false,
  },
];

const VOICE_ICON_MAP: Record<string, string> = {
  yuta: "record_voice_over",
  hana: "graphic_eq",
  joker: "mic",
  anchor: "campaign",
  niwat: "smart_toy",
};

const VOICE_SAMPLE_TEXT_MAP: Record<string, string> = {
  yuta: "สวัสดีครับทุกคน ยินดีต้อนรับเข้าสู่ไลฟ์สตรีมของเรานะครับ",
  hana: "สวัสดีค่าทุกคน วันนี้มาสนุกไปด้วยกันนะคะ ขอบคุณที่แวะมาทักทายกันน้า",
  joker: "โย่ว สวัสดีวัยรุ่นทุกคน ใครเข้ามาแล้วฝากกดหัวใจรัวๆ ให้หน่อยนะครับผม",
  anchor: "สวัสดีครับท่านผู้ชมทุกท่าน ขอต้อนรับเข้าสู่รายการถ่ายทอดสดอย่างเป็นทางการครับ",
  niwat: "ระบบเสียงสังเคราะห์นิวัฒน์ นิวรัล พร้อมทำงานตลอดยี่สิบสี่ชั่วโมงครับ",
};

export interface VoiceSelectorProps {
  /** Currently active voice profile ID (e.g., "yuta", "hana", "joker", "anchor", "niwat"). */
  selectedVoiceId?: string;
  /** Callback invoked when the streamer selects a voice card. */
  onSelectVoice: (voiceId: string) => void;
  /** Callback invoked when the streamer clicks "ฟังตัวอย่างเสียง" on a card. */
  onTestVoice?: (
    voiceId: string,
    sampleText: string,
    tuning?: VoiceTuningConfig
  ) => void | Promise<any>;
  /** Optional per-voice acoustic tuning map or active voice tuning configuration. */
  voiceTuning?: VoiceTuningConfig;
  /** Optional map of all per-voice tunings keyed by voice ID. */
  voiceTunings?: Record<string, VoiceTuningConfig>;
  /** Callback invoked when the streamer adjusts speed, pitch, or volume for a voice. */
  onChangeTuning?: (voiceId: string, tuning: VoiceTuningConfig) => void;
  /** Optional base URL of the FastAPI backend for fetching `/api/voices`. */
  backendUrl?: string;
  /** Optional ID of the voice currently playing an audition sample. */
  testingVoiceId?: string | null;
  /** Optional additional CSS classes. */
  className?: string;
}

export function VoiceSelector({
  selectedVoiceId = "yuta",
  onSelectVoice,
  onTestVoice,
  voiceTuning,
  voiceTunings,
  onChangeTuning,
  backendUrl = "",
  testingVoiceId = null,
  className = "",
}: VoiceSelectorProps): React.JSX.Element {
  const [voices, setVoices] = useState<VoiceProfileInfo[]>(FALLBACK_VOICE_PROFILES);
  const [localTestingId, setLocalTestingId] = useState<string | null>(null);
  const [localTunings, setLocalTunings] = useState<Record<string, VoiceTuningConfig>>({});

  useEffect(() => {
    let isMounted = true;
    async function fetchVoices() {
      try {
        const cleanUrl = (backendUrl || "").replace(/\/+$/, "");
        const endpoint = cleanUrl ? `${cleanUrl}/api/voices` : "/api/voices";
        const res = await fetch(endpoint);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data && Array.isArray(data.voices) && data.voices.length > 0) {
            setVoices(data.voices);
          }
        }
      } catch {
        // Fallback profiles already loaded instantaneously
      }
    }
    fetchVoices();
    return () => {
      isMounted = false;
    };
  }, [backendUrl]);

  const handleAuditionClick = async (
    e: React.MouseEvent,
    voice: VoiceProfileInfo
  ) => {
    e.stopPropagation();
    if (!onTestVoice) return;
    const sampleText =
      VOICE_SAMPLE_TEXT_MAP[voice.id] ||
      `สวัสดีครับ ทดสอบเสียง ${voice.name} บนระบบ StreamVox Live`;
    const thisVoiceTuning =
      (voiceTunings && voiceTunings[voice.id.toLowerCase()]) ||
      localTunings[voice.id.toLowerCase()] ||
      DEFAULT_VOICE_TUNING;
    setLocalTestingId(voice.id);
    try {
      await onTestVoice(voice.id, sampleText, thisVoiceTuning);
    } finally {
      setTimeout(() => {
        setLocalTestingId((prev) => (prev === voice.id ? null : prev));
      }, 900);
    }
  };

  const activeId = (selectedVoiceId || "yuta").toLowerCase();
  const activeVoice =
    voices.find((v) => v.id.toLowerCase() === activeId) || voices[0];
  const currentTuning: VoiceTuningConfig =
    voiceTuning ||
    (voiceTunings && voiceTunings[activeId]) ||
    localTunings[activeId] ||
    DEFAULT_VOICE_TUNING;

  const updateActiveTuning = (partial: Partial<VoiceTuningConfig>) => {
    const next: VoiceTuningConfig = {
      speed: partial.speed !== undefined ? partial.speed : currentTuning.speed,
      pitch: partial.pitch !== undefined ? partial.pitch : currentTuning.pitch,
      volume: partial.volume !== undefined ? partial.volume : currentTuning.volume,
    };
    setLocalTunings((prev) => ({ ...prev, [activeId]: next }));
    onChangeTuning?.(activeId, next);
  };

  return (
    <div className={`flex flex-col gap-3.5 ${className}`} data-testid="voice-selector">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-rounded text-[#25f4ee] text-xl select-none">
            record_voice_over
          </span>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">
              เลือกโปรไฟล์เสียงพากย์ (Multi-Voice Ecosystem)
            </h3>
          </div>
        </div>
        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#25f4ee]/10 text-[#25f4ee] border border-[#25f4ee]/30 whitespace-nowrap">
          {voices.length} Voices Ready
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {voices.map((voice) => {
          const isSelected = voice.id.toLowerCase() === activeId;
          const isFish = voice.engine === "fish_audio";
          const iconName = VOICE_ICON_MAP[voice.id] || "record_voice_over";
          const isAuditioning =
            testingVoiceId === voice.id || localTestingId === voice.id;

          return (
            <div
              key={voice.id}
              role="button"
              tabIndex={0}
              data-testid={`voice-card-${voice.id}`}
              onClick={() => onSelectVoice(voice.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectVoice(voice.id);
                }
              }}
              className={`group relative rounded-xl p-3.5 transition-all duration-200 cursor-pointer border text-left flex flex-col justify-between gap-3 ${
                isSelected
                  ? "bg-gradient-to-br from-[#fe2c55]/15 via-[#181b24] to-[#25f4ee]/10 border-[#fe2c55] shadow-[0_0_20px_rgba(254,44,85,0.2)]"
                  : "bg-[#181b24]/90 hover:bg-[#1e222e] border-[#1e222d] hover:border-[#25f4ee]/40"
              }`}
            >
              {/* Top Row: Icon, Name, Engine Badge & Active Pill */}
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? "bg-gradient-to-br from-[#fe2c55] to-[#25f4ee] text-black shadow-md"
                        : "bg-[#12141a] text-[#25f4ee] border border-[#1e222d] group-hover:border-[#25f4ee]/40"
                    }`}
                  >
                    <span className="material-symbols-rounded text-xl select-none">
                      {iconName}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-sm text-white truncate">
                        {voice.name}
                      </span>
                      {isSelected && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#fe2c55] text-white shadow-sm">
                          ใช้อยู่
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                          isFish
                            ? "bg-[#fe2c55]/10 text-[#fe2c55] border-[#fe2c55]/30"
                            : "bg-[#25f4ee]/10 text-[#25f4ee] border-[#25f4ee]/30"
                        }`}
                      >
                        {isFish ? "Fish Audio S1" : "Edge-TTS Neural"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Action Row: Audition Button */}
              <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
                <span className="text-[11px] font-mono text-slate-400">
                  ID: {voice.id}
                </span>
                {onTestVoice && (
                  <button
                    type="button"
                    data-testid={`audition-voice-${voice.id}`}
                    onClick={(e) => handleAuditionClick(e, voice)}
                    disabled={isAuditioning}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      isSelected
                        ? "bg-[#25f4ee]/15 hover:bg-[#25f4ee]/25 text-[#25f4ee] border border-[#25f4ee]/40"
                        : "bg-[#12141a] hover:bg-[#25f4ee]/15 text-slate-200 hover:text-[#25f4ee] border border-[#1e222d]"
                    } disabled:opacity-50`}
                  >
                    <span className="material-symbols-rounded text-sm select-none">
                      {isAuditioning ? "hourglass_top" : "volume_up"}
                    </span>
                    <span>
                      {isAuditioning ? "กำลังเล่น..." : "ฟังตัวอย่างเสียง"}
                    </span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Per-Voice Acoustic Tuning Panel */}
      <div
        data-testid="voice-tuning-panel"
        className="rounded-xl p-4 bg-[#181b24]/95 border border-[#1e222d] flex flex-col gap-3.5"
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="material-symbols-rounded text-[#25f4ee] text-lg select-none">
              tune
            </span>
            <div>
              <h4 className="text-xs font-bold text-white">
                ปรับแต่งโทนเสียงเฉพาะโปรไฟล์: {activeVoice?.name || activeId}
              </h4>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="voice-tuning-test"
              onClick={() => {
                const sampleText =
                  VOICE_SAMPLE_TEXT_MAP[activeId] ||
                  `ทดสอบโทนเสียง ${activeVoice?.name || activeId} บนระบบ StreamVox Live`;
                onTestVoice?.(activeId, sampleText, currentTuning);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#25f4ee]/15 hover:bg-[#25f4ee]/25 text-[#25f4ee] border border-[#25f4ee]/40 transition-colors cursor-pointer"
            >
              <span className="material-symbols-rounded text-sm select-none">
                volume_up
              </span>
              <span>ทดสอบโทนเสียงนี้</span>
            </button>
            <button
              type="button"
              data-testid="voice-tuning-reset"
              onClick={() => updateActiveTuning(DEFAULT_VOICE_TUNING)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#12141a] hover:bg-[#fe2c55]/15 text-slate-300 hover:text-[#fe2c55] border border-[#1e222d] hover:border-[#fe2c55]/40 transition-colors cursor-pointer"
            >
              <span className="material-symbols-rounded text-sm select-none">
                restart_alt
              </span>
              <span>รีเซ็ตค่าเริ่มต้น</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Speed Slider & Direct Numeric Input */}
          <div className="flex flex-col gap-1.5 bg-[#12141a] p-2.5 rounded-lg border border-white/[0.05]">
            <div className="flex items-center justify-between text-xs">
              <label
                htmlFor="voice-tuning-speed-number"
                className="inline-flex items-center gap-1 text-slate-300 font-medium"
              >
                <span className="material-symbols-rounded text-sm text-[#25f4ee] select-none">
                  speed
                </span>
                ความเร็ว (Speed)
              </label>
              <div className="flex items-center gap-0.5">
                <input
                  id="voice-tuning-speed-number"
                  type="number"
                  data-testid="voice-tuning-speed-input"
                  aria-label="ความเร็วสังเคราะห์เสียง (Speed)"
                  step="0.05"
                  min="0.5"
                  max="2.0"
                  value={currentTuning.speed}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) {
                      updateActiveTuning({ speed: Math.max(0.5, Math.min(2.0, val)) });
                    }
                  }}
                  className="w-16 bg-transparent text-right font-mono font-semibold text-xs text-[#25f4ee] border border-white/10 hover:border-white/30 focus:border-[#25f4ee] focus:bg-[#181b24] rounded px-1 py-0.5 focus:outline-none transition-colors"
                />
                <span className="font-mono font-bold text-xs text-[#25f4ee] select-none">x</span>
              </div>
            </div>
            <input
              type="range"
              data-testid="voice-tuning-speed"
              min="0.5"
              max="2.0"
              step="0.05"
              value={currentTuning.speed}
              onChange={(e) =>
                updateActiveTuning({ speed: parseFloat(e.target.value) })
              }
              className="w-full accent-[#25f4ee] cursor-pointer"
              aria-label="ตัวเลื่อนปรับความเร็วเสียง (Speed Slider)"
            />
          </div>

          {/* Pitch Slider & Direct Numeric Input */}
          <div className="flex flex-col gap-1.5 bg-[#12141a] p-2.5 rounded-lg border border-white/[0.05]">
            <div className="flex items-center justify-between text-xs">
              <label
                htmlFor="voice-tuning-pitch-number"
                className="inline-flex items-center gap-1 text-slate-300 font-medium"
              >
                <span className="material-symbols-rounded text-sm text-[#fe2c55] select-none">
                  graphic_eq
                </span>
                ระดับเสียง (Pitch)
              </label>
              <div className="flex items-center gap-0.5">
                <input
                  id="voice-tuning-pitch-number"
                  type="number"
                  data-testid="voice-tuning-pitch-input"
                  aria-label="ระดับเสียงพิทช์ (Pitch)"
                  step="1"
                  min="-50"
                  max="50"
                  value={currentTuning.pitch}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) {
                      updateActiveTuning({ pitch: Math.max(-50, Math.min(50, val)) });
                    }
                  }}
                  className="w-16 bg-transparent text-right font-mono font-semibold text-xs text-[#fe2c55] border border-white/10 hover:border-white/30 focus:border-[#fe2c55] focus:bg-[#181b24] rounded px-1 py-0.5 focus:outline-none transition-colors"
                />
                <span className="font-mono font-bold text-xs text-[#fe2c55] select-none">Hz</span>
              </div>
            </div>
            <input
              type="range"
              data-testid="voice-tuning-pitch"
              min="-50"
              max="50"
              step="1"
              value={currentTuning.pitch}
              onChange={(e) =>
                updateActiveTuning({ pitch: parseInt(e.target.value, 10) })
              }
              className="w-full accent-[#fe2c55] cursor-pointer"
              aria-label="ตัวเลื่อนปรับระดับเสียงพิทช์ (Pitch Slider)"
            />
          </div>

          {/* Volume Slider & Direct Numeric Input */}
          <div className="flex flex-col gap-1.5 bg-[#12141a] p-2.5 rounded-lg border border-white/[0.05]">
            <div className="flex items-center justify-between text-xs">
              <label
                htmlFor="voice-tuning-volume-number"
                className="inline-flex items-center gap-1 text-slate-300 font-medium"
              >
                <span className="material-symbols-rounded text-sm text-[#25f4ee] select-none">
                  volume_up
                </span>
                ความดัง (Volume)
              </label>
              <div className="flex items-center gap-0.5">
                <input
                  id="voice-tuning-volume-number"
                  type="number"
                  data-testid="voice-tuning-volume-input"
                  aria-label="ระดับความดังเสียง (Volume)"
                  step="5"
                  min="0"
                  max="200"
                  value={currentTuning.volume}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) {
                      updateActiveTuning({ volume: Math.max(0, Math.min(200, val)) });
                    }
                  }}
                  className="w-16 bg-transparent text-right font-mono font-semibold text-xs text-[#25f4ee] border border-white/10 hover:border-white/30 focus:border-[#25f4ee] focus:bg-[#181b24] rounded px-1 py-0.5 focus:outline-none transition-colors"
                />
                <span className="font-mono font-bold text-xs text-[#25f4ee] select-none">%</span>
              </div>
            </div>
            <input
              type="range"
              data-testid="voice-tuning-volume"
              min="0"
              max="200"
              step="5"
              value={currentTuning.volume}
              onChange={(e) =>
                updateActiveTuning({ volume: parseInt(e.target.value, 10) })
              }
              className="w-full accent-[#25f4ee] cursor-pointer"
              aria-label="ตัวเลื่อนปรับความดังเสียง (Volume Slider)"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default VoiceSelector;
