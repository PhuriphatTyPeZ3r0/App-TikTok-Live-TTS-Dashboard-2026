"use client";

/**
 * Red Broadcast Theme Context and Provider for Next.js 15.
 *
 * Manages active application theme mode ('light' | 'dark'), persisting choices
 * to browser LocalStorage ('red_broadcast_theme') with fallback to 'dark' Cinema mode.
 * Dynamically synchronizes 'dark' class on document.documentElement for Tailwind CSS.
 *
 * Voice Actor Attribution: คุณพิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert) - Thai Yuta Okkotsu TTS
 * System Architecture: Single-Page Application (SPA) & Asynchronous Server Gateway Interface (ASGI)
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export type Theme = "light" | "dark";

export interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const THEME_STORAGE_KEY = "red_broadcast_theme";

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [isMounted, setIsMounted] = useState<boolean>(false);

  // Initialize theme from LocalStorage on client mount
  useEffect(() => {
    setIsMounted(true);
    try {
      const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
      if (storedTheme === "light" || storedTheme === "dark") {
        setThemeState(storedTheme);
        if (storedTheme === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      } else {
        // Fallback default: dark cinema broadcast mode
        setThemeState("dark");
        document.documentElement.classList.add("dark");
      }
    } catch {
      // LocalStorage access restricted in private mode fallback
      document.documentElement.classList.add("dark");
    }
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch {
      // Ignore LocalStorage quota/permission errors
    }

    if (typeof document !== "undefined") {
      if (newTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
