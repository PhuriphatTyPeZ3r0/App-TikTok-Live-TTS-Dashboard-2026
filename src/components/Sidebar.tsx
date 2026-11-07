"use client";

/**
 * ============================================================================
 * StreamVox Live Flowbite-Standard Responsive Sidebar Component for Next.js 15
 * ============================================================================
 *
 * Implements standard Flowbite responsive aside layout specification with Next.js App Router:
 * - HTML5 Semantic `<aside id="logo-sidebar" aria-label="Sidebar">`
 * - Real route navigation using Next.js `<Link href={item.path}>` across 8 workspace routes:
 *     1. `/` -> Cockpit (แดชบอร์ดหลัก)
 *     2. `/queue` -> Live Queue (คิวอ่านสด)
 *     3. `/voice` -> Voice Studio (เสียงพากย์)
 *     4. `/settings` -> Chat TTS (ตั้งค่าแชท)
 *     5. `/gift` -> Gift Alerts (ของขวัญ)
 *     6. `/safety` -> Safety & Filters (ตัวกรองคำ)
 *     7. `/obs` -> OBS Studio
 *     8. `/logs` -> System Logs (บันทึกระบบ)
 * - Automatic active link highlighting powered by Next.js `usePathname()`
 * - Fixed full viewport height: `fixed top-0 left-0 z-40 w-64 h-full`
 * - Responsive off-canvas transitions: `-translate-x-full sm:translate-x-0`
 * - Direct integration with `DashboardContext` (`sidebarMobileOpen`, `setSidebarMobileOpen`)
 * - Smooth closing of mobile drawer on link navigation
 * - High-accessibility touch targets >= 44x44px adhering to WCAG 2.1 & 2.2 Level AA
 * - Backdrop blur overlay on mobile screens (< sm / < 640px)
 * - Zero verbose descriptive paragraph text: minimal, clean Flowbite enterprise styling
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
 * Dedicated to Master Voice Actor: คุณพิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert).
 * Official voice model for StreamVox Live TTS engine.
 * ============================================================================
 */

import React, { useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ListOrdered,
  Mic,
  Tv,
  Settings,
  Gift,
  Shield,
  ScrollText,
  X,
  Radio,
} from "lucide-react";
import { useDashboard, type DashboardContextType } from "../context/DashboardContext";
import { cn } from "@/lib/utils";

export type TabType =
  | "cockpit"
  | "queue"
  | "voice"
  | "settings"
  | "gift"
  | "safety"
  | "obs"
  | "logs"
  | string;

export interface SidebarItem {
  id: TabType;
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export interface SidebarProps {
  /** Optional explicit pathname override for SSR, unit tests or custom route display. */
  pathname?: string;
  /** Currently selected navigation tab id or path override. Kept for backward compatibility. */
  activeTab?: TabType;
  /** Callback triggered when a navigation item is clicked. Kept for backward compatibility. */
  onTabChange?: (tab: TabType) => void;
  /** Backward compatibility callback triggered when a navigation item is clicked. */
  onSelectTab?: (tabId: string) => void;
  /** Whether sidebar is collapsed (kept for backward compatibility). */
  isCollapsed?: boolean;
  /** Callback to toggle collapse/expand state (kept for backward compatibility). */
  onToggleCollapse?: () => void;
  /** Whether the mobile slide-over off-canvas drawer is currently open. Overrides DashboardContext. */
  isMobileOpen?: boolean;
  /** Callback to close the mobile slide-over off-canvas drawer. */
  onMobileClose?: () => void;
  /** Backward compatibility callback to close the mobile drawer. */
  onCloseMobile?: () => void;
  /** Live FIFO queue count for displaying badge indicator. Overrides DashboardContext queue length. */
  liveQueueCount?: number;
  /** Whether live streaming connection is active. Overrides DashboardContext. */
  isStreaming?: boolean;
  /** Optional custom CSS classes. */
  className?: string;
}

/**
 * 8 Core Workspace Navigation Routes with explicit App Router paths.
 */
export const SIDEBAR_ITEMS: SidebarItem[] = [
  {
    id: "cockpit",
    path: "/",
    label: "แดชบอร์ดหลัก (Cockpit)",
    icon: LayoutDashboard,
  },
  {
    id: "queue",
    path: "/queue",
    label: "คิวอ่านสด (Live Queue)",
    icon: ListOrdered,
  },
  {
    id: "voice",
    path: "/voice",
    label: "เสียงพากย์ (Voice Studio)",
    icon: Mic,
  },
  {
    id: "settings",
    path: "/settings",
    label: "ตั้งค่าแชท (Chat TTS)",
    icon: Settings,
  },
  {
    id: "gift",
    path: "/gift",
    label: "ของขวัญ (Gift Alerts)",
    icon: Gift,
  },
  {
    id: "safety",
    path: "/safety",
    label: "ตัวกรองคำ (Safety & Filters)",
    icon: Shield,
  },
  {
    id: "obs",
    path: "/obs",
    label: "OBS Studio",
    icon: Tv,
  },
  {
    id: "logs",
    path: "/logs",
    label: "บันทึกระบบ (System Logs)",
    icon: ScrollText,
  },
];

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

/**
 * Determines whether a given sidebar navigation item is active based on current pathname.
 *
 * @param pathname - Current Next.js App Router pathname string
 * @param itemPath - Route path of the target sidebar item
 * @returns boolean indicating whether the item is active
 */
export function isSidebarItemActive(pathname: string, itemPath: string): boolean {
  if (!pathname || !itemPath) return false;
  const cleanPath = pathname.split("?")[0].replace(/\/+$/, "") || "/";
  const cleanItem = itemPath.split("?")[0].replace(/\/+$/, "") || "/";
  return cleanPath === cleanItem || (cleanItem !== "/" && cleanPath.startsWith(cleanItem));
}

export function Sidebar({
  pathname: pathnameProp,
  activeTab: activeTabProp,
  onTabChange,
  onSelectTab,
  isCollapsed = false,
  onToggleCollapse,
  isMobileOpen: isMobileOpenProp,
  onMobileClose,
  onCloseMobile,
  liveQueueCount: liveQueueCountProp,
  isStreaming: isStreamingProp,
  className = "",
}: SidebarProps): React.JSX.Element {
  const dashboard = useDashboardSafe();

  // Mobile drawer state: prop override has highest priority, otherwise consume DashboardContext
  const isMobileOpen = isMobileOpenProp ?? dashboard?.sidebarMobileOpen ?? false;

  // Safe helper to invoke mobile close callbacks and close DashboardContext mobile drawer
  const handleCloseMobile = useCallback(() => {
    if (dashboard?.setSidebarMobileOpen) {
      dashboard.setSidebarMobileOpen(false);
    }
    if (onMobileClose) {
      onMobileClose();
    }
    if (onCloseMobile) {
      onCloseMobile();
    }
  }, [dashboard, onMobileClose, onCloseMobile]);

  // Handle keyboard Escape to dismiss mobile drawer per WCAG 2.1 AA
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMobileOpen) {
        handleCloseMobile();
      }
    },
    [isMobileOpen, handleCloseMobile]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isMobileOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isMobileOpen, handleKeyDown]);

  // App Router Pathname resolution with graceful fallback
  let hookPathname: string | null = null;
  try {
    hookPathname = usePathname();
  } catch {
    hookPathname = null;
  }

  const fallbackFromTab = activeTabProp
    ? SIDEBAR_ITEMS.find((i) => i.id === activeTabProp || i.path === activeTabProp)?.path
    : undefined;

  const pathname = pathnameProp ?? hookPathname ?? fallbackFromTab ?? "/";

  // Telemetry fallbacks from DashboardContext
  const liveQueueCount = liveQueueCountProp ?? dashboard?.queue?.length ?? 0;
  const isStreaming = isStreamingProp ?? dashboard?.isStreaming ?? false;

  const handleItemClick = (item: SidebarItem) => {
    if (dashboard?.setSidebarMobileOpen) {
      dashboard.setSidebarMobileOpen(false);
    }
    handleCloseMobile();
    if (onTabChange) {
      onTabChange(item.id);
    }
    if (onSelectTab) {
      onSelectTab(item.id);
    }
  };

  return (
    <>
      {/* ==================================================================== */}
      {/* 1. Mobile Backdrop Blur Overlay (< sm / < 640px)                     */}
      {/* ==================================================================== */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm sm:hidden transition-opacity duration-200"
          onClick={handleCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* ==================================================================== */}
      {/* 2. Flowbite Standard Aside Navigation Container                      */}
      {/* ==================================================================== */}
      <aside
        id="logo-sidebar"
        className={cn(
          "fixed top-0 left-0 z-40 w-64 h-full transition-transform duration-200 ease-in-out border-r border-border bg-card text-card-foreground select-none",
          isMobileOpen ? "translate-x-0" : "-translate-x-full sm:translate-x-0",
          className
        )}
        aria-label="Sidebar"
      >
        <div className="h-full px-3 py-4 overflow-y-auto no-scrollbar flex flex-col justify-between">
          <div>
            {/* Top Brand Logo & App Header */}
            <div className="flex items-center justify-between ps-2.5 mb-5 pb-3 border-b border-border">
              <Link
                href="/"
                onClick={handleCloseMobile}
                className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg min-touch-target"
                aria-label="StreamVox Live Home"
              >
                <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-extrabold text-sm shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                  <span className="material-symbols-rounded text-lg select-none">
                    graphic_eq
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="self-center text-sm font-bold tracking-tight text-foreground whitespace-nowrap">
                    StreamVox Live
                  </span>
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-primary/15 text-primary border border-primary/25">
                    PRO
                  </span>
                </div>
              </Link>

              {/* Close Button on Mobile Screen */}
              <button
                type="button"
                onClick={handleCloseMobile}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent border border-border transition-colors sm:hidden min-touch-target flex items-center justify-center"
                aria-label="Close sidebar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation List per Flowbite pattern: <ul class="space-y-1.5 font-medium"> */}
            <ul className="space-y-1.5 font-medium" role="menu">
              {SIDEBAR_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = isSidebarItemActive(pathname, item.path);
                const showQueueBadge = item.id === "queue" && liveQueueCount > 0;

                return (
                  <li key={item.id} role="none">
                    <Link
                      href={item.path}
                      role="menuitem"
                      onClick={() => handleItemClick(item)}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "w-full flex items-center px-3 py-2.5 text-xs sm:text-sm font-medium rounded-xl transition-all duration-150 group text-left min-h-[44px] min-touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background",
                        isActive
                          ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <Icon
                        className={cn(
                          "w-5 h-5 shrink-0 transition duration-75",
                          isActive
                            ? "text-primary-foreground"
                            : "text-muted-foreground group-hover:text-foreground"
                        )}
                        aria-hidden="true"
                      />
                      <span className="ms-3 flex-1 whitespace-nowrap truncate tracking-tight">
                        {item.label}
                      </span>
                      {showQueueBadge && (
                        <span className="inline-flex items-center justify-center px-2 py-0.5 ms-2 text-[10px] font-bold text-destructive-foreground bg-destructive rounded-full font-mono">
                          {liveQueueCount}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Bottom Attribution & System Status Card */}
          <div className="pt-3 border-t border-border mt-auto">
            <div className="px-3 py-2 rounded-xl bg-muted/40 border border-border flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <Radio
                  className={cn(
                    "w-3 h-3",
                    isStreaming ? "text-destructive animate-pulse" : "text-muted-foreground"
                  )}
                  aria-hidden="true"
                />
                <span className="text-[11px] truncate">คุณพิพัฒน์ บุญสิทธิเลิศ</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-primary">v2.1</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
