-- ==============================================================================
-- StreamVox Live (tiktok-live-tts-bot) - Supabase Database & RBAC Schema
-- Database: PostgreSQL 15+ (Supabase)
-- Architecture: 3-Tier Role-Based Access Control (RBAC) with Row Level Security (RLS)
-- Roles: 'admin', 'streamer', 'viewer'
-- ==============================================================================

-- 1. Create User Profiles Table
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    display_name TEXT,
    role TEXT NOT NULL DEFAULT 'streamer' CHECK (role IN ('admin', 'streamer', 'viewer')),
    tiktok_username TEXT DEFAULT 'phuriphat_live',
    selected_voice_id TEXT DEFAULT 'yuta',
    voice_tunings JSONB DEFAULT '{}'::jsonb,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create System Logs Table for In-Dashboard Real-time Monitoring & Ingest
CREATE TABLE IF NOT EXISTS public.system_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id TEXT,
    level TEXT NOT NULL CHECK (level IN ('INFO', 'WARN', 'ERROR', 'DEBUG')),
    category TEXT NOT NULL CHECK (category IN ('TTS', 'TIKTOK_WS', 'AUTH', 'NETWORK', 'OVERLAY', 'SYSTEM')),
    message TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles (role);
CREATE INDEX IF NOT EXISTS idx_system_logs_user_created ON public.system_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_level_created ON public.system_logs (level, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_category_created ON public.system_logs (category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_session_id ON public.system_logs (session_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- 5. Helper Function: Check if Authenticated User has 'admin' Role
-- Defined with SECURITY DEFINER to bypass RLS recursion on public.user_profiles
CREATE OR REPLACE FUNCTION public.is_admin(user_uid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_profiles
        WHERE id = user_uid AND role = 'admin'
    );
$$;

-- 6. Trigger to Prevent Role Escalation by Non-Admins
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Prevent non-admin users from escalating their own or other roles
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        IF NOT public.is_admin(auth.uid()) THEN
            RAISE EXCEPTION 'Permission denied: Only administrators can modify user roles.';
        END IF;
    END IF;
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_profiles_prevent_role_escalation ON public.user_profiles;
CREATE TRIGGER trg_user_profiles_prevent_role_escalation
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_role_escalation();

-- 7. User Signup Trigger: Automatically create user_profiles record from auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.user_profiles (
        id,
        email,
        display_name,
        role
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'streamer')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 8. Row Level Security (RLS) Policies for `user_profiles`

-- Read: Users can view their own profile, Admins can view all profiles
DROP POLICY IF EXISTS "Users can read own profile or admin can read all" ON public.user_profiles;
CREATE POLICY "Users can read own profile or admin can read all"
    ON public.user_profiles
    FOR SELECT
    USING (
        auth.uid() = id OR public.is_admin(auth.uid())
    );

-- Update: Users can update their own profile (role changes guarded by trigger), Admins can update all
DROP POLICY IF EXISTS "Users can update own profile or admin can update all" ON public.user_profiles;
CREATE POLICY "Users can update own profile or admin can update all"
    ON public.user_profiles
    FOR UPDATE
    USING (
        auth.uid() = id OR public.is_admin(auth.uid())
    )
    WITH CHECK (
        auth.uid() = id OR public.is_admin(auth.uid())
    );

-- Insert: Service role or trigger creates profile, user can insert their own if missing
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile"
    ON public.user_profiles
    FOR INSERT
    WITH CHECK (
        auth.uid() = id OR public.is_admin(auth.uid())
    );

-- 9. Row Level Security (RLS) Policies for `system_logs`

-- Insert: Authenticated users can insert logs (or unauthenticated with service role / anonymous logs)
DROP POLICY IF EXISTS "Users can insert system logs" ON public.system_logs;
CREATE POLICY "Users can insert system logs"
    ON public.system_logs
    FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated' OR auth.uid() IS NULL
    );

-- Select: Streamers can view their own logs, Admins can view all logs
DROP POLICY IF EXISTS "Users can view own logs or admin can view all" ON public.system_logs;
CREATE POLICY "Users can view own logs or admin can view all"
    ON public.system_logs
    FOR SELECT
    USING (
        (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR public.is_admin(auth.uid())
    );
