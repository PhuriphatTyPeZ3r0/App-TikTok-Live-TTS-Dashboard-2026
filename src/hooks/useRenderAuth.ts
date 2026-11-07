/**
 * React Hook for Render Backend Native Open Authorization (OAuth) 2.0 & Role-Based Access Control (RBAC).
 *
 * Implements full client lifecycle for Render Fast Application Programming Interface (FastAPI):
 * 1. Token extraction from Uniform Resource Locator (URL) query parameters (?token=...) following OAuth callback.
 * 2. Secure browser LocalStorage persistence (streamvox_token) and seamless URL query sanitization.
 * 3. Identity verification and claims extraction via Representational State Transfer (REST) GET /api/auth/me.
 * 4. Superadministrator privilege detection (Role-Based Access Control (RBAC) 'admin' or phuriphathem@gmail.com).
 * 5. Google OAuth 2.0 redirection dispatch and session termination (POST /api/auth/logout).
 * 6. Local development mock authentication fallback for unblocked offline testing.
 *
 * Full Academic Terminology & Acronyms:
 * - Role-Based Access Control (RBAC)
 * - Open Authorization (OAuth)
 * - JSON Web Token (JWT)
 * - Application Programming Interface (API)
 * - Representational State Transfer (REST)
 * - Single-Page Application (SPA)
 * - Uniform Resource Locator (URL)
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { RenderUser, RenderAuthState } from '../types/auth';

/** Key identifier for browser LocalStorage access token persistence. */
const STORAGE_KEY = 'streamvox_token';

/** Default Render backend production Uniform Resource Locator (URL). */
const DEFAULT_API_BASE_URL = 'https://tiktok-live-tts-bot.onrender.com';

/** Designated system Superadministrator Electronic Mail (Email) address. */
const SUPERADMIN_EMAIL = 'phuriphathem@gmail.com';

/**
 * Custom React hook managing Render-native OAuth authentication lifecycle.
 *
 * @returns {RenderAuthState} Active authentication state, identity claims, and workflow triggers.
 */
export function useRenderAuth(): RenderAuthState {
  const [user, setUser] = useState<RenderUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<'admin' | 'streamer' | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize and verify authentication state on mount
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      setIsLoading(true);
      setError(null);

      try {
        let activeToken: string | null = null;

        if (typeof window !== 'undefined') {
          // 1. Detect token in URL query parameter (?token=...) from OAuth redirect
          const searchParams = new URLSearchParams(window.location.search);
          const urlToken = searchParams.get('token');

          if (urlToken) {
            activeToken = urlToken;
            try {
              localStorage.setItem(STORAGE_KEY, urlToken);
            } catch (storageErr) {
              console.warn('[useRenderAuth] LocalStorage write restricted:', storageErr);
            }

            // Clean query parameter from address bar without page reload for credential isolation
            const cleanUrl = new URL(window.location.href);
            cleanUrl.searchParams.delete('token');
            window.history.replaceState({}, document.title, cleanUrl.toString());
          } else {
            // 2. Read persistent token from LocalStorage
            try {
              activeToken = localStorage.getItem(STORAGE_KEY);
            } catch (storageErr) {
              console.warn('[useRenderAuth] LocalStorage read restricted:', storageErr);
            }
          }
        }

        if (!activeToken) {
          if (isMounted) {
            setToken(null);
            setUser(null);
            setRole(null);
            setIsAdmin(false);
            setIsLoading(false);
          }
          return;
        }

        if (isMounted) {
          setToken(activeToken);
        }

        // Mock token fallback for local offline simulation
        if (activeToken.startsWith('mock-render-jwt-')) {
          const isMockAdmin = activeToken.includes('admin');
          const mockUser: RenderUser = {
            id: 'mock-usr-local-id',
            email: isMockAdmin ? SUPERADMIN_EMAIL : 'streamer@streamvox.live',
            name: isMockAdmin ? 'System Administrator (Mock)' : 'Demo Streamer (Mock)',
            role: isMockAdmin ? 'admin' : 'streamer',
            created_at: new Date().toISOString(),
          };
          if (isMounted) {
            setUser(mockUser);
            setRole(isMockAdmin ? 'admin' : 'streamer');
            setIsAdmin(isMockAdmin);
            setError(null);
            setIsLoading(false);
          }
          return;
        }

        // 3. Request user profile verification from Render FastAPI backend
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_BASE_URL;
        const response = await fetch(`${baseUrl}/api/auth/me`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${activeToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Authentication verification failed with status HTTP ${response.status}`);
        }

        const data = await response.json();
        const resolvedUser: RenderUser = data && data.user ? data.user : data;

        if (resolvedUser && resolvedUser.id) {
          const effectiveRole: 'admin' | 'streamer' =
            resolvedUser.role === 'admin' ||
            resolvedUser.email?.trim().toLowerCase() === SUPERADMIN_EMAIL
              ? 'admin'
              : 'streamer';

          const adminFlag =
            effectiveRole === 'admin' ||
            resolvedUser.email?.trim().toLowerCase() === SUPERADMIN_EMAIL;

          if (isMounted) {
            setUser(resolvedUser);
            setRole(effectiveRole);
            setIsAdmin(adminFlag);
            setError(null);
          }
        } else {
          throw new Error('Malformed user payload received from verification endpoint');
        }
      } catch (err: any) {
        console.warn('[useRenderAuth] Verification failure:', err?.message || err);
        if (isMounted) {
          setError(err?.message || 'Authentication error');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    const handleSync = () => {
      initializeAuth();
    };

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('streamvox-auth-sync', handleSync);
      window.addEventListener('storage', handleSync);
    }

    return () => {
      isMounted = false;
      if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
        window.removeEventListener('streamvox-auth-sync', handleSync);
        window.removeEventListener('storage', handleSync);
      }
    };
  }, []);

  /**
   * Dispatches browser navigation to initiate Google OAuth 2.0 authentication flow.
   */
  const loginWithGoogle = useCallback(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_BASE_URL;
    if (typeof window !== 'undefined') {
      window.location.href = `${baseUrl}/api/auth/google/login`;
    }
  }, []);

  /**
   * Terminates active session, purges cached tokens, and notifies backend endpoint.
   */
  const logout = useCallback(async () => {
    const currentToken = token;

    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (storageErr) {
        console.warn('[useRenderAuth] Failed to purge token from LocalStorage:', storageErr);
      }
      if (typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('streamvox-auth-sync'));
      }
    }

    // Reset local state immediately for optimal User Interface (UI) responsiveness
    setUser(null);
    setToken(null);
    setRole(null);
    setIsAdmin(false);
    setError(null);
    setIsLoading(false);

    // Dispatch non-blocking session termination request to backend
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_BASE_URL;
      await fetch(`${baseUrl}/api/auth/logout`, {
        method: 'POST',
        headers: currentToken
          ? {
              Authorization: `Bearer ${currentToken}`,
              'Content-Type': 'application/json',
            }
          : {
              'Content-Type': 'application/json',
            },
      });
    } catch (err) {
      console.warn('[useRenderAuth] Remote session logout request error:', err);
    }
  }, [token]);

  /**
   * Simulates authenticated user session for local offline development and automated testing.
   *
   * @param {'admin' | 'streamer'} mockRole Target Role-Based Access Control (RBAC) role tier.
   */
  const mockLogin = useCallback((mockRole: 'admin' | 'streamer' = 'admin') => {
    const email = mockRole === 'admin' ? SUPERADMIN_EMAIL : 'streamer@streamvox.live';
    const name = mockRole === 'admin' ? 'System Administrator (Mock)' : 'Demo Streamer (Mock)';
    const mockJwt = `mock-render-jwt-${mockRole}-${Date.now()}`;

    const mockUser: RenderUser = {
      id: `mock-usr-${mockRole}-${Date.now().toString(36)}`,
      email,
      name,
      role: mockRole,
      created_at: new Date().toISOString(),
    };

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, mockJwt);
      } catch (storageErr) {
        console.warn('[useRenderAuth] LocalStorage mock write restricted:', storageErr);
      }
      if (typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('streamvox-auth-sync'));
      }
    }

    setToken(mockJwt);
    setUser(mockUser);
    setRole(mockRole);
    setIsAdmin(mockRole === 'admin' || email === SUPERADMIN_EMAIL);
    setError(null);
    setIsLoading(false);

    // Asynchronously notify backend mock login endpoint if available in local development
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_BASE_URL;
    fetch(`${baseUrl}/api/auth/mock-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, role: mockRole }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.token && data.user) {
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(STORAGE_KEY, data.token);
            } catch {
              // Ignore LocalStorage exceptions
            }
          }
          setToken(data.token);
          setUser(data.user);
          setRole(data.user.role);
          setIsAdmin(data.user.role === 'admin' || data.user.email === SUPERADMIN_EMAIL);
          if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
            window.dispatchEvent(new CustomEvent('streamvox-auth-sync'));
          }
        }
      })
      .catch(() => {
        // Dev offline fallback state already established
      });
  }, []);

  return {
    user,
    token,
    role,
    isAdmin,
    isLoading,
    error,
    loginWithGoogle,
    logout,
    mockLogin,
  };
}

export default useRenderAuth;
