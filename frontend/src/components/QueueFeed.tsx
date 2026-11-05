"use client";

/**
 * ============================================================================
 * Red Broadcast Queue Feed Component (Video Grid & Playlist Layout)
 * ============================================================================
 *
 * Professional playlist and video item queue feed visualizer designed for
 * the Red Broadcast design system in Next.js 15 Single-Page Application (SPA).
 * Interfaces with FastAPI Asynchronous Server Gateway Interface (ASGI) backend,
 * Web Audio Application Programming Interface (Web Audio API), Text-to-Speech (TTS)
 * synthesis pipeline, and First-In, First-Out (FIFO) ingestion queue.
 *
 * Voice Actor Attribution: คุณพิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)
 * Master Thai Voice Model for Text-to-Speech (TTS) live streaming systems.
 *
 * Design Specifications:
 * - 36px circular avatar (`h-9 w-9 rounded-full bg-neutral-200 dark:bg-neutral-800`).
 * - Channel / Username in Roboto weight 500 (`text-sm font-medium`).
 * - Message text strictly clamped to 2 lines (`line-clamp-2 text-sm text-[#0F0F0F] dark:text-white`).
 * - Compact metadata line: "X เหรียญ/เพชร • รออ่านในคิว (In Queue)" with secondary text
 *   (`text-xs text-neutral-500 dark:text-neutral-400`).
 * - VIP Gift badges with diamond icon (💎) or gift icon (🎁).
 * - Filter tabs with high-contrast active styling:
 *   `[ ทั้งหมด ]`, `[ เฉพาะของขวัญ 🎁 ]`, `[ แชท 💬 ]`.
 * - Empty queue message exact string: "ไม่มีคิวข้อความรออ่าน (Queue is idle)".
 * - Clear Queue button with exact label "ล้างคิวทั้งหมด" and `onClearQueue` callback.
 * - Flat cards with 1px border (`border-broadcast-border-light dark:border-broadcast-border-dark`),
 *   Elevation Level 0 (no drop shadows).
 * - Broadcast Red (#FF0000) is strictly reserved for live indicators, audio progress bars,
 *   and critical emergency flush actions.
 * ============================================================================
 */

import React, { useState, useMemo } from "react";
import {
  MessageSquare,
  Gift,
  Volume2,
  Trash2,
  ListOrdered,
  Sparkles,
  Gem,
  SkipForward,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { QueueItem, SpeakingItem } from "../types/dashboard";

export interface QueueFeedProps {
  /** First-In, First-Out (FIFO) list of pending speech synthesis items. */
  queue: QueueItem[];
  /** Callback to purge the entire pending queue. */
  onClearQueue?: () => void;
  /** Currently active speaker item, or null if audio pipeline is idle. */
  currentSpeaker?: QueueItem | SpeakingItem | null;
  /** Whether the speech synthesis engine is actively outputting audio. */
  isSpeaking?: boolean;
  /** Callback to skip the currently speaking item. */
  onSkipCurrent?: () => void;
  /** Active filter tab key ('all' | 'gifts' | 'comments'). */
  activeFilter?: string;
  /** Callback when user changes the active filter tab. */
  onSelectFilter?: (filter: string) => void;
  /** Backward-compatible alias for currently active speech synthesis payload. */
  speakingItem?: SpeakingItem | null;
  /** Callback to skip or discard a specific item from the queue by its unique ID. */
  onSkipItem?: (id: string) => void;
  /** Additional Cascading Style Sheets (CSS) classes. */
  className?: string;
}

export function QueueFeed({
  queue,
  onClearQueue,
  currentSpeaker = null,
  isSpeaking = false,
  onSkipCurrent,
  activeFilter,
  onSelectFilter,
  speakingItem = null,
  onSkipItem,
  className = "",
}: QueueFeedProps): React.JSX.Element {
  // Resolve unified active speaker across legacy and Red Broadcast props
  const resolvedSpeaker = currentSpeaker || speakingItem;
  const isCurrentlySpeaking = isSpeaking || Boolean(speakingItem);

  // Local filter fallback when activeFilter is not controlled externally
  const [internalFilter, setInternalFilter] = useState<string>("all");
  const selectedFilter = activeFilter !== undefined ? activeFilter : internalFilter;

  const handleFilterChange = (nextFilter: string) => {
    if (onSelectFilter) {
      onSelectFilter(nextFilter);
    }
    setInternalFilter(nextFilter);
  };

  const giftsCount = useMemo(
    () => queue.filter((i) => Boolean(i.is_gift)).length,
    [queue]
  );
  const commentsCount = useMemo(
    () => queue.filter((i) => !i.is_gift).length,
    [queue]
  );

  const filteredQueue = useMemo(() => {
    if (selectedFilter === "gifts" || selectedFilter === "gift") {
      return queue.filter((i) => Boolean(i.is_gift));
    }
    if (selectedFilter === "comments" || selectedFilter === "comment") {
      return queue.filter((i) => !i.is_gift);
    }
    return queue;
  }, [queue, selectedFilter]);

  const handleSkipSpeaker = () => {
    if (onSkipCurrent) {
      onSkipCurrent();
    } else if (onSkipItem && resolvedSpeaker?.id) {
      onSkipItem(resolvedSpeaker.id);
    }
  };

  return (
    <div
      className={`flex flex-col h-full rounded-2xl border border-broadcast-border-light dark:border-broadcast-border-dark bg-white dark:bg-broadcast-dark p-5 transition-all duration-300 ${className}`}
      aria-label="Speech Queue Playlist Feed"
    >
      {/* ==================================================================== */}
      {/* Feed Header & Clear Queue Action                                     */}
      {/* ==================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-broadcast-border-light dark:border-broadcast-border-dark gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-broadcast-border-light dark:border-broadcast-border-dark">
            <ListOrdered className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-wide text-neutral-900 dark:text-white flex items-center gap-2">
              คิวเสียงพูด (Speech Queue)
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-broadcast-border-light dark:border-broadcast-border-dark">
                {queue.length} ในคิว
              </span>
            </h2>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              ข้อความสดจาก TikTok Live เรียงลำดับตาม First-In, First-Out (FIFO)
            </p>
          </div>
        </div>

        {/* Clear Queue Button */}
        {queue.length > 0 && onClearQueue && (
          <button
            type="button"
            onClick={onClearQueue}
            className="self-end sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 border border-broadcast-border-light dark:border-broadcast-border-dark transition-colors active:scale-95"
            title="ล้างคิวข้อความทั้งหมด"
          >
            <Trash2 className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
            <span>ล้างคิวทั้งหมด</span>
          </button>
        )}
      </div>

      {/* ==================================================================== */}
      {/* Filter Tabs with High-Contrast Active Styling                        */}
      {/* ==================================================================== */}
      <div className="flex items-center gap-2 mb-4 text-xs select-none">
        <button
          type="button"
          onClick={() => handleFilterChange("all")}
          className={`py-1.5 px-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-1 border ${
            selectedFilter === "all"
              ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-neutral-900 dark:border-white shadow-none"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 border-transparent"
          }`}
        >
          <span>[ ทั้งหมด ]</span>
          <span className="opacity-75">({queue.length})</span>
        </button>

        <button
          type="button"
          onClick={() => handleFilterChange("gifts")}
          className={`py-1.5 px-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5 border ${
            selectedFilter === "gifts" || selectedFilter === "gift"
              ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-neutral-900 dark:border-white shadow-none"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 border-transparent"
          }`}
        >
          <Gift className="w-3.5 h-3.5" />
          <span>[ เฉพาะของขวัญ 🎁 ]</span>
          <span className="opacity-75">({giftsCount})</span>
        </button>

        <button
          type="button"
          onClick={() => handleFilterChange("comments")}
          className={`py-1.5 px-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5 border ${
            selectedFilter === "comments" || selectedFilter === "comment"
              ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-neutral-900 dark:border-white shadow-none"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 border-transparent"
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>[ แชท 💬 ]</span>
          <span className="opacity-75">({commentsCount})</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* Active Speaker Spotlight Banner (Optional In-Queue Hero)            */}
      {/* ==================================================================== */}
      <AnimatePresence mode="wait">
        {resolvedSpeaker && (
          <motion.div
            key={resolvedSpeaker.id || "speaking-banner"}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="mb-4 p-3.5 rounded-xl border border-broadcast-border-light dark:border-broadcast-border-dark bg-neutral-50 dark:bg-neutral-900/80 flex flex-col gap-2 relative overflow-hidden"
          >
            {/* Top Indicator Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Broadcast Red Live Indicator (Strictly permitted for live broadcast status) */}
                <span className="bg-[#FF0000] text-white font-bold text-[10px] px-1.5 py-0.5 rounded-[2px] tracking-wider uppercase flex items-center gap-1 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  <span>กำลังพากย์เสียง</span>
                </span>
                <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                  <Volume2 className="w-3.5 h-3.5 text-neutral-700 dark:text-neutral-300" />
                  <span>กำลังพูดสด (Now Speaking)</span>
                </span>
              </div>

              {(onSkipCurrent || onSkipItem) && (
                <button
                  type="button"
                  onClick={handleSkipSpeaker}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 transition-colors"
                  title="ข้ามเสียงนี้"
                >
                  <SkipForward className="w-3 h-3" />
                  <span>ข้าม</span>
                </button>
              )}
            </div>

            {/* Speaker Metadata & 2-Line Clamped Message */}
            <div className="flex items-start gap-3 mt-1">
              {/* 36px circular avatar */}
              <div className="h-9 w-9 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center font-medium text-xs text-neutral-700 dark:text-neutral-200 shrink-0 border border-broadcast-border-light dark:border-broadcast-border-dark">
                {resolvedSpeaker.user ? resolvedSpeaker.user.replace(/^@/, "").charAt(0).toUpperCase() : "AI"}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                    {resolvedSpeaker.user}
                  </span>
                  {"is_gift" in resolvedSpeaker && Boolean((resolvedSpeaker as QueueItem).is_gift) && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-medium bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 shrink-0">
                      {(resolvedSpeaker as QueueItem).gift_name ? `🎁 ${(resolvedSpeaker as QueueItem).gift_name}` : "💎 VIP Gift"}
                    </span>
                  )}
                </div>

                <p className="line-clamp-2 text-sm text-[#0F0F0F] dark:text-white mt-0.5 leading-snug">
                  &ldquo;{resolvedSpeaker.text}&rdquo;
                </p>

                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  {"diamonds" in resolvedSpeaker && (resolvedSpeaker as QueueItem).diamonds
                    ? `${(resolvedSpeaker as QueueItem).diamonds} เหรียญ/เพชร (💎) • กำลังสังเคราะห์เสียง`
                    : "คอมเมนต์แชทสด • กำลังสังเคราะห์เสียง"}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================================================================== */}
      {/* Scrollable Playlist Queue Item List                                  */}
      {/* ==================================================================== */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 min-h-[260px] max-h-[480px] scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700 scrollbar-track-transparent">
        <AnimatePresence initial={false}>
          {filteredQueue.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-48 rounded-xl border border-dashed border-broadcast-border-light dark:border-broadcast-border-dark text-center p-6 text-neutral-400"
            >
              <Sparkles className="w-8 h-8 text-neutral-300 dark:text-neutral-600 mb-2" />
              <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                ไม่มีคิวข้อความรออ่าน (Queue is idle)
              </p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                เมื่อมีผู้ชมส่งคอมเมนต์หรือของขวัญ ระบบจะนำมาเรียงอ่านที่นี่โดยอัตโนมัติ
              </p>
            </motion.div>
          ) : (
            filteredQueue.map((item, index) => {
              const isGift = Boolean(item.is_gift);
              const avatarInitial = item.user
                ? item.user.replace(/^@/, "").charAt(0).toUpperCase()
                : "U";

              return (
                <motion.div
                  key={item.id || `queue-item-${index}`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.12 }}
                  className="p-3 rounded-xl border border-broadcast-border-light dark:border-broadcast-border-dark bg-white dark:bg-broadcast-dark hover:bg-neutral-50 dark:hover:bg-neutral-800/60 flex items-start justify-between gap-3 transition-colors"
                >
                  {/* Left: 36px circular avatar & details */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* 36px circular avatar (h-9 w-9 rounded-full bg-neutral-200 dark:bg-neutral-800) */}
                    <div
                      className="h-9 w-9 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center font-medium text-xs text-neutral-700 dark:text-neutral-200 shrink-0 border border-broadcast-border-light dark:border-broadcast-border-dark"
                      aria-hidden="true"
                    >
                      {isGift ? "🎁" : avatarInitial}
                    </div>

                    {/* Metadata & Message */}
                    <div className="min-w-0 flex-1">
                      {/* Channel / Username row */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                          {item.user}
                        </span>

                        {/* VIP Gift badges with diamond icon (💎) or gift icon (🎁) */}
                        {isGift && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 shrink-0">
                            {item.gift_name ? `🎁 ${item.gift_name}` : "💎 VIP Gift"}
                            {item.diamonds ? ` (${item.diamonds} diamonds)` : ""}
                          </span>
                        )}

                        <span className="text-xs text-neutral-400 font-mono shrink-0 ml-auto">
                          #{index + 1}
                        </span>
                      </div>

                      {/* Message text strictly clamped to 2 lines */}
                      <div className="line-clamp-2 text-sm text-[#0F0F0F] dark:text-white mt-0.5 break-words leading-snug">
                        {item.text}
                      </div>

                      {/* Compact metadata line: "X เหรียญ/เพชร • รออ่านในคิว (In Queue)" */}
                      <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 flex items-center gap-1">
                        {isGift && item.diamonds ? (
                          <>
                            <span>💎 {item.diamonds} เหรียญ/เพชร</span>
                            <span>•</span>
                            <span>รออ่านในคิว (In Queue)</span>
                          </>
                        ) : isGift ? (
                          <>
                            <span>🎁 ของขวัญพิเศษ</span>
                            <span>•</span>
                            <span>รออ่านในคิว (In Queue)</span>
                          </>
                        ) : (
                          <>
                            <span>แชท TikTok Live</span>
                            <span>•</span>
                            <span>รออ่านในคิว (In Queue)</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Discard/Skip Item Action */}
                  {onSkipItem && (
                    <button
                      type="button"
                      onClick={() => onSkipItem(item.id)}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shrink-0 mt-0.5"
                      title="ลบออกจากคิว"
                      aria-label={`ลบข้อความของ ${item.user} ออกจากคิว`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
