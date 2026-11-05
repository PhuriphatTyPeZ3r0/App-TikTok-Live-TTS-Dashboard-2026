"use client";

/**
 * TikFinity-Style Navigation Bar Component for Next.js 15.
 *
 * Implements TikFinity-inspired header design:
 * - Brand logo: "TF" with pink/cyan gradient box
 * - Title: "TikTok Live TTS Stream Console"
 * - Subtitle: "TikFinity Cleansed Edition • 24/7 Cloud Powered"
 * - Status badges:
 *     - LIVE badge with pulsing dot: `LIVE: @{username || 'phuriphat_live'}`
 *     - Voice engine badge: `🎙️ Fish Audio (คุณพิพัฒน์ บุญสิทธิเลิศ)`
 * - Quick Voice Test button with loading indicator
 * - TTS Master toggle switch (masterTtsEnabled / onToggleMaster)
 * - Optional theme toggler and account/room switcher
 *
 * Voice Actor Model: คุณพิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)
 */

import React, { useState } from "react";
import {
  Volume2,
  Loader2,
  Sun,
  Moon,
  Tv,
  Copy,
  Check,
  ExternalLink,
  User,
  Radio,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export interface NavbarProps {
  /** Optional TikTok creator handle (e.g., @phuriphat_live). Defaults to @phuriphat_live. */
  username?: string;
  /** Whether the WebSocket (WS) connection to the ASGI server is active. */
  isConnected?: boolean;
  /** Whether the client is currently performing reconnection. */
  isReconnecting?: boolean;
  /** Base backend URL for API and overlay endpoints. */
  backendUrl?: string;
  /** Session UUID of active live stream. */
  sessionId?: string;
  /** Security token for authenticating OBS browser source overlays. */
  overlayToken?: string;
  /** Whether Open Broadcaster Software (OBS) client is connected. */
  obsConnected?: boolean;
  /** Master TTS switch state. */
  masterTtsEnabled?: boolean;
  /** Callback when Master TTS switch is toggled. */
  onToggleMaster?: (enabled: boolean) => void;
  /** Callback for Quick Voice Test button. */
  onTestVoice?: () => void | Promise<any>;
  /** Whether quick voice test is actively in progress. */
  isTestingVoice?: boolean;
  /** Active voice synthesis engine name. Defaults to Fish Audio (คุณพิพัฒน์ บุญสิทธิเลิศ). */
  activeEngine?: string;
  /** Callback to open or toggle the Room Switcher / Session Start dialog. */
  onOpenRoomModal?: () => void;
  /** Callback to switch TikTok accounts or open creator switcher dialog. */
  onSwitchAccount?: () => void;
  /** Callback to preview OBS Browser Source overlay. */
  onOpenOBSPreview?: () => void;
  /** Callback to toggle collapsible sidebar navigation state. */
  onToggleSidebar?: () => void;
  /** Optional custom className */
  className?: string;
}

export function Navbar({
  username = "phuriphat_live",
  isConnected = false,
  isReconnecting = false,
  backendUrl = "",
  sessionId = "",
  overlayToken,
  obsConnected = false,
  masterTtsEnabled = true,
  onToggleMaster,
  onTestVoice,
  isTestingVoice = false,
  activeEngine = "Fish Audio (คุณพิพัฒน์ บุญสิทธิเลิศ)",
  onOpenRoomModal,
  onSwitchAccount,
  onOpenOBSPreview,
  className = "",
}: NavbarProps): React.JSX.Element {
  const { theme, toggleTheme } = useTheme();
  const [copied, setCopied] = useState(false);

  // Clean creator handle for display
  const displayUser = username.replace(/^@/, "").trim() || "phuriphat_live";

  // OBS Overlay URL calculation
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
    <header
      className={`sticky top-0 z-50 w-full bg-[#12141a]/95 backdrop-blur-md border-b border-[#1e222d] px-4 md:px-6 py-3 shadow-lg flex items-center justify-between gap-4 transition-colors ${className}`}
      aria-label="TikFinity TTS Master Navigation Bar"
    >
      {/* Left Section: Brand Logo & Title */}
      <div className="flex items-center gap-3 shrink-0">
        <div
          className="w-[38px] h-[38px] rounded-lg bg-gradient-to-br from-[#fe2c55] to-[#25f4ee] flex items-center justify-center font-extrabold text-black text-lg select-none shadow-md shrink-0"
          title="TikFinity TTS Console"
        >
          TF
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-sm sm:text-base tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
              TikTok Live TTS Stream Console
            </h1>
          </div>
          <p className="text-[11px] text-slate-400 font-normal hidden sm:block">
            TikFinity Cleansed Edition • 24/7 Cloud Powered
          </p>
        </div>
      </div>

      {/* Right Section: Badges, Controls, Master Switch */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 flex-wrap justify-end">
        {/* Live Badge with Pulsing Dot */}
        <div
          className="flex items-center gap-2 bg-[#fe2c55]/15 border border-[#fe2c55]/30 px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#fe2c55] shadow-[0_0_12px_rgba(254,44,85,0.15)] cursor-pointer hover:bg-[#fe2c55]/20 transition-colors"
          onClick={onSwitchAccount || onOpenRoomModal}
          title={`TikTok Live: @${displayUser} (คลิกเพื่อเปลี่ยนห้อง)`}
        >
          <span className="w-2 h-2 rounded-full bg-[#fe2c55] animate-pulse shadow-[0_0_8px_#fe2c55]" />
          <span className="truncate max-w-[140px] sm:max-w-[200px]">
            LIVE: @{displayUser}
          </span>
        </div>

        {/* Voice Engine Badge */}
        <div
          className="hidden md:flex items-center gap-1.5 bg-[#25f4ee]/10 border border-[#25f4ee]/25 px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#25f4ee] shadow-sm"
          title={`Active Voice Engine: ${activeEngine}`}
        >
          <span>🎙️</span>
          <span className="truncate max-w-[220px]">{activeEngine}</span>
        </div>

        {/* Quick Voice Test Button */}
        {onTestVoice && (
          <button
            type="button"
            onClick={onTestVoice}
            disabled={isTestingVoice}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#181b24] hover:bg-[#222734] border border-[#1e222d] text-slate-200 hover:text-white transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-sm"
            title="ทดสอบระบบเสียงสังเคราะห์ (Quick Voice Test)"
          >
            {isTestingVoice ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#25f4ee]" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-[#25f4ee]" />
            )}
            <span className="hidden sm:inline">
              {isTestingVoice ? "กำลังทดสอบ..." : "ทดสอบเสียง"}
            </span>
          </button>
        )}

        {/* TTS Master Toggle Switch */}
        <div className="flex items-center gap-2.5 bg-[#181b24] border border-[#1e222d] px-3 py-1.5 rounded-lg shadow-sm">
          <span className="text-xs font-semibold text-slate-200 whitespace-nowrap select-none">
            TTS Master
          </span>
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={masterTtsEnabled}
              onChange={(e) => onToggleMaster?.(e.target.checked)}
              className="sr-only peer"
              aria-label="สวิตช์เปิด/ปิด TTS ทั้งหมด (Master TTS)"
            />
            <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#00e676]" />
          </label>
        </div>

        {/* Theme Mode Toggle (Sun/Moon) */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-lg bg-[#181b24] hover:bg-[#222734] border border-[#1e222d] text-slate-300 hover:text-white transition-colors"
          title={theme === "dark" ? "เปลี่ยนเป็นโหมดสว่าง (Light Mode)" : "เปลี่ยนเป็นโหมดมืด (Dark Cinema Mode)"}
          aria-label="Toggle theme color scheme"
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-300" />
          )}
        </button>

        {/* Room Switcher / Creator Profile Avatar */}
        <button
          type="button"
          onClick={onSwitchAccount || onOpenRoomModal}
          className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-800 to-slate-700 border border-[#1e222d] flex items-center justify-center text-slate-200 hover:text-white font-medium text-xs shadow-sm hover:ring-2 hover:ring-[#25f4ee]/40 transition-all shrink-0"
          title={`เปลี่ยนห้อง TikTok LIVE: @${displayUser}`}
          aria-label="Change live stream room"
        >
          <User className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}

export default Navbar;
