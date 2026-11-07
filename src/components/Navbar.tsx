"use client";

/**
 * StreamVox Live Master Navigation Bar Component for Next.js 15.
 *
 * Implements Clean Minimal Enterprise Design System (DS) & Web Content Accessibility Guidelines (WCAG) 2.1 AA:
 * - Brand logo with Google Material Symbols (`graphic_eq`)
 * - Responsive mobile hamburger drawer toggle button (`Menu`) with touch target >= 44x44px (`md:hidden`)
 * - Title: "StreamVox Live" with `v2.1 PRO` status badge
 * - Subtitle: "TikTok Live Text-to-Speech (TTS) Studio • PyThaiNLP & Multi-Voice Powered"
 * - Status indicators:
 *     - LIVE badge with pulsing indicator: `LIVE: @{username || 'phuriphat_live'}`
 *     - Active Voice profile indicator: `record_voice_over {activeEngine}`
 * - Quick Voice Test button with Google Material Symbols (`volume_up`) and loading indicator
 * - Text-to-Speech (TTS) Master toggle switch (`masterTtsEnabled` / `onToggleMaster`)
 * - Touch targets >= 44x44px for optimal mobile ergonomics across iOS and Android
 * - Safe area top padding for Dynamic Island and hardware camera cutouts
 * - Zero Hardcoded Colors: Uses semantic tokens (`bg-background/85`, `border-border`, etc.)
 *
 * Full Academic Terminology & Acronyms:
 * - User Interface (UI)
 * - User Experience (UX)
 * - Design System (DS)
 * - Web Content Accessibility Guidelines (WCAG)
 * - Single-Page Application (SPA)
 * - Asynchronous Server Gateway Interface (ASGI)
 * - Open Broadcaster Software (OBS)
 * - Text-to-Speech (TTS)
 * - Application Programming Interface (API)
 * - Role-Based Access Control (RBAC)
 *
 * Voice Actor Attribution:
 * - Dedicated to Master Voice Actor: คุณพิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert).
 */

import React, { useState } from "react";
import { Loader2, Sun, Moon, User, Menu } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { UserProfileButton } from "./auth/UserProfileButton";
import { AuthModal } from "./auth/AuthModal";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";

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
  /** Currently selected voice profile ID (e.g., "yuta", "hana", "joker", "anchor", "niwat"). */
  selectedVoiceId?: string;
  /** Callback to open or toggle the Room Switcher / Session Start dialog. */
  onOpenRoomModal?: () => void;
  /** Callback to switch TikTok accounts or open creator switcher dialog. */
  onSwitchAccount?: () => void;
  /** Callback to preview OBS Browser Source overlay. */
  onOpenOBSPreview?: () => void;
  /** Callback to toggle collapsible sidebar navigation state. */
  onToggleSidebar?: () => void;
  /** State indicator whether collapsible navigation sidebar is currently open/expanded. */
  isSidebarOpen?: boolean;
  /** Callback to trigger authentication modal dialog. */
  onOpenAuthModal?: () => void;
  /** Optional custom className */
  className?: string;
}

const VOICE_BADGE_LABELS: Record<string, string> = {
  yuta: "พิพัฒน์ บุญสิทธิเลิศ (Yuta • Fish Audio)",
  hana: "ฮานะ (Hana Sweet • Fish Audio)",
  joker: "ดีเจโจ๊กเกอร์ (DJ Joker • Fish Audio)",
  anchor: "ผู้ประกาศข่าว ชาย (News Anchor • Fish Audio)",
  niwat: "นิวัฒน์ (Niwat Neural • Edge-TTS)",
};

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
  activeEngine,
  selectedVoiceId = "yuta",
  onOpenRoomModal,
  onSwitchAccount,
  onOpenOBSPreview,
  onToggleSidebar,
  isSidebarOpen = false,
  onOpenAuthModal,
  className = "",
}: NavbarProps): React.JSX.Element {
  const { theme, toggleTheme } = useTheme();
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);

  // Clean creator handle for display
  const displayUser = username.replace(/^@/, "").trim() || "phuriphat_live";

  const resolvedEngineLabel =
    activeEngine ||
    VOICE_BADGE_LABELS[selectedVoiceId] ||
    "Fish Audio (คุณพิพัฒน์ บุญสิทธิเลิศ)";

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full bg-background/85 backdrop-blur-md border-b border-border px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 pt-[calc(0.625rem+env(safe-area-inset-top,0px))] shadow-xs flex items-center justify-between gap-2.5 sm:gap-4 transition-colors",
        className
      )}
      aria-label="StreamVox Live Master Navigation Bar"
    >
      {/* Left Section: Mobile Hamburger, Brand Logo & Title */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Mobile Hamburger Drawer Toggle (Touch target >= 44x44px, hidden on md+) */}
        {onToggleSidebar && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onToggleSidebar}
            aria-expanded={isSidebarOpen}
            aria-label="Toggle navigation menu"
            title="เปิด/ปิดเมนูนำทาง (Toggle Sidebar)"
            className="h-11 w-11 min-h-[44px] min-w-[44px] md:hidden shrink-0 border-border text-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <Menu className="w-5 h-5" />
          </Button>
        )}

        {/* Brand Icon Box (Touch target >= 44x44px, triggers onToggleSidebar if desktop drawer) */}
        <div
          role="button"
          tabIndex={0}
          onClick={onToggleSidebar}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              onToggleSidebar?.();
            }
          }}
          className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-extrabold text-lg select-none shadow-xs shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
          title="StreamVox Live TTS Console (Toggle Sidebar)"
          aria-label="StreamVox Live TTS Console"
        >
          <span className="material-symbols-rounded text-xl select-none">
            graphic_eq
          </span>
        </div>

        {/* Brand Title and Subtitle */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-sm sm:text-base tracking-tight text-foreground">
              StreamVox Live
            </h1>
            <Badge
              variant="outline"
              className="text-[10px] font-mono py-0 px-2 font-bold tracking-wider"
            >
              v2.1 PRO
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground font-normal hidden lg:block">
            TikTok Live TTS Stream Console • PyThaiNLP &amp; Multi-Voice Studio
          </p>
        </div>
      </div>

      {/* Right Section: Badges, Controls, TTS Master Switch & Profile */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-wrap justify-end">
        {/* Live Badge with Pulsing Dot */}
        <div
          role="button"
          tabIndex={0}
          onClick={onSwitchAccount || onOpenRoomModal}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              (onSwitchAccount || onOpenRoomModal)?.();
            }
          }}
          className="flex items-center gap-2 bg-destructive/15 border border-destructive/30 px-3.5 py-1.5 rounded-full text-xs font-semibold text-destructive shadow-xs cursor-pointer hover:bg-destructive/25 transition-colors h-11 min-h-[44px] select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
          title={`TikTok Live: @${displayUser} (คลิกเพื่อเปลี่ยนห้อง)`}
          aria-label={`TikTok Live: @${displayUser}`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-destructive animate-pulse" />
          <span className="truncate max-w-[110px] sm:max-w-[180px]">
            LIVE: @{displayUser}
          </span>
        </div>

        {/* Voice Engine Badge (hidden on mobile/tablet, visible on desktop >= xl) */}
        <div
          className="hidden xl:flex items-center gap-2 bg-secondary border border-border px-3.5 py-1.5 rounded-full text-xs font-semibold text-secondary-foreground shadow-xs h-11 min-h-[44px] select-none"
          title={`Active Voice Engine: ${resolvedEngineLabel}`}
        >
          <span className="material-symbols-rounded text-base select-none text-primary">
            record_voice_over
          </span>
          <span className="truncate max-w-[220px]">{resolvedEngineLabel}</span>
        </div>

        {/* Quick Voice Test Button */}
        {onTestVoice && (
          <Button
            type="button"
            variant="outline"
            size="default"
            onClick={onTestVoice}
            disabled={isTestingVoice}
            className="h-11 min-h-[44px] px-3.5 gap-2 text-xs font-semibold border-border hover:bg-accent hover:text-accent-foreground"
            title="ทดสอบระบบเสียงสังเคราะห์ (Quick Voice Test)"
            aria-label="ทดสอบระบบเสียงสังเคราะห์ (Quick Voice Test)"
          >
            {isTestingVoice ? (
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            ) : (
              <span className="material-symbols-rounded text-base text-primary select-none">
                volume_up
              </span>
            )}
            <span className="hidden sm:inline">
              {isTestingVoice ? "กำลังทดสอบ..." : "ทดสอบเสียง"}
            </span>
          </Button>
        )}

        {/* TTS Master Toggle Switch */}
        <div className="flex items-center gap-2.5 bg-card border border-border px-3.5 py-1.5 rounded-lg shadow-xs h-11 min-h-[44px]">
          <span className="text-[11px] sm:text-xs font-semibold text-foreground whitespace-nowrap select-none hidden xs:inline">
            Master TTS
          </span>
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={masterTtsEnabled}
              onChange={(e) => onToggleMaster?.(e.target.checked)}
              className="sr-only peer"
              aria-label="สวิตช์เปิด/ปิด TTS ทั้งหมด (Master TTS)"
            />
            <div className="w-10 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary border border-border" />
          </label>
        </div>

        {/* Theme Mode Toggle (Sun/Moon) */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={toggleTheme}
          className="h-11 w-11 min-h-[44px] min-w-[44px] border-border text-foreground hover:bg-accent hover:text-accent-foreground"
          title={
            theme === "dark"
              ? "เปลี่ยนเป็นโหมดสว่าง (Light Mode)"
              : "เปลี่ยนเป็นโหมดมืด (Dark Cinema Mode)"
          }
          aria-label="Toggle theme color scheme"
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          )}
        </Button>

        {/* Room Switcher Button */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onSwitchAccount || onOpenRoomModal}
          className="h-11 w-11 min-h-[44px] min-w-[44px] border-border text-foreground hover:bg-accent hover:text-accent-foreground"
          title={`เปลี่ยนห้อง TikTok LIVE: @${displayUser}`}
          aria-label="Change live stream room"
        >
          <User className="w-4 h-4" />
        </Button>

        {/* User Profile & Role-Based Access Control (RBAC) Button */}
        <UserProfileButton
          onOpenAuthModal={() => {
            if (onOpenAuthModal) {
              onOpenAuthModal();
            } else {
              setAuthModalOpen(true);
            }
          }}
        />
      </div>

      {/* Supabase / OAuth Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </header>
  );
}

export default Navbar;
