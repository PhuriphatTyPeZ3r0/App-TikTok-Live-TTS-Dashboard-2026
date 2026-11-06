"use client";

/**
 * TikFinitySettings Component for StreamVox Live.
 *
 * StreamVox Live & TikFinity-style Tabbed Settings Panel for TikTok Live Text-to-Speech (TTS)
 * stream console. Implements dark glassmorphism styling, embedded Multi-Voice Selector,
 * and sub-tabs for Chat TTS, Voice Profiles (โมเดลเสียง), Gift Alerts & TTS,
 * Safety & Filters, and Open Broadcaster Software (OBS Studio) Integration.
 *
 * Voice Actor Attribution: พิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)
 */

import React, { useState } from "react";
import {
  TikFinitySettings as TikFinitySettingsType,
  VoiceTuningConfig,
} from "../types/tikfinity";
import { VoiceSelector } from "./VoiceSelector";
import { TabChatSettings } from "./tabs/TabChatSettings";
import { TabGiftSettings } from "./tabs/TabGiftSettings";
import { TabSafetySettings } from "./tabs/TabSafetySettings";
import { TabObsSettings } from "./tabs/TabObsSettings";

export type SettingsTabId = "chat" | "voices" | "gift" | "safety" | "obs";

export interface TikFinitySettingsProps {
  settings: TikFinitySettingsType;
  onUpdate: (partial: Partial<TikFinitySettingsType>) => void;
  onSelectVoice?: (voiceId: string) => void;
  onChangeTuning?: (voiceId: string, tuning: VoiceTuningConfig) => void;
  onTestVoice?: (voiceId: string, sampleText: string) => void | Promise<any>;
  backendUrl?: string;
  testingVoiceId?: string | null;
  sessionId?: string;
  className?: string;
}

interface TabDefinition {
  id: SettingsTabId;
  label: string;
  icon: string;
}

const TABS: TabDefinition[] = [
  { id: "chat", label: "Chat TTS", icon: "chat" },
  { id: "voices", label: "Voice Profiles (โมเดลเสียง)", icon: "record_voice_over" },
  { id: "gift", label: "Gift Alerts & TTS", icon: "redeem" },
  { id: "safety", label: "Safety & Filters", icon: "shield" },
  { id: "obs", label: "OBS & Output", icon: "live_tv" },
];

export function TikFinitySettings({
  settings,
  onUpdate,
  onSelectVoice,
  onChangeTuning,
  onTestVoice,
  backendUrl = "",
  testingVoiceId = null,
  sessionId,
  className = "",
}: TikFinitySettingsProps) {
  const [activeTab, setActiveTab] = useState<SettingsTabId>("chat");

  const handleVoiceChange = (voiceId: string) => {
    onUpdate({ selectedVoiceId: voiceId });
    onSelectVoice?.(voiceId);
  };

  const handleTuningChange = (voiceId: string, tuning: VoiceTuningConfig) => {
    const nextTunings = { ...(settings.voiceTunings || {}), [voiceId]: tuning };
    onUpdate({ voiceTunings: nextTunings });
    onChangeTuning?.(voiceId, tuning);
  };

  return (
    <div
      className={`bg-[#12141a] border border-[#1e222d] rounded-2xl p-5 shadow-2xl flex flex-col gap-5 ${className}`}
    >
      {/* Tabs Header */}
      <div className="flex gap-2 border-b border-[#1e222d] pb-3.5 overflow-x-auto scrollbar-none">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 border whitespace-nowrap flex items-center gap-2 ${
                isActive
                  ? "bg-[#fe2c55]/10 text-white border-[#fe2c55]/40 shadow-[0_0_12px_rgba(254,44,85,0.15)]"
                  : "bg-transparent text-slate-400 border-transparent hover:text-slate-200 hover:bg-white/[0.04]"
              }`}
            >
              <span className="material-symbols-rounded text-base leading-none select-none">
                {tab.icon}
              </span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="flex flex-col gap-5">
        {activeTab === "chat" && (
          <>
            <VoiceSelector
              selectedVoiceId={settings.selectedVoiceId || "yuta"}
              onSelectVoice={handleVoiceChange}
              voiceTunings={settings.voiceTunings}
              onChangeTuning={handleTuningChange}
              onTestVoice={onTestVoice}
              backendUrl={backendUrl}
              testingVoiceId={testingVoiceId}
            />
            <div className="border-t border-[#1e222d] pt-4">
              <TabChatSettings settings={settings} onUpdate={onUpdate} />
            </div>
          </>
        )}
        {activeTab === "voices" && (
          <VoiceSelector
            selectedVoiceId={settings.selectedVoiceId || "yuta"}
            onSelectVoice={handleVoiceChange}
            voiceTunings={settings.voiceTunings}
            onChangeTuning={handleTuningChange}
            onTestVoice={onTestVoice}
            backendUrl={backendUrl}
            testingVoiceId={testingVoiceId}
          />
        )}
        {activeTab === "gift" && (
          <TabGiftSettings settings={settings} onUpdate={onUpdate} />
        )}
        {activeTab === "safety" && (
          <TabSafetySettings settings={settings} onUpdate={onUpdate} />
        )}
        {activeTab === "obs" && (
          <TabObsSettings
            settings={settings}
            onUpdate={onUpdate}
            sessionId={sessionId}
          />
        )}
      </div>
    </div>
  );
}

export default TikFinitySettings;
