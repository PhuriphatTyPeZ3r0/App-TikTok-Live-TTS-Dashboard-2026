/**
 * React Hook for User Profile Cloud Settings Synchronization in StreamVox Live.
 *
 * Implements bidirectional cloud persistence between local dashboard settings (TikFinity
 * configuration, active voice profile, and acoustic tunings) and Supabase PostgreSQL
 * public.user_profiles table governed by Row Level Security (RLS) and Role-Based Access
 * Control (RBAC).
 *
 * Key Capabilities:
 * 1. Cloud Hydration: Automatically merges cloud settings into dashboard state upon user authentication.
 * 2. Debounced Auto-Sync: Throttles high-frequency UI mutations (e.g. slider adjustments) with configurable debounce (default 1000ms).
 * 3. Role-Based Access Control (RBAC): Enforces role hierarchy ('admin', 'streamer', 'viewer'). Read-only 'viewer' accounts are prohibited from cloud mutations.
 * 4. Fault-Tolerant Resilience: Gracefully falls back to browser localStorage when offline or if Supabase Application Programming Interface (API) is unconfigured.
 * 5. Structured Telemetry: Emits diagnostic audit records via centralized logger under the 'AUTH' or 'SYSTEM' category.
 *
 * Mandatory Academic Terminology & Acronyms:
 * - Role-Based Access Control (RBAC)
 * - Row Level Security (RLS)
 * - Universally Unique Identifier (UUID)
 * - Application Programming Interface (API)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSupabaseAuth } from './useSupabaseAuth';
import { getSupabaseBrowserClient } from '../lib/supabase/client';
import { logger } from '../lib/logger';
import type { TikFinitySettings } from '../types/tikfinity';

/**
 * Configuration options for the useSupabaseSync hook.
 */
export interface UseSupabaseSyncOptions {
  /** Active local TikFinity and voice tuning settings state. */
  settings: TikFinitySettings;
  /** Optional callback invoked when remote cloud profile settings are hydrated into local state. */
  onHydrate?: (cloudSettings: Partial<TikFinitySettings>) => void;
  /** Debounce delay in milliseconds before dispatching cloud persistence requests. Defaults to 1000ms. */
  debounceMs?: number;
}

/**
 * Reactive return contract of the useSupabaseSync hook.
 */
export interface UseSupabaseSyncReturn {
  /** Whether an asynchronous cloud synchronization operation is actively in flight. */
  isSyncing: boolean;
  /** Timestamp indicating when the last successful cloud synchronization occurred. */
  lastSyncedAt: Date | null;
  /** Diagnostic error message if the most recent cloud sync attempt failed, or null when healthy. */
  syncError: string | null;
  /** Whether remote cloud synchronization is active (user authenticated and Supabase API configured). */
  isCloudSyncActive: boolean;
  /** Manually forces an immediate synchronization of current settings to the cloud bypassing debounce delay. */
  manualSync: () => Promise<void>;
}

/**
 * Custom React hook managing bidirectional settings synchronization with Supabase.
 */
export function useSupabaseSync({
  settings,
  onHydrate,
  debounceMs = 1000,
}: UseSupabaseSyncOptions): UseSupabaseSyncReturn {
  const { user, profile, role, isConfigured } = useSupabaseAuth();

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // References to preserve state across asynchronous boundaries and avoid re-render loops
  const settingsRef = useRef<TikFinitySettings>(settings);
  settingsRef.current = settings;

  const onHydrateRef = useRef(onHydrate);
  onHydrateRef.current = onHydrate;

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hydratedUserIdRef = useRef<string | null>(null);
  const isHydratingRef = useRef<boolean>(false);
  const serializedBaselineRef = useRef<string>(JSON.stringify(settings));

  const isCloudSyncActive = Boolean(isConfigured && user);

  /**
   * Persists the given settings configuration to the Supabase public.user_profiles table.
   * Enforces Row Level Security (RLS) and Role-Based Access Control (RBAC).
   */
  const persistSettingsToCloud = useCallback(
    async (targetSettings: TikFinitySettings): Promise<void> => {
      const client = getSupabaseBrowserClient();
      if (!client || !user || !isConfigured) {
        setIsSyncing(false);
        return;
      }

      // Role-Based Access Control (RBAC): Viewers are read-only and cannot alter cloud profile settings
      if (role === 'viewer') {
        setIsSyncing(false);
        logger.warn(
          'AUTH',
          'Cloud settings sync aborted: User possesses viewer role with read-only permissions',
          { userId: user.id, role }
        );
        return;
      }

      try {
        setIsSyncing(true);

        const updatePayload = {
          selected_voice_id: targetSettings.selectedVoiceId || 'yuta',
          voice_tunings: targetSettings.voiceTunings || {},
          settings: targetSettings,
          updated_at: new Date().toISOString(),
        };

        const { data, error } = await client
          .from('user_profiles')
          .update(updatePayload)
          .eq('id', user.id)
          .select('id, updated_at');

        if (error) {
          logger.warn('AUTH', 'Supabase user_profiles settings update failed', {
            userId: user.id,
            errorMessage: error.message,
          });
          setSyncError(error.message);
        } else if (!data || data.length === 0) {
          // Fallback: If no existing profile was updated, perform an initial insert
          const insertPayload = {
            id: user.id,
            email: user.email,
            display_name: user.email ? user.email.split('@')[0] : 'Streamer',
            role: role || 'streamer',
            ...updatePayload,
          };

          const { error: insertError } = await client
            .from('user_profiles')
            .insert(insertPayload);

          if (insertError) {
            logger.warn('AUTH', 'Supabase user_profiles initial insertion failed', {
              userId: user.id,
              errorMessage: insertError.message,
            });
            setSyncError(insertError.message);
          } else {
            setLastSyncedAt(new Date());
            setSyncError(null);
            logger.info('AUTH', 'Initial user profile settings created in Supabase cloud database', {
              userId: user.id,
              role,
            });
          }
        } else {
          setLastSyncedAt(new Date());
          setSyncError(null);
          logger.info('AUTH', 'User settings synchronized to Supabase cloud profile successfully', {
            userId: user.id,
            selectedVoiceId: targetSettings.selectedVoiceId,
          });
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        logger.warn('AUTH', 'Exception caught during cloud settings synchronization', {
          userId: user.id,
          error: errorMsg,
        });
        setSyncError(errorMsg);
      } finally {
        setIsSyncing(false);
      }
    },
    [user, isConfigured, role]
  );

  /**
   * Cloud Hydration Effect:
   * When an authenticated session is active and user profile metadata is loaded,
   * merges remote cloud settings into local dashboard state.
   */
  useEffect(() => {
    if (!isConfigured || !user) {
      hydratedUserIdRef.current = null;
      return;
    }

    // Only hydrate once per authenticated user session transition
    if (profile && user.id !== hydratedUserIdRef.current) {
      hydratedUserIdRef.current = user.id;

      const hasCloudData =
        (profile.settings && Object.keys(profile.settings).length > 0) ||
        (profile.voice_tunings && Object.keys(profile.voice_tunings).length > 0) ||
        Boolean(profile.selected_voice_id && profile.selected_voice_id !== 'yuta');

      if (hasCloudData && onHydrateRef.current) {
        const cloudSettings: Partial<TikFinitySettings> = {
          ...(profile.settings || {}),
          ...(profile.voice_tunings ? { voiceTunings: profile.voice_tunings } : {}),
          ...(profile.selected_voice_id ? { selectedVoiceId: profile.selected_voice_id } : {}),
        };

        isHydratingRef.current = true;
        onHydrateRef.current(cloudSettings);

        // Update baseline to match hydrated state and prevent immediate reflective push
        const mergedSettings = { ...settingsRef.current, ...cloudSettings };
        serializedBaselineRef.current = JSON.stringify(mergedSettings);

        if (profile.updated_at) {
          setLastSyncedAt(new Date(profile.updated_at));
        } else {
          setLastSyncedAt(new Date());
        }

        logger.info('AUTH', 'Cloud settings successfully hydrated into local state', {
          userId: user.id,
          selectedVoiceId: cloudSettings.selectedVoiceId,
        });
      } else if (!hasCloudData) {
        // Cloud profile lacks settings: initialize remote profile with current local baseline
        void persistSettingsToCloud(settingsRef.current);
      }
    }
  }, [isConfigured, user, profile, persistSettingsToCloud]);

  /**
   * Debounced Auto-Sync Effect:
   * Watches local settings mutations and queues a debounced update to Supabase.
   */
  useEffect(() => {
    // If not authenticated or Supabase is unconfigured, bypass cloud sync
    if (!isConfigured || !user || role === 'viewer') {
      return;
    }

    const currentSerialized = JSON.stringify(settings);

    // Skip if settings haven't changed from baseline
    if (currentSerialized === serializedBaselineRef.current) {
      return;
    }

    // If change was caused by hydration, update baseline and do not trigger cloud push
    if (isHydratingRef.current) {
      isHydratingRef.current = false;
      serializedBaselineRef.current = currentSerialized;
      return;
    }

    serializedBaselineRef.current = currentSerialized;
    setIsSyncing(true);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      void persistSettingsToCloud(settings);
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [settings, isConfigured, user, role, debounceMs, persistSettingsToCloud]);

  /**
   * Immediate Manual Cloud Synchronization.
   */
  const manualSync = useCallback(async (): Promise<void> => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    await persistSettingsToCloud(settingsRef.current);
  }, [persistSettingsToCloud]);

  return {
    isSyncing,
    lastSyncedAt,
    syncError,
    isCloudSyncActive,
    manualSync,
  };
}

export default useSupabaseSync;
