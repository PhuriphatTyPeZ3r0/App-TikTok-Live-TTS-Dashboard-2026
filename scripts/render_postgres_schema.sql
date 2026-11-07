-- ==============================================================================
-- StreamVox Live (tiktok-live-tts-bot) - Render Managed PostgreSQL Schema
-- Database: PostgreSQL 16+ (Render Managed Database)
-- Region: Singapore (Co-located with FastAPI Backend)
-- Architecture: 3-Tier Role-Based Access Control (RBAC)
-- Roles: 'admin', 'streamer', 'viewer'
-- ==============================================================================

-- Enable UUID extension for cryptographically secure UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Create User Profiles Table
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE,
    display_name TEXT,
    role TEXT NOT NULL DEFAULT 'streamer' CHECK (role IN ('admin', 'streamer', 'viewer')),
    tiktok_username TEXT DEFAULT 'phuriphat_live',
    selected_voice_id TEXT DEFAULT 'yuta',
    voice_tunings JSONB DEFAULT '{}'::jsonb,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create System Logs Table for In-Dashboard Real-time Telemetry & Diagnostics
CREATE TABLE IF NOT EXISTS public.system_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    session_id TEXT,
    level TEXT NOT NULL CHECK (level IN ('INFO', 'WARN', 'ERROR', 'DEBUG')),
    category TEXT NOT NULL CHECK (category IN ('TTS', 'TIKTOK_WS', 'AUTH', 'NETWORK', 'OVERLAY', 'SYSTEM')),
    message TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles (role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles (email);
CREATE INDEX IF NOT EXISTS idx_system_logs_user_created ON public.system_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_level_created ON public.system_logs (level, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_category_created ON public.system_logs (category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_session_id ON public.system_logs (session_id);

-- 4. Trigger for Auto-Updating updated_at Timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER trg_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Trigger for Admin Whitelist Promotion
-- Automatically assigns 'admin' role if email matches authorized admin whitelist
CREATE OR REPLACE FUNCTION public.handle_admin_whitelist()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.email IS NOT NULL AND LOWER(NEW.email) IN ('phuriphathem@gmail.com', 'admin@streamvox.live') THEN
        NEW.role = 'admin';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_profiles_admin_whitelist ON public.user_profiles;
CREATE TRIGGER trg_user_profiles_admin_whitelist
    BEFORE INSERT OR UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_admin_whitelist();
