"use client";

/**
 * Authentication Dialog Modal for StreamVox Live Dashboard.
 *
 * Adheres to:
 * - Clean Minimal Enterprise Design System (DS) using Semantic HSL Design Tokens.
 * - 100% Centered Modal Mandate via Grid Centering (`grid place-items-center`) within DialogContent primitive.
 * - Web Content Accessibility Guidelines (WCAG) 2.1 Level AA focus trapping and Escape key dismissal.
 * - Render Fast Application Programming Interface (FastAPI) Open Authorization (OAuth) 2.0 integration.
 * - Role-Based Access Control (RBAC) Superadministrator local simulation mode.
 * - Voice Actor Attribution: คุณพิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert) - Master Thai Voice Model.
 *
 * Full Academic Terminology & Acronyms:
 * - Single Sign-On (SSO)
 * - Open Authorization (OAuth)
 * - Role-Based Access Control (RBAC)
 * - Application Programming Interface (API)
 * - Web Content Accessibility Guidelines (WCAG)
 * - Single-Page Application (SPA)
 * - Representational State Transfer (REST)
 * - Uniform Resource Locator (URL)
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { AlertCircle, CheckCircle2, Loader2, Lock, Mail, User, ShieldCheck, KeyRound } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRenderAuth } from "@/hooks/useRenderAuth";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import type { UserRole } from "@/types/auth";
import { cn } from "@/lib/utils";

/** Base Uniform Resource Locator (URL) for backend API services. */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://tiktok-live-tts-bot.onrender.com";

/**
 * Properties for AuthModal component.
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
 * Clean Minimal Enterprise Authentication Dialog for StreamVox Live.
 */
export function AuthModal({
  isOpen,
  onClose,
  defaultTab = "signin",
}: AuthModalProps): React.JSX.Element {
  const { loginWithGoogle, mockLogin } = useRenderAuth();
  const { isConfigured, signInWithPassword, signUp } = useSupabaseAuth();

  const [activeTab, setActiveTab] = useState<"signin" | "signup">(defaultTab);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<UserRole>("streamer");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clear timers on component dismount
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  // Reset alert states upon modal invocation
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setSuccessMessage(null);
      setSubmitting(false);
      setIsGoogleLoading(false);
    }
  }, [isOpen]);

  // Synchronize active tab with initial property specification
  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  const handleTabChange = (tab: "signin" | "signup") => {
    setActiveTab(tab);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  // Google Single Sign-On (SSO) OAuth dispatcher via useRenderAuth
  const handleGoogleLogin = () => {
    setErrorMessage(null);
    setIsGoogleLoading(true);
    try {
      loginWithGoogle();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to initiate Google OAuth flow.";
      setErrorMessage(msg);
      setIsGoogleLoading(false);
    }
  };

  // Local development mock authentication for offline administrator verification
  const handleAdminMockLogin = () => {
    setErrorMessage(null);
    mockLogin("admin");
    setSuccessMessage("Authenticated as Superadministrator (phuriphathem@gmail.com).");
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      onClose();
    }, 600);
  };

  // Standard Electronic Mail (Email) and password authentication handler
  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setErrorMessage(null);
      setSuccessMessage(null);

      if (!email.trim() || !password) {
        setErrorMessage("Please provide both electronic mail address and password.");
        return;
      }

      if (password.length < 6) {
        setErrorMessage("Password must be at least 6 characters in length.");
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
              "Account registered successfully. If electronic mail verification is enabled, please verify your inbox."
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        onClose={onClose}
        className="w-full max-w-md p-6 bg-card text-card-foreground border border-border rounded-lg shadow-lg max-h-[90dvh] overflow-y-auto space-y-4"
      >
        {/* Accessible Dialog Header */}
        <DialogHeader className="text-left pb-3 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-foreground">
                StreamVox Account
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Single Sign-On (SSO) &amp; Role-Based Access Control (RBAC)
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Local Offline Supabase Notification */}
        {!isConfigured && (
          <div className="p-3 rounded-md bg-muted/60 border border-border text-xs text-muted-foreground flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-foreground block">Local Offline Mode Active</span>
              Supabase cloud credentials are unconfigured. The dashboard functions in autonomous offline broadcaster mode.
            </div>
          </div>
        )}

        {/* Tab Navigation Controls */}
        <div className="grid grid-cols-2 gap-1 p-1 rounded-md bg-muted text-muted-foreground">
          <Button
            type="button"
            variant={activeTab === "signin" ? "default" : "ghost"}
            size="sm"
            className={cn(
              "w-full text-xs font-semibold min-h-[36px]",
              activeTab === "signin"
                ? "bg-background text-foreground shadow-xs hover:bg-background"
                : "hover:bg-background/50 hover:text-foreground"
            )}
            onClick={() => handleTabChange("signin")}
          >
            Sign In
          </Button>
          <Button
            type="button"
            variant={activeTab === "signup" ? "default" : "ghost"}
            size="sm"
            className={cn(
              "w-full text-xs font-semibold min-h-[36px]",
              activeTab === "signup"
                ? "bg-background text-foreground shadow-xs hover:bg-background"
                : "hover:bg-background/50 hover:text-foreground"
            )}
            onClick={() => handleTabChange("signup")}
          >
            Create Account
          </Button>
        </div>

        {/* Error Feedback Message */}
        {errorMessage && (
          <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30 text-xs text-destructive flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success Feedback Message */}
        {successMessage && (
          <div className="p-3 rounded-md bg-primary/10 border border-primary/30 text-xs text-primary flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Single Sign-On (SSO) OAuth Triggers */}
        <div className="space-y-2">
          {/* Google OAuth Button */}
          <Button
            type="button"
            variant="outline"
            size="default"
            disabled={submitting || isGoogleLoading}
            onClick={handleGoogleLogin}
            aria-label="Continue with Google Single Sign-On (SSO)"
            className="w-full h-11 min-h-[44px] flex items-center justify-center gap-3 font-medium border-border hover:bg-accent hover:text-accent-foreground"
          >
            {isGoogleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            ) : (
              <svg
                className="w-4 h-4 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  fill="#EA4335"
                />
              </svg>
            )}
            <span>Continue with Google SSO</span>
          </Button>
        </div>

        {/* Local Development / Mock Administrator Mode */}
        <div className="p-3 rounded-md bg-muted/40 border border-border/70 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span>Local Dev / Testing Mode</span>
            </div>
            <Badge variant="admin">Admin Bypass</Badge>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Simulate Superadministrator privilege (phuriphathem@gmail.com) for instantaneous Role-Based Access Control (RBAC) diagnostics without Google credentials.
          </p>
          <Button
            type="button"
            variant="secondary"
            size="default"
            className="w-full h-11 min-h-[44px] text-xs font-semibold justify-center gap-2"
            onClick={handleAdminMockLogin}
          >
            <KeyRound className="w-4 h-4" />
            <span>Continue as Admin (phuriphathem@gmail.com)</span>
          </Button>
        </div>

        {/* Visual Boundary Divider */}
        <div className="relative my-3 flex items-center justify-center">
          <div className="w-full border-t border-border" />
          <span className="absolute px-2 bg-card text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Or continue with electronic mail
          </span>
        </div>

        {/* Electronic Mail & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {activeTab === "signup" && (
            <>
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-foreground">
                  Display Name or Live Handle
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. phuriphat_live"
                    className="w-full pl-9 pr-3 h-10 bg-background border border-input rounded-md text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-foreground">
                  Role-Based Access Control (RBAC) Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                  className="w-full px-3 h-10 bg-background border border-input rounded-md text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background transition-colors"
                >
                  <option value="streamer">Streamer (Broadcaster Controls &amp; Cloud Tuning)</option>
                  <option value="viewer">Viewer (Read-Only Overlay Observer)</option>
                  <option value="admin">Administrator (System Diagnostics &amp; Audit Logs)</option>
                </select>
              </div>
            </>
          )}

          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-foreground">
              Electronic Mail (Email)
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="streamer@streamvox.live"
                className="w-full pl-9 pr-3 h-10 bg-background border border-input rounded-md text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-foreground">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 h-10 bg-background border border-input rounded-md text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background transition-colors"
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="default"
            size="default"
            disabled={submitting || oauthLoading !== null}
            className="w-full h-11 min-h-[44px] font-semibold text-xs sm:text-sm shadow-sm mt-1"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span>Processing...</span>
              </>
            ) : (
              <span>{activeTab === "signin" ? "Sign In to StreamVox" : "Complete Registration"}</span>
            )}
          </Button>
        </form>

        {/* Compliance Footer: TikTok Login Kit & OpenID Policy */}
        <div className="pt-2 border-t border-border/40 text-center text-[10px] text-muted-foreground space-x-1">
          <span>By signing in, you agree to our</span>
          <a
            href="/terms"
            target="_blank"
            rel="noreferrer"
            className="text-foreground underline hover:text-primary transition-colors"
          >
            Terms of Service
          </a>
          <span>and</span>
          <a
            href="/privacy"
            target="_blank"
            rel="noreferrer"
            className="text-foreground underline hover:text-primary transition-colors"
          >
            Privacy Policy
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AuthModal;
