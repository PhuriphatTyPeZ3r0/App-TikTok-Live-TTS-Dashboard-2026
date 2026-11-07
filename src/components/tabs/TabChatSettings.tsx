"use client";

/**
 * TabChatSettings Component
 *
 * TikFinity-style Chat Text-to-Speech (TTS) configuration tab.
 * Allows streamers to configure comment ingestion, username prefixing,
 * anti-spam heuristic filters, maximum character truncations, and per-user cooldown limits.
 */

import React from "react";
import { TikFinitySettings } from "../../types/tikfinity";
import { ToggleSwitch } from "./ToggleSwitch";

export interface TabChatSettingsProps {
  settings: TikFinitySettings;
  onUpdate: (partial: Partial<TikFinitySettings>) => void;
}

export function TabChatSettings({ settings, onUpdate }: TabChatSettingsProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* 1. เปิดใช้งาน Chat TTS */}
      <div className="flex items-center justify-between gap-4 p-3.5 bg-[#181b24] border border-[#1e222d] rounded-lg">
        <div className="text-sm font-semibold text-slate-100">
          เปิดใช้งาน Chat TTS
        </div>
        <ToggleSwitch
          ariaLabel="เปิดใช้งาน Chat TTS"
          checked={settings.chatTtsEnabled}
          onChange={(checked) => onUpdate({ chatTtsEnabled: checked })}
        />
      </div>

      {/* 2. อ่านชื่อผู้ส่งข้อความ (Read Username) */}
      <div className="flex items-center justify-between gap-4 p-3.5 bg-[#181b24] border border-[#1e222d] rounded-lg">
        <div className="text-sm font-semibold text-slate-100">
          อ่านชื่อผู้ส่งข้อความ (Read Username)
        </div>
        <ToggleSwitch
          ariaLabel="อ่านชื่อผู้ส่งข้อความ (Read Username)"
          checked={settings.readUsername}
          onChange={(checked) => onUpdate({ readUsername: checked })}
        />
      </div>

      {/* 3. กรองตัวอักษรลากยาวและตัดลิงก์ (Anti-Spam) */}
      <div className="flex items-center justify-between gap-4 p-3.5 bg-[#181b24] border border-[#1e222d] rounded-lg">
        <div className="text-sm font-semibold text-slate-100">
          กรองตัวอักษรลากยาวและตัดลิงก์ (Anti-Spam)
        </div>
        <ToggleSwitch
          ariaLabel="กรองตัวอักษรลากยาวและตัดลิงก์ (Anti-Spam)"
          checked={settings.antiSpamEnabled}
          onChange={(checked) => onUpdate({ antiSpamEnabled: checked })}
        />
      </div>

      {/* 4. จำกัดความยาวสูงสุด (Max Characters) */}
      <div className="flex flex-col gap-2 p-3.5 bg-[#181b24] border border-[#1e222d] rounded-lg">
        <div className="flex items-center justify-between">
          <label
            htmlFor="max-characters-slider"
            className="text-sm font-semibold text-slate-100"
          >
            จำกัดความยาวสูงสุด (Max Characters)
          </label>
          <span className="text-xs font-bold font-mono text-[#fe2c55] bg-[#fe2c55]/10 px-2.5 py-0.5 rounded-full border border-[#fe2c55]/30">
            {settings.maxCharacters} ตัวอักษร
          </span>
        </div>
        <input
          id="max-characters-slider"
          type="range"
          min={30}
          max={250}
          step={1}
          value={settings.maxCharacters}
          onChange={(e) =>
            onUpdate({ maxCharacters: parseInt(e.target.value, 10) })
          }
          className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#fe2c55]"
        />
      </div>

      {/* 5. คูลดาวน์รายคน (User Cooldown) */}
      <div className="flex flex-col gap-2 p-3.5 bg-[#181b24] border border-[#1e222d] rounded-lg">
        <label
          htmlFor="user-cooldown-input"
          className="text-sm font-semibold text-slate-100"
        >
          คูลดาวน์รายคน (User Cooldown)
        </label>
        <div className="flex items-center gap-3">
          <input
            id="user-cooldown-input"
            type="number"
            min={0}
            max={300}
            value={settings.userCooldownSeconds}
            onChange={(e) =>
              onUpdate({
                userCooldownSeconds: Math.max(0, parseInt(e.target.value, 10) || 0),
              })
            }
            className="w-24 bg-[#12141a] border border-[#1e222d] text-slate-100 font-mono rounded-lg px-3 py-2 text-sm focus:border-[#fe2c55] focus:outline-none transition-colors"
          />
          <span className="text-xs text-slate-400">
            วินาทีต่อคน
          </span>
        </div>
      </div>
    </div>
  );
}
