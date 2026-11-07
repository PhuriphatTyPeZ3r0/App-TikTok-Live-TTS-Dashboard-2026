import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Supabase OAuth 2.0 PKCE Code Exchange Callback Route for Next.js 15.
 *
 * Handles redirect authentication code exchange for Single Sign-On (SSO) providers
 * such as Google OAuth and TikTok Login Kit, establishing authenticated session cookies.
 *
 * Mandatory Academic Terminology:
 * - Single Sign-On (SSO)
 * - Role-Based Access Control (RBAC)
 * - Application Programming Interface (API)
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
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
              // Ignore cookie mutations in edge contexts
            }
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Fallback to origin root if code exchange fails or params missing
  return NextResponse.redirect(`${origin}/`);
}
