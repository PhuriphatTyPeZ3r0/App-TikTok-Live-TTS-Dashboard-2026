"use client";

/**
 * StreamVox Live Hybrid Responsive Sidebar Navigation Component for Next.js 15.
 *
 * Implements dual-mode responsive layout:
 * - Desktop View (>= 768px): Collapsible icon rail (72px) vs expanded navigation drawer (240px)
 * - Mobile / Tablet View (< 768px): High-performance slide-over drawer with backdrop blur,
 *   supporting touch gestures, Apple Safe Area Insets, and Samsung One UI touch guidelines.
 *
 * Coordinates with Single-Page Application (SPA) dashboard, communicating with the FastAPI
 * Asynchronous Server Gateway Interface (ASGI) server, Web Audio Application Programming Interface
 * (Web Audio API), and First-In, First-Out (FIFO) queue states.
 *
 * Voice Actor Attribution: พิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert) - Thai Voice Model
 *
 * Mandatory Academic Terminology & Acronyms:
 * - Single-Page Application (SPA)
 * - Asynchronous Server Gateway Interface (ASGI)
 * - Role-Based Access Control (RBAC)
 * - Row Level Security (RLS)
 * - First-In, First-Out (FIFO)
 */

import React, { useEffect, useCallback } from "react";
import {
  LayoutDashboard,
  ListOrdered,
  Mic,
  Tv,
  Settings,
  ScrollText,
  X,
  Radio,
} from "lucide-react";

export interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export interface SidebarProps {
  /** Whether sidebar is collapsed into a 72px icon rail or expanded to 240px on desktop. */
  isCollapsed: boolean;
  /** Currently selected navigation tab id. Defaults to "cockpit". */
  activeTab?: string;
  /** Callback triggered when a navigation item is clicked. */
  onSelectTab?: (tabId: string) => void;
  /** Whether the mobile slide-over drawer is currently open. */
  isMobileOpen?: boolean;
  /** Callback to close the mobile slide-over drawer. */
  onCloseMobile?: () => void;
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
    label: "ตั้งค่า (Settings)",
    icon: Settings,
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
  isCollapsed,
  activeTab = "cockpit",
  onSelectTab,
  isMobileOpen = false,
  onCloseMobile,
}: SidebarProps): React.JSX.Element {
  // Handle keyboard Escape to dismiss mobile drawer
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMobileOpen && onCloseMobile) {
        onCloseMobile();
      }
    },
    [isMobileOpen, onCloseMobile]
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

  const handleItemClick = (tabId: string) => {
    if (onSelectTab) {
      onSelectTab(tabId);
    }
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* ==================================================================== */}
      {/* 1. Desktop Persistent / Collapsible Sidebar (md:flex)                */}
      {/* ==================================================================== */}
      <aside
        className={`hidden md:flex flex-col h-[calc(100vh-3.75rem)] sticky top-[3.75rem] left-0 shrink-0 bg-[#0c0d12]/95 border-r border-[#1e222d] backdrop-blur-xl transition-all duration-300 ease-in-out z-40 select-none ${
          isCollapsed ? "w-[72px]" : "w-[240px]"
        }`}
        aria-label="Studio Desktop Sidebar Navigation"
      >
        <div className="flex flex-col h-full py-4 px-2 justify-between">
          {/* Navigation Item List */}
          <nav className="flex flex-col gap-1.5" role="navigation" aria-label="Main Navigation">
            {SIDEBAR_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleItemClick(item.id)}
                  title={item.label}
                  className={`flex items-center gap-3.5 rounded-xl transition-all duration-150 text-left min-h-[44px] ${
                    isCollapsed ? "justify-center px-0 py-2.5" : "px-3.5 py-2.5"
                  } ${
                    isActive
                      ? "bg-gradient-to-r from-[#fe2c55]/20 to-[#25f4ee]/20 border border-white/15 text-white font-semibold shadow-sm"
                      : "text-slate-400 hover:text-white hover:bg-white/[0.05] font-normal"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 shrink-0 transition-colors ${
                      isActive ? "text-neutral-900 dark:text-white" : "text-slate-400"
                    }`}
                  />
                  {!isCollapsed && (
                    <span className="text-xs tracking-tight truncate leading-tight font-sans">
                      {item.label}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Desktop Footer Card */}
          {!isCollapsed && (
            <div className="p-3 mx-1 rounded-xl bg-white/[0.03] border border-[#1e222d] text-[10px] text-slate-400">
              <div className="flex items-center gap-1.5 font-semibold text-slate-200 mb-1">
                <Radio className="w-3.5 h-3.5 text-[#fe2c55] animate-pulse" />
                <span>StreamVox Live PRO</span>
              </div>
              <div className="text-slate-400 truncate">
                เสียงพากย์: พิพัฒน์ บุญสิทธิเลิศ
              </div>
              <div className="font-mono text-[9px] text-slate-500 mt-1">
                v2.1 • FastAPI &amp; FIFO
              </div>
            </div>
          )}
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
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity duration-200 animate-in fade-in"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Slide-over Drawer Surface */}
          <div
            className="relative w-72 max-w-[85vw] h-full bg-[#0c0d12]/98 border-r border-[#1e222d] shadow-2xl flex flex-col justify-between p-4 pt-safe pb-safe z-50 animate-in slide-in-from-left duration-200"
          >
            <div className="flex flex-col gap-4">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#1e222d]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#fe2c55] to-[#25f4ee] flex items-center justify-center text-black font-extrabold text-sm shadow-md shrink-0">
                    <span className="material-symbols-rounded text-lg text-black select-none">
                      graphic_eq
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-white tracking-tight">
                        StreamVox Live
                      </span>
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-gradient-to-r from-[#fe2c55] to-[#25f4ee] text-black">
                        PRO
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      TikTok Live TTS Studio
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onCloseMobile}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-[#1e222d] transition-colors min-touch-target"
                  aria-label="Close navigation menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Navigation Links */}
              <nav className="flex flex-col gap-1.5" role="navigation">
                {SIDEBAR_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleItemClick(item.id)}
                      className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition-all text-left min-h-[48px] ${
                        isActive
                          ? "bg-gradient-to-r from-[#fe2c55]/20 to-[#25f4ee]/20 border border-white/20 text-white font-semibold shadow-md"
                          : "text-slate-300 hover:text-white hover:bg-white/[0.05] font-normal"
                      }`}
                    >
                      <Icon
                        className={`w-5 h-5 shrink-0 ${
                          isActive ? "text-neutral-900 dark:text-white" : "text-slate-400"
                        }`}
                      />
                      <span className="text-sm font-medium tracking-tight">
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Mobile Drawer Footer */}
            <div className="pt-4 border-t border-[#1e222d] text-xs text-slate-400">
              <div className="p-3 rounded-xl bg-white/[0.03] border border-[#1e222d]">
                <div className="font-semibold text-slate-200 text-xs mb-1">
                  เสียงพากย์ต้นแบบ
                </div>
                <div className="text-[11px] text-slate-300">
                  พิพัฒน์ บุญสิทธิเลิศ (Yuta Okkotsu)
                </div>
                <div className="font-mono text-[10px] text-slate-500 mt-1.5">
                  Platform: Apple &amp; Samsung Ready
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
