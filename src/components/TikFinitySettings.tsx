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
import { TabLogMonitor } from "./tabs/TabLogMonitor";

export type SettingsTabId = "chat" | "voices" | "gift" | "safety" | "obs" | "logs";

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
  /** Active subtab id when controlled externally (e.g. from Sidebar). */
  activeTab?: SettingsTabId;
  /** Callback invoked when the active subtab changes. */
  onTabChange?: (tab: SettingsTabId) => void;
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
  { id: "logs", label: "Logs", icon: "terminal" },
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
  activeTab: controlledTab,
  onTabChange,
  isSyncing = false,
  isCloudSyncActive = false,
  lastSyncedAt = null,
  syncError = null,
  onManualSync,
}: TikFinitySettingsProps) {
  const [internalTab, setInternalTab] = useState<SettingsTabId>("chat");
  const currentTab = controlledTab !== undefined ? controlledTab : internalTab;
  const activeTab = currentTab;

  const handleTabSelect = (tabId: SettingsTabId) => {
    setInternalTab(tabId);
    onTabChange?.(tabId);
  };

  const handleVoiceChange = (voiceId: string) => {
    onUpdate({ selectedVoiceId: voiceId });
    onSelectVoice?.(voiceId);
  };

  const handleTuningChange = (voiceId: string, tuning: VoiceTuningConfig) => {
    const nextTunings = { ...(settings.voiceTunings || {}), [voiceId]: tuning };
    onUpdate({ voiceTunings: nextTunings });
    onChangeTuning?.(voiceId, tuning);
  };

  const currentTabDef = TABS.find((tab) => tab.id === currentTab);

  return (
    <div
      className={`bg-card text-card-foreground border border-border rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col gap-5 ${className}`}
    >
      {/* Section Header with Active Sidebar Tab Indicator & Cloud Sync Status Badge */}
      <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
            <span className="material-symbols-rounded text-lg select-none">
              {currentTabDef?.icon || "tune"}
            </span>
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-semibold text-foreground flex items-center gap-2">
              <span>{currentTabDef?.label || "การตั้งค่าระบบ (Studio Settings)"}</span>
            </h2>
            <p className="text-[11px] text-muted-foreground">
              ควบคุมผ่านแถบนำทางหลัก (Controlled via Main Sidebar Navigation)
            </p>
          </div>
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
        {activeTab === "logs" && (
          <TabLogMonitor backendUrl={backendUrl} />
        )}
      </div>
    </div>
  );
}

export default TikFinitySettings;
