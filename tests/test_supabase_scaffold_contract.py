"""Tests for Supabase Schema, Role-Based Access Control (RBAC), and Client Infrastructure Contracts.

This module validates that the PostgreSQL schema, Row Level Security (RLS) policies,
TypeScript type definitions, and Next.js 15 client/server Supabase modules are properly
scaffolded according to the StreamVox Live specification.

Role-Based Access Control (RBAC) tiers: 'admin', 'streamer', 'viewer'.
"""

import json
from pathlib import Path
import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
FRONTEND_DIR = REPO_ROOT / "frontend"
SCHEMA_SQL = REPO_ROOT / "scripts" / "supabase_schema.sql"
AUTH_TYPES = FRONTEND_DIR / "src" / "types" / "auth.ts"
LOGGER_TYPES = FRONTEND_DIR / "src" / "types" / "logger.ts"
CLIENT_TS = FRONTEND_DIR / "src" / "lib" / "supabase" / "client.ts"
SERVER_TS = FRONTEND_DIR / "src" / "lib" / "supabase" / "server.ts"
ENV_EXAMPLE = FRONTEND_DIR / ".env.example"
ENV_LOCAL = FRONTEND_DIR / ".env.local"
PACKAGE_JSON = FRONTEND_DIR / "package.json"


def test_supabase_dependencies_in_package_json():
    """Verify @supabase/supabase-js and @supabase/ssr are declared in frontend/package.json."""
    assert PACKAGE_JSON.exists(), "frontend/package.json must exist"
    data = json.loads(PACKAGE_JSON.read_text(encoding="utf-8"))
    deps = data.get("dependencies", {})
    assert "@supabase/supabase-js" in deps, "@supabase/supabase-js must be in dependencies"
    assert "@supabase/ssr" in deps, "@supabase/ssr must be in dependencies"


def test_supabase_schema_sql_contract():
    """Verify scripts/supabase_schema.sql defines required tables, constraints, indexes, and RLS policies."""
    assert SCHEMA_SQL.exists(), "scripts/supabase_schema.sql must exist"
    content = SCHEMA_SQL.read_text(encoding="utf-8")

    # Table definitions
    assert "public.user_profiles" in content
    assert "public.system_logs" in content

    # 3-tier Role-Based Access Control (RBAC)
    assert "'admin', 'streamer', 'viewer'" in content
    assert "role TEXT NOT NULL DEFAULT 'streamer'" in content

    # System logs columns & check constraints
    assert "'INFO', 'WARN', 'ERROR', 'DEBUG'" in content
    assert "'TTS', 'TIKTOK_WS', 'AUTH', 'NETWORK', 'OVERLAY', 'SYSTEM'" in content

    # Indexes
    assert "idx_user_profiles_role" in content
    assert "idx_system_logs_user_created" in content
    assert "idx_system_logs_level_created" in content

    # Row Level Security (RLS)
    assert "ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;" in content
    assert "ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;" in content

    # Admin check & privilege escalation guard functions
    assert "is_admin" in content
    assert "prevent_role_escalation" in content
    assert "handle_new_user" in content
    assert "on_auth_user_created" in content


def test_typescript_auth_and_logger_types():
    """Verify TypeScript type definitions for auth and logging exist and declare key types."""
    assert AUTH_TYPES.exists(), "frontend/src/types/auth.ts must exist"
    auth_content = AUTH_TYPES.read_text(encoding="utf-8")
    assert "export type UserRole = 'admin' | 'streamer' | 'viewer';" in auth_content
    assert "export interface UserProfile" in auth_content
    assert "export interface AuthState" in auth_content

    assert LOGGER_TYPES.exists(), "frontend/src/types/logger.ts must exist"
    logger_content = LOGGER_TYPES.read_text(encoding="utf-8")
    assert "export type LogLevel" in logger_content
    assert "export type LogCategory" in logger_content
    assert "export interface LogEntry" in logger_content


def test_supabase_client_and_server_helpers():
    """Verify frontend/src/lib/supabase client and server files export expected helpers."""
    assert CLIENT_TS.exists(), "frontend/src/lib/supabase/client.ts must exist"
    client_content = CLIENT_TS.read_text(encoding="utf-8")
    assert "export function isSupabaseConfigured" in client_content
    assert "export function getSupabaseBrowserClient" in client_content
    assert "export const createClient = getSupabaseBrowserClient" in client_content

    assert SERVER_TS.exists(), "frontend/src/lib/supabase/server.ts must exist"
    server_content = SERVER_TS.read_text(encoding="utf-8")
    assert "export async function createSupabaseServerClient" in server_content
    assert "createServerClient" in server_content


def test_environment_variable_templates():
    """Verify frontend/.env.example and frontend/.env.local are created with required keys."""
    assert ENV_EXAMPLE.exists(), "frontend/.env.example must exist"
    env_ex = ENV_EXAMPLE.read_text(encoding="utf-8")
    assert "NEXT_PUBLIC_SUPABASE_URL" in env_ex
    assert "NEXT_PUBLIC_SUPABASE_ANON_KEY" in env_ex

    assert ENV_LOCAL.exists(), "frontend/.env.local must exist"
    env_loc = ENV_LOCAL.read_text(encoding="utf-8")
    assert "NEXT_PUBLIC_SUPABASE_URL" in env_loc
    assert "NEXT_PUBLIC_SUPABASE_ANON_KEY" in env_loc
