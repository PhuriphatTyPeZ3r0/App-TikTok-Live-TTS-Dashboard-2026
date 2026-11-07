# Google OAuth 2.0 Admin Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Google OAuth 2.0 authentication via Supabase Auth in Next.js 15, automatically designating users matching an **Admin Email Whitelist** as `role = 'admin'` upon login, granting full access to system-wide logs, global TTS settings, and admin dashboard controls.

**Architecture:** Integration with Supabase Auth Google OAuth Provider (`supabase.auth.signInWithOAuth({ provider: 'google' })`), PostgreSQL `handle_new_user()` trigger and RLS policies checking `ADMIN_EMAILS` whitelist (configured via database setting or environment variable), dedicated "Sign in with Google" button with official Google branding in `AuthModal.tsx`, and automatic elevation to Admin status in `user_profiles`.

**Tech Stack:** Next.js 15 App Router, React 19, Supabase Auth & PostgreSQL, Google Identity Services OAuth 2.0, TypeScript 5, Tailwind CSS.

**Spec:** Supabase Google Auth Guide and StreamVox Live RBAC Security Architecture.

## Global Constraints

- Must maintain zero visual degradation: follow StreamVox Live Apple visionOS Liquid Glass dark styling (`#0a0b0e`, `#12141a`, `#181b24`, `#fe2c55`, `#25f4ee`).
- Admin Whitelist specification:
  - Whitelist configured in `frontend/.env.local` (`NEXT_PUBLIC_ADMIN_EMAILS=admin@example.com,phuriphat.live@gmail.com`) and database schema trigger.
  - When an authorized Google email signs in, their profile automatically receives `role = 'admin'`.
  - Non-whitelisted Google users default to `role = 'streamer'`.
- Must preserve all existing unit/integration tests and zero-emoji UI rules.

## Review Focus

1. **Email Domain & Address Matching Security:** Case-insensitive, trimmed email comparison in PostgreSQL trigger to avoid impersonation.
2. **Prevent Client-Side Role Tampering:** Role elevation must ONLY occur via server-side database trigger / service role, never via client updates.
3. **Redirect URI Matching:** Correctly redirect to `/auth/callback` in Next.js after Google OAuth consent screen.
4. **Offline / Unconfigured Mode:** If Google OAuth credentials are not yet entered in Supabase, show a friendly configuration toast without crashing.

---

## File Structure

```
tiktok-live-tts-bot/
├── scripts/
│   └── supabase_schema.sql                  # Updated with handle_new_user() admin whitelist trigger
├── frontend/
│   ├── .env.example                         # Updated with NEXT_PUBLIC_ADMIN_EMAILS
│   ├── .env.local                           # Configured with local admin emails
│   ├── src/
│   │   ├── app/
│   │   │   └── auth/
│   │   │       └── callback/
│   │   │           └── route.ts             # Supabase OAuth exchange code for session
│   │   ├── components/
│   │   │   └── auth/
│   │   │       ├── GoogleLoginButton.tsx    # Official Google-styled OAuth button
│   │   │       └── AuthModal.tsx            # Updated with Google Login button
│   │   ├── hooks/
│   │   │   └── useSupabaseAuth.ts           # Extended with signInWithGoogle()
│   └── tests/
│       └── test_google_oauth_whitelist.test.ts # Tests for admin whitelist matching
```

---

## Task Decomposition

### Task 1: Supabase Admin Whitelist Trigger & OAuth Callback Handler

**Files:**
- Modify: `scripts/supabase_schema.sql`
- Create: `frontend/src/app/auth/callback/route.ts`
- Modify: `frontend/.env.example`
- Modify: `frontend/.env.local`

**Interfaces:**
- Produces: `GET /auth/callback`, `handle_new_user()` trigger with admin whitelist logic

- [ ] **Step 1: Update `scripts/supabase_schema.sql` with Admin Whitelist Function**
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  admin_list text[];
BEGIN
  -- Read configured admin emails from raw_user_meta_data or predefined list
  admin_list := ARRAY['admin@streamvox.live', 'phuriphat.live@gmail.com', 'typez3r0@gmail.com'];
  
  INSERT INTO public.user_profiles (id, email, display_name, role)
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    CASE
      WHEN lower(trim(new.email)) = ANY(admin_list) THEN 'admin'
      ELSE 'streamer'
    END
  )
  ON CONFLICT (id) DO UPDATE SET
    role = CASE
      WHEN lower(trim(new.email)) = ANY(admin_list) THEN 'admin'
      ELSE user_profiles.role
    END,
    updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

- [ ] **Step 2: Implement `/auth/callback/route.ts` in Next.js**
Exchange authorization code for Supabase session using `@supabase/ssr` server client and redirect to `/`.

- [ ] **Step 3: Verify build with TypeScript**
```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 4: Commit**
```bash
git add scripts/supabase_schema.sql frontend/src/app/auth/callback/ frontend/.env.example frontend/.env.local
git commit -m "feat(auth): add admin email whitelist trigger and supabase oauth callback route"
```

---

### Task 2: "Sign in with Google" UI & AuthModal Integration

**Files:**
- Create: `frontend/src/components/auth/GoogleLoginButton.tsx`
- Modify: `frontend/src/components/auth/AuthModal.tsx`
- Modify: `frontend/src/hooks/useSupabaseAuth.ts`

**Interfaces:**
- Produces: `<GoogleLoginButton />`, `signInWithGoogle()` in `useSupabaseAuth`

- [ ] **Step 1: Add `signInWithGoogle()` method to `useSupabaseAuth` hook**
Triggers `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/auth/callback' } })`.

- [ ] **Step 2: Build `<GoogleLoginButton />` component**
Styled with dark glassmorphic container, official multi-color Google 'G' logo SVG, and hover effects.

- [ ] **Step 3: Embed Google Login Button in `AuthModal.tsx`**
Display as primary 1-click social login option with "หรือดำเนินการต่อด้วยอีเมล (or continue with email)" separator.

- [ ] **Step 4: Verify build with TypeScript**
```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 5: Commit**
```bash
git add frontend/src/components/auth/GoogleLoginButton.tsx frontend/src/components/auth/AuthModal.tsx frontend/src/hooks/useSupabaseAuth.ts
git commit -m "feat(ui): add google sign-in button and oauth flow in auth modal"
```

---

### Task 3: End-to-End Verification & Google Cloud Console Setup Guide

**Files:**
- Modify: `README.md`
- Modify: `docs/VERCEL_RENDER_DEPLOYMENT_GUIDE.md`

- [ ] **Step 1: Document Google Cloud Console OAuth Setup**
Add instructions for enabling Google Identity, creating OAuth Client ID, setting redirect URI to Supabase (`https://<project-ref>.supabase.co/auth/v1/callback`), and configuring `NEXT_PUBLIC_ADMIN_EMAILS`.

- [ ] **Step 2: Run all backend tests and frontend production build**
```bash
pytest
cd frontend && npm run build
```

- [ ] **Step 3: Commit and Push**
```bash
git add README.md docs/
git commit -m "docs: add google oauth cloud console configuration guide"
git push origin main
git push tool-remote main
```
