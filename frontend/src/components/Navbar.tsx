"use client";

/**
 * Apple visionOS Frosted Liquid Glass Navigation Bar Component for Next.js 15.
 *
 * Single-Page Application (SPA) navigation and multi-system telemetry component communicating
 * with the FastAPI Asynchronous Server Gateway Interface (ASGI) server, coordinating with
 * the Web Audio Application Programming Interface (Web Audio API) and First-In, First-Out (FIFO) queue states.
 *
 * Voice Actor Attribution: พิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)
 */

import React, { useState } from "react";
import { Mic, Sparkles, Zap, Tv, UserCheck, RefreshCw, Copy, Check, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface NavbarProps {
  /** Optional TikTok creator handle (e.g., @creator_name). Defaults to @tiktok_creator. */
  username?: string;
  /** Whether the WebSocket (WS) connection to the ASGI server is active and verified. */
  isConnected: boolean;
  /** Whether the client is currently performing exponential backoff reconnection. */
  isReconnecting: boolean;
  /** Base backend URL. */
  backendUrl: string;
  /** Session UUID of active live stream. */
  sessionId: string;
  /** Security token for authenticating Open Broadcaster Software (OBS) browser source overlays. */
  overlayToken?: string;
  /** Whether OBS overlay client is currently connected. */
  obsConnected?: boolean;
  /** Active voice synthesis engine name (e.g., fish-speech-v1.5, Edge-TTS). */
  activeEngine?: string;
  /** Callback to open or toggle the Room Switcher / Session Start dialog. */
  onOpenRoomModal?: () => void;
}

export function Navbar({
  username = "@tiktok_creator",
  isConnected,
  isReconnecting,
  backendUrl,
  sessionId,
  overlayToken,
  obsConnected = false,
  activeEngine = "fish-speech-v1.5",
  onOpenRoomModal,
}: NavbarProps) {
  const [copied, setCopied] = useState<boolean>(false);
  const isGPUActive = activeEngine.toLowerCase().includes("fish") || activeEngine.toLowerCase().includes("colab");

  // Fully qualified OBS overlay URL with URI-encoded parameters
  const cleanBackendUrl = (backendUrl || "").replace(/\/+$/, "");
  const encodedSessionId = encodeURIComponent(sessionId || "");
  const overlayUrl = overlayToken
    ? `${cleanBackendUrl}/overlay/${encodedSessionId}?token=${encodeURIComponent(overlayToken)}`
    : `${cleanBackendUrl}/overlay/${encodedSessionId}`;

  const handleCopyOverlay = async () => {
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

  return (
    <header className="w-full liquid-glass specular-border rounded-2xl px-5 py-3.5 mb-6 shadow-xl backdrop-blur-2xl transition-all duration-300">
      <div className="flex flex-col md:flex-row items-center justify-between gap-3.5">
        {/* Studio Branding & Voice Attribution */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-[#fe2c55]/30 to-[#00f2fe]/30 border border-white/20 shadow-inner">
            <Mic className="w-5 h-5 text-white drop-shadow-md" />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 12, ease: "linear" }}
              className="absolute -top-1 -right-1 text-cyan-300"
            >
              <Sparkles className="w-3.5 h-3.5 drop-shadow" />
            </motion.div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-wide text-white drop-shadow">
                TikTok Live TTS Studio
              </h1>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                v2.0 Cockpit
              </span>
            </div>
            <div className="text-[11px] text-cyan-200/80 font-light flex items-center gap-1.5">
              <span>เสียงพากย์:</span>
              <strong className="text-white/90 font-medium">พิพัฒน์ บุญสิทธิเลิศ</strong>
              <span className="text-white/40">({username})</span>
              <span className="text-white/30">•</span>
              <span className="text-white/50 font-mono text-[10px]">Tesla T4 FP16</span>
            </div>
          </div>
        </div>

        {/* Multi-System Real-time Health Telemetry Badges & Overlay Tools */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
          {/* TikTok Ingestion Status */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 border border-white/10 font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected
                  ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse"
                  : isReconnecting
                  ? "bg-amber-400 animate-ping"
                  : "bg-rose-400"
              }`}
            />
            <span className={isConnected ? "text-emerald-300 font-medium" : isReconnecting ? "text-amber-300" : "text-rose-300"}>
              {isConnected ? "Online (เชื่อมต่อแล้ว)" : isReconnecting ? "Reconnecting (กำลังเชื่อมต่อใหม่)" : "Disconnected (ขาดการเชื่อมต่อ)"}
            </span>
          </div>

          {/* AI Voice Engine Status */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 border border-white/10 font-mono">
            <Zap className={`w-3 h-3 ${isGPUActive ? "text-cyan-400" : "text-amber-400"}`} />
            <span className={isGPUActive ? "text-cyan-300" : "text-amber-200"}>
              {isGPUActive ? "Colab GPU (T4)" : "Cloud Fallback"}
            </span>
          </div>

          {/* OBS Overlay Quick Copy & Preview Link */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleCopyOverlay}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white/90 text-xs font-medium transition-all active:scale-95"
              title="คัดลอก OBS Overlay URL"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-cyan-300" />}
              <span>{copied ? "คัดลอกแล้ว" : "Copy OBS Overlay URL"}</span>
            </button>
            <a
              href={overlayUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white/80 transition-all"
              title="Preview Overlay (ดูตัวอย่าง Overlay)"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Active Creator Handle & Change Room Button */}
          {onOpenRoomModal && (
            <button
              type="button"
              onClick={onOpenRoomModal}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-400/30 text-white text-xs font-medium transition-all active:scale-95"
              title="เปลี่ยนห้อง TikTok Live หรือเริ่มสตรีมใหม่"
            >
              <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-semibold text-cyan-200">{username}</span>
              <RefreshCw className="w-3 h-3 text-white/50 ml-0.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
