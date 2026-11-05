"use client";

/**
 * 1-Click Open Broadcaster Software (OBS Studio) Integration Wizard Component.
 *
 * Provides live streamers with an effortless, foolproof onboarding card to copy
 * the OBS Studio Browser Source Uniform Resource Identifier (URI) overlay URL,
 * displays recommended canvas dimensions (600x240 px), prompts the essential
 * "Control audio via OBS" checkbox, and indicates real-time overlay connection status.
 *
 * Voice Actor Attribution: พิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)
 */

import React, { useState } from "react";
import { Copy, Check, Tv, ExternalLink, Sparkles, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface OBSIntegrationCardProps {
  /** Backend base URL (e.g., https://tiktok-live-tts-bot.onrender.com). */
  backendUrl: string;
  /** Active session UUID. */
  sessionId: string;
  /** Read-only overlay security token for OBS Browser Source. */
  overlayToken?: string;
  /** Number of active overlay clients connected to this session. */
  connectedClients?: number;
}

export function OBSIntegrationCard({
  backendUrl,
  sessionId,
  overlayToken,
  connectedClients = 0,
}: OBSIntegrationCardProps) {
  const [copied, setCopied] = useState<boolean>(false);

  const cleanBackendUrl = (backendUrl || "").replace(/\/+$/, "");
  const encodedSessionId = encodeURIComponent(sessionId || "");
  const overlayUrl = overlayToken
    ? `${cleanBackendUrl}/overlay/${encodedSessionId}?token=${encodeURIComponent(overlayToken)}`
    : `${cleanBackendUrl}/overlay/${encodedSessionId}`;

  const handleCopy = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(overlayUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch (err) {
      console.error("Failed to copy OBS overlay URL:", err);
    }
  };

  const isOBSActive = connectedClients > 0;

  return (
    <div className="liquid-glass specular-border rounded-2xl p-5 shadow-2xl backdrop-blur-2xl transition-all duration-300">
      {/* Card Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-white/10 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-[#fe2c55]/20 to-[#00f2fe]/20 border border-white/15 text-cyan-300">
            <Tv className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-wide text-white flex items-center gap-2">
              ตั้งค่า OBS Studio (Browser Source)
            </h2>
            <p className="text-[11px] text-white/50">
              นำลิงก์ไปใส่ในโปรแกรมสตรีมเพื่อส่งเสียงและป๊อปอัปแจ้งเตือน
            </p>
          </div>
        </div>

        {/* Live OBS Connection Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 border border-white/10 text-[11px] font-mono">
          <span
            className={`w-2 h-2 rounded-full ${
              isOBSActive
                ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse"
                : "bg-white/40"
            }`}
          />
          <span className={isOBSActive ? "text-emerald-300 font-medium" : "text-white/60"}>
            {isOBSActive ? "OBS เชื่อมต่อแล้ว" : "รอเชื่อมต่อ OBS"}
          </span>
        </div>
      </div>

      {/* 1-Click Copy Bar */}
      <div className="flex flex-col gap-2 mb-3.5">
        <label className="text-xs font-medium text-white/80 flex items-center justify-between">
          <span>ขั้นตอนที่ 1: คัดลอก Overlay URL</span>
          <span className="text-[10px] text-cyan-300/80 font-mono">1-Click Copy</span>
        </label>
        <div className="flex items-center gap-2 p-1.5 rounded-xl bg-black/50 border border-white/15 focus-within:border-cyan-400/60 transition-colors shadow-inner">
          <input
            type="text"
            readOnly
            value={overlayUrl}
            className="flex-1 bg-transparent px-2.5 py-1 text-xs font-mono text-cyan-200/90 outline-none select-all truncate"
            title={overlayUrl}
          />
          <button
            type="button"
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all shadow-md active:scale-95 whitespace-nowrap ${
              copied
                ? "bg-emerald-500/30 text-emerald-300 border border-emerald-400/50"
                : "bg-gradient-to-r from-cyan-500/80 to-blue-600/80 text-white hover:brightness-110 border border-cyan-400/40"
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-300" />
                <span>คัดลอกแล้ว!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>คัดลอก URL</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Recommended Settings Guide Box */}
      <div className="rounded-xl p-3 bg-white/[0.03] border border-white/10 text-xs text-white/70 space-y-1.5">
        <div className="flex items-center gap-1.5 font-medium text-white/90 text-[11px]">
          <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
          <span>ขั้นตอนที่ 2: ตั้งค่าใน OBS Studio Browser Source</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 font-mono">
          <div className="px-2.5 py-1 rounded bg-black/30 border border-white/5">
            <span className="text-white/50">Width: </span>
            <span className="text-cyan-300 font-bold">600 px</span>
          </div>
          <div className="px-2.5 py-1 rounded bg-black/30 border border-white/5">
            <span className="text-white/50">Height: </span>
            <span className="text-cyan-300 font-bold">240 px</span>
          </div>
        </div>
        <p className="text-[11px] text-amber-300/80 pt-0.5">
          💡 สำคัญ: อย่าลืมติ๊กถูกที่ช่อง <strong className="text-white font-semibold">&ldquo;Control audio via OBS&rdquo;</strong> เพื่อให้เสียงเข้าไลฟ์
        </p>
      </div>
    </div>
  );
}
