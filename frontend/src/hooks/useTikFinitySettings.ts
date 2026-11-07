'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  TikFinitySettings,
  DEFAULT_TIKFINITY_SETTINGS,
} from '../types/tikfinity';

export const TIKFINITY_STORAGE_KEY = 'tikfinity_tts_settings_v1';

export interface UseTikFinitySettingsReturn {
  settings: TikFinitySettings;
  updateSettings: (partial: Partial<TikFinitySettings>) => void;
  resetDefaults: () => void;
  isLoaded: boolean;
}

/**
 * useTikFinitySettings
 * Custom React hook for managing TikFinity-style TTS settings with localStorage persistence.
 * Safe for Server-Side Rendering (SSR) in Next.js.
 */
export function useTikFinitySettings(): UseTikFinitySettingsReturn {
  const [settings, setSettings] = useState<TikFinitySettings>(DEFAULT_TIKFINITY_SETTINGS);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // Hydrate settings safely on mount from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const stored = window.localStorage.getItem(TIKFINITY_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<TikFinitySettings>;
        setSettings((prev) => ({
          ...prev,
          ...parsed,
        }));
      }
    } catch (err) {
      console.warn('[useTikFinitySettings] Failed to parse stored settings:', err);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Update a subset of settings and persist to localStorage
  const updateSettings = useCallback((partial: Partial<TikFinitySettings>) => {
    setSettings((prev) => {
      const updated: TikFinitySettings = {
        ...prev,
        ...partial,
        ...(partial.voiceTunings
          ? {
              voiceTunings: {
                ...(prev.voiceTunings || {}),
                ...partial.voiceTunings,
              },
            }
          : {}),
      };

      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(
            TIKFINITY_STORAGE_KEY,
            JSON.stringify(updated)
          );
        } catch (err) {
          console.error('[useTikFinitySettings] Failed to save settings to localStorage:', err);
        }
      }

      return updated;
    });
  }, []);

  // Reset all settings to default and clear/overwrite localStorage
  const resetDefaults = useCallback(() => {
    setSettings(DEFAULT_TIKFINITY_SETTINGS);

    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(
          TIKFINITY_STORAGE_KEY,
          JSON.stringify(DEFAULT_TIKFINITY_SETTINGS)
        );
      } catch (err) {
        console.error('[useTikFinitySettings] Failed to reset settings in localStorage:', err);
      }
    }
  }, []);

  return {
    settings,
    updateSettings,
    resetDefaults,
    isLoaded,
  };
}
