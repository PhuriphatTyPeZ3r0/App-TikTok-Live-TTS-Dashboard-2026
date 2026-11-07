"use client";

/**
 * StreamVox Live Hybrid Responsive Collapsible Sidebar Component for Next.js 15.
 *
 * Implements a dual-mode responsive layout adhering to Clean Minimal Enterprise Design System (DS)
 * and Web Content Accessibility Guidelines (WCAG) 2.1 & 2.2 Level AA:
 * - Desktop View (>= 768px): Persistent collapsible sidebar rail (`w-16` / 64px collapsed vs `w-64` / 256px expanded)
 *   with smooth transition animations, hover/focus tooltips for icon-rail mode, and bottom toggle button.
 * - Mobile / Tablet View (< 768px): High-performance off-canvas slide-over drawer (`w-72`) with backdrop overlay blur
 *   (`bg-black/60 backdrop-blur-sm z-40`), close button with touch target >= 44x44px, and safe-area insets (`pt-safe`, `pb-safe`)
 *   for Apple iPhone (iOS Safari Dynamic Island/Notch) and Samsung Galaxy (Android One UI Gesture Navigation Bar).
 *
 * Interacts with Single-Page Application (SPA) dashboard communicating with FastAPI
 * Asynchronous Server Gateway Interface (ASGI) server, Web Audio Application Programming Interface
 * (Web Audio API), Open Broadcaster Software (OBS) Studio, and First-In, First-Out (FIFO) queue states.
 *
 * Zero Hardcoded Colors: Uses semantic tokens (`bg-card`, `text-card-foreground`, `border-border`,
 * `bg-primary`, `text-primary-foreground`, `bg-muted`, `text-muted-foreground`, etc.).
 *
 * Voice Actor Attribution:
 * Dedicated to Master Thai Voice Model: คุณพิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert).
 *
 * Mandatory Academic Terminology & Acronyms:
 * - User Interface (UI)
 * - User Experience (UX)
 * - Design System (DS)
 * - Web Content Accessibility Guidelines (WCAG)
 * - Single-Page Application (SPA)
 * - Asynchronous Server Gateway Interface (ASGI)
 * - Role-Based Access Control (RBAC)
 * - Row Level Security (RLS)
 * - First-In, First-Out (FIFO)
 * - Open Broadcaster Software (OBS)
 * - Text-to-Speech (TTS)
 * - Application Programming Interface (API)
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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type TabType =
  | "cockpit"
  | "queue"
  | "voice"
  | "settings"
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
  /** Whether sidebar is collapsed into w-16 icon rail or expanded to w-64 on desktop. */
  isCollapsed: boolean;
  /** Callback to toggle collapse/expand state of the desktop sidebar. */
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
  isCollapsed,
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
      {/* 1. Desktop Persistent / Collapsible Sidebar (md:flex)                */}
      {/* ==================================================================== */}
      <aside
        className={cn(
          "hidden md:flex flex-col fixed top-[3.75rem] left-0 bottom-0 z-30 bg-card text-card-foreground border-r border-border transition-all duration-300 ease-in-out select-none",
          isCollapsed ? "w-16" : "w-64",
          className
        )}
        aria-label="Studio Desktop Sidebar Navigation"
      >
        <div className="flex flex-col h-full py-3 px-2 justify-between overflow-y-auto no-scrollbar">
          {/* Navigation Item List */}
          <nav
            className="flex flex-col gap-1.5"
            role="navigation"
            aria-label="Main Navigation"
          >
            {SIDEBAR_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const showQueueBadge = item.id === "queue" && liveQueueCount > 0;

              return (
                <div key={item.id} className="relative group">
                  <button
                    type="button"
                    onClick={() => handleItemClick(item.id)}
                    aria-current={isActive ? "page" : undefined}
                    aria-label={item.label}
                    className={cn(
                      "flex items-center rounded-xl transition-all duration-150 text-left min-h-[44px] min-w-[44px] w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background",
                      isCollapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5 gap-3",
                      isActive
                        ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/60 font-normal"
                    )}
                  >
                    <div className="relative flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5" />
                      {showQueueBadge && isCollapsed && (
                        <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center animate-pulse">
                          {liveQueueCount}
                        </span>
                      )}
                    </div>

                    {!isCollapsed && (
                      <div className="flex items-center justify-between w-full min-w-0">
                        <span className="text-xs tracking-tight truncate leading-tight">
                          {item.label}
                        </span>
                        {showQueueBadge && (
                          <span className="ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-destructive text-destructive-foreground font-mono">
                            {liveQueueCount}
                          </span>
                        )}
                      </div>
                    )}
                  </button>

                  {/* Accessible Hover / Focus Tooltip when collapsed */}
                  {isCollapsed && (
                    <div
                      role="tooltip"
                      className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 hidden group-hover:flex group-focus-within:flex items-center px-2.5 py-1 rounded-md bg-popover text-popover-foreground text-xs font-medium shadow-md border border-border whitespace-nowrap z-50 animate-in fade-in zoom-in-95 duration-150"
                    >
                      <span>{item.label}</span>
                      {showQueueBadge && (
                        <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                          {liveQueueCount}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Desktop Footer Card & Bottom Collapse/Expand Toggle */}
          <div className="flex flex-col gap-2 pt-2">
            {!isCollapsed && (
              <div className="p-3 mx-1 rounded-xl bg-muted/40 border border-border text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1.5 font-semibold text-foreground mb-1">
                  <Radio
                    className={cn(
                      "w-3.5 h-3.5",
                      isStreaming ? "text-destructive animate-pulse" : "text-muted-foreground"
                    )}
                  />
                  <span>StreamVox Live PRO</span>
                </div>
                <div className="truncate text-foreground/80">
                  เสียงพากย์: คุณพิพัฒน์ บุญสิทธิเลิศ
                </div>
                <div className="font-mono text-[10px] text-muted-foreground mt-1">
                  v2.1 • FastAPI &amp; FIFO Queue
                </div>
              </div>
            )}

            {/* Bottom Collapse Toggle Button */}
            {onToggleCollapse && (
              <div className="pt-2 border-t border-border">
                <div className="relative group">
                  <button
                    type="button"
                    onClick={onToggleCollapse}
                    className={cn(
                      "flex items-center rounded-xl transition-colors min-h-[44px] min-w-[44px] w-full text-muted-foreground hover:text-foreground hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background",
                      isCollapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5 gap-3"
                    )}
                    aria-label={
                      isCollapsed
                        ? "ขยายแถบข้าง (Expand sidebar)"
                        : "ย่อแถบข้าง (Collapse sidebar)"
                    }
                    title={
                      isCollapsed
                        ? "ขยายแถบข้าง (Expand sidebar)"
                        : "ย่อแถบข้าง (Collapse sidebar)"
                    }
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-5 h-5 shrink-0" />
                    ) : (
                      <>
                        <ChevronLeft className="w-5 h-5 shrink-0" />
                        <span className="text-xs font-medium truncate">
                          ย่อแถบข้าง (Collapse)
                        </span>
                      </>
                    )}
                  </button>

                  {/* Tooltip for Collapse Toggle button in collapsed state */}
                  {isCollapsed && (
                    <div
                      role="tooltip"
                      className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 hidden group-hover:flex group-focus-within:flex items-center px-2.5 py-1 rounded-md bg-popover text-popover-foreground text-xs font-medium shadow-md border border-border whitespace-nowrap z-50 animate-in fade-in zoom-in-95 duration-150"
                    >
                      ขยายแถบข้าง (Expand sidebar)
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ==================================================================== */}
      {/* 2. Mobile & Tablet Slide-Over Drawer Navigation (md:hidden)          */}
      {/* ==================================================================== */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden flex"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation Menu"
        >
          {/* Backdrop Blur Overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200 z-40 animate-in fade-in"
            onClick={handleCloseMobile}
            aria-hidden="true"
          />

          {/* Slide-over Drawer Surface */}
          <div className="relative w-72 max-w-[85vw] h-full bg-card text-card-foreground border-r border-border shadow-2xl flex flex-col justify-between p-4 pt-safe pb-safe z-50 animate-in slide-in-from-left duration-200">
            <div className="flex flex-col gap-4 overflow-y-auto no-scrollbar">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-extrabold text-sm shadow-xs shrink-0">
                    <span className="material-symbols-rounded text-lg select-none">
                      graphic_eq
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-foreground tracking-tight">
                        StreamVox Live
                      </span>
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-primary/15 text-primary border border-primary/25">
                        PRO
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      TikTok Live TTS Studio
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCloseMobile}
                  className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent border border-border transition-colors min-touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                  aria-label="Close navigation menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Navigation Links */}
              <nav
                className="flex flex-col gap-1.5"
                role="navigation"
                aria-label="Mobile Navigation"
              >
                {SIDEBAR_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  const showQueueBadge = item.id === "queue" && liveQueueCount > 0;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleItemClick(item.id)}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "flex items-center justify-between px-3.5 py-3 rounded-xl transition-all text-left min-h-[48px] min-touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background",
                        isActive
                          ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/60 font-medium"
                      )}
                    >
                      <div className="flex items-center gap-3.5">
                        <Icon className="w-5 h-5 shrink-0" />
                        <span className="text-sm font-medium tracking-tight">
                          {item.label}
                        </span>
                      </div>
                      {showQueueBadge && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-destructive text-destructive-foreground font-mono">
                          {liveQueueCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Mobile Drawer Footer */}
            <div className="pt-4 border-t border-border text-xs text-muted-foreground">
              <div className="p-3 rounded-xl bg-muted/40 border border-border">
                <div className="font-semibold text-foreground text-xs mb-1">
                  เสียงพากย์ต้นแบบ
                </div>
                <div className="text-[11px] text-foreground/80">
                  คุณพิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert)
                </div>
                <div className="font-mono text-[10px] text-muted-foreground mt-1.5">
                  iOS Safari &amp; Samsung One UI Ready
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Sidebar;
