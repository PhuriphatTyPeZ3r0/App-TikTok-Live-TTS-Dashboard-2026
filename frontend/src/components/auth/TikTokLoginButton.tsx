"use client";

/**
 * TikTok Single Sign-On (SSO) Authentication Trigger Button for StreamVox Live.
 *
 * Implements Apple visionOS Liquid Glass dark aesthetic with signature TikTok chromatic styling:
 * - Subtle neon pink (#fe2c55) and cyan (#25f4ee) glow accents
 * - Clean Scalable Vector Graphics (SVG) TikTok logo mark
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
 * Properties for TikTokLoginButton.
 */
export interface TikTokLoginButtonProps {
  /** Asynchronous click event handler initiating Single Sign-On (SSO) authentication. */
  onClick?: () => void | Promise<void>;
  /** Indicates whether authentication handoff is actively executing. */
  loading?: boolean;
  /** Disables user interaction. */
  disabled?: boolean;
  /** Supplementary CSS classes. */
  className?: string;
  /** Button title label (defaults to 'Continue with TikTok'). */
  label?: string;
}

/**
 * Clean Liquid Glass button initiating TikTok Single Sign-On (SSO) OAuth flow.
 */
export function TikTokLoginButton({
  onClick,
  loading = false,
  disabled = false,
  className = "",
  label = "Continue with TikTok",
}: TikTokLoginButtonProps): React.JSX.Element {
  const isDisabled = disabled || loading;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      aria-label="TikTok Single Sign-On (SSO) Authentication"
      className={`relative w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium text-white bg-gradient-to-r from-[#12141a] to-[#181b24] hover:from-[#181b24] hover:to-[#222734] border border-[#25f4ee]/25 hover:border-[#fe2c55]/40 active:scale-[0.99] transition-all duration-200 shadow-[0_0_15px_rgba(37,244,238,0.06)] hover:shadow-[0_0_20px_rgba(254,44,85,0.15)] backdrop-blur-md disabled:opacity-50 disabled:pointer-events-none select-none ${className}`}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-[#fe2c55]" />
      ) : (
        <svg
          className="w-4 h-4 shrink-0 text-white fill-current"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.85.11V9.33a6.33 6.33 0 0 0-.85-.06A6.34 6.34 0 0 0 3.14 15.6a6.34 6.34 0 0 0 6.34 6.34 6.33 6.33 0 0 0 6.34-6.34V8.58a8.28 8.28 0 0 0 4.77 1.5V6.69h-1z" />
        </svg>
      )}
      <span>{label}</span>
    </button>
  );
}

export default TikTokLoginButton;
