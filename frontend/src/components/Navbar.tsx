"use client";

/**
 * Apple visionOS Frosted Liquid Glass Navigation Bar Component for Next.js 15.
 *
 * Provides real-time connection status monitoring, creator identity branding,
 * and Open Broadcaster Software (OBS) browser source overlay Uniform Resource Identifier (URI) distribution.
 * Integrates directly with the FastAPI Asynchronous Server Gateway Interface (ASGI) server,
 * serving the Single-Page Application (SPA) dashboard while synchronizing with the
 * Web Audio Application Programming Interface (Web Audio API) pipeline and First-In, First-Out (FIFO) queue states.
 *
 * Voice actor attribution: พิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)
 */

import React, { useState } from "react";
import { Mic, Copy, Check, ExternalLink, Radio, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface NavbarProps {
  /** Optional TikTok creator handle (e.g., @creator_name). Defaults to @tiktok_creator. */
  username?: string;
  /** Whether the WebSocket (WS) connection to the ASGI server is active and verified. */
  isConnected: boolean;
  /** Whether the client is currently performing exponential backoff reconnection. */
  isReconnecting: boolean;
  /** Base Hypertext Transfer Protocol (HTTP/HTTPS) backend URL. */
  backendUrl: string;
  /** Session Universally Unique Identifier (UUID) of the active live streaming session. */
  sessionId: string;
  /** Security token for authenticating Open Broadcaster Software (OBS) browser source overlays. */
  overlayToken?: string;
}

export function Navbar({
  username = "@tiktok_creator",
  isConnected,
  isReconnecting,
  backendUrl,
  sessionId,
  overlayToken,
}: NavbarProps) {
  const [copied, setCopied] = useState<boolean>(false);

  // Construct fully qualified OBS overlay URL with URI-encoded parameters
  const cleanBackendUrl = (backendUrl || "").replace(/\/+$/, "");
  const encodedSessionId = encodeURIComponent(sessionId || "");
  const overlayUrl = overlayToken
    ? `${cleanBackendUrl}/overlay/${encodedSessionId}?token=${encodeURIComponent(overlayToken)}`
    : `${cleanBackendUrl}/overlay/${encodedSessionId}`;

  const handleCopyOverlayUrl = async () => {
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
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Creator Identity & Studio Branding */}
        <div className="flex items-center gap-3.5">
          <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-tr from-[#fe2c55]/30 to-[#00f2fe]/30 border border-white/20 shadow-inner">
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
              <h1 className="text-lg font-semibold tracking-wide text-white drop-shadow">
                TikTok Live TTS Studio
              </h1>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                v2.0 Liquid Glass
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-white/60">
              <span className="font-medium text-white/80">{username}</span>
              <span>•</span>
              <span className="text-[11px] text-cyan-200/70 font-light">
                เสียงพากย์: พิพัฒน์ บุญสิทธิเลิศ
              </span>
            </div>
          </div>
        </div>

        {/* Center: Real-time Connection Status Pill */}
        <div className="flex items-center">
          <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-black/40 border border-white/10 shadow-inner">
            {isConnected ? (
              <>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                </span>
                <span className="text-xs font-medium text-emerald-400 tracking-wide">
                  Online (เชื่อมต่อแล้ว)
                </span>
              </>
            ) : isReconnecting ? (
              <>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]"></span>
                </span>
                <span className="text-xs font-medium text-amber-300 tracking-wide">
                  Reconnecting... (กำลังเชื่อมต่อใหม่)
                </span>
              </>
            ) : (
              <>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"></span>
                </span>
                <span className="text-xs font-medium text-rose-400 tracking-wide">
                  Disconnected (ขาดการเชื่อมต่อ)
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right: Quick Action Buttons (OBS Overlay URL distribution) */}
        <div className="flex items-center gap-2.5">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleCopyOverlayUrl}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white shadow-sm transition-colors duration-150 backdrop-blur-md"
            title="Copy OBS Overlay URL to clipboard"
          >
            <AnimatePresence mode="wait" initial={false}>
              {copied ? (
                <motion.span
                  key="check"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  className="flex items-center gap-1.5 text-emerald-400"
                >
                  <Check className="w-4 h-4" />
                  <span>คัดลอกแล้ว!</span>
                </motion.span>
              ) : (
                <motion.span
                  key="copy"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  className="flex items-center gap-1.5"
                >
                  <Copy className="w-4 h-4 text-cyan-300" />
                  <span>Copy OBS Overlay URL</span>
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>

          <a
            href={overlayUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl bg-[#00f2fe]/10 hover:bg-[#00f2fe]/20 border border-[#00f2fe]/30 text-cyan-300 shadow-sm transition-colors duration-150 backdrop-blur-md"
            title="Preview Overlay in new tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Preview Overlay</span>
          </a>
        </div>
      </div>
    </header>
  );
}
