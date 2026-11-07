/**
 * React Hook for Supabase Authentication and Role-Based Access Control (RBAC) for StreamVox Live.
 *
 * Provides reactive access to:
 * - Supabase authenticated user session
 * - PostgreSQL user_profiles record with Row Level Security (RLS) enforcement
 * - 3-tier Role-Based Access Control (RBAC): 'admin', 'streamer', 'viewer'
 * - Offline demo resilience: seamlessly falls back to local unblocked operation if Supabase is unconfigured
 * - Structured audit telemetry logging under category 'AUTH'
 * - Single Sign-On (SSO) OAuth methods (Google, TikTok) and Email/Password flows
 *
 * Full Academic Terminology & Acronyms:
 * - Role-Based Access Control (RBAC)
 * - Row Level Security (RLS)
 * - Universally Unique Identifier (UUID)
 * - Single Sign-On (SSO)
 * - Application Programming Interface (API)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '../lib/supabase/client';
import { logger } from '../lib/logger';
import type { UserRole, UserProfile, AuthCredentials } from '../types/auth';

/**
 * Return signature of useSupabaseAuth hook.
 */
export interface UseSupabaseAuthReturn {
  /** Supabase authenticated user entity or null when unauthenticated. */
  user: User | null;
  /** Synchronized PostgreSQL public.user_profiles record. */
  profile: UserProfile | null;
  /** Effective Role-Based Access Control (RBAC) role tier ('admin', 'streamer', 'viewer'). */
  role: UserRole;
  /** Whether the initial session or profile revalidation is in progress. */
  loading: boolean;
  /** Whether Supabase Application Programming Interface (API) credentials are configured. */
  isConfigured: boolean;
  /** Authenticates using standard Electronic Mail (Email) and password credentials. */
  signInWithPassword: (credentials: AuthCredentials) => Promise<{ error: Error | null }>;
  /** Registers a new account with credentials and metadata role assignment. */
  signUp: (
    credentials: AuthCredentials,
    metadata?: { username?: string; role?: UserRole }
  ) => Promise<{ error: Error | null }>;
  /** Initiates Google Single Sign-On (SSO) OpenID Connect authentication flow. */
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  /** Initiates TikTok Single Sign-On (SSO) OAuth authentication flow. */
  signInWithTikTok: () => Promise<{ error: Error | null }>;
  /** Terminates the active Supabase authentication session. */
  signOut: () => Promise<{ error: Error | null }>;
  /** Manually re-fetches user profile metadata from PostgreSQL public.user_profiles. */
  refreshProfile: () => Promise<void>;
}

/**
 * Custom React hook managing Supabase authentication state and Role-Based Access Control (RBAC).
 */
export function useSupabaseAuth(): UseSupabaseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole>('streamer');
  const [loading, setLoading] = useState<boolean>(true);
  const [configured, setConfigured] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? isSupabaseConfigured() : false;
  });

  const isMountedRef = useRef<boolean>(true);

  // Helper to safely fetch user profile from PostgreSQL public.user_profiles table
  const fetchProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    const client = getSupabaseBrowserClient();
    if (!client) {
      return null;
    }

    try {
      const { data, error } = await client
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        logger.warn('AUTH', 'User profile query returned an error or record not found', {
          userId,
          errorMessage: error.message,
        });
        return null;
      }

      return data as UserProfile;
    } catch (fetchErr: unknown) {
      const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      logger.warn('AUTH', 'User profile retrieval exception isolated', { userId, error: msg });
      return null;
    }
  }, []);

  // Re-fetch active profile metadata
  const refreshProfile = useCallback(async (): Promise<void> => {
    if (!user) {
      return;
    }
    const updatedProfile = await fetchProfile(user.id);
    if (!isMountedRef.current) return;

    if (updatedProfile) {
      setProfile(updatedProfile);
      setRole(updatedProfile.role || 'streamer');
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    isMountedRef.current = true;
    const client = getSupabaseBrowserClient();
    const isConfig = isSupabaseConfigured() && client !== null;
    setConfigured(isConfig);

    // Offline Fallback Mode: Supabase credentials are missing or unconfigured
    if (!isConfig || !client) {
      setUser(null);
      setProfile(null);
      setRole('streamer');
      setLoading(false);
      logger.info(
        'AUTH',
        'Supabase client is not configured; running in local offline mode with default streamer role'
      );
      return () => {
        isMountedRef.current = false;
      };
    }

    // Supabase is configured: inspect active session
    client.auth
      .getSession()
      .then(async ({ data: { session }, error }) => {
        if (!isMountedRef.current) return;

        if (error) {
          logger.warn('AUTH', 'Initial session restoration encountered an error', {
            errorMessage: error.message,
          });
          setLoading(false);
          return;
        }

        if (session?.user) {
          setUser(session.user);
          logger.setUserId(session.user.id);
          logger.info('AUTH', 'Supabase authenticated session restored successfully', {
            userId: session.user.id,
            email: session.user.email,
          });

          const userProf = await fetchProfile(session.user.id);
          if (!isMountedRef.current) return;

          if (userProf) {
            setProfile(userProf);
            setRole(userProf.role || 'streamer');
          } else {
            setProfile(null);
            setRole('streamer');
          }
        } else {
          setUser(null);
          setProfile(null);
          setRole('streamer');
          logger.setUserId(null);
        }

        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!isMountedRef.current) return;
        const msg = err instanceof Error ? err.message : String(err);
        logger.error('AUTH', 'Failed to resolve initial Supabase session', { error: msg });
        setLoading(false);
      });

    // Listen to real-time authentication state transitions
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(async (event, session) => {
      if (!isMountedRef.current) return;

      if (session?.user) {
        setUser(session.user);
        logger.setUserId(session.user.id);
        logger.info('AUTH', `Supabase authentication state transition event: ${event}`, {
          userId: session.user.id,
          email: session.user.email,
        });

        const userProf = await fetchProfile(session.user.id);
        if (!isMountedRef.current) return;

        if (userProf) {
          setProfile(userProf);
          setRole(userProf.role || 'streamer');
        } else {
          setProfile(null);
          setRole('streamer');
        }
      } else {
        setUser(null);
        setProfile(null);
        setRole('streamer');
        logger.setUserId(null);
        if (event === 'SIGNED_OUT') {
          logger.info('AUTH', 'User signed out from Supabase authentication session');
        }
      }

      setLoading(false);
    });

    return () => {
      isMountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // Sign In with Email & Password
  const signInWithPassword = useCallback(
    async (credentials: AuthCredentials): Promise<{ error: Error | null }> => {
      const client = getSupabaseBrowserClient();
      const isLiveConfig = isSupabaseConfigured() && client !== null;

      // Resilient local offline mode fallback
      if (!isLiveConfig || !client) {
        const cleanEmail = credentials.email.trim();
        const isAdmin = cleanEmail.toLowerCase() === 'phuriphathem@gmail.com' || cleanEmail.toLowerCase().includes('admin');
        const assignedRole: UserRole = isAdmin ? 'admin' : 'streamer';
        const mockUser: User = {
          id: '44b82350-fb22-483d-927f-a7e2ad0cd164',
          app_metadata: { provider: 'email' },
          user_metadata: { display_name: cleanEmail.split('@')[0], role: assignedRole },
          aud: 'authenticated',
          created_at: new Date().toISOString(),
          email: cleanEmail,
        } as unknown as User;

        const mockProfile: UserProfile = {
          id: mockUser.id,
          email: cleanEmail,
          display_name: cleanEmail.split('@')[0],
          role: assignedRole,
          tiktok_username: 'phuriphat_live',
          selected_voice_id: 'yuta',
          voice_tunings: {},
          settings: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        setUser(mockUser);
        setProfile(mockProfile);
        setRole(assignedRole);
        logger.info('AUTH', 'Authenticated via Local Offline Session fallback', {
          email: cleanEmail,
          role: assignedRole,
        });
        return { error: null };
      }

      try {
        const { data, error } = await client.auth.signInWithPassword({
          email: credentials.email.trim(),
          password: credentials.password,
        });

        if (error) {
          logger.error('AUTH', 'Supabase password authentication failed', {
            email: credentials.email,
            errorMessage: error.message,
          });
          return { error: new Error(error.message) };
        }

        logger.info('AUTH', 'Supabase password authentication successful', {
          userId: data.user?.id,
          email: data.user?.email,
        });

        if (data.user) {
          setUser(data.user);
          logger.setUserId(data.user.id);
          const userProf = await fetchProfile(data.user.id);
          if (isMountedRef.current) {
            setProfile(userProf);
            setRole(userProf?.role || 'streamer');
          }
        }

        return { error: null };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unexpected authentication error';
        logger.error('AUTH', 'Unexpected exception during password authentication', { error: msg });
        return { error: new Error(msg) };
      }
    },
    [fetchProfile]
  );

  // Sign Up with Email, Password, and Profile Metadata
  const signUp = useCallback(
    async (
      credentials: AuthCredentials,
      metadata?: { username?: string; role?: UserRole }
    ): Promise<{ error: Error | null }> => {
      const client = getSupabaseBrowserClient();
      const isLiveConfig = isSupabaseConfigured() && client !== null;

      // Resilient local offline mode fallback
      if (!isLiveConfig || !client) {
        const cleanEmail = credentials.email.trim();
        const assignedRole = metadata?.role || 'streamer';
        const mockUser: User = {
          id: '44b82350-fb22-483d-927f-a7e2ad0cd164',
          app_metadata: { provider: 'email' },
          user_metadata: { display_name: metadata?.username || cleanEmail.split('@')[0], role: assignedRole },
          aud: 'authenticated',
          created_at: new Date().toISOString(),
          email: cleanEmail,
        } as unknown as User;

        const mockProfile: UserProfile = {
          id: mockUser.id,
          email: cleanEmail,
          display_name: metadata?.username || cleanEmail.split('@')[0],
          role: assignedRole,
          tiktok_username: 'phuriphat_live',
          selected_voice_id: 'yuta',
          voice_tunings: {},
          settings: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        setUser(mockUser);
        setProfile(mockProfile);
        setRole(assignedRole);
        return { error: null };
      }

      try {
        const displayName =
          metadata?.username ||
          credentials.displayName ||
          credentials.email.split('@')[0] ||
          'Streamer';
        const assignedRole = metadata?.role || 'streamer';

        const { data, error } = await client.auth.signUp({
          email: credentials.email.trim(),
          password: credentials.password,
          options: {
            data: {
              display_name: displayName,
              role: assignedRole,
            },
          },
        });

        if (error) {
          logger.error('AUTH', 'Supabase user registration failed', {
            email: credentials.email,
            errorMessage: error.message,
          });
          return { error: new Error(error.message) };
        }

        logger.info('AUTH', 'Supabase user registration successful', {
          userId: data.user?.id,
          email: data.user?.email,
        });

        if (data.user) {
          setUser(data.user);
          logger.setUserId(data.user.id);
          const userProf = await fetchProfile(data.user.id);
          if (isMountedRef.current) {
            setProfile(userProf);
            setRole(userProf?.role || assignedRole);
          }
        }

        return { error: null };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unexpected registration error';
        logger.error('AUTH', 'Unexpected exception during user registration', { error: msg });
        return { error: new Error(msg) };
      }
    },
    [fetchProfile]
  );

  // Sign In with Google Single Sign-On (SSO) OAuth
  const signInWithGoogle = useCallback(async (): Promise<{ error: Error | null }> => {
    const client = getSupabaseBrowserClient();
    if (!client || !isSupabaseConfigured()) {
      const error = new Error('Supabase authentication is not configured in this environment.');
      logger.warn('AUTH', 'Google SSO invocation rejected: Supabase is not configured');
      return { error };
    }

    try {
      const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined;
      const { error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
        },
      });

      if (error) {
        logger.error('AUTH', 'Google Single Sign-On (SSO) OAuth initialization failed', {
          errorMessage: error.message,
        });
        return { error: new Error(error.message) };
      }

      logger.info('AUTH', 'Google Single Sign-On (SSO) OAuth initiated successfully');
      return { error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unexpected Google SSO error';
      logger.error('AUTH', 'Unexpected exception during Google SSO initialization', { error: msg });
      return { error: new Error(msg) };
    }
  }, []);

  // Sign In with TikTok Single Sign-On (SSO) OAuth
  const signInWithTikTok = useCallback(async (): Promise<{ error: Error | null }> => {
    const client = getSupabaseBrowserClient();
    if (!client || !isSupabaseConfigured()) {
      const error = new Error('Supabase authentication is not configured in this environment.');
      logger.warn('AUTH', 'TikTok SSO invocation rejected: Supabase is not configured');
      return { error };
    }

    try {
      const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined;
      // TikTok OAuth provider integration via Supabase OAuth endpoint
      const { error } = await client.auth.signInWithOAuth({
        provider: 'tiktok' as any,
        options: {
          redirectTo,
        },
      });

      if (error) {
        logger.error('AUTH', 'TikTok Single Sign-On (SSO) OAuth initialization failed', {
          errorMessage: error.message,
        });
        return { error: new Error(error.message) };
      }

      logger.info('AUTH', 'TikTok Single Sign-On (SSO) OAuth initiated successfully');
      return { error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unexpected TikTok SSO error';
      logger.error('AUTH', 'Unexpected exception during TikTok SSO initialization', { error: msg });
      return { error: new Error(msg) };
    }
  }, []);

  // Sign Out from active session
  const signOut = useCallback(async (): Promise<{ error: Error | null }> => {
    const client = getSupabaseBrowserClient();
    if (!client || !configured) {
      // Local reset in offline mode
      setUser(null);
      setProfile(null);
      setRole('streamer');
      logger.setUserId(null);
      return { error: null };
    }

    try {
      const { error } = await client.auth.signOut();
      setUser(null);
      setProfile(null);
      setRole('streamer');
      logger.setUserId(null);

      if (error) {
        logger.error('AUTH', 'Supabase session termination encountered an error', {
          errorMessage: error.message,
        });
        return { error: new Error(error.message) };
      }

      logger.info('AUTH', 'Supabase authentication session terminated successfully');
      return { error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unexpected sign out error';
      logger.error('AUTH', 'Unexpected exception during sign out', { error: msg });
      return { error: new Error(msg) };
    }
  }, [configured]);

  return {
    user,
    profile,
    role,
    loading,
    isConfigured: configured,
    signInWithPassword,
    signUp,
    signInWithGoogle,
    signInWithTikTok,
    signOut,
    refreshProfile,
  };
}

export default useSupabaseAuth;
