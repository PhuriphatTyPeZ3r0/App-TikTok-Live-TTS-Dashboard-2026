"use client";

/**
 * Role-Based Access Control (RBAC) Declarative Authorization Gate for StreamVox Live.
 *
 * Implements fine-grained access control based on user role assignments:
 * - 'admin': Full operational authorization including system telemetry audit and global parameters.
 * - 'streamer': Broadcaster access allowing custom voice tuning persistence and live queue operation.
 * - 'viewer': Read-only observer scope for Open Broadcaster Software (OBS) browser overlays.
 *
 * Provides resilient offline fallback: when Supabase credentials are not configured,
 * the component operates in permissive mode to ensure local development workflows are never blocked.
 *
 * Full Academic Terminology & Acronyms:
 * - Role-Based Access Control (RBAC)
 * - Row Level Security (RLS)
 * - Universally Unique Identifier (UUID)
 * - Single Sign-On (SSO)
 * - Application Programming Interface (API)
 */

import React from "react";
import type { UserRole } from "../../types/auth";
import { useSupabaseAuth } from "../../hooks/useSupabaseAuth";

/**
 * Properties for RoleGate declarative authorization wrapper.
 */
export interface RoleGateProps {
  /** Array of permitted Role-Based Access Control (RBAC) tiers authorized to access children. */
  allowedRoles: UserRole[];
  /** Protected User Interface (UI) tree rendered when authorization requirements are satisfied. */
  children: React.ReactNode;
  /** Optional fallback User Interface (UI) element rendered when access is denied. */
  fallback?: React.ReactNode;
  /** Optional explicit Role-Based Access Control (RBAC) role override (defaults to active auth hook role). */
  userRole?: UserRole;
  /** Optional loading placeholder element rendered during authentication revalidation. */
  loadingFallback?: React.ReactNode;
}

/**
 * Declarative component-level permission gate enforcing Role-Based Access Control (RBAC).
 */
export function RoleGate({
  allowedRoles,
  children,
  fallback = null,
  userRole,
  loadingFallback = null,
}: RoleGateProps): React.JSX.Element | null {
  const { role: authRole, loading, isConfigured } = useSupabaseAuth();

  // If initial authentication revalidation is in progress, show loading state
  if (loading) {
    return <>{loadingFallback}</>;
  }

  // Resolve effective Role-Based Access Control (RBAC) role
  const effectiveRole = userRole || authRole;

  // Explicit override check for testing and targeted sandboxing
  if (userRole && !allowedRoles.includes(effectiveRole)) {
    return <>{fallback}</>;
  }

  // Resilient Offline Fallback: If Supabase API is unconfigured, allow local access
  if (!isConfigured) {
    return <>{children}</>;
  }

  // Authorization Check
  if (allowedRoles.includes(effectiveRole)) {
    return <>{children}</>;
  }

  // Fallback when authorization check fails
  return <>{fallback}</>;
}

export default RoleGate;
