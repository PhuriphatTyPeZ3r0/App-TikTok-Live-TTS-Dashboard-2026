/**
 * Server-Side Supabase Client for StreamVox Live (Next.js 15 App Router).
 *
 * Provides a secure server-side client utilizing @supabase/ssr with cookie handling.
 * Safely falls back to null if Supabase environment variables are unconfigured.
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isSupabaseConfigured } from './client';

/**
 * Creates an asynchronous server-side Supabase client with Next.js 15 cookie store integration.
 * Returns null if Supabase credentials are missing or invalid, allowing offline server rendering.
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const cookieStore = await cookies();

    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim(),
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing user sessions.
            }
          },
        },
      }
    );
  } catch (error) {
    console.warn('[StreamVox Supabase] Error instantiating server client:', error);
    return null;
  }
}

/**
 * Standard alias for createSupabaseServerClient.
 */
export const createServerSupabase = createSupabaseServerClient;
