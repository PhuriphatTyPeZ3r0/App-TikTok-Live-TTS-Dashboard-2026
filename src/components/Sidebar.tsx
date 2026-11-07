"use client";

/**
 * Red Broadcast Collapsible Sidebar Navigation for Next.js 15.
 *
 * Implements 240px expanded navigation drawer vs 72px compact icon rail,
 * fluid layout transitions, active surface highlight tokens, and quick switching
 * across live broadcast operations.
 *
 * System Context: Coordinates with Single-Page Application (SPA) dashboard,
 * communicating with the FastAPI Asynchronous Server Gateway Interface (ASGI)
 * server, Web Audio Application Programming Interface (Web Audio API), and
 * First-In, First-Out (FIFO) queue states.
 *
 * Voice Actor Attribution: พิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert) - Thai Voice Model
 */

import React from "react";
import {
  LayoutDashboard,
  ListOrdered,
  Mic,
  Tv,
  Settings,
} from "lucide-react";

export interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export interface SidebarProps {
  /** Whether sidebar is collapsed into a 72px icon rail or expanded to 240px. */
  isCollapsed: boolean;
  /** Currently selected navigation tab id. Defaults to "cockpit". */
  activeTab?: string;
  /** Callback triggered when a navigation item is clicked. */
  onSelectTab?: (tabId: string) => void;
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
    id: "obs",
    label: "OBS Studio",
    icon: Tv,
  },
  {
    id: "settings",
    label: "ตั้งค่า (Settings)",
    icon: Settings,
  },
];

export function Sidebar({
  isCollapsed,
  activeTab = "cockpit",
  onSelectTab,
}: SidebarProps) {
  return (
    <aside
      className={`h-[calc(100vh-3.5rem)] sticky top-14 left-0 shrink-0 bg-white dark:bg-broadcast-dark border-r border-broadcast-border-light dark:border-broadcast-border-dark transition-all duration-300 ease-in-out z-40 select-none ${
        isCollapsed ? "w-[72px]" : "w-[240px]"
      }`}
      aria-label="Studio Sidebar Navigation"
    >
      <div className="flex flex-col h-full py-3 px-2 justify-between">
        {/* Navigation Item List */}
        <nav className="flex flex-col gap-1">
          {SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab && onSelectTab(item.id)}
                title={item.label}
                className={`flex items-center gap-3.5 rounded-xl transition-colors duration-150 text-left ${
                  isCollapsed
                    ? "justify-center px-0 py-3.5"
                    : "px-3.5 py-2.5"
                } ${
                  isActive
                    ? "bg-broadcast-surface-light dark:bg-broadcast-surface-dark font-medium text-neutral-900 dark:text-white"
                    : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 hover:text-neutral-900 dark:hover:text-white font-normal"
                }`}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 ${
                    isActive
                      ? "text-neutral-900 dark:text-white"
                      : "text-neutral-500 dark:text-neutral-400"
                  }`}
                />
                {!isCollapsed && (
                  <span className="text-xs tracking-tight truncate leading-tight">
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Collapsed Rail Micro Telemetry / Bottom Info */}
        {!isCollapsed && (
          <div className="p-3 mx-1 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-broadcast-border-light dark:border-broadcast-border-dark text-[10px] text-neutral-500 dark:text-neutral-400">
            <div className="font-semibold text-neutral-700 dark:text-neutral-300 mb-0.5">
              Red Broadcast Studio
            </div>
            <div>เสียงพากย์: พิพัฒน์ บุญสิทธิเลิศ</div>
            <div className="font-mono text-[9px] text-neutral-400 dark:text-neutral-500 mt-1">
              v2.0 • FIFO & ASGI
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
