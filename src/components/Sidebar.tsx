"use client";

/**
 * StreamVox Live Flowbite-Standard Responsive Sidebar Component for Next.js 15.
 *
 * Implements standard Flowbite responsive aside layout specification:
 * - HTML5 Semantic `<aside id="logo-sidebar" aria-label="Sidebar">`
 * - Fixed full viewport height: `fixed top-0 left-0 z-40 w-64 h-full`
 * - Responsive off-canvas transitions: `-translate-x-full sm:translate-x-0`
 * - High-accessibility touch targets >= 44x44px for iOS Dynamic Island and Android One UI
 * - Backdrop blur overlay on mobile screens (< sm / < 640px)
 * - Compliant with Web Content Accessibility Guidelines (WCAG) 2.1 & 2.2 Level AA
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
 *
 * Voice Actor Attribution:
 * Dedicated to Master Voice Actor: คุณพิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert).
 */

import React, { useEffect, useCallback } from "react";
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
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export interface SidebarProps {
  /** Currently selected navigation tab id. Defaults to "cockpit". */
  activeTab?: TabType;
  /** Callback triggered when a navigation item is clicked. */
  onTabChange?: (tab: TabType) => void;
  /** Backward compatibility callback triggered when a navigation item is clicked. */
  onSelectTab?: (tabId: string) => void;
  /** Whether sidebar is collapsed (kept for backward compatibility). */
  isCollapsed?: boolean;
  /** Callback to toggle collapse/expand state (kept for backward compatibility). */
  onToggleCollapse?: () => void;
  /** Whether the mobile slide-over off-canvas drawer is currently open. */
  isMobileOpen?: boolean;
  /** Callback to close the mobile slide-over off-canvas drawer. */
  onMobileClose?: () => void;
  /** Backward compatibility callback to close the mobile drawer. */
  onCloseMobile?: () => void;
  /** Live FIFO queue count for displaying badge indicator. */
  liveQueueCount?: number;
  /** Whether live streaming connection is active. */
  isStreaming?: boolean;
  /** Optional custom CSS classes. */
  className?: string;
}

export const SIDEBAR_ITEMS: SidebarItem[] = [
  {
    id: "cockpit",
    label: "แดชบอร์ดหลัก (Cockpit)",
    icon: LayoutDashboard,
  },
  {
    id: "queue",
    label: "คิวอ่านสด (Live Queue)",
    icon: ListOrdered,
  },
  {
    id: "voice",
    label: "เสียงพากย์ (Voice Studio)",
    icon: Mic,
  },
  {
    id: "settings",
    label: "ตั้งค่าแชท (Chat TTS)",
    icon: Settings,
  },
  {
    id: "gift",
    label: "ของขวัญ (Gift Alerts)",
    icon: Gift,
  },
  {
    id: "safety",
    label: "ตัวกรองคำ (Safety & Filters)",
    icon: Shield,
  },
  {
    id: "obs",
    label: "OBS Studio",
    icon: Tv,
  },
  {
    id: "logs",
    label: "บันทึกระบบ (System Logs)",
    icon: ScrollText,
  },
];

export function Sidebar({
  activeTab = "cockpit",
  onTabChange,
  onSelectTab,
  isCollapsed = false,
  onToggleCollapse,
  isMobileOpen = false,
  onMobileClose,
  onCloseMobile,
  liveQueueCount = 0,
  isStreaming = false,
  className = "",
}: SidebarProps): React.JSX.Element {
  // Safe helper to invoke mobile close callbacks
  const handleCloseMobile = useCallback(() => {
    if (onMobileClose) {
      onMobileClose();
    }
    if (onCloseMobile) {
      onCloseMobile();
    }
  }, [onMobileClose, onCloseMobile]);

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

  const handleItemClick = (tabId: TabType) => {
    if (onTabChange) {
      onTabChange(tabId);
    }
    if (onSelectTab) {
      onSelectTab(tabId);
    }
    if (isMobileOpen) {
      handleCloseMobile();
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
              <a
                href="/"
                className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
              >
                <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-extrabold text-sm shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                  <span className="material-symbols-rounded text-lg select-none">
                    graphic_eq
                  </span>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="self-center text-sm font-bold tracking-tight text-foreground whitespace-nowrap">
                      StreamVox Live
                    </span>
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-primary/15 text-primary border border-primary/25">
                      PRO
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground truncate">
                    TikTok Live TTS Studio
                  </span>
                </div>
              </a>

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

            {/* Navigation List per Flowbite pattern: <ul class="space-y-2 font-medium"> */}
            <ul className="space-y-1.5 font-medium" role="menu">
              {SIDEBAR_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const showQueueBadge = item.id === "queue" && liveQueueCount > 0;

                return (
                  <li key={item.id} role="none">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => handleItemClick(item.id)}
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
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Bottom Attribution & System Status Card */}
          <div className="pt-4 border-t border-border mt-auto">
            <div className="p-3 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5 font-semibold text-foreground mb-1">
                <Radio
                  className={cn(
                    "w-3.5 h-3.5",
                    isStreaming ? "text-destructive animate-pulse" : "text-muted-foreground"
                  )}
                />
                <span className="text-xs">StreamVox Live PRO</span>
              </div>
              <div className="text-[11px] text-foreground/80 truncate">
                เสียงพากย์: คุณพิพัฒน์ บุญสิทธิเลิศ
              </div>
              <div className="font-mono text-[10px] text-muted-foreground mt-1">
                v2.1 • Flowbite Layout Standard
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
