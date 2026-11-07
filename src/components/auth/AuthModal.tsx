"use client";

/**
 * Liquid Glass Authentication Dialog Modal for StreamVox Live.
 *
 * Implements Apple visionOS dark design aesthetic:
 * - Tabbed navigation for Account Authentication (Sign In) and Registration (Sign Up)
 * - Single Sign-On (SSO) OAuth triggers for Google and TikTok
 * - Secure Electronic Mail (Email) and password authentication flows
 * - Resilient offline mode status banner when Supabase credentials are not configured
 * - Strict zero-emoji compliance across all visual indicators and error banners
 *
 * Full Academic Terminology & Acronyms:
 * - Role-Based Access Control (RBAC)
 * - Row Level Security (RLS)
 * - Universally Unique Identifier (UUID)
 * - Single Sign-On (SSO)
 * - Application Programming Interface (API)
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { X, AlertCircle, CheckCircle2, Loader2, Lock, Mail, User } from "lucide-react";
import { useSupabaseAuth } from "../../hooks/useSupabaseAuth";
import type { UserRole } from "../../types/auth";
import { GoogleLoginButton } from "./GoogleLoginButton";
import { TikTokLoginButton } from "./TikTokLoginButton";

/**
 * Properties for AuthModal dialog.
 */
export interface AuthModalProps {
  /** Controls visibility of the authentication dialog overlay. */
  isOpen: boolean;
  /** Callback invoked when the modal dialog is dismissed. */
  onClose: () => void;
  /** Initial active tab selection (defaults to 'signin'). */
  defaultTab?: "signin" | "signup";
}

/**
 * Apple visionOS Liquid Glass dark modal for user authentication and Role-Based Access Control (RBAC).
 */
export function AuthModal({
  isOpen,
  onClose,
  defaultTab = "signin",
}: AuthModalProps): React.JSX.Element | null {
  const {
    isConfigured,
    signInWithPassword,
    signUp,
    signInWithGoogle,
    signInWithTikTok,
  } = useSupabaseAuth();

  const [activeTab, setActiveTab] = useState<"signin" | "signup">(defaultTab);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<UserRole>("streamer");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "tiktok" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setSuccessMessage(null);
      setSubmitting(false);
      setOauthLoading(null);
    }
  }, [isOpen]);

  // Sync tab state when defaultTab changes
  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  // Clear messages and input errors when switching tabs
  const handleTabChange = (tab: "signin" | "signup") => {
    setActiveTab(tab);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  // Close modal on Escape key press
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Handle standard Email/Password submission
  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setErrorMessage(null);
      setSuccessMessage(null);

      if (!email.trim() || !password) {
        setErrorMessage("Please provide both email address and password.");
        return;
      }

      if (password.length < 6) {
        setErrorMessage("Password must be at least 6 characters long.");
        return;
      }

      setSubmitting(true);

      try {
        if (activeTab === "signin") {
          const { error } = await signInWithPassword({
            email: email.trim(),
            password,
          });

          if (error) {
            setErrorMessage(error.message);
          } else {
            setSuccessMessage("Authenticated successfully.");
            if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
            closeTimerRef.current = setTimeout(() => {
              onClose();
            }, 600);
          }
        } else {
          const { error } = await signUp(
            {
              email: email.trim(),
              password,
              displayName: displayName.trim() || undefined,
            },
            {
              username: displayName.trim() || undefined,
              role: selectedRole,
            }
          );

          if (error) {
            setErrorMessage(error.message);
          } else {
            setSuccessMessage(
              "Account registered successfully. If email verification is enabled, please verify your email."
            );
            if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
            closeTimerRef.current = setTimeout(() => {
              onClose();
            }, 1200);
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Authentication procedure failed.";
        setErrorMessage(msg);
      } finally {
        setSubmitting(false);
      }
    },
    [activeTab, email, password, displayName, selectedRole, signInWithPassword, signUp, onClose]
  );

  // Handle Google OAuth Single Sign-On (SSO)
  const handleGoogleLogin = async () => {
    setErrorMessage(null);
    setOauthLoading("google");
    const { error } = await signInWithGoogle();
    if (error) {
      setErrorMessage(error.message);
      setOauthLoading(null);
    }
  };

  // Handle TikTok OAuth Single Sign-On (SSO)
  const handleTikTokLogin = async () => {
    setErrorMessage(null);
    setOauthLoading("tiktok");
    const { error } = await signInWithTikTok();
    if (error) {
      setErrorMessage(error.message);
      setOauthLoading(null);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md transition-opacity overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-md my-auto bg-[#12141a]/95 border border-[#1e222d] hover:border-white/15 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] p-5 sm:p-7 backdrop-blur-2xl text-slate-100 transition-all modal-center-animate max-h-[calc(100dvh-2rem)] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1e222d]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#fe2c55] to-[#25f4ee] flex items-center justify-center text-black font-extrabold text-sm select-none shadow-md">
              <span className="material-symbols-rounded text-base select-none">
                lock
              </span>
            </div>
            <div>
              <h2 id="auth-modal-title" className="text-base font-bold tracking-tight text-white">
                StreamVox Account
              </h2>
              <p className="text-[11px] text-slate-400">
                Supabase Authentication &amp; Role-Based Access Control (RBAC)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-[#181b24] hover:bg-[#222734] border border-[#1e222d] transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Unconfigured Supabase Notice */}
        {!isConfigured && (
          <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-xs text-amber-200">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Local Offline Mode Active</span>
              Supabase environment keys are not configured. The dashboard continues operating locally with full broadcaster permissions.
            </div>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex p-1 mt-4 rounded-xl bg-[#0a0b0e] border border-[#1e222d]">
          <button
            type="button"
            onClick={() => handleTabChange("signin")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all select-none ${
              activeTab === "signin"
                ? "bg-[#181b24] text-white shadow-sm border border-white/10"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("signup")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all select-none ${
              activeTab === "signup"
                ? "bg-[#181b24] text-white shadow-sm border border-white/10"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Status and Error Alerts */}
        {errorMessage && (
          <div className="mt-4 p-3 rounded-xl bg-[#fe2c55]/15 border border-[#fe2c55]/30 flex items-start gap-2.5 text-xs text-[#fe2c55]">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mt-4 p-3 rounded-xl bg-[#00e676]/15 border border-[#00e676]/30 flex items-start gap-2.5 text-xs text-[#00e676]">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Single Sign-On (SSO) OAuth Section */}
        <div className="mt-4 space-y-2">
          <GoogleLoginButton
            onClick={handleGoogleLogin}
            loading={oauthLoading === "google"}
            disabled={!isConfigured || submitting}
            label="Continue with Google SSO"
          />
          <TikTokLoginButton
            onClick={handleTikTokLogin}
            loading={oauthLoading === "tiktok"}
            disabled={!isConfigured || submitting}
            label="Continue with TikTok SSO"
          />
        </div>

        {/* Visual Divider */}
        <div className="relative my-4 flex items-center justify-center">
          <div className="w-full border-t border-[#1e222d]" />
          <span className="absolute px-3 bg-[#12141a] text-[10px] uppercase tracking-wider text-slate-500 font-medium">
            Or continue with email
          </span>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {activeTab === "signup" && (
            <>
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Display Name or Live Handle
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. phuriphat_live"
                    className="w-full pl-9 pr-3 py-2 bg-[#0a0b0e] border border-[#1e222d] focus:border-[#25f4ee] rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Role-Based Access Control (RBAC) Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-[#0a0b0e] border border-[#1e222d] focus:border-[#25f4ee] rounded-xl text-xs text-white focus:outline-none transition-colors"
                >
                  <option value="streamer">Streamer (Broadcaster Controls &amp; Cloud Tuning)</option>
                  <option value="viewer">Viewer (Read-Only Overlay Observer)</option>
                  <option value="admin">Administrator (System Diagnostics &amp; Audit Logs)</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-[11px] font-medium text-slate-300 mb-1">
              Electronic Mail (Email)
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="streamer@streamvox.live"
                className="w-full pl-9 pr-3 py-2 bg-[#0a0b0e] border border-[#1e222d] focus:border-[#25f4ee] rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-300 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 bg-[#0a0b0e] border border-[#1e222d] focus:border-[#25f4ee] rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || oauthLoading !== null}
            className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold text-black bg-gradient-to-r from-[#fe2c55] to-[#25f4ee] hover:brightness-110 active:scale-[0.99] transition-all duration-150 flex items-center justify-center gap-2 shadow-md disabled:opacity-50 disabled:pointer-events-none mt-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span>Processing...</span>
              </>
            ) : (
              <span>{activeTab === "signin" ? "Sign In to StreamVox" : "Complete Registration"}</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AuthModal;
