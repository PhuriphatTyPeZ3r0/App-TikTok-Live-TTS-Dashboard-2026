"use client";

/**
 * Red Broadcast Category Chips Pill Bar Component for Next.js 15.
 *
 * Implements horizontally scrollable pill filter bar with 9999px radius (`rounded-full`),
 * high-contrast active state (#0F0F0F in light, #FFFFFF in dark mode), and streamlined
 * stream filtering across FIFO comments, VIP gifts, and ASGI system events.
 *
 * Single-Page Application (SPA) architecture integrating with the FastAPI
 * Asynchronous Server Gateway Interface (ASGI) backend and Web Audio Application
 * Programming Interface (Web Audio API) audio pipelines.
 *
 * Voice Actor Attribution: พิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert) - Thai Voice Model
 */

import React from "react";

export interface CategoryOption {
  id: string;
  label: string;
  count?: number;
}

export interface CategoryChipsProps {
  /** Currently active category id. Defaults to "all". */
  selectedCategory?: string;
  /** Callback fired when a category chip is selected. */
  onSelectCategory?: (categoryId: string) => void;
  /** Optional custom category options list. */
  categories?: CategoryOption[];
}

export const DEFAULT_CATEGORIES: CategoryOption[] = [
  { id: "all", label: "ทั้งหมด" },
  { id: "gifts", label: "ของขวัญ VIP 🎁" },
  { id: "chat", label: "แชทสด 💬" },
  { id: "system", label: "ระบบ ⚙️" },
];

export function CategoryChips({
  selectedCategory = "all",
  onSelectCategory,
  categories = DEFAULT_CATEGORIES,
}: CategoryChipsProps) {
  return (
    <div
      className="w-full overflow-x-auto no-scrollbar py-2.5 px-1 flex items-center gap-2 select-none"
      role="tablist"
      aria-label="Filter stream event categories"
    >
      {categories.map((cat) => {
        const isActive = selectedCategory === cat.id;

        return (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelectCategory && onSelectCategory(cat.id)}
            className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs transition-colors duration-150 ${
              isActive
                ? "bg-[#0F0F0F] dark:bg-[#FFFFFF] text-white dark:text-[#0F0F0F] font-semibold shadow-sm"
                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 font-normal border border-broadcast-border-light dark:border-broadcast-border-dark"
            }`}
          >
            <span>{cat.label}</span>
            {typeof cat.count === "number" && (
              <span
                className={`ml-1.5 text-[10px] px-1.5 py-0.2 rounded-full ${
                  isActive
                    ? "bg-white/20 dark:bg-black/20"
                    : "bg-neutral-200 dark:bg-neutral-700"
                }`}
              >
                {cat.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
