"use client";

/**
 * QueueFeed Component
 *
 * TikFinity-style Priority Queue Feed for TikTok Live stream speech synthesis.
 * Features dark glassmorphism styling, amber highlight for VIP Gift priority items,
 * real-time item counter, auto-play indicator, and individual item deletion controls.
 */

import React from "react";
import { QueueItem } from "../types/tikfinity";
import { Sparkles } from "lucide-react";

export interface QueueFeedProps {
  queue: (QueueItem | any)[];
  onDeleteItem?: (id: string) => void;
  onClearQueue?: () => void;
  // Legacy compatibility props until Task 5 page refactor
  onSkipItem?: (id: string) => void;
  currentSpeaker?: any;
  speakingItem?: any;
  isSpeaking?: boolean;
  activeFilter?: string;
  onSelectFilter?: (filter: string) => void;
  className?: string;
}

export function QueueFeed({
  queue = [],
  onDeleteItem,
  onClearQueue,
  onSkipItem,
  className = "",
}: QueueFeedProps): React.JSX.Element {
  // Unify item deletion across onDeleteItem (TikFinity) and onSkipItem (legacy)
  const handleDeleteItem = (id: string) => {
    if (onDeleteItem) {
      onDeleteItem(id);
    } else if (onSkipItem) {
      onSkipItem(id);
    }
  };

  return (
    <div
      className={`bg-gradient-to-br from-[#161822] to-[#0d0f14] border border-slate-800 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 ${className}`}
      aria-label="Live Speech Queue Feed"
    >
      {/* Header Row */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-800/80 gap-3">
        <div className="flex items-center gap-2.5">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 tracking-wide">
            <span className="material-symbols-rounded text-base text-[#25f4ee] leading-none select-none">
              queue_music
            </span>
            <span>คิวรออ่านเสียง</span>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300 border border-slate-700/60 shadow-sm">
              {queue.length} รายการ
            </span>
          </h2>
        </div>

        {/* Auto-Play Status Badge */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#00e676]/10 text-[#00e676] border border-[#00e676]/30 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00e676] animate-pulse" />
            <span className="material-symbols-rounded text-xs leading-none select-none">
              bolt
            </span>
            <span>Auto-Play ON</span>
          </span>
        </div>
      </div>

      {/* Items List (max height with scrollbar) */}
      <div className="max-h-[360px] overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        {queue.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-10 rounded-xl border border-dashed border-slate-800/80 text-center p-6 text-slate-500">
            <div className="w-10 h-10 rounded-full bg-slate-800/60 border border-slate-700/50 flex items-center justify-center text-slate-400 mb-2.5">
              <Sparkles className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-xs font-semibold text-slate-300">
              ไม่มีข้อความในคิว
            </p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
              ข้อความแชทสดและของขวัญที่รออ่านเสียงจะปรากฏที่นี่โดยอัตโนมัติ
            </p>
          </div>
        ) : (
          queue.map((item, index) => {
            // Resolve attributes supporting both TikFinity & legacy items
            const isGift = Boolean(item.isGift || item.is_gift);
            const username = item.username || item.user || "ผู้ใช้";
            const giftName = item.giftName || item.gift_name;
            const giftAmount = item.giftAmount;
            const coins = item.coins ?? item.diamonds;

            return (
              <div
                key={item.id || `queue-${index}`}
                className={`rounded-xl p-3 border transition-all flex items-center justify-between gap-3 ${
                  isGift
                    ? "border-slate-800 border-l-2 border-l-amber-400 bg-amber-500/5 hover:bg-amber-500/10 shadow-sm"
                    : "border-slate-800 border-l-2 border-l-slate-700 bg-slate-900/40 hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* User Icon: redeem for gift, chat for chat */}
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 border ${
                      isGift
                        ? "bg-amber-500/15 border-amber-500/30 text-amber-300"
                        : "bg-slate-800 border-slate-700 text-slate-300"
                    }`}
                  >
                    <span className="material-symbols-rounded text-base leading-none select-none">
                      {isGift ? "redeem" : "chat"}
                    </span>
                  </div>

                  {/* Username, Gift Tag & Truncated Text */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-200 truncate max-w-[120px] sm:max-w-[180px]">
                        {username}
                      </span>

                      {/* Gift Tag */}
                      {isGift && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-400/15 text-amber-300 border border-amber-400/30 shrink-0">
                          <span className="material-symbols-rounded text-xs leading-none select-none">
                            {giftName ? "redeem" : "bolt"}
                          </span>
                          <span>
                            {giftName || "VIP Gift"}
                            {giftAmount && giftAmount > 1 ? ` x${giftAmount}` : ""}
                            {typeof coins === "number" ? ` (${coins} เหรียญ)` : ""}
                          </span>
                        </span>
                      )}

                      <span className="text-[10px] font-mono text-slate-500 ml-auto shrink-0">
                        #{index + 1}
                      </span>
                    </div>

                    {/* Truncated Text (Single line ellipsis) */}
                    <p className="text-xs text-slate-400 truncate mt-0.5 leading-snug">
                      {item.text}
                    </p>
                  </div>
                </div>

                {/* Delete Button calling onDeleteItem(item.id) */}
                <button
                  type="button"
                  onClick={() => handleDeleteItem(item.id)}
                  className="w-7 h-7 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/15 flex items-center justify-center transition-colors text-xs font-bold shrink-0 border border-transparent hover:border-rose-500/20 active:scale-95"
                  title="ลบออกจากคิว (Delete)"
                  aria-label={`ลบข้อความของ ${username} ออกจากคิว`}
                >
                  <span className="material-symbols-rounded text-sm leading-none select-none">
                    close
                  </span>
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default QueueFeed;
