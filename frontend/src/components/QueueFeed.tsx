"use client";

/**
 * Apple visionOS Frosted Liquid Glass Queue Feed Component for Next.js 15.
 *
 * Displays the real-time First-In, First-Out (FIFO) speech synthesis message queue,
 * highlighting actively playing speech synthesis with glowing cyan indicators,
 * elevating VIP Gift events with golden glass badges, and offering individual item discard actions.
 * Integrates into Single-Page Application (SPA) dashboard communicating with FastAPI
 * Asynchronous Server Gateway Interface (ASGI) backend server and coordinating with
 * the Web Audio Application Programming Interface (Web Audio API).
 *
 * Voice actor attribution: พิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)
 */

import React from "react";
import { MessageSquare, Gift, Volume2, Trash2, ListOrdered, Sparkles, Gem } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { QueueItem, SpeakingItem } from "../types/dashboard";

export interface QueueFeedProps {
  /** First-In, First-Out (FIFO) list of pending speech synthesis items. */
  queue: QueueItem[];
  /** Currently active speech synthesis payload, or null if audio pipeline is idle. */
  speakingItem: SpeakingItem | null;
  /** Callback to skip or discard a specific item from the queue by its unique ID. */
  onSkipItem?: (id: string) => void;
}

export function QueueFeed({
  queue,
  speakingItem,
  onSkipItem,
}: QueueFeedProps) {
  return (
    <div className="flex flex-col h-full liquid-glass specular-border rounded-2xl p-5 shadow-2xl backdrop-blur-2xl transition-all duration-300">
      {/* Feed Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-white/10 border border-white/10 text-cyan-300">
            <ListOrdered className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold tracking-wide text-white">
              คิวเสียงพูด (Speech Queue)
            </h2>
            <p className="text-xs text-white/50">
              ลำดับการสังเคราะห์เสียงแบบ First-In, First-Out (FIFO)
            </p>
          </div>
        </div>

        {/* Queue Count Badge */}
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-white/10 border border-white/15 text-white/80">
          <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
          <span>{queue.length} รายการ</span>
        </span>
      </div>

      {/* Now Speaking Banner (Active TTS Item) */}
      <AnimatePresence mode="wait">
        {speakingItem && (
          <motion.div
            key={speakingItem.id || "speaking-banner"}
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="mb-4 p-4 rounded-xl bg-gradient-to-r from-cyan-500/15 via-blue-500/10 to-transparent border border-cyan-400/40 shadow-[0_0_20px_rgba(0,242,254,0.15)] relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500 shadow-[0_0_8px_rgba(0,242,254,0.8)]"></span>
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1">
                  <Volume2 className="w-3.5 h-3.5 animate-bounce" />
                  กำลังพูด (Now Speaking)
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-200 border border-cyan-400/30">
                {speakingItem.engine || "Edge-TTS"}
              </span>
            </div>

            <div className="text-sm font-semibold text-white drop-shadow">
              {speakingItem.user}
            </div>
            <div className="text-xs text-white/90 mt-1 line-clamp-2 leading-relaxed font-light">
              &ldquo;{speakingItem.text}&rdquo;
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scrollable Queue Item List */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 min-h-[220px] max-h-[380px] scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
        <AnimatePresence initial={false}>
          {queue.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-full min-h-[200px] text-center p-6 border border-dashed border-white/10 rounded-xl bg-white/[0.01]"
            >
              <div className="p-3 rounded-full bg-white/5 border border-white/10 text-white/30 mb-2">
                <Sparkles className="w-5 h-5" />
              </div>
              <p className="text-sm font-medium text-white/60">
                ไม่มีคิวข้อความรออ่าน (Queue is idle)
              </p>
              <p className="text-xs text-white/40 mt-1">
                ระบบพร้อมสังเคราะห์เสียงทันทีเมื่อมีผู้ส่งคอมเมนต์หรือของขวัญ
              </p>
            </motion.div>
          ) : (
            queue.map((item, index) => {
              const isVipGift = item.is_gift || item.priority;

              return (
                <motion.div
                  key={item.id || `queue-item-${index}`}
                  layout
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className={`flex items-start justify-between gap-3 p-3.5 rounded-xl border transition-all duration-200 ${
                    isVipGift
                      ? "bg-amber-500/10 hover:bg-amber-500/15 border-amber-400/40 shadow-[0_0_12px_rgba(245,158,11,0.1)]"
                      : "bg-white/[0.03] hover:bg-white/[0.06] border-white/10"
                  }`}
                >
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    {/* Event Type Icon */}
                    <div
                      className={`p-1.5 rounded-lg mt-0.5 ${
                        isVipGift
                          ? "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                          : "bg-white/10 text-cyan-300 border border-white/10"
                      }`}
                    >
                      {isVipGift ? (
                        <Gift className="w-4 h-4" />
                      ) : (
                        <MessageSquare className="w-4 h-4" />
                      )}
                    </div>

                    {/* Sender and Message Body */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-white truncate">
                          {item.user}
                        </span>

                        {/* VIP Gift Badge & Diamonds */}
                        {isVipGift && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-400/20 text-amber-200 border border-amber-400/30">
                            <Gem className="w-2.5 h-2.5 text-amber-300" />
                            <span>
                              {item.gift_name ? `${item.gift_name} ` : "VIP Gift "}
                              {item.diamonds ? `(${item.diamonds} diamonds)` : ""}
                            </span>
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-white/80 mt-1 line-clamp-2 font-light leading-relaxed">
                        {item.text}
                      </p>
                    </div>
                  </div>

                  {/* Skip / Trash Action Button */}
                  {onSkipItem && (
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => onSkipItem(item.id)}
                      className="p-1.5 rounded-lg text-white/30 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-colors"
                      title="Skip / Discard queue item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </motion.button>
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
