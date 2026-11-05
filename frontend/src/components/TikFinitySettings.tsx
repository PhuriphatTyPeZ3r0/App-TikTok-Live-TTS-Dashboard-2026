"use client";

/**
 * TikFinitySettings Component
 *
 * TikFinity-style Tabbed Settings Panel for TikTok Live Text-to-Speech (TTS) stream console.
 * Implements dark glassmorphism styling and sub-tabs for Chat TTS, Gift Alerts & TTS,
 * Safety & Filters, and Open Broadcaster Software (OBS Studio) Integration.
 */

import React, { useState } from "react";
import { TikFinitySettings as TikFinitySettingsType } from "../types/tikfinity";
import { TabChatSettings } from "./tabs/TabChatSettings";
import { TabGiftSettings } from "./tabs/TabGiftSettings";
import { TabSafetySettings } from "./tabs/TabSafetySettings";
import { TabObsSettings } from "./tabs/TabObsSettings";

export type SettingsTabId = "chat" | "gift" | "safety" | "obs";

export interface TikFinitySettingsProps {
  settings: TikFinitySettingsType;
  onUpdate: (partial: Partial<TikFinitySettingsType>) => void;
  sessionId?: string;
  className?: string;
}

interface TabDefinition {
  id: SettingsTabId;
  label: string;
}

const TABS: TabDefinition[] = [
  { id: "chat", label: "💬 Chat TTS" },
  { id: "gift", label: "🎁 Gift Alerts & TTS" },
  { id: "safety", label: "🛡️ Safety & Filters" },
  { id: "obs", label: "📺 OBS & Output" },
];

export function TikFinitySettings({
  settings,
  onUpdate,
  sessionId,
  className = "",
}: TikFinitySettingsProps) {
  const [activeTab, setActiveTab] = useState<SettingsTabId>("chat");

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
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="flex flex-col">
        {activeTab === "chat" && (
          <TabChatSettings settings={settings} onUpdate={onUpdate} />
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
