"use client";

/**
 * ============================================================================
 * StreamVox Live — Flowbite AppShell Layout Component for Next.js 15
 * ============================================================================
 *
 * Implements the standard Flowbite responsive dashboard layout:
 * - Semantic fixed aside navigation sidebar (`<Sidebar />`)
 * - Responsive main content wrapper (`sm:ml-64 min-h-screen min-h-[100dvh] flex flex-col`)
 * - Header navigation bar (`<Navbar />`)
 * - Main viewport section (`<main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">`)
 * - Global TikTok Live room connection modal triggered via `showRoomModal`
 * - Adheres strictly to Web Content Accessibility Guidelines (WCAG) 2.1 Level AA
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

import React, { useState, useEffect, useCallback, type ReactNode } from "react";
import { Loader2, X } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { useDashboardSafe } from "../context/DashboardContext";
import { cn } from "@/lib/utils";

export interface AppShellProps {
  /** Page content rendered within semantic `<main>` viewport container. */
  children?: ReactNode;
  /** Optional container CSS class name override. */
  className?: string;
  /** Optional `<main>` element CSS class name override. */
  mainClassName?: string;
  /** Optional controlled visibility flag for Room Switcher modal (testing override). */
  showRoomModalOverride?: boolean;
  /** Optional callback when Room Switcher modal closes (testing override). */
  onCloseRoomModalOverride?: () => void;
}

export function AppShell({
  children,
  className,
  mainClassName,
  showRoomModalOverride,
  onCloseRoomModalOverride,
}: AppShellProps): React.JSX.Element {
  const dashboard = useDashboardSafe();

  // Modal display logic: prefers explicit prop override if provided, otherwise DashboardContext
  const isRoomModalOpen =
    showRoomModalOverride !== undefined
      ? showRoomModalOverride
      : Boolean(dashboard?.showRoomModal);

  const closeRoomModal = useCallback(() => {
    if (onCloseRoomModalOverride) {
      onCloseRoomModalOverride();
    }
    if (dashboard?.setShowRoomModal) {
      dashboard.setShowRoomModal(false);
    }
  }, [dashboard, onCloseRoomModalOverride]);

  // Form input and submission state
  const [inputUsername, setInputUsername] = useState<string>(
    dashboard?.username || ""
  );
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Sync username from dashboard when modal opens
  useEffect(() => {
    if (isRoomModalOpen && dashboard?.username) {
      setInputUsername(dashboard.username);
      setConnectionError(null);
    }
  }, [isRoomModalOpen, dashboard?.username]);

  // Escape key event listener for modal dismissal
  useEffect(() => {
    if (!isRoomModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeRoomModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isRoomModalOpen, closeRoomModal]);

  // Handle TikTok Room Connection Form Submission
  const handleConnectRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = inputUsername.replace(/^@/, "").trim();
    if (!cleanUser) return;

    setIsConnecting(true);
    setConnectionError(null);

    try {
      const defaultBackend =
        process.env.NEXT_PUBLIC_BACKEND_URL || "https://tiktok-live-tts-bot.onrender.com";
      const cleanUrl = (dashboard?.backendUrl || defaultBackend).replace(/\/+$/, "");

      let res = await fetch(`${cleanUrl}/api/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tiktok_username: cleanUser }),
      });

      // Fallback for older backend deployments
      if (!res.ok && res.status === 404) {
        res = await fetch(`${cleanUrl}/api/session/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tiktok_username: cleanUser, fish_audio_api_key: "" }),
        });
      }

      if (!res.ok) {
        let errDetail = `Server returned HTTP ${res.status}`;
        try {
          const errJson = await res.json();
          if (errJson?.detail) errDetail = errJson.detail;
        } catch {}
        throw new Error(errDetail);
      }

      const data = await res.json();

      if (dashboard) {
        dashboard.setSessionId(data.session_id);
        dashboard.setAdminToken(data.admin_token);
        dashboard.setOverlayToken(data.overlay_token || "");
        dashboard.setUsername(cleanUser);
      }

      if (typeof window !== "undefined") {
        sessionStorage.setItem(
          "tiktok_live_tts_session",
          JSON.stringify({
            sessionId: data.session_id,
            adminToken: data.admin_token,
            overlayToken: data.overlay_token || "",
            username: cleanUser,
          })
        );
      }

      closeRoomModal();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const formattedNotice = `ไม่สามารถเชื่อมต่อห้อง @${cleanUser} ได้: ${msg}`;
      setConnectionError(formattedNotice);
      if (dashboard?.setConnectionNotice) {
        dashboard.setConnectionNotice(formattedNotice);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div
      className={cn(
        "min-h-screen min-h-[100dvh] bg-white dark:bg-broadcast-dark text-broadcast-dark dark:text-white transition-colors duration-200",
        className
      )}
      data-testid="app-shell"
    >
      {/* 1. Flowbite Semantic Responsive Aside Sidebar */}
      <Sidebar />

      {/* 2. Flowbite Responsive Main Content Wrapper */}
      <div className="sm:ml-64 min-h-screen min-h-[100dvh] flex flex-col">
        {/* Navigation Bar Header */}
        <Navbar />

        {/* Semantic Main Content Section */}
        <main
          className={cn("flex-1 p-4 sm:p-6 lg:p-8 space-y-6", mainClassName)}
          id="main-content"
        >
          {children}
        </main>
      </div>

      {/* 3. TikTok Live Room Switcher Dialog Modal */}
      {isRoomModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeRoomModal();
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="room-switcher-modal-title"
          data-testid="room-switcher-modal"
        >
          <div className="relative z-[101] w-full max-w-md my-auto bg-card text-card-foreground border border-border rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col gap-4 backdrop-blur-2xl modal-center-animate max-h-[calc(100dvh-2rem)] overflow-y-auto">
            {/* Modal Dismiss Button */}
            <button
              type="button"
              onClick={closeRoomModal}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#25f4ee]"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#fe2c55] to-[#25f4ee] flex items-center justify-center text-black font-extrabold text-base flex-shrink-0">
                <span className="material-symbols-rounded text-xl text-black">
                  graphic_eq
                </span>
              </div>
              <div>
                <h3
                  id="room-switcher-modal-title"
                  className="text-base font-bold text-white tracking-tight"
                >
                  สลับห้อง TikTok LIVE
                </h3>
                <p className="text-xs text-slate-400">
                  ระบุชื่อบัญชี TikTok เพื่อเชื่อมต่อและรับฟังแชท/ของขวัญ
                </p>
              </div>
            </div>

            {/* Room Switcher Form */}
            <form onSubmit={handleConnectRoom} className="flex flex-col gap-4 mt-1">
              <div>
                <label
                  htmlFor="tiktok-room-input"
                  className="block text-xs font-semibold text-slate-300 mb-1.5"
                >
                  TikTok Username (@handle)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 font-mono text-sm pointer-events-none select-none">
                    @
                  </span>
                  <input
                    id="tiktok-room-input"
                    type="text"
                    value={inputUsername}
                    onChange={(e) => setInputUsername(e.target.value)}
                    placeholder="username"
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-[#181b24] border border-[#1e222d] focus:border-[#25f4ee] text-sm text-white placeholder-slate-500 focus:outline-none transition-colors"
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* Error Notice */}
              {connectionError && (
                <div
                  className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs leading-relaxed"
                  role="alert"
                >
                  {connectionError}
                </div>
              )}

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeRoomModal}
                  className="px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isConnecting || !inputUsername.trim()}
                  className="px-5 py-2.5 min-h-[44px] rounded-xl text-xs font-bold bg-gradient-to-r from-[#fe2c55] to-[#25f4ee] text-black hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50 shadow-md"
                >
                  {isConnecting && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  <span>เชื่อมต่อไลฟ์สตรีม</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
