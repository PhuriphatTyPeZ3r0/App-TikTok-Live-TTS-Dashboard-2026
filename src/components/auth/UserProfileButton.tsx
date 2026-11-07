"use client";

/**
 * Top Navigation User Profile Chip and Dropdown Menu for StreamVox Live.
 *
 * Implements Apple visionOS Liquid Glass dark styling:
 * - Reactive avatar with Role-Based Access Control (RBAC) role badge
 * - 3-tier role indicators: 'admin', 'streamer', 'viewer'
 * - Single Sign-On (SSO) and account management dropdown
 * - Seamless offline mode representation for unconfigured environments
 * - Zero-emoji compliance
 *
 * Full Academic Terminology & Acronyms:
 * - Role-Based Access Control (RBAC)
 * - Row Level Security (RLS)
 * - Universally Unique Identifier (UUID)
 * - Single Sign-On (SSO)
 * - Application Programming Interface (API)
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { User, LogOut, Shield, ChevronDown, CheckCircle, WifiOff } from "lucide-react";
import { useSupabaseAuth } from "../../hooks/useSupabaseAuth";
import type { UserRole } from "../../types/auth";

/**
 * Properties for UserProfileButton component.
 */
export interface UserProfileButtonProps {
  /** Callback to trigger the authentication modal overlay. */
  onOpenAuthModal?: () => void;
  /** Supplementary CSS classes. */
  className?: string;
}

const ROLE_STYLES: Record<
  UserRole,
  { label: string; bg: string; text: string; border: string; glow: string }
> = {
  admin: {
    label: "ADMIN",
    bg: "bg-[#fe2c55]/15",
    text: "text-[#fe2c55]",
    border: "border-[#fe2c55]/30",
    glow: "shadow-[0_0_10px_rgba(254,44,85,0.2)]",
  },
  streamer: {
    label: "STREAMER",
    bg: "bg-[#25f4ee]/15",
    text: "text-[#25f4ee]",
    border: "border-[#25f4ee]/30",
    glow: "shadow-[0_0_10px_rgba(37,244,238,0.2)]",
  },
  viewer: {
    label: "VIEWER",
    bg: "bg-slate-700/25",
    text: "text-slate-300",
    border: "border-slate-600/30",
    glow: "shadow-none",
  },
};

/**
 * Interactive User Profile button and dropdown for top navigation bar.
 */
export function UserProfileButton({
  onOpenAuthModal,
  className = "",
}: UserProfileButtonProps): React.JSX.Element {
  const { user, profile, role, isConfigured, signOut } = useSupabaseAuth();
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!dropdownOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [dropdownOpen]);

  const handleSignOut = useCallback(async () => {
    setDropdownOpen(false);
    await signOut();
  }, [signOut]);

  // Resolve user display moniker and initials
  const displayName =
    profile?.display_name ||
    user?.user_metadata?.display_name ||
    (user?.email ? user.email.split("@")[0] : null) ||
    (isConfigured ? "Guest" : "Local Streamer");

  const email = user?.email || (isConfigured ? "unauthenticated" : "offline@local");
  const roleStyle = ROLE_STYLES[role] || ROLE_STYLES.streamer;

  // Derives 2-letter uppercase initials for avatar representation
  const initials = displayName
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 2)
    .toUpperCase() || "SV";

  // Unauthenticated & Configured state: Show prominent Sign In trigger button
  if (isConfigured && !user) {
    return (
      <div className={`relative ${className}`}>
        <button
          type="button"
          onClick={onOpenAuthModal}
          aria-label="Sign in to StreamVox"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#181b24] hover:bg-[#222734] border border-[#1e222d] hover:border-[#25f4ee]/30 text-slate-200 hover:text-white transition-all shadow-sm active:scale-95"
        >
          <User className="w-3.5 h-3.5 text-[#25f4ee]" />
          <span>Sign In</span>
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative select-none ${className}`}>
      {/* Profile Chip Button */}
      <button
        type="button"
        onClick={() => setDropdownOpen((prev) => !prev)}
        aria-expanded={dropdownOpen}
        aria-haspopup="menu"
        aria-label={`User profile for ${displayName}`}
        className="flex items-center gap-2 px-2 sm:px-2.5 py-1 rounded-full bg-[#181b24]/90 hover:bg-[#222734] border border-[#1e222d] hover:border-white/20 transition-all shadow-sm active:scale-95"
      >
        {/* Avatar Circle with Initials or User icon */}
        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#fe2c55] to-[#25f4ee] flex items-center justify-center text-black font-extrabold text-[10px] shadow-sm shrink-0">
          {initials}
        </div>

        {/* Username Moniker (Hidden on narrow viewports) */}
        <span className="hidden sm:inline-block text-xs font-medium text-slate-200 max-w-[110px] truncate">
          {displayName}
        </span>

        {/* Role Pill Badge */}
        <span
          className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider border ${roleStyle.bg} ${roleStyle.text} ${roleStyle.border} ${roleStyle.glow}`}
        >
          {roleStyle.label}
        </span>

        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
            dropdownOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Profile Dropdown Menu */}
      {dropdownOpen && (
        <div
          role="menu"
          aria-label="User profile actions"
          className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#12141a]/95 border border-[#1e222d] hover:border-white/10 shadow-[0_15px_35px_rgba(0,0,0,0.7)] backdrop-blur-xl p-3 z-50 text-slate-200 animate-fadeIn"
        >
          {/* Identity Information Section */}
          <div className="pb-3 border-b border-[#1e222d]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#fe2c55] to-[#25f4ee] flex items-center justify-center text-black font-black text-xs shadow-md">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">
                  {displayName}
                </p>
                <p className="text-[11px] text-slate-400 truncate">{email}</p>
              </div>
            </div>

            {/* Role-Based Access Control (RBAC) Role Label */}
            <div className="mt-2.5 flex items-center justify-between text-[10px]">
              <span className="text-slate-400 flex items-center gap-1">
                <Shield className="w-3 h-3 text-[#25f4ee]" />
                RBAC Access Tier
              </span>
              <span
                className={`px-2 py-0.5 rounded-full font-bold border ${roleStyle.bg} ${roleStyle.text} ${roleStyle.border}`}
              >
                {roleStyle.label}
              </span>
            </div>

            {/* TikTok Streamer Channel Handle if Bound */}
            {profile?.tiktok_username && (
              <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
                <span>TikTok Channel</span>
                <span className="text-white font-mono">@{profile.tiktok_username}</span>
              </div>
            )}
          </div>

          {/* Infrastructure and Environment Status */}
          <div className="py-2.5 px-1 border-b border-[#1e222d] text-[10px] text-slate-400 space-y-1">
            <div className="flex items-center justify-between">
              <span>Supabase Cloud Integration</span>
              {isConfigured ? (
                <span className="flex items-center gap-1 text-[#00e676]">
                  <CheckCircle className="w-2.5 h-2.5" />
                  Active
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-400">
                  <WifiOff className="w-2.5 h-2.5" />
                  Local Offline
                </span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span>Row Level Security (RLS)</span>
              <span className="text-slate-300 font-mono">ENFORCED</span>
            </div>
          </div>

          {/* Action Links */}
          <div className="pt-2">
            {!user ? (
              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  onOpenAuthModal?.();
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-black bg-gradient-to-r from-[#fe2c55] to-[#25f4ee] hover:brightness-110 transition-all shadow-sm"
              >
                <User className="w-3.5 h-3.5 text-black" />
                <span>Sign In / Register</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-[#181b24] hover:bg-[#222734] border border-[#1e222d] hover:border-red-500/30 transition-all"
              >
                <LogOut className="w-3.5 h-3.5 text-[#fe2c55]" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default UserProfileButton;
