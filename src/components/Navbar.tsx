"use client";

/**
 * StreamVox Live Master Navigation Bar Component for Next.js 15.
 *
 * Implements Flowbite Modern Enterprise Design System (DS) & Web Content Accessibility Guidelines (WCAG) 2.1 AA:
 * - Direct integration with global DashboardContext (`useDashboard()`)
 * - Dynamic route breadcrumb navigation powered by Next.js App Router (`usePathname()`)
 * - Responsive mobile off-canvas drawer toggle button (`min-h-[44px] min-w-[44px]`)
 * - TikTok Room Switcher Chip with pulsing live indicator dot triggering room modal (`setShowRoomModal(true)`)
 * - High-visibility Master Text-to-Speech (TTS) toggle button with radiant emerald/rose state glow
 * - Quick Voice Test trigger button (`testVoice()`) featuring speaker icon
 * - Inline volume slider and mute toggle synchronizing with TikFinity configuration (`settings.volume`)
 * - Embedded Role-Based Access Control (RBAC) user profile button (`UserProfileButton`)
 * - Zero verbose descriptive paragraphs: strictly minimal, high-density Flowbite enterprise interface
 * - Touch targets >= 44x44px adhering to WCAG 2.1 Level AA mobile ergonomics
 * - Semantic design tokens with complete dark/light cinema mode adaptability
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
 * - Dedicated to Master Thai Voice Actor: คุณพิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert).
 */

import React, { useState, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import {
  Loader2,
  Sun,
  Moon,
  Volume2,
  Volume1,
  VolumeX,
  ChevronRight,
  Radio,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useDashboard, type DashboardContextType } from "../context/DashboardContext";
import { UserProfileButton } from "./auth/UserProfileButton";
import { AuthModal } from "./auth/AuthModal";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";

/**
 * Route-to-Breadcrumb label dictionary.
 * Maps Next.js 15 App Router uniform resource identifier (URI) paths to human-readable workspace section names.
 */
export const ROUTE_BREADCRUMBS: Record<string, string> = {
  "/": "Cockpit",
  "/queue": "FIFO Queue",
  "/voice": "Voice Studio",
  "/settings": "Chat TTS",
  "/gift": "Gift Alerts",
  "/safety": "Safety & Filters",
  "/obs": "OBS Studio",
  "/logs": "Broadcast Logs",
};

/**
 * Resolves the dynamic breadcrumb label based on active Uniform Resource Identifier (URI) pathname.
 *
 * @param pathname - Current Next.js App Router pathname string
 * @returns Human-readable workspace section label (defaults to "Cockpit")
 */
export function getBreadcrumbTitle(pathname?: string | null): string {
  if (!pathname) return "Cockpit";
  const clean = pathname.split("?")[0].replace(/\/+$/, "") || "/";
  return ROUTE_BREADCRUMBS[clean] || ROUTE_BREADCRUMBS[pathname] || "Cockpit";
}

/**
 * Safe consumer wrapper for useDashboard hook to prevent uncaught exceptions
 * when rendered in isolated test harnesses without a parent DashboardProvider.
 */
function useDashboardSafe(): DashboardContextType | null {
  try {
    return useDashboard();
  } catch {
    return null;
  }
}

export interface NavbarProps {
  /** Optional TikTok creator handle override (e.g. @phuriphat_live). */
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
  /** Master TTS switch state override. */
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
  /** Optional explicit pathname override for SSR, unit tests or custom route display. */
  pathname?: string;
  /** Optional custom CSS className. */
  className?: string;
}

export function Navbar({
  username: usernameProp,
  isConnected,
  isReconnecting,
  backendUrl,
  sessionId,
  overlayToken,
  obsConnected,
  masterTtsEnabled: masterTtsProp,
  onToggleMaster,
  onTestVoice,
  isTestingVoice: isTestingVoiceProp,
  activeEngine,
  selectedVoiceId,
  onOpenRoomModal,
  onSwitchAccount,
  onOpenOBSPreview,
  onToggleSidebar,
  isSidebarOpen: isSidebarOpenProp,
  onOpenAuthModal,
  pathname: pathnameProp,
  className = "",
}: NavbarProps): React.JSX.Element {
  const { theme, toggleTheme } = useTheme();
  const dashboard = useDashboardSafe();
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);

  // Pathname resolution with App Router fallback
  let hookPathname: string | null = null;
  try {
    hookPathname = usePathname();
  } catch {
    hookPathname = null;
  }
  const currentPath = pathnameProp ?? hookPathname ?? "/";
  const activeBreadcrumb = getBreadcrumbTitle(currentPath);

  // Extract reactive properties from DashboardContext with prop fallbacks
  const rawUsername = usernameProp !== undefined ? usernameProp : dashboard?.username;
  const cleanUsername = rawUsername ? rawUsername.replace(/^@/, "").trim() : "";
  const displayUsername = cleanUsername ? `@${cleanUsername}` : "@username";

  const masterTtsEnabled = masterTtsProp ?? dashboard?.masterTtsEnabled ?? true;
  const isTestingVoice = isTestingVoiceProp ?? dashboard?.isTestingVoice ?? false;
  const sidebarMobileOpen = isSidebarOpenProp ?? dashboard?.sidebarMobileOpen ?? false;

  const currentVolume =
    typeof dashboard?.settings?.volume === "number"
      ? dashboard.settings.volume
      : 1.0;
  const isMuted = currentVolume <= 0.01;
  const prevVolumeRef = useRef<number>(currentVolume > 0.05 ? currentVolume : 1.0);

  // Action Dispatches
  const handleToggleSidebar = useCallback(() => {
    if (dashboard?.setSidebarMobileOpen) {
      dashboard.setSidebarMobileOpen((prev) => !prev);
    }
    onToggleSidebar?.();
  }, [dashboard, onToggleSidebar]);

  const handleRoomClick = useCallback(() => {
    if (dashboard?.setShowRoomModal) {
      dashboard.setShowRoomModal(true);
    }
    onOpenRoomModal?.();
    onSwitchAccount?.();
  }, [dashboard, onOpenRoomModal, onSwitchAccount]);

  const handleToggleMaster = useCallback(() => {
    const nextVal = !masterTtsEnabled;
    if (dashboard?.setMasterTtsEnabled) {
      dashboard.setMasterTtsEnabled(nextVal);
    }
    onToggleMaster?.(nextVal);
  }, [dashboard, masterTtsEnabled, onToggleMaster]);

  const handleTestVoice = useCallback(() => {
    if (dashboard?.testVoice) {
      dashboard.testVoice();
    }
    onTestVoice?.();
  }, [dashboard, onTestVoice]);

  const handleVolumeChange = useCallback(
    (newVolume: number) => {
      const clamped = Math.max(0, Math.min(1, newVolume));
      if (clamped > 0.05) {
        prevVolumeRef.current = clamped;
      }
      if (dashboard?.updateSettings) {
        dashboard.updateSettings({ volume: clamped });
      }
    },
    [dashboard]
  );

  const toggleMute = useCallback(() => {
    if (isMuted) {
      const restored = prevVolumeRef.current > 0.05 ? prevVolumeRef.current : 1.0;
      handleVolumeChange(restored);
    } else {
      prevVolumeRef.current = currentVolume;
      handleVolumeChange(0);
    }
  }, [isMuted, currentVolume, handleVolumeChange]);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 w-full bg-background/85 backdrop-blur-md border-b border-border px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 pt-[calc(0.5rem+env(safe-area-inset-top,0px))] shadow-xs flex items-center justify-between gap-2.5 sm:gap-4 transition-colors",
        className
      )}
      aria-label="StreamVox Live Master Navigation Bar"
    >
      {/* Left Section: Mobile Hamburger, Brand Emblem & Dynamic Route Breadcrumb */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Responsive Mobile Drawer Menu Toggle (Flowbite Standard: flex sm:hidden) */}
        <button
          type="button"
          onClick={handleToggleSidebar}
          aria-expanded={sidebarMobileOpen}
          aria-controls="logo-sidebar"
          className="text-foreground bg-transparent border border-border hover:bg-accent focus:ring-2 focus:ring-ring font-medium rounded-lg text-sm p-2 focus:outline-none flex sm:hidden min-h-[44px] min-w-[44px] items-center justify-center shrink-0 min-touch-target"
          aria-label="Open sidebar"
          title="Open navigation menu (Open sidebar)"
        >
          <span className="sr-only">Open sidebar</span>
          <svg
            className="w-6 h-6"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="2"
              d="M5 7h14M5 12h14M5 17h10"
            />
          </svg>
        </button>

        {/* Brand Logo Box (Touch target >= 44x44px) */}
        <div
          role="button"
          tabIndex={0}
          onClick={handleToggleSidebar}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              handleToggleSidebar();
            }
          }}
          className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-extrabold text-lg select-none shadow-xs shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
          title="StreamVox Live TTS Console (Toggle Sidebar)"
          aria-label="StreamVox Live TTS Console"
        >
          <Radio className="w-5 h-5 select-none" aria-hidden="true" />
        </div>

        {/* Brand Title and Product Tier */}
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm sm:text-base tracking-tight text-foreground select-none">
            StreamVox
          </span>
          <Badge
            variant="outline"
            className="text-[10px] font-mono py-0 px-1.5 font-bold tracking-wider hidden xs:inline-flex"
          >
            PRO
          </Badge>
        </div>

        {/* Dynamic Route Breadcrumb (Flowbite Minimal Standard) */}
        <nav
          className="flex items-center text-sm font-medium text-muted-foreground ml-1 sm:ml-2"
          aria-label="Breadcrumb"
        >
          <ol className="inline-flex items-center space-x-1 sm:space-x-1.5">
            <li className="inline-flex items-center">
              <ChevronRight
                className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0"
                aria-hidden="true"
              />
            </li>
            <li className="inline-flex items-center">
              <span
                className="text-xs font-semibold text-foreground bg-secondary/80 border border-border px-2 py-0.5 rounded-md whitespace-nowrap"
                data-testid="navbar-breadcrumb"
              >
                {activeBreadcrumb}
              </span>
            </li>
          </ol>
        </nav>
      </div>

      {/* Right Section: Room Switcher, Master TTS Toggle, Quick Voice Test, Volume & SSO Profile */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 flex-wrap justify-end">
        {/* TikTok Room Switcher Chip (Pulsing live dot, min-h-[44px] min-w-[44px]) */}
        <button
          type="button"
          onClick={handleRoomClick}
          className="flex items-center justify-center gap-2 bg-card/60 border border-border hover:border-emerald-500/50 hover:bg-emerald-500/10 px-3.5 py-1.5 rounded-full text-xs font-semibold text-foreground transition-all h-11 min-h-[44px] min-w-[44px] select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background active:scale-[0.98]"
          title={
            cleanUsername
              ? `TikTok Live Room: @${cleanUsername} (Click to change room)`
              : "TikTok Live Room: @username (Click to set room)"
          }
          aria-label={
            cleanUsername
              ? `TikTok Live Room: @${cleanUsername} (Click to change room)`
              : "TikTok Live Room: @username (Click to set room)"
          }
        >
          <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span className="truncate max-w-[100px] sm:max-w-[150px] font-medium">
            {displayUsername}
          </span>
        </button>

        {/* Master TTS Toggle Button (High-visibility radiant glow: Emerald when ON, Rose when OFF) */}
        <button
          type="button"
          onClick={handleToggleMaster}
          aria-pressed={masterTtsEnabled}
          className={cn(
            "flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border font-semibold text-xs h-11 min-h-[44px] min-w-[44px] transition-all select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background active:scale-[0.98]",
            masterTtsEnabled
              ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.35)] hover:bg-emerald-500/25"
              : "bg-rose-500/15 border-rose-500/40 text-rose-600 dark:text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.35)] hover:bg-rose-500/25"
          )}
          title={
            masterTtsEnabled
              ? "Master TTS is Active (Click to disable speech output)"
              : "Master TTS is Disabled (Click to enable speech output)"
          }
          aria-label={masterTtsEnabled ? "Disable Master TTS" : "Enable Master TTS"}
        >
          <span
            className={cn(
              "w-2.5 h-2.5 rounded-full transition-colors shrink-0",
              masterTtsEnabled
                ? "bg-emerald-500 shadow-[0_0_6px_#10b981]"
                : "bg-rose-500 shadow-[0_0_6px_#f43f5e]"
            )}
            aria-hidden="true"
          />
          <span className="whitespace-nowrap hidden xs:inline">Master TTS</span>
          <span
            className={cn(
              "text-[10px] font-mono px-1.5 py-0.5 rounded font-bold uppercase",
              masterTtsEnabled
                ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                : "bg-rose-500/20 text-rose-700 dark:text-rose-300"
            )}
          >
            {masterTtsEnabled ? "ON" : "OFF"}
          </span>
        </button>

        {/* Quick Voice Test Trigger Button */}
        <Button
          type="button"
          variant="outline"
          size="default"
          onClick={handleTestVoice}
          disabled={isTestingVoice}
          className="h-11 min-h-[44px] min-w-[44px] px-3 sm:px-3.5 gap-2 text-xs font-semibold border-border hover:bg-accent hover:text-accent-foreground select-none flex items-center justify-center"
          title="Quick Voice Test"
          aria-label="Test Voice"
        >
          {isTestingVoice ? (
            <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" aria-hidden="true" />
          ) : (
            <Volume2 className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
          )}
          <span className="whitespace-nowrap">
            {isTestingVoice ? "Testing..." : "Test Voice"}
          </span>
        </Button>

        {/* Volume Control: Slider & Mute Toggle (settings.volume) */}
        <div
          className="flex items-center gap-1.5 bg-card/60 border border-border px-1.5 py-0.5 rounded-lg shadow-xs h-11 min-h-[44px]"
          title={`TTS Master Volume: ${Math.round(currentVolume * 100)}%`}
        >
          <button
            type="button"
            onClick={toggleMute}
            className="h-11 w-11 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring select-none"
            aria-label={isMuted ? "Unmute TTS audio" : "Mute TTS audio"}
            title={isMuted ? "Unmute TTS audio" : "Mute TTS audio"}
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-rose-500 shrink-0" aria-hidden="true" />
            ) : currentVolume <= 0.5 ? (
              <Volume1 className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
            ) : (
              <Volume2 className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
            )}
          </button>
          <div className="hidden md:flex items-center gap-2 pr-1">
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={currentVolume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-16 lg:w-20 h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              aria-label="Master Output Volume Slider"
            />
            <span className="text-[11px] font-mono text-muted-foreground w-8 text-right select-none">
              {Math.round(currentVolume * 100)}%
            </span>
          </div>
        </div>

        {/* Theme Mode Toggle (Sun/Moon) */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={toggleTheme}
          className="h-11 w-11 min-h-[44px] min-w-[44px] border-border text-foreground hover:bg-accent hover:text-accent-foreground flex items-center justify-center"
          title={
            theme === "dark"
              ? "Switch to Light Mode"
              : "Switch to Dark Cinema Mode"
          }
          aria-label="Toggle theme color scheme"
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 text-amber-400" aria-hidden="true" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600 dark:text-slate-300" aria-hidden="true" />
          )}
        </Button>

        {/* User Profile Single Sign-On (SSO) & Role-Based Access Control (RBAC) */}
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
