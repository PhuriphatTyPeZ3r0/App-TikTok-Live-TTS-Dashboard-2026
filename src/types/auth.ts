/**
 * Authentication and Role-Based Access Control (RBAC) type definitions for StreamVox Live.
 *
 * Implements a 3-tier Role-Based Access Control (RBAC) hierarchy:
 * - 'admin': Full administrative system control, configuration management, and audit log inspection.
 * - 'streamer': Live broadcaster access, custom voice tuning persistence, and session log access.
 * - 'viewer': Read-only observer access for Open Broadcaster Software (OBS) browser overlays.
 */

import type { User, Session } from '@supabase/supabase-js';

/**
 * 3-Tier Role-Based Access Control (RBAC) roles.
 */
export type UserRole = 'admin' | 'streamer' | 'viewer';

/**
 * PostgreSQL public.user_profiles row contract.
 */
export interface UserProfile {
  /** Universally Unique Identifier (UUID) primary key referencing auth.users(id). */
  id: string;
  /** Primary contact Electronic Mail (Email) address. */
  email?: string;
  /** Public display name or live channel moniker. */
  display_name?: string;
  /** Assigned 3-tier Role-Based Access Control (RBAC) level. */
  role: UserRole;
  /** Associated TikTok live streamer handle. */
  tiktok_username?: string;
  /** Selected Text-to-Speech (TTS) voice identifier (e.g. 'yuta'). */
  selected_voice_id?: string;
  /** Voice acoustic tuning parameters (speed, pitch, emotion, temperature). */
  voice_tunings?: Record<string, any>;
  /** TikFinity and general dashboard preferences. */
  settings?: Record<string, any>;
  /** ISO 8601 creation timestamp. */
  created_at?: string;
  /** ISO 8601 update timestamp. */
  updated_at?: string;
}

/**
 * Unified application authentication state contract.
 */
export interface AuthState {
  /** Supabase authenticated user object or null when unauthenticated / local offline mode. */
  user: User | null;
  /** Synchronized PostgreSQL user profile with Role-Based Access Control (RBAC) role. */
  profile: UserProfile | null;
  /** Active effective Role-Based Access Control (RBAC) role (defaults to 'streamer' in offline demo mode, 'viewer' unauthenticated). */
  role: UserRole;
  /** Loading or revalidation status indicator. */
  loading: boolean;
}

/**
 * User credentials payload for sign-in and sign-up workflows.
 */
export interface AuthCredentials {
  email: string;
  password: string;
  displayName?: string;
}

/**
 * Render Backend authenticated user entity representing an Open Authorization (OAuth) account.
 */
export interface RenderUser {
  /** Universally Unique Identifier (UUID) or backend account identity string. */
  id: string;
  /** Primary electronic mail address. */
  email: string;
  /** Full display name extracted from Open Authorization (OAuth) provider. */
  name?: string;
  /** Public Uniform Resource Locator (URL) for user profile avatar. */
  avatar_url?: string;
  /** Role-Based Access Control (RBAC) role assigned in backend database. */
  role: "admin" | "streamer";
  /** ISO 8601 creation timestamp. */
  created_at?: string;
}

/**
 * Render Backend Native Open Authorization (OAuth) state lifecycle contract.
 */
export interface RenderAuthState {
  /** Authenticated user details or null when guest/unauthenticated. */
  user: RenderUser | null;
  /** JSON Web Token (JWT) bearer access token. */
  token: string | null;
  /** Active Role-Based Access Control (RBAC) role. */
  role: "admin" | "streamer" | null;
  /** High-privilege administrative access flag. */
  isAdmin: boolean;
  /** Authentication verification or network roundtrip loading status. */
  isLoading: boolean;
  /** Human-readable error message if authentication failed. */
  error: string | null;
  /** Initiate Google Open Authorization (OAuth) redirection workflow. */
  loginWithGoogle: () => void;
  /** Purge authentication credentials, terminate session, and reset local state. */
  logout: () => void;
  /** Developer mode fallback mock login simulator. */
  mockLogin: (role?: "admin" | "streamer") => Promise<void> | void;
}

