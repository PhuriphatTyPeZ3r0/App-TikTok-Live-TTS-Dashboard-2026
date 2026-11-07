"use client";

/**
 * TikFinitySettings Component for StreamVox Live.
 *
 * StreamVox Live & TikFinity-style Tabbed Settings Panel for TikTok Live Text-to-Speech (TTS)
 * stream console. Implements dark glassmorphism styling, embedded Multi-Voice Selector,
 * and sub-tabs for Chat TTS, Voice Profiles (โมเดลเสียง), Gift Alerts & TTS,
 * Safety & Filters, and Open Broadcaster Software (OBS Studio) Integration.
 *
 * Provides real-time visual indicator for cloud settings synchronization powered by
 * Supabase PostgreSQL public.user_profiles with Row Level Security (RLS) and Role-Based
 * Access Control (RBAC).
 *
 * Voice Actor Attribution: พิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)
 *
 * Mandatory Academic Terminology & Acronyms:
 * - Role-Based Access Control (RBAC)
 * - Row Level Security (RLS)
 * - Universally Unique Identifier (UUID)
 * - Application Programming Interface (API)
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
  overlayToken?: string;
  className?: string;
  /** Whether cloud synchronization is actively persisting updates. */
  isSyncing?: boolean;
  /** Whether cloud synchronization is active (authenticated session with Supabase). */
  isCloudSyncActive?: boolean;
  /** Timestamp of the most recent successful cloud synchronization. */
  lastSyncedAt?: Date | null;
  /** Diagnostic error message if cloud synchronization failed. */
  syncError?: string | null;
  /** Trigger manual cloud synchronization. */
  onManualSync?: () => Promise<void>;
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
  overlayToken = "",
  className = "",
  isSyncing = false,
  isCloudSyncActive = false,
  lastSyncedAt = null,
  syncError = null,
  onManualSync,
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
      {/* Tabs Header with Cloud Sync Status Badge */}
      <div className="flex items-center justify-between gap-3 border-b border-[#1e222d] pb-3.5">
        <div className="flex gap-2 overflow-x-auto scrollbar-none flex-1">
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

        {/* Cloud Sync Status Badge */}
        <div className="shrink-0 flex items-center">
          {isSyncing ? (
            <div
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#25f4ee]/10 text-[#25f4ee] border border-[#25f4ee]/30 shadow-[0_0_8px_rgba(37,244,238,0.2)] animate-pulse"
              title="Synchronizing settings to Supabase cloud profile..."
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#25f4ee]" />
              <span>Syncing...</span>
            </div>
          ) : syncError ? (
            <button
              type="button"
              onClick={onManualSync}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 transition-all cursor-pointer shadow-sm"
              title={`Sync Error: ${syncError} (Click to retry manual sync)`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              <span>Sync Error</span>
            </button>
          ) : isCloudSyncActive ? (
            <button
              type="button"
              onClick={onManualSync}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all cursor-pointer shadow-sm"
              title={
                lastSyncedAt
                  ? `Cloud Synced: Last saved at ${lastSyncedAt.toLocaleTimeString()} (Click to sync now)`
                  : "Cloud Synced: All settings saved to Supabase (Click to sync now)"
              }
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Cloud Synced</span>
            </button>
          ) : (
            <div
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#181b24] text-slate-400 border border-[#1e222d]"
              title="Running in local storage mode (Supabase unauthenticated or offline)"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
              <span>Local Storage</span>
            </div>
          )}
        </div>
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
            backendUrl={backendUrl}
            overlayToken={overlayToken}
          />
        )}
      </div>
    </div>
  );
}

export default TikFinitySettings;
