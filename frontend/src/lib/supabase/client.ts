/**
 * Client-Side Supabase Client for StreamVox Live.
 *
 * Provides a resilient browser client wrapper leveraging @supabase/ssr.
 * Implements graceful offline fallback when NEXT_PUBLIC_SUPABASE_URL or
 * NEXT_PUBLIC_SUPABASE_ANON_KEY are missing or set to placeholder values,
 * allowing local offline operation without runtime exceptions.
 */

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null = null;

/**
 * Validates whether Supabase environment credentials are present and syntactically valid.
 * Returns false for missing variables, empty strings, or default template placeholders.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !key) {
    return false;
  }

  // Check for unfilled placeholder templates
  if (
    url === 'https://your-project.supabase.co' ||
    url === 'https://placeholder.supabase.co' ||
    key === 'your-anon-key' ||
    key === 'your-anon-public-key'
  ) {
    return false;
  }

  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Obtains the singleton Supabase browser client instance.
 * Returns null if Supabase is not configured, enabling graceful local offline mode.
 */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!cachedClient) {
    try {
      cachedClient = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim()
      );
    } catch (error) {
      console.warn('[StreamVox Supabase] Error instantiating browser client:', error);
      return null;
    }
  }

  return cachedClient;
}

/**
 * Reset the cached client singleton (primarily for testing and mock reset purposes).
 */
export function resetSupabaseBrowserClient(): void {
  cachedClient = null;
}

/**
 * Standard alias for getSupabaseBrowserClient.
 */
export const createClient = getSupabaseBrowserClient;
