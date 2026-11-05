"use client";

/**
 * TabGiftSettings Component
 *
 * TikFinity-style Gift Text-to-Speech (TTS) and Alert configuration tab.
 * Allows streamers to configure gift TTS alerts, priority queue bypass,
 * minimum coin thresholds, and personalized appreciation templates.
 */

import React from "react";
import { TikFinitySettings } from "../../types/tikfinity";
import { ToggleSwitch } from "./ToggleSwitch";

export interface TabGiftSettingsProps {
  settings: TikFinitySettings;
  onUpdate: (partial: Partial<TikFinitySettings>) => void;
}

export function TabGiftSettings({ settings, onUpdate }: TabGiftSettingsProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* 1. เปิดใช้งาน Gift TTS Alerts */}
      <div className="flex items-center justify-between gap-4 p-3.5 bg-[#181b24] border border-[#1e222d] rounded-lg">
        <div>
          <div className="text-sm font-semibold text-slate-100">
            เปิดใช้งาน Gift TTS Alerts
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            อ่านข้อความขอบคุณอัตโนมัติเมื่อมีผู้ชมส่งของขวัญ
          </div>
        </div>
        <ToggleSwitch
          ariaLabel="เปิดใช้งาน Gift TTS Alerts"
          checked={settings.giftTtsEnabled}
          onChange={(checked) => onUpdate({ giftTtsEnabled: checked })}
        />
      </div>

      {/* 2. Priority Queue Banner/Toggle */}
      <div className="flex items-center justify-between gap-4 p-3.5 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-400">
        <div>
          <div className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
            <span>⚡ Priority Queue (คิวบุริมภาพ)</span>
          </div>
          <div className="text-xs text-amber-200/80 mt-0.5">
            ให้เสียงของขวัญ Gift TTS แทรกคิวแซงหน้า Chat ทันที
          </div>
        </div>
        <ToggleSwitch
          ariaLabel="⚡ Priority Queue (คิวบุริมภาพ)"
          checked={settings.giftPriorityQueue}
          onChange={(checked) => onUpdate({ giftPriorityQueue: checked })}
        />
      </div>

      {/* 3. เกณฑ์เหรียญขั้นต่ำ (Minimum Coin Threshold) */}
      <div className="flex flex-col gap-2 p-3.5 bg-[#181b24] border border-[#1e222d] rounded-lg">
        <label
          htmlFor="gift-min-coins-input"
          className="text-sm font-semibold text-slate-100"
        >
          เกณฑ์เหรียญขั้นต่ำ (Minimum Coin Threshold)
        </label>
        <div className="flex items-center gap-3">
          <input
            id="gift-min-coins-input"
            type="number"
            min={1}
            max={100000}
            value={settings.giftMinCoins}
            onChange={(e) =>
              onUpdate({
                giftMinCoins: Math.max(1, parseInt(e.target.value, 10) || 1),
              })
            }
            className="w-24 bg-[#12141a] border border-[#1e222d] text-slate-100 font-mono rounded-lg px-3 py-2 text-sm focus:border-[#fe2c55] focus:outline-none transition-colors"
          />
          <span className="text-xs text-slate-400">
            เหรียญขึ้นไป (Coin) จึงจะส่งเสียงอ่าน
          </span>
        </div>
      </div>

      {/* 4. แม่แบบข้อความขอบคุณ (Gift Template) */}
      <div className="flex flex-col gap-2 p-3.5 bg-[#181b24] border border-[#1e222d] rounded-lg">
        <label
          htmlFor="gift-template-input"
          className="text-sm font-semibold text-slate-100"
        >
          แม่แบบข้อความขอบคุณ (Gift Template)
        </label>
        <input
          id="gift-template-input"
          type="text"
          value={settings.giftTemplate}
          onChange={(e) => onUpdate({ giftTemplate: e.target.value })}
          placeholder="ขอบคุณคุณ {user} ที่ส่ง {amount}x {gift} ให้ยูตะนะครับ!"
          className="w-full bg-[#12141a] border border-[#1e222d] text-slate-100 rounded-lg px-3.5 py-2.5 text-sm focus:border-[#fe2c55] focus:outline-none transition-colors"
        />
        <div className="text-xs text-slate-400">
          ตัวแปรที่ใช้ได้: <span className="text-[#25f4ee] font-mono">{"{user}"}</span> = ชื่อผู้ส่ง,{" "}
          <span className="text-[#25f4ee] font-mono">{"{gift}"}</span> = ชื่อของขวัญ,{" "}
          <span className="text-[#25f4ee] font-mono">{"{amount}"}</span> = จำนวนชิ้น
        </div>
      </div>
    </div>
  );
}
