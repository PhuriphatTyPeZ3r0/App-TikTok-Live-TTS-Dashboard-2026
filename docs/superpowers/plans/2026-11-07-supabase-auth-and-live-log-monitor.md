# Supabase User Auth, RBAC Permissions & Live Log Monitor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement full Supabase User Authentication (Login / Register / Cloud Profile Sync), 3-Tier Role-Based Access Control (Admin / Streamer / Viewer), and an In-Dashboard Real-Time Log Monitor with persistent error logging for StreamVox Live (`tiktok-live-tts-bot`).

**Architecture:** Next.js 15 App Router client & server Supabase integration (`@supabase/supabase-js`, `@supabase/ssr`), PostgreSQL schema with Row Level Security (RLS) enforcing Role-Based Access Control (RBAC) on user profiles and logs, a glassmorphic Auth modal in the top navigation bar, bidirectional cloud settings sync hook, role-aware UI gating, and a live in-dashboard log console tab with filtering, search, export, and automatic Supabase error persistence.

**Tech Stack:** Next.js 15, React 19, Supabase Auth & PostgreSQL, TypeScript 5, Tailwind CSS, Lucide React, FastAPI, Pytest.

**Spec:** Documented in user requirements and architecture specification below.

## Global Constraints

- Must maintain zero visual degradation: follow StreamVox Live Apple visionOS Liquid Glass dark styling (`#0a0b0e`, `#12141a`, `#181b24`, `#fe2c55`, `#25f4ee`).
- Must maintain offline/demo resilience: if `NEXT_PUBLIC_SUPABASE_URL` is unset or invalid, the app runs in Local Offline Mode as `admin` by default so development and testing never stall.
- 3 User Roles enforced:
  - `admin`: Full system access, can view all user profiles, all system logs, and manage global TTS configuration.
  - `streamer`: Can access dashboard, save and sync personal voice tunings and TikFinity settings, and view own session logs.
  - `viewer`: Read-only access for OBS browser overlay sources, unable to mutate settings or flush audio queues.
- Must preserve all existing 271 unit/integration tests and zero-emoji UI rules.
- Strict Thai normalizer and voice actor attribution must be preserved.

## Review Focus

1. **Role Privilege Escalation Prevention:** RLS policies must strictly verify `role = 'admin'` through database checks, preventing users from altering their own role via client-side payloads.
2. **Missing Supabase Credentials:** The app must render cleanly in local offline mode without throwing runtime exceptions.
3. **Expired / Invalid JWT Tokens:** Automatic token refresh and graceful fallback to unauthenticated state without breaking active stream TTS playback.
4. **High-Frequency Log Flood:** In-memory circular log buffer capped at 500 entries to prevent memory leaks during long live streams.
5. **Concurrent Cloud Settings Sync:** Debounced updates (500ms) to prevent race conditions during rapid slider adjustments.

---

## File Structure

```
tiktok-live-tts-bot/
├── scripts/
│   └── supabase_schema.sql                  # PostgreSQL tables, indexes, RBAC roles, and RLS policies
├── frontend/
│   ├── .env.example                         # Updated with Supabase environment variables
│   ├── .env.local                           # Local development template
│   ├── src/
│   │   ├── lib/
│   │   │   ├── supabase/
│   │   │   │   ├── client.ts                # Browser Supabase client (createBrowserClient)
│   │   │   │   └── server.ts                # Server Supabase client (createServerClient)
│   │   │   └── logger.ts                    # Centralized structured logger & event bus
│   │   ├── types/
│   │   │   ├── auth.ts                      # UserRole, UserProfile & Auth state types
│   │   │   └── logger.ts                    # LogEntry, LogLevel, LogCategory types
│   │   ├── hooks/
│   │   │   ├── useSupabaseAuth.ts           # Auth state listener, login, register, logout, role
│   │   │   └── useSupabaseSync.ts           # Cloud settings sync for voice tunings & preferences
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   │   ├── AuthModal.tsx            # Login / Register glassmorphic modal
│   │   │   │   ├── UserProfileButton.tsx    # Navbar user chip, role badge & dropdown menu
│   │   │   │   └── RoleGate.tsx             # Component-level RBAC authorization wrapper
│   │   │   ├── tabs/
│   │   │   │   └── TabLogMonitor.tsx        # Live Log Monitor tab with admin system log toggle
│   │   │   ├── Navbar.tsx                   # Updated with UserProfileButton and role badge
│   │   │   └── TikFinitySettings.tsx        # Updated with Log Monitor tab and role gating
│   └── tests/
│       ├── test_supabase_client.test.ts     # Client initialization & fallback tests
│       └── test_logger.test.ts              # Logger event bus & ring buffer tests
├── src/
│   └── web_server.py                        # FastAPI /api/logs ingest endpoint
└── tests/
    └── test_log_ingest_api.py               # Backend log ingestion unit tests
```

---

## Task Decomposition

### Task 1: Supabase Database Schema, RBAC Roles & Client Infrastructure

**Files:**
- Create: `scripts/supabase_schema.sql`
- Create: `frontend/src/types/auth.ts`
- Create: `frontend/src/types/logger.ts`
- Create: `frontend/src/lib/supabase/client.ts`
- Create: `frontend/src/lib/supabase/server.ts`
- Modify: `frontend/.env.example`
- Create: `frontend/.env.local`
- Modify: `frontend/package.json`

**Interfaces:**
- Produces: `UserRole = 'admin' | 'streamer' | 'viewer'`, `UserProfile`, `getSupabaseBrowserClient()`

- [ ] **Step 1: Install `@supabase/supabase-js` and `@supabase/ssr` in `frontend`**
```bash
cd frontend && npm install @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 2: Create SQL migration script in `scripts/supabase_schema.sql`**
Define:
- `user_profiles` table with `role TEXT NOT NULL DEFAULT 'streamer' CHECK (role IN ('admin', 'streamer', 'viewer'))`
- `system_logs` table with `user_id`, `session_id`, `level`, `category`, `message`, `details`
- Row Level Security (RLS) policies:
  - Admin users can view and update all profiles and all logs.
  - Streamers can only view and update their own profile and view their own logs.
  - Viewers can only view public/overlay data.
  - Users CANNOT update their own `role` column (security definer trigger or column-level check).

- [ ] **Step 3: Define TypeScript interfaces in `frontend/src/types/auth.ts` and `frontend/src/types/logger.ts`**
Export `UserRole`, `UserProfile`, `AuthState`, `LogEntry`, `LogLevel`, `LogCategory`.

- [ ] **Step 4: Implement browser and server Supabase clients in `frontend/src/lib/supabase/`**
Implement safe browser client with offline fallback if `NEXT_PUBLIC_SUPABASE_URL` is unset (defaults to mock offline admin).

- [ ] **Step 5: Verify build with TypeScript**
```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 6: Commit**
```bash
git add scripts/supabase_schema.sql frontend/package.json frontend/package-lock.json frontend/.env.example frontend/.env.local frontend/src/types/ frontend/src/lib/supabase/
git commit -m "feat(supabase): scaffold rbac schema, types, and client infrastructure"
```

---

### Task 2: Centralized Structured Logger & Log Event Bus

**Files:**
- Create: `frontend/src/lib/logger.ts`
- Modify: `src/web_server.py`
- Create: `tests/test_log_ingest_api.py`

**Interfaces:**
- Consumes: `LogEntry`, `LogLevel`, `LogCategory` from `frontend/src/types/logger.ts`
- Produces: `logger.info()`, `logger.warn()`, `logger.error()`, `logger.debug()`, `subscribeToLogs()`

- [ ] **Step 1: Write backend test in `tests/test_log_ingest_api.py`**
Verify `POST /api/logs` accepts structured log payloads and returns HTTP 200 with stored count.

- [ ] **Step 2: Run backend test to verify it fails**
```bash
pytest tests/test_log_ingest_api.py -v
```

- [ ] **Step 3: Implement `POST /api/logs` in `src/web_server.py`**
Store incoming client logs into a thread-safe ring buffer (`collections.deque(maxlen=1000)`).

- [ ] **Step 4: Implement `frontend/src/lib/logger.ts`**
Implement ring-buffered in-memory logger (max 500 entries), event listener emitter for UI subscriber, and automatic POST to `/api/logs` or Supabase `system_logs` on `ERROR` level.

- [ ] **Step 5: Run tests and verify**
```bash
pytest tests/test_log_ingest_api.py -v
cd frontend && npx tsc --noEmit
```

- [ ] **Step 6: Commit**
```bash
git add src/web_server.py tests/test_log_ingest_api.py frontend/src/lib/logger.ts
git commit -m "feat(logger): implement structured logger and backend log ingest api"
```

---

### Task 3: Supabase Authentication, RBAC Role Gate & UI Modal

**Files:**
- Create: `frontend/src/hooks/useSupabaseAuth.ts`
- Create: `frontend/src/components/auth/AuthModal.tsx`
- Create: `frontend/src/components/auth/UserProfileButton.tsx`
- Create: `frontend/src/components/auth/RoleGate.tsx`
- Modify: `frontend/src/components/Navbar.tsx`

**Interfaces:**
- Consumes: `getSupabaseBrowserClient()`, `UserRole`
- Produces: `useSupabaseAuth()`, `<RoleGate allowedRoles={['admin', 'streamer']} />`, `<AuthModal />`, `<UserProfileButton />`

- [ ] **Step 1: Implement `useSupabaseAuth` hook**
Handles `user`, `profile`, `role`, `loading`, `signInWithPassword`, `signUpWithPassword`, `signInWithOAuth`, `signOut`.

- [ ] **Step 2: Build `RoleGate.tsx` authorization component**
Conditionally renders children or fallback banner based on active `userRole` (`admin`, `streamer`, `viewer`).

- [ ] **Step 3: Build `AuthModal.tsx`**
Liquid Glass design modal with Login and Register tabs, email/password inputs, loading spinners, and error alerts.

- [ ] **Step 4: Build `UserProfileButton.tsx`**
Displays user avatar/email with role pill badge (`ADMIN`, `STREAMER`, `VIEWER`), with dropdown for account details and logout.

- [ ] **Step 5: Integrate `UserProfileButton` into `Navbar.tsx`**
Embed user profile button and role status into the top right actions row in StreamVox Navbar.

- [ ] **Step 6: Verify build with TypeScript**
```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 7: Commit**
```bash
git add frontend/src/hooks/useSupabaseAuth.ts frontend/src/components/auth/ frontend/src/components/Navbar.tsx
git commit -m "feat(auth): add rbac auth hook, role gate, auth modal and navbar user menu"
```

---

### Task 4: User Profile Cloud Settings Sync

**Files:**
- Create: `frontend/src/hooks/useSupabaseSync.ts`
- Modify: `frontend/src/app/page.tsx`
- Modify: `frontend/src/hooks/useTikFinitySettings.ts`

**Interfaces:**
- Consumes: `useSupabaseAuth()`, `TikFinitySettings`
- Produces: `useSupabaseSync()` for cloud profile syncing

- [ ] **Step 1: Implement `useSupabaseSync` hook in `frontend/src/hooks/useSupabaseSync.ts`**
On authentication change:
1. Fetch `user_profiles` from Supabase for the current user.
2. If profile exists, merge `voice_tunings` and `settings` into the dashboard.
3. If profile does not exist, insert initial record with current settings and `role = 'streamer'`.
4. Listen for local settings changes and debounce-save (500ms) to Supabase (only if role is `admin` or `streamer`).

- [ ] **Step 2: Wire `useSupabaseSync` into `frontend/src/app/page.tsx`**
Connect user session to dashboard settings state.

- [ ] **Step 3: Verify build with TypeScript**
```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 4: Commit**
```bash
git add frontend/src/hooks/useSupabaseSync.ts frontend/src/app/page.tsx frontend/src/hooks/useTikFinitySettings.ts
git commit -m "feat(sync): implement role-aware cloud settings synchronization"
```

---

### Task 5: In-Dashboard Real-Time Log Monitor Tab with RBAC

**Files:**
- Create: `frontend/src/components/tabs/TabLogMonitor.tsx`
- Modify: `frontend/src/components/TikFinitySettings.tsx`
- Modify: `frontend/src/lib/logger.ts`

**Interfaces:**
- Consumes: `subscribeToLogs()`, `clearLogs()`, `getLogHistory()`, `useSupabaseAuth()`
- Produces: `<TabLogMonitor />` embedded in `TikFinitySettings`

- [ ] **Step 1: Create `TabLogMonitor.tsx` component with RBAC scope selector**
Features:
- Scope toggle (for `admin` role only): "Logs ทั้งระบบ (All System Logs)" vs "Logs ส่วนตัว (My Session)"
- Filter chips: `ALL`, `ERROR`, `WARN`, `INFO`, `DEBUG`
- Category selector: `ALL`, `TTS`, `TIKTOK_WS`, `AUTH`, `NETWORK`, `OVERLAY`
- Search bar for instant keyword filtering
- Scrollable terminal console with badge colors and timestamps
- Expandable accordion for inspecting JSON error details and stack traces
- Utility buttons: "ล้าง Log (Clear)", "คัดลอก (Copy JSON)", "ดาวน์โหลด Report (Export .txt)"
- Auto-scroll toggle switch

- [ ] **Step 2: Register Tab in `TikFinitySettings.tsx`**
Add 6th tab: `{ id: "logs", label: "Log Monitor (ตรวจสอบระบบ)", icon: "terminal" }`

- [ ] **Step 3: Verify build with TypeScript and Next.js production build**
```bash
cd frontend && npx tsc --noEmit && npm run build
```

- [ ] **Step 4: Run full pytest suite to verify zero backend regression**
```bash
pytest
```

- [ ] **Step 5: Commit**
```bash
git add frontend/src/components/tabs/TabLogMonitor.tsx frontend/src/components/TikFinitySettings.tsx frontend/src/lib/logger.ts
git commit -m "feat(monitor): add in-dashboard real-time log monitor console tab with rbac"
```

---

### Task 6: End-to-End Verification & Production Readiness

**Files:**
- Modify: `README.md`
- Modify: `docs/VERCEL_RENDER_DEPLOYMENT_GUIDE.md`

- [ ] **Step 1: Update documentation with Supabase setup instructions, RBAC role assignment, and SQL migration guide**
Document environment variables, table creation, default admin assignment, and RLS policies in `README.md` and `docs/VERCEL_RENDER_DEPLOYMENT_GUIDE.md`.

- [ ] **Step 2: Run all backend tests and frontend production builds**
```bash
pytest
cd frontend && npm run build
```

- [ ] **Step 3: Commit and Push**
```bash
git add README.md docs/
git commit -m "docs: add supabase rbac authentication and log monitor deployment guide"
git push origin main
git push tool-remote main
```
