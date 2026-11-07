"use client";

/**
 * TabSafetySettings Component
 *
 * TikFinity-style Safety, Content Moderation, and Filtering configuration tab.
 * Allows live streamers to define banned profanities/sensitive keywords
 * and maintain a blacklist of restricted usernames for stream safety.
 */

import React, { useState, useEffect } from "react";
import { TikFinitySettings } from "../../types/tikfinity";

export interface TabSafetySettingsProps {
  settings: TikFinitySettings;
  onUpdate: (partial: Partial<TikFinitySettings>) => void;
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function parseCommaSeparated(val: string): string[] {
  return val
    .split(",")
    .map((w) => w.trim())
    .filter((w) => w.length > 0);
}

export function TabSafetySettings({
  settings,
  onUpdate,
}: TabSafetySettingsProps) {
  const [bannedInput, setBannedInput] = useState<string>(
    settings.bannedWords.join(", ")
  );
  const [blacklistInput, setBlacklistInput] = useState<string>(
    settings.blacklistedUsers.join(", ")
  );

  // Sync state ONLY if incoming settings differ from current parsed content
  // to prevent trailing commas and spaces from being swallowed during typing.
  useEffect(() => {
    const currentParsed = parseCommaSeparated(bannedInput);
    if (!arraysEqual(currentParsed, settings.bannedWords)) {
      setBannedInput(settings.bannedWords.join(", "));
    }
  }, [settings.bannedWords]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const currentParsed = parseCommaSeparated(blacklistInput);
    if (!arraysEqual(currentParsed, settings.blacklistedUsers)) {
      setBlacklistInput(settings.blacklistedUsers.join(", "));
    }
  }, [settings.blacklistedUsers]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBannedChange = (val: string) => {
    setBannedInput(val);
    const parsed = parseCommaSeparated(val);
    onUpdate({ bannedWords: parsed });
  };

  const handleBannedBlur = () => {
    const parsed = parseCommaSeparated(bannedInput);
    setBannedInput(parsed.join(", "));
    onUpdate({ bannedWords: parsed });
  };

  const handleBlacklistChange = (val: string) => {
    setBlacklistInput(val);
    const parsed = parseCommaSeparated(val);
    onUpdate({ blacklistedUsers: parsed });
  };

  const handleBlacklistBlur = () => {
    const parsed = parseCommaSeparated(blacklistInput);
    setBlacklistInput(parsed.join(", "));
    onUpdate({ blacklistedUsers: parsed });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 1. คำต้องห้าม / คำหยาบคาย (Banned Words) */}
      <div className="flex flex-col gap-2 p-3.5 bg-[#181b24] border border-[#1e222d] rounded-lg">
        <label
          htmlFor="banned-words-textarea"
          className="text-sm font-semibold text-slate-100"
        >
          คำต้องห้าม / คำหยาบคาย (Banned Words)
        </label>
        <textarea
          id="banned-words-textarea"
          rows={4}
          value={bannedInput}
          onChange={(e) => handleBannedChange(e.target.value)}
          onBlur={handleBannedBlur}
          placeholder="พิมพ์คำที่ห้ามอ่าน โดยคั่นด้วยเครื่องหมายจุลภาค (,) เช่น คำด่า, คำหยาบ, การเมือง..."
          className="w-full bg-[#12141a] border border-[#1e222d] text-slate-100 rounded-lg p-3 text-sm focus:border-[#fe2c55] focus:outline-none transition-colors resize-none leading-relaxed"
        />
      </div>

      {/* 2. รายชื่อผู้ใช้งานที่ถูกบล็อก (Blacklist Users) */}
      <div className="flex flex-col gap-2 p-3.5 bg-[#181b24] border border-[#1e222d] rounded-lg">
        <label
          htmlFor="blacklisted-users-textarea"
          className="text-sm font-semibold text-slate-100"
        >
          รายชื่อผู้ใช้งานที่ถูกบล็อก (Blacklist Users)
        </label>
        <textarea
          id="blacklisted-users-textarea"
          rows={3}
          value={blacklistInput}
          onChange={(e) => handleBlacklistChange(e.target.value)}
          onBlur={handleBlacklistBlur}
          placeholder="ระบุ @username ที่ต้องการตัดสิทธิ์การอ่าน TTS คั่นด้วยจุลภาค"
          className="w-full bg-[#12141a] border border-[#1e222d] text-slate-100 rounded-lg p-3 text-sm focus:border-[#fe2c55] focus:outline-none transition-colors resize-none leading-relaxed"
        />
      </div>
    </div>
  );
}
