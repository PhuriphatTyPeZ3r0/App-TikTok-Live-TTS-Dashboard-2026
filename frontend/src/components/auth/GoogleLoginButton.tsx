"use client";

/**
 * Google Single Sign-On (SSO) Authentication Trigger Button for StreamVox Live.
 *
 * Implements Apple visionOS Liquid Glass dark aesthetic:
 * - Ultra-subtle glass borders and specular lighting highlights
 * - Clean Scalable Vector Graphics (SVG) Google identity mark
 * - Zero-emoji compliance
 * - Non-blocking asynchronous interaction with loading and disabled states
 *
 * Full Academic Terminology & Acronyms:
 * - Single Sign-On (SSO)
 * - Application Programming Interface (API)
 * - Scalable Vector Graphics (SVG)
 */

import React from "react";
import { Loader2 } from "lucide-react";

/**
 * Properties for GoogleLoginButton.
 */
export interface GoogleLoginButtonProps {
  /** Asynchronous click event handler initiating Single Sign-On (SSO) authentication. */
  onClick?: () => void | Promise<void>;
  /** Indicates whether authentication handoff is actively executing. */
  loading?: boolean;
  /** Disables user interaction. */
  disabled?: boolean;
  /** Supplementary CSS classes. */
  className?: string;
  /** Button title label (defaults to 'Continue with Google'). */
  label?: string;
}

/**
 * Clean Liquid Glass button initiating Google Single Sign-On (SSO) OpenID Connect flow.
 */
export function GoogleLoginButton({
  onClick,
  loading = false,
  disabled = false,
  className = "",
  label = "Continue with Google",
}: GoogleLoginButtonProps): React.JSX.Element {
  const isDisabled = disabled || loading;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      aria-label="Google Single Sign-On (SSO) Authentication"
      className={`relative w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium text-slate-200 bg-[#12141a]/90 hover:bg-[#181b24] active:bg-[#101217] border border-white/10 hover:border-white/20 active:scale-[0.99] transition-all duration-200 shadow-md backdrop-blur-md disabled:opacity-50 disabled:pointer-events-none select-none ${className}`}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-[#25f4ee]" />
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
      <span>{label}</span>
    </button>
  );
}

export default GoogleLoginButton;
