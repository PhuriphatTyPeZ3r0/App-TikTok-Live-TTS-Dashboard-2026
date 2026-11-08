"use client";

/**
 * Role-Based Access Control (RBAC) Declarative Authorization Gate for StreamVox Live.
 *
 * Implements fine-grained access control based on user role assignments:
 * - 'admin': Full operational authorization including system telemetry audit and global parameters.
 * - 'streamer': Broadcaster access allowing custom voice tuning persistence and live queue operation.
 * - 'viewer': Read-only observer scope for Open Broadcaster Software (OBS) browser overlays.
 *
 * Aligned with Render FastAPI Open Authorization (OAuth) 2.0 backend and JWT session claims.
 * Dedicated to Master Thai Voice Actor: คุณพิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert).
 *
 * Full Academic Terminology & Acronyms:
 * - Role-Based Access Control (RBAC)
 * - Row Level Security (RLS)
 * - Universally Unique Identifier (UUID)
 * - Single Sign-On (SSO)
 * - Open Authorization (OAuth)
 * - JSON Web Token (JWT)
 * - Application Programming Interface (API)
 * - User Interface (UI)
 */

import React from "react";
import type { UserRole } from "../../types/auth";
import { useRenderAuth } from "../../hooks/useRenderAuth";

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
  const { role: authRole, isLoading: loading, isAdmin } = useRenderAuth();

  // If initial authentication revalidation is in progress and no explicit userRole override is set
  if (loading && !userRole) {
    return <>{loadingFallback}</>;
  }

  // Resolve effective Role-Based Access Control (RBAC) role
  const effectiveRole = userRole || authRole || (isAdmin ? "admin" : "streamer");

  // Authorization Check
  if (allowedRoles.includes(effectiveRole as UserRole)) {
    return <>{children}</>;
  }

  // Fallback when authorization check fails
  return <>{fallback}</>;
}

export default RoleGate;
