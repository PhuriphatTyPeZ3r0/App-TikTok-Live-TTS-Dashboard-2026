"use client";

/**
 * Red Broadcast Navigation Bar Component for Next.js 15.
 *
 * Implements 56px height, Level 1 elevation shadow, centralized search bar with
 * voice search, real-time multi-system telemetry (TikTok Live, Colab Tesla T4 GPU, OBS Studio),
 * theme toggling (Light / Cinema Dark), and backward-compatible props.
 *
 * Integrates Single-Page Application (SPA) architecture with the FastAPI
 * Asynchronous Server Gateway Interface (ASGI) server, coordinating with
 * the Web Audio Application Programming Interface (Web Audio API) and
 * First-In, First-Out (FIFO) speech synthesis queue states.
 *
 * Design System: Red Broadcast Studio
 * Compatibility: Liquid Glass & Specular Border backward tokens (liquid-glass specular-border)
 * Voice Actor Attribution: พิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert) - Thai Voice Model
 */

import React, { useState } from "react";
import {
  Menu,
  Play,
  Search,
  Mic,
  Sun,
  Moon,
  Bell,
  Zap,
  Radio,
  Tv,
  Copy,
  Check,
  ExternalLink,
  User,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export interface NavbarProps {
  /** Optional TikTok creator handle (e.g., @creator_name). Defaults to @tiktok_creator. */
  username?: string;
  /** isConnected: Whether the WebSocket (WS) connection to the ASGI server is active and verified. */
  isConnected: boolean;
  /** isReconnecting: Whether the client is currently performing exponential backoff reconnection. */
  isReconnecting?: boolean;
  /** backendUrl: Base backend URL for API and overlay endpoints. */
  backendUrl?: string;
  /** sessionId: Session UUID of active live stream. */
  sessionId?: string;
  /** overlayToken?: Security token for authenticating Open Broadcaster Software (OBS) browser source overlays. */
  overlayToken?: string;
  /** Whether OBS overlay client is currently connected. */
  obsConnected?: boolean;
  /** Whether Google Colab Tesla T4 GPU backend is verified connected. */
  colabConnected?: boolean;
  /** Active voice synthesis engine name (e.g., fish-speech-v1.5, Edge-TTS). */
  activeEngine?: string;
  /** Callback to open or toggle the Room Switcher / Session Start dialog. */
  onOpenRoomModal?: () => void;
  /** Callback to switch TikTok accounts or open creator switcher dialog. */
  onSwitchAccount?: () => void;
  /** Callback to preview OBS Browser Source overlay. */
  onOpenOBSPreview?: () => void;
  /** Callback to toggle collapsible sidebar navigation state. */
  onToggleSidebar?: () => void;
}

export function Navbar({
  username = "@tiktok_creator",
  isConnected,
  isReconnecting = false,
  backendUrl = "",
  sessionId = "",
  overlayToken,
  obsConnected = false,
  colabConnected = false,
  activeEngine = "fish-speech-v1.5",
  onOpenRoomModal,
  onSwitchAccount,
  onOpenOBSPreview,
  onToggleSidebar,
}: NavbarProps) {
  const { theme, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);

  // Colab GPU engine determination
  const isGPUActive =
    colabConnected ||
    (activeEngine &&
      (activeEngine.toLowerCase().includes("fish") ||
        activeEngine.toLowerCase().includes("colab")));

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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      console.log("Navbar Search dispatched:", searchQuery);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full h-14 bg-white dark:bg-broadcast-dark border-b border-broadcast-border-light dark:border-broadcast-border-dark shadow-[0_1px_2px_rgba(0,0,0,0.1)] liquid-glass specular-border transition-colors duration-200">
      <div className="h-full px-4 flex items-center justify-between gap-4 max-w-full">
        {/* Left Section: Hamburger Menu & Red Studio Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-2 rounded-full hover:bg-broadcast-surface-light dark:hover:bg-broadcast-surface-dark text-neutral-700 dark:text-neutral-200 transition-colors focus:outline-none"
            aria-label="Toggle navigation drawer"
            title="สลับแถบเมนูด้านข้าง (Toggle Sidebar)"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-broadcast-red flex items-center justify-center text-white shadow-sm">
              <Play className="w-4 h-4 fill-white translate-x-0.5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-neutral-900 dark:text-white">
                  TTS Studio
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-semibold">
                  Live
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Center Section: 44px Search Input, 64px Search Button, and Circular Voice Mic */}
        <div className="flex-1 max-w-2xl hidden md:flex items-center justify-center gap-2">
          <form
            onSubmit={handleSearchSubmit}
            className="flex items-center w-full max-w-lg"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาบันทึกเสียง หรือประวัติแชท... (Search logs or chat)"
                className="w-full h-[44px] px-4 rounded-l-full bg-white dark:bg-broadcast-dark text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 border border-r-0 border-broadcast-border-light dark:border-broadcast-border-dark focus:outline-none focus:border-broadcast-blue text-sm transition-colors"
              />
            </div>
            <button
              type="submit"
              className="w-[64px] h-[44px] rounded-r-full bg-[#F8F8F8] dark:bg-[#222222] border border-broadcast-border-light dark:border-broadcast-border-dark flex items-center justify-center hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors"
              title="ค้นหา (Search)"
            >
              <Search className="w-4 h-4" />
            </button>
          </form>

          <button
            type="button"
            className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 flex items-center justify-center transition-colors shrink-0"
            title="ค้นหาด้วยเสียง (Voice Search)"
          >
            <Mic className="w-4 h-4" />
          </button>
        </div>

        {/* Right Section: Badges, Theme Toggle, Bell & User Avatar */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Multi-System Real-Time Badges */}
          <div className="hidden lg:flex items-center gap-2 text-xs">
            {/* TikTok Live Stream Connection Badge */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-broadcast-border-light dark:border-broadcast-border-dark font-mono text-[11px]"
              title={`TikTok Live: ${username}`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected
                    ? "bg-emerald-500 animate-pulse"
                    : isReconnecting
                    ? "bg-amber-500 animate-ping"
                    : "bg-rose-500"
                }`}
              />
              <span className="text-neutral-700 dark:text-neutral-300 font-medium">
                {isConnected
                  ? "Online (เชื่อมต่อแล้ว)"
                  : isReconnecting
                  ? "Reconnecting (กำลังเชื่อมต่อใหม่)"
                  : "Disconnected (ขาดการเชื่อมต่อ)"}
              </span>
            </div>

            {/* Google Colab Tesla T4 GPU Telemetry */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-broadcast-border-light dark:border-broadcast-border-dark font-mono text-[11px]"
              title="สถานะระบบสังเคราะห์เสียง Colab Tesla T4 GPU"
            >
              <Zap
                className={`w-3 h-3 ${
                  isGPUActive ? "text-cyan-500" : "text-amber-500"
                }`}
              />
              <span className="text-neutral-700 dark:text-neutral-300">
                {isGPUActive ? "Colab GPU (T4)" : "Cloud Fallback"}
              </span>
            </div>

            {/* OBS Studio Integration Badge */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-broadcast-border-light dark:border-broadcast-border-dark font-mono text-[11px]"
              title="OBS Studio Browser Source"
            >
              <Tv
                className={`w-3 h-3 ${
                  obsConnected ? "text-emerald-500" : "text-neutral-400"
                }`}
              />
              <span className="text-neutral-700 dark:text-neutral-300">
                {obsConnected ? "OBS เชื่อมต่อแล้ว" : "OBS Studio"}
              </span>
            </div>

            {/* OBS Overlay Quick Copy & Preview */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleCopyOverlay}
                className="flex items-center gap-1 px-2 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-broadcast-border-light dark:border-broadcast-border-dark text-neutral-700 dark:text-neutral-300 transition-colors"
                title="คัดลอก OBS Overlay URL"
              >
                {copied ? (
                  <Check className="w-3 h-3 text-emerald-500" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>{copied ? "คัดลอกแล้ว" : "Copy OBS Overlay URL"}</span>
              </button>
              <a
                href={overlayUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (onOpenOBSPreview) {
                    e.preventDefault();
                    onOpenOBSPreview();
                  }
                }}
                className="p-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-broadcast-border-light dark:border-broadcast-border-dark text-neutral-600 dark:text-neutral-400 transition-colors"
                title="Preview Overlay (ดูตัวอย่าง Overlay)"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Theme Mode Toggle (Sun/Moon calling toggleTheme()) */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-broadcast-surface-light dark:hover:bg-broadcast-surface-dark text-neutral-700 dark:text-neutral-200 transition-colors"
            title={theme === "dark" ? "เปลี่ยนเป็นโหมดสว่าง (Light Mode)" : "เปลี่ยนเป็นโหมดมืด (Dark Cinema Mode)"}
            aria-label="Toggle application color scheme"
          >
            {theme === "dark" ? (
              <Sun className="w-5 h-5 text-amber-400" />
            ) : (
              <Moon className="w-5 h-5 text-neutral-700" />
            )}
          </button>

          {/* Notification Bell */}
          <button
            type="button"
            className="relative p-2 rounded-full hover:bg-broadcast-surface-light dark:hover:bg-broadcast-surface-dark text-neutral-700 dark:text-neutral-200 transition-colors"
            title="การแจ้งเตือน (Notifications)"
            aria-label="View notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-broadcast-red" />
          </button>

          {/* Creator Profile Avatar (32px Circle) */}
          <button
            type="button"
            onClick={onSwitchAccount || onOpenRoomModal}
            className="w-8 h-8 rounded-full bg-gradient-to-tr from-neutral-200 to-neutral-300 dark:from-neutral-700 dark:to-neutral-600 border border-broadcast-border-light dark:border-broadcast-border-dark flex items-center justify-center text-neutral-700 dark:text-white font-medium text-xs shadow-sm hover:ring-2 hover:ring-broadcast-blue/40 transition-all shrink-0"
            title={`บัญชี: ${username} (คลิกเพื่อเปลี่ยนห้องหรือบัญชี)`}
            aria-label="User profile and account settings"
          >
            <User className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
