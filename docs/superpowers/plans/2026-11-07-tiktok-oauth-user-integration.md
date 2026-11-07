# TikTok OAuth 2.0 User Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement TikTok OAuth 2.0 Login Kit integration in Next.js 15, enabling streamers to 1-click connect their TikTok account, automatically extract and persist their `@username`, avatar, and display name into Supabase `user_profiles`, and auto-connect to their live stream room without manual username entry.

**Architecture:** Next.js Route Handlers (`/api/auth/tiktok/login` and `/api/auth/tiktok/callback`) implementing OAuth 2.0 authorization code flow with PKCE and state protection, local Mock Mode fallback for immediate offline/dev testing without waiting for ByteDance app approval, seamless synchronization into Supabase `user_profiles` (`tiktok_username`, `avatar_url`, `display_name`), and auto-initialization of live stream room sessions in the dashboard.

**Tech Stack:** Next.js 15 App Router, React 19, Supabase Auth & PostgreSQL, TikTok Login Kit v2 API (`/v2/oauth/token/` & `/v2/user/info/`), TypeScript 5, Tailwind CSS.

**Spec:** TikTok for Developers Login Kit v2 Specification and StreamVox Live Account Management Architecture.

## Global Constraints

- Must maintain zero visual degradation: follow StreamVox Live Apple visionOS Liquid Glass dark styling (`#0a0b0e`, `#12141a`, `#181b24`, `#fe2c55`, `#25f4ee`).
- Must support **Mock / Sandbox Mode**: if `TIKTOK_CLIENT_KEY` or `TIKTOK_CLIENT_SECRET` is unset, clicking "Login with TikTok" displays a dev/mock login dialog (e.g. `@phuriphat_live`, `@arm_phx`, or custom handle) so developers and users can test without ByteDance production approval.
- Must preserve dual-mode flexibility: streamer can still manually switch to monitor any other TikTok room via the existing Room Switcher dialog.
- Must preserve all existing unit/integration tests and zero-emoji UI rules.

## Review Focus

1. **CSRF State Parameter Validation:** The OAuth callback must strictly verify the `state` query parameter against a secure cookie to prevent Cross-Site Request Forgery (CSRF).
2. **Missing TikTok Developer Credentials:** Graceful automatic activation of Mock Mode without throwing 500 errors.
3. **Token Expiration & Refresh:** Storing the `refresh_token` securely and handling expired access tokens gracefully.
4. **Room Auto-Connect Fallback:** If the user's TikTok account is not currently live, display a friendly notice and keep the dashboard ready rather than throwing an unhandled rejection.
5. **Supabase Profile Sync Race Conditions:** Updating `user_profiles` using upsert (`onConflict: 'id'`) to prevent duplicate key errors.

---

## File Structure

```
tiktok-live-tts-bot/
├── frontend/
│   ├── .env.example                         # Updated with TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET
│   ├── .env.local                           # Updated with TikTok OAuth keys
│   ├── src/
│   │   ├── app/
│   │   │   └── api/
│   │   │       └── auth/
│   │   │           └── tiktok/
│   │   │               ├── login/
│   │   │               │   └── route.ts     # Initiates TikTok OAuth 2.0 authorization flow
│   │   │               ├── callback/
│   │   │               │   └── route.ts     # Handles code exchange & profile extraction
│   │   │               └── mock/
│   │   │                   └── route.ts     # Instant local mock callback for development
│   │   ├── lib/
│   │   │   └── tiktokOAuth.ts               # TikTok API client helper (exchangeCode, fetchUserInfo)
│   │   ├── types/
│   │   │   └── tiktok.ts                    # TikTok user profile, token response types
│   │   ├── hooks/
│   │   │   └── useTikTokAuth.ts             # Hook to initiate TikTok login and auto-connect
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   │   └── TikTokLoginButton.tsx    # Branded TikTok 1-click connect button
│   │   │   ├── Navbar.tsx                   # Display TikTok avatar and quick account switch
│   │   │   └── TikFinitySettings.tsx        # Linked TikTok creator account status card
│   └── tests/
│       └── test_tiktok_oauth.test.ts        # Unit tests for state verification and mock flow
```

---

## Task Decomposition

### Task 1: TikTok OAuth 2.0 Core Client & Route Handlers

**Files:**
- Create: `frontend/src/types/tiktok.ts`
- Create: `frontend/src/lib/tiktokOAuth.ts`
- Create: `frontend/src/app/api/auth/tiktok/login/route.ts`
- Create: `frontend/src/app/api/auth/tiktok/callback/route.ts`
- Create: `frontend/src/app/api/auth/tiktok/mock/route.ts`
- Modify: `frontend/.env.example`
- Modify: `frontend/.env.local`

**Interfaces:**
- Produces: `TikTokUserProfile`, `generateTikTokAuthUrl()`, `exchangeTikTokCode()`, `getTikTokUserInfo()`

- [ ] **Step 1: Define TypeScript interfaces in `frontend/src/types/tiktok.ts`**
Export `TikTokUserProfile` (`open_id`, `union_id`, `avatar_url`, `display_name`, `username`), `TikTokTokenResponse`.

- [ ] **Step 2: Implement OAuth helper in `frontend/src/lib/tiktokOAuth.ts`**
Implement PKCE, state token generation, token exchange, and user info retrieval with timeout and error handling.

- [ ] **Step 3: Implement `/api/auth/tiktok/login/route.ts`**
Generates CSRF state, sets HttpOnly cookie, and redirects to TikTok authorization URL (or `/api/auth/tiktok/mock` if credentials are not configured).

- [ ] **Step 4: Implement `/api/auth/tiktok/callback/route.ts` and mock handler**
Validates state cookie, exchanges `code` for access token, fetches profile, stores in Supabase `user_profiles` (or cookie session), and redirects to `/?username=@...`.

- [ ] **Step 5: Verify build with TypeScript**
```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 6: Commit**
```bash
git add frontend/src/types/tiktok.ts frontend/src/lib/tiktokOAuth.ts frontend/src/app/api/auth/tiktok/ frontend/.env.example frontend/.env.local
git commit -m "feat(oauth): implement tiktok oauth 2.0 route handlers and mock dev mode"
```

---

### Task 2: 1-Click "Login with TikTok" UI & Navbar Integration

**Files:**
- Create: `frontend/src/components/auth/TikTokLoginButton.tsx`
- Create: `frontend/src/hooks/useTikTokAuth.ts`
- Modify: `frontend/src/components/Navbar.tsx`
- Modify: `frontend/src/components/auth/AuthModal.tsx`

**Interfaces:**
- Consumes: `/api/auth/tiktok/login`
- Produces: `<TikTokLoginButton />`, `useTikTokAuth()`

- [ ] **Step 1: Create `useTikTokAuth.ts` hook**
Triggers `/api/auth/tiktok/login`, manages loading state, and handles auto-reconnection.

- [ ] **Step 2: Build `<TikTokLoginButton />` component**
Styled with TikTok brand colors (black background, `#fe2c55` / `#25f4ee` accent glow, TikTok logo icon).

- [ ] **Step 3: Embed TikTok Login Button in `AuthModal.tsx` and `Navbar.tsx`**
Add "เข้าสู่ระบบด้วย TikTok (Login with TikTok)" button in AuthModal and top creator status card.

- [ ] **Step 4: Verify build with TypeScript**
```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 5: Commit**
```bash
git add frontend/src/components/auth/TikTokLoginButton.tsx frontend/src/hooks/useTikTokAuth.ts frontend/src/components/Navbar.tsx frontend/src/components/auth/AuthModal.tsx
git commit -m "feat(ui): add 1-click tiktok login button and navbar creator chip"
```

---

### Task 3: Automatic Room Session Initialization & Account Linking

**Files:**
- Modify: `frontend/src/app/page.tsx`
- Modify: `scripts/supabase_schema.sql`

**Interfaces:**
- Consumes: `useTikTokAuth()`, `useSupabaseSync()`
- Produces: Auto-connect live stream session on TikTok login

- [ ] **Step 1: Update Supabase schema in `scripts/supabase_schema.sql`**
Add `tiktok_avatar_url TEXT` and `tiktok_open_id TEXT UNIQUE` to `user_profiles` table.

- [ ] **Step 2: Implement auto-connection logic in `frontend/src/app/page.tsx`**
When `username` is returned from TikTok OAuth or user profile:
1. Automatically dispatch session start to backend (`POST /api/sessions`).
2. Update dashboard title and Live status badge without user having to type their username.
3. Keep the manual Room Switcher modal accessible for monitoring other streams.

- [ ] **Step 3: Verify build with TypeScript and Next.js production build**
```bash
cd frontend && npx tsc --noEmit && npm run build
```

- [ ] **Step 4: Commit**
```bash
git add frontend/src/app/page.tsx scripts/supabase_schema.sql
git commit -m "feat(session): auto-initialize tiktok live room session on oauth login"
```

---

### Task 4: End-to-End Verification & Documentation

**Files:**
- Modify: `README.md`
- Modify: `docs/VERCEL_RENDER_DEPLOYMENT_GUIDE.md`

- [ ] **Step 1: Document TikTok Developer Portal Setup**
Add step-by-step instructions for creating a TikTok Developer App, requesting Login Kit permissions, and configuring Redirect URIs.

- [ ] **Step 2: Run full test suite and verify build**
```bash
pytest
cd frontend && npm run build
```

- [ ] **Step 3: Commit and Push**
```bash
git add README.md docs/
git commit -m "docs: add tiktok developer oauth setup and room auto-connect guide"
git push origin main
git push tool-remote main
```
