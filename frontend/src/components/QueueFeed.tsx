"use client";

/**
 * Apple visionOS Frosted Liquid Glass Queue Feed Component for Next.js 15.
 *
 * Single-Page Application (SPA) queue visualizer communicating with FastAPI
 * Asynchronous Server Gateway Interface (ASGI) server, coordinating with
 * the Web Audio Application Programming Interface (Web Audio API) and First-In, First-Out (FIFO) queue.
 *
 * Voice Actor Attribution: พิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)
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
  /** Currently active speech synthesis payload, or null if audio pipeline is idle. */
  speakingItem: SpeakingItem | null;
  /** Callback to skip or discard a specific item from the queue by its unique ID. */
  onSkipItem?: (id: string) => void;
  /** Callback to purge the entire pending queue. */
  onClearQueue?: () => void;
}

export function QueueFeed({
  queue,
  speakingItem,
  onSkipItem,
  onClearQueue,
}: QueueFeedProps) {
  const [filter, setFilter] = useState<"all" | "gifts" | "comments">("all");

  const giftsCount = useMemo(
    () => queue.filter((i) => Boolean(i.is_gift)).length,
    [queue]
  );
  const commentsCount = useMemo(
    () => queue.filter((i) => !i.is_gift).length,
    [queue]
  );

  const filteredQueue = useMemo(() => {
    if (filter === "gifts") {
      return queue.filter((i) => Boolean(i.is_gift));
    }
    if (filter === "comments") {
      return queue.filter((i) => !i.is_gift);
    }
    return queue;
  }, [queue, filter]);

  return (
    <div className="flex flex-col h-full liquid-glass specular-border rounded-2xl p-5 shadow-2xl backdrop-blur-2xl transition-all duration-300">
      {/* Feed Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-white/10 gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-white/10 border border-white/10 text-cyan-300">
            <ListOrdered className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-wide text-white flex items-center gap-2">
              คิวเสียงพูด (Speech Queue)
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                {queue.length} ในคิว
              </span>
            </h2>
            <p className="text-[11px] text-white/50">
              ข้อความสดจาก TikTok Live เรียงลำดับตาม First-In, First-Out (FIFO)
            </p>
          </div>
        </div>

        {/* Clear Queue Button */}
        {queue.length > 0 && onClearQueue && (
          <button
            type="button"
            onClick={onClearQueue}
            className="self-end sm:self-auto flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-rose-300 hover:text-rose-100 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all active:scale-95"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>ล้างคิวทั้งหมด</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 mb-3.5 bg-black/40 p-1 rounded-xl border border-white/10 text-xs">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`flex-1 py-1 px-2.5 rounded-lg font-medium transition-all ${
            filter === "all"
              ? "bg-white/15 text-white shadow-sm border border-white/10"
              : "text-white/50 hover:text-white/80"
          }`}
        >
          ทั้งหมด ({queue.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter("gifts")}
          className={`flex-1 py-1 px-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-1 ${
            filter === "gifts"
              ? "bg-amber-500/20 text-amber-300 shadow-sm border border-amber-400/30"
              : "text-white/50 hover:text-amber-200"
          }`}
        >
          <Gift className="w-3 h-3 text-amber-400" />
          <span>ของขวัญ ({giftsCount})</span>
        </button>
        <button
          type="button"
          onClick={() => setFilter("comments")}
          className={`flex-1 py-1 px-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-1 ${
            filter === "comments"
              ? "bg-cyan-500/20 text-cyan-300 shadow-sm border border-cyan-400/30"
              : "text-white/50 hover:text-cyan-200"
          }`}
        >
          <MessageSquare className="w-3 h-3 text-cyan-400" />
          <span>แชท ({commentsCount})</span>
        </button>
      </div>

      {/* Now Speaking Hero Spotlight */}
      <AnimatePresence mode="wait">
        {speakingItem && (
          <motion.div
            key={speakingItem.id || "speaking-banner"}
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="mb-4 p-4 rounded-xl bg-gradient-to-r from-cyan-500/20 via-blue-500/15 to-transparent border border-cyan-400/50 shadow-[0_0_25px_rgba(0,242,254,0.2)] relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500 shadow-[0_0_8px_rgba(0,242,254,0.8)]"></span>
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1">
                  <Volume2 className="w-3.5 h-3.5 animate-bounce" />
                  กำลังพูดสด (Now Speaking)
                </span>
              </div>

              {/* Sound Wave Bars Simulation */}
              <div className="flex items-center gap-1 h-3.5">
                {[40, 90, 60, 100, 75, 45].map((h, i) => (
                  <motion.div
                    key={i}
                    animate={{ height: [`${h * 0.3}%`, `${h}%`, `${h * 0.4}%`] }}
                    transition={{
                      repeat: Infinity,
                      duration: 0.6 + i * 0.1,
                      ease: "easeInOut",
                    }}
                    className="w-0.5 rounded-full bg-cyan-400 shadow-[0_0_4px_rgba(0,242,254,0.8)]"
                  />
                ))}
              </div>
            </div>

            <div className="text-sm font-semibold text-white flex items-center justify-between">
              <span>{speakingItem.user}</span>
              {onSkipItem && (
                <button
                  type="button"
                  onClick={() => onSkipItem(speakingItem.id)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] text-white/70 hover:text-white bg-white/10 hover:bg-white/20 transition-all"
                  title="ข้ามเสียงนี้"
                >
                  <SkipForward className="w-3 h-3" />
                  <span>ข้าม</span>
                </button>
              )}
            </div>

            <div className="text-xs text-white/95 mt-1 leading-relaxed font-light line-clamp-2">
              &ldquo;{speakingItem.text}&rdquo;
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scrollable Queue Item List */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 min-h-[260px] max-h-[480px] scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
        <AnimatePresence initial={false}>
          {filteredQueue.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-48 rounded-xl border border-dashed border-white/10 text-center p-6 text-white/40"
            >
              <Sparkles className="w-8 h-8 text-white/20 mb-2" />
              <p className="text-xs font-medium text-white/60">
                ไม่มีคิวข้อความรออ่าน (Queue is idle)
              </p>
              <p className="text-[11px] text-white/30 mt-1">
                เมื่อมีผู้ชมส่งคอมเมนต์หรือของขวัญ ระบบจะนำมาเรียงอ่านที่นี่โดยอัตโนมัติ
              </p>
            </motion.div>
          ) : (
            filteredQueue.map((item, index) => {
              const isGift = Boolean(item.is_gift);

              return (
                <motion.div
                  key={item.id || `queue-item-${index}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.15 }}
                  className={`p-3 rounded-xl border flex items-start justify-between gap-3 transition-all ${
                    isGift
                      ? "bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-amber-400/40 shadow-[0_0_15px_rgba(251,191,36,0.1)]"
                      : "bg-white/[0.04] border-white/10 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <div
                      className={`p-1.5 rounded-lg border mt-0.5 shrink-0 ${
                        isGift
                          ? "bg-amber-500/20 border-amber-400/40 text-amber-300 shadow-sm"
                          : "bg-white/10 border-white/10 text-cyan-300"
                      }`}
                    >
                      {isGift ? <Gem className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white/90 truncate">
                          {item.user}
                        </span>
                        {isGift && (
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40 shrink-0">
                            {item.gift_name ? `🎁 ${item.gift_name}` : "VIP Gift"}
                            {item.diamonds ? ` (${item.diamonds} diamonds)` : ""}
                          </span>
                        )}
                        <span className="text-[10px] text-white/30 font-mono shrink-0 ml-auto">
                          #{index + 1}
                        </span>
                      </div>

                      <div className="text-xs text-white/75 mt-0.5 break-words line-clamp-2 leading-relaxed">
                        {item.text}
                      </div>
                    </div>
                  </div>

                  {onSkipItem && (
                    <button
                      type="button"
                      onClick={() => onSkipItem(item.id)}
                      className="p-1 rounded-md text-white/30 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0 mt-0.5"
                      title="ลบออกจากคิว"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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
