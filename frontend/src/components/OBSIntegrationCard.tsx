"use client";

/**
 * 1-Click Open Broadcaster Software (OBS Studio) Integration Wizard Component.
 *
 * Professional Single-Page Application (SPA) card communicating with FastAPI
 * Asynchronous Server Gateway Interface (ASGI) server, coordinating with
 * the Web Audio Application Programming Interface (Web Audio API) and First-In, First-Out (FIFO) queue.
 *
 * Provides live streamers with an effortless, foolproof onboarding card to copy
 * the OBS Studio Browser Source Uniform Resource Identifier (URI) overlay URL,
 * displays recommended canvas dimensions (600x240 px), prompts the essential
 * "Control audio via OBS" checkbox, and indicates real-time overlay connection status.
 *
 * Design System: Red Broadcast Studio (Level 0 Elevation, 12px radius, 1px border)
 * Voice Actor Attribution: พิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)
 */

import React, { useState } from "react";
import { Copy, Check, Tv, ExternalLink, CheckCircle2 } from "lucide-react";

export interface OBSIntegrationCardProps {
  /** Backend base URL (e.g., https://tiktok-live-tts-bot.onrender.com). */
  backendUrl?: string;
  /** Active session UUID. */
  sessionId?: string;
  /** Read-only overlay security token for OBS Browser Source. */
  overlayToken?: string;
  /** Direct overlay URL override if pre-computed by parent. */
  overlayUrl?: string;
  /** Number of active overlay clients connected to this session. */
  connectedClients?: number;
  /** Alias: Whether OBS overlay client is currently connected. */
  obsConnected?: boolean;
  /** Optional additional CSS class names. */
  className?: string;
}

export function OBSIntegrationCard({
  backendUrl = "",
  sessionId = "",
  overlayToken,
  overlayUrl: propOverlayUrl,
  connectedClients = 0,
  obsConnected = false,
  className = "",
}: OBSIntegrationCardProps) {
  const [copied, setCopied] = useState<boolean>(false);

  const cleanBackendUrl = (backendUrl || "").replace(/\/+$/, "");
  const encodedSessionId = encodeURIComponent(sessionId || "");
  const resolvedOverlayUrl =
    propOverlayUrl ||
    (overlayToken
      ? `${cleanBackendUrl}/overlay/${encodedSessionId}?token=${encodeURIComponent(overlayToken)}`
      : `${cleanBackendUrl}/overlay/${encodedSessionId}`);

  const handleCopy = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(resolvedOverlayUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch (err) {
      console.error("Failed to copy OBS overlay URL:", err);
    }
  };

  const isOBSActive = connectedClients > 0 || obsConnected;

  return (
    <div
      className={`bg-white dark:bg-[#0F0F0F] rounded-xl border border-broadcast-border-light dark:border-broadcast-border-dark p-4 md:p-5 transition-colors ${className}`}
    >
      {/* Card Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-broadcast-border-light dark:border-broadcast-border-dark mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
            <Tv className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-wide text-neutral-900 dark:text-white">
              ตั้งค่า OBS Studio (Browser Source)
            </h2>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              นำลิงก์ไปใส่ในโปรแกรมสตรีมเพื่อส่งเสียงและป๊อปอัปแจ้งเตือน
            </p>
          </div>
        </div>

        {/* Live OBS Connection Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-broadcast-border-light dark:border-broadcast-border-dark text-[11px] font-mono">
          <span
            className={`w-2 h-2 rounded-full ${
              isOBSActive
                ? "bg-emerald-500 animate-pulse"
                : "bg-neutral-400 dark:bg-neutral-600"
            }`}
          />
          <span
            className={
              isOBSActive
                ? "text-emerald-600 dark:text-emerald-400 font-medium"
                : "text-neutral-500 dark:text-neutral-400"
            }
          >
            {isOBSActive ? "OBS เชื่อมต่อแล้ว" : "รอเชื่อมต่อ OBS"}
          </span>
        </div>
      </div>

      {/* 1-Click Copy Bar */}
      <div className="flex flex-col gap-2 mb-3.5">
        <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center justify-between">
          <span>ขั้นตอนที่ 1: คัดลอก Overlay URL</span>
          <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono">
            1-Click Copy
          </span>
        </label>
        <div className="flex items-center gap-2 p-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-broadcast-border-light dark:border-broadcast-border-dark">
          <input
            type="text"
            readOnly
            value={resolvedOverlayUrl}
            className="flex-1 bg-transparent px-2.5 py-1 text-xs font-mono text-neutral-800 dark:text-neutral-200 outline-none select-all truncate"
            title={resolvedOverlayUrl}
          />
          <button
            type="button"
            onClick={handleCopy}
            className={`h-9 px-4 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 whitespace-nowrap ${
              copied
                ? "bg-emerald-600 text-white"
                : "bg-[#0F0F0F] dark:bg-white text-white dark:text-[#0F0F0F] hover:opacity-90"
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
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

      {/* Recommended Settings Guide Box (600x240 px) */}
      <div className="rounded-xl p-3 bg-neutral-50 dark:bg-neutral-900 border border-broadcast-border-light dark:border-broadcast-border-dark text-xs text-neutral-600 dark:text-neutral-400 space-y-2">
        <div className="flex items-center gap-1.5 font-medium text-neutral-800 dark:text-neutral-200 text-[11px]">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span>ขั้นตอนที่ 2: ตั้งค่าใน OBS Studio Browser Source (600x240 px)</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
          <div className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-neutral-800 border border-broadcast-border-light dark:border-broadcast-border-dark">
            <span className="text-neutral-500 dark:text-neutral-400">Width: </span>
            <span className="text-neutral-900 dark:text-white font-bold">600 px</span>
          </div>
          <div className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-neutral-800 border border-broadcast-border-light dark:border-broadcast-border-dark">
            <span className="text-neutral-500 dark:text-neutral-400">Height: </span>
            <span className="text-neutral-900 dark:text-white font-bold">240 px</span>
          </div>
        </div>
        <p className="text-[11px] text-amber-700 dark:text-amber-300/90 pt-0.5 flex items-center gap-1 flex-wrap">
          <span className="material-symbols-rounded text-sm leading-none select-none">
            lightbulb
          </span>
          <span>สำคัญ: อย่าลืมติ๊กถูกที่ช่อง</span>{" "}
          <strong className="text-neutral-900 dark:text-white font-semibold">
            &ldquo;Control audio via OBS&rdquo;
          </strong>{" "}
          <span>เพื่อให้เสียงเข้าไลฟ์</span>
        </p>
      </div>
    </div>
  );
}
