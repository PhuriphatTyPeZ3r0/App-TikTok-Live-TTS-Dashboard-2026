"use client";

/**
 * ============================================================================
 * StreamVox Live — Live FIFO Speech Queue Page (Next.js 15 App Router)
 * ============================================================================
 *
 * Dedicated First-In, First-Out (FIFO) queue management and live playback console.
 * Communicates with FastAPI Asynchronous Server Gateway Interface (ASGI) backend.
 *
 * Layout Specification:
 * - Flowbite AppShell layout wrapper
 * - Active Speaker Spotlight Card (`NowSpeakingCard`) with 8-bar audio waveform
 * - Queue Management Toolbar:
 *     - Event Type Filter: All / Chat / Gifts (คัดกรองตามประเภทเหตุการณ์)
 *     - Free-text search filter by username or message text
 *     - Manual test message injection (Test Chat & Test Gift)
 *     - Batch queue purge ("ล้างคิวทั้งหมด")
 * - High-density FIFO Queue Feed with individual item deletion
 *
 * Full Academic Terminology & Acronyms:
 * - User Interface (UI)
 * - User Experience (UX)
 * - Design System (DS)
 * - Web Content Accessibility Guidelines (WCAG)
 * - Single-Page Application (SPA)
 * - Asynchronous Server Gateway Interface (ASGI)
 * - First-In, First-Out (FIFO)
 * - Open Broadcaster Software (OBS)
 * - Text-to-Speech (TTS)
 * - Role-Based Access Control (RBAC)
 * - Application Programming Interface (API)
 *
 * Master Thai Voice Actor Attribution:
 * Dedicated to Master Voice Actor คุณพิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert).
 * Official voice model for StreamVox Live Text-to-Speech (TTS) live streaming systems.
 * ============================================================================
 */

import React, { useState, useMemo } from "react";
import { AppShell } from "../../components/AppShell";
import { NowSpeakingCard } from "../../components/NowSpeakingCard";
import { useDashboard } from "../../context/DashboardContext";
import {
  ListOrdered,
  Search,
  Trash2,
  Plus,
  MessageSquare,
  Sparkles,
  Gift,
  X,
  Filter,
} from "lucide-react";

type QueueFilterType = "all" | "chat" | "gift";

export default function QueuePage(): React.JSX.Element {
  const dashboard = useDashboard();
  const [filterType, setFilterType] = useState<QueueFilterType>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Filtered queue items based on category and search query
  const filteredQueue = useMemo(() => {
    return dashboard.queue.filter((item) => {
      // Category filter
      if (filterType === "chat" && item.isGift) return false;
      if (filterType === "gift" && !item.isGift) return false;

      // Text search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesUser = item.username.toLowerCase().includes(query);
        const matchesText = item.text.toLowerCase().includes(query);
        return matchesUser || matchesText;
      }
      return true;
    });
  }, [dashboard.queue, filterType, searchQuery]);

  // Inject sample test message into FIFO queue
  const handleInjectTest = (isGift: boolean) => {
    if (isGift) {
      dashboard.addQueueItem({
        username: "VIP_Supporter",
        text: "ส่ง Rose 1 ชิ้น ขอบคุณสำหรับคอนเทนต์ดีๆ ครับ",
        isGift: true,
        giftName: "Rose",
        giftAmount: 1,
        coins: 1,
      });
    } else {
      dashboard.addQueueItem({
        username: "Viewer_TikTok",
        text: "สวัสดีครับคุณพิพัฒน์ ระบบเสียงสังเคราะห์ทำงานลื่นไหลมาก",
        isGift: false,
      });
    }
  };

  return (
    <AppShell>
      {/* 1. Active Speaker Spotlight Card */}
      <NowSpeakingCard
        currentSpeaker={dashboard.currentSpeaker}
        isPlaying={dashboard.isPlaying}
        isPaused={dashboard.isPaused}
        onSkip={dashboard.skipCurrent}
        onTogglePause={dashboard.togglePause}
        onClearQueue={dashboard.clearQueue}
      />

      {/* 2. Queue Management Control Header */}
      <div className="bg-[#161822] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col gap-4">
        {/* Top Controls Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <ListOrdered className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>คิวสังเคราะห์เสียงพูด (FIFO Queue)</span>
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300 border border-slate-700/60">
                  {dashboard.queue.length} รายการ
                </span>
              </h2>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => handleInjectTest(false)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium bg-[#1e222d] hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors min-h-[36px]"
              title="เพิ่มข้อความแชททดสอบลงในคิว"
            >
              <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
              <span>+ เทสต์แชท</span>
            </button>
            <button
              type="button"
              onClick={() => handleInjectTest(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium bg-[#1e222d] hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors min-h-[36px]"
              title="เพิ่มของขวัญทดสอบลงในคิวบุริมภาพ"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>+ เทสต์กิฟต์</span>
            </button>
            {dashboard.queue.length > 0 && (
              <button
                type="button"
                onClick={dashboard.clearQueue}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1.5 transition-colors min-h-[36px]"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>ล้างคิว</span>
              </button>
            )}
          </div>
        </div>

        {/* Filters & Search Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Segmented Filter Control */}
          <div className="inline-flex rounded-xl bg-[#0f1117] p-1 border border-slate-800 self-start">
            <button
              type="button"
              onClick={() => setFilterType("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterType === "all"
                  ? "bg-slate-700 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              ทั้งหมด ({dashboard.queue.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("chat")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterType === "chat"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              แชท ({dashboard.queue.filter((i) => !i.isGift).length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("gift")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterType === "gift"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              ของขวัญ ({dashboard.queue.filter((i) => i.isGift).length})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อผู้ใช้หรือข้อความ..."
              className="w-full pl-8 pr-8 py-1.5 rounded-xl bg-[#0f1117] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* 3. Filtered Queue List */}
        <div className="space-y-2 mt-1">
          {filteredQueue.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center text-slate-500 gap-2 border border-dashed border-slate-800/80 rounded-xl">
              <span className="material-symbols-rounded text-3xl text-slate-600">
                inbox
              </span>
              <p className="text-xs">ไม่มีรายการค้างในคิว FIFO</p>
            </div>
          ) : (
            filteredQueue.map((item, index) => {
              const isGift = Boolean(item.isGift);
              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-colors ${
                    isGift
                      ? "bg-amber-500/5 border-amber-500/30 hover:border-amber-500/50"
                      : "bg-[#0f1117] border-slate-800/80 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="text-[10px] font-mono text-slate-500 w-5 text-right select-none">
                      #{index + 1}
                    </span>

                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isGift
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-cyan-500/20 text-cyan-400"
                      }`}
                    >
                      {isGift ? (
                        <Sparkles className="w-4 h-4" />
                      ) : (
                        <MessageSquare className="w-4 h-4" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white truncate">
                          {item.username}
                        </span>
                        {isGift && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            VIP GIFT
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 truncate mt-0.5">
                        {item.text}
                      </p>
                    </div>
                  </div>

                  {/* Delete Item Button */}
                  <button
                    type="button"
                    onClick={() => dashboard.deleteQueueItem(item.id)}
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors flex-shrink-0 min-h-[36px] min-w-[36px] flex items-center justify-center"
                    title="ลบรายการนี้ออกจากคิว"
                    aria-label={`ลบข้อความของ ${item.username}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </AppShell>
  );
}
