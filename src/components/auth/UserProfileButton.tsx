"use client";

/**
 * Top Navigation User Profile Chip and Dropdown Menu for StreamVox Live.
 *
 * Implements Clean Minimal Enterprise Design System (DS) & Role-Based Access Control (RBAC):
 * - Reactive avatar with Role-Based Access Control (RBAC) role badge
 * - 2-tier role indicators: 'admin' (Superadministrator) and 'streamer' (Broadcaster)
 * - Single Sign-On (SSO) and account management dropdown card
 * - Touch targets >= 44x44px adhering to Web Content Accessibility Guidelines (WCAG) 2.1 AA
 * - Semantic Design Tokens mapping to HSL Cascading Style Sheets (CSS) variables (Zero Hardcoded Colors)
 * - Zero-emoji compliance across all visual indicators
 *
 * Full Academic Terminology & Acronyms:
 * - Role-Based Access Control (RBAC)
 * - Web Content Accessibility Guidelines (WCAG)
 * - Single-Page Application (SPA)
 * - Single Sign-On (SSO)
 * - Open Authorization (OAuth)
 * - Application Programming Interface (API)
 * - User Interface (UI)
 * - User Experience (UX)
 * - Design System (DS)
 *
 * Master Voice Actor Attribution:
 * - Dedicated to Master Voice Actor: คุณพิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert).
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { User, LogOut, Shield, ChevronDown } from "lucide-react";
import { useRenderAuth } from "@/hooks/useRenderAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Properties for UserProfileButton component.
 */
export interface UserProfileButtonProps {
  /** Callback to trigger the authentication modal overlay dialog. */
  onOpenAuthModal?: () => void;
  /** Supplementary Cascading Style Sheets (CSS) class names. */
  className?: string;
}

/**
 * Interactive User Profile button and dropdown for top navigation bar.
 */
export function UserProfileButton({
  onOpenAuthModal,
  className,
}: UserProfileButtonProps): React.JSX.Element {
  const { user, role, isAdmin, isLoading, loginWithGoogle, logout } = useRenderAuth();
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown menu when clicking outside or pressing Escape key
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
    await logout();
  }, [logout]);

  // Loading skeleton state according to Tri-State Asynchronous Pattern (WCAG 2.1 AA)
  if (isLoading) {
    return (
      <div
        className={cn(
          "flex items-center justify-center h-11 min-h-[44px] min-w-[44px] px-3.5 rounded-full border border-border bg-card animate-pulse gap-2 select-none",
          className
        )}
        aria-label="Loading user profile"
      >
        <div className="w-6 h-6 rounded-full bg-muted" />
        <div className="w-16 h-3.5 bg-muted rounded" />
      </div>
    );
  }

  // Unauthenticated State: Display prominent Sign In button with touch target >= 44px
  if (!user) {
    return (
      <div className={cn("relative select-none", className)}>
        <Button
          type="button"
          variant="broadcast"
          size="default"
          onClick={() => {
            if (onOpenAuthModal) {
              onOpenAuthModal();
            } else {
              loginWithGoogle();
            }
          }}
          aria-label="Sign In to StreamVox Live"
          className="h-11 min-h-[44px] min-w-[44px] px-4 gap-2 font-semibold shadow-xs flex items-center justify-center"
        >
          <User className="w-4 h-4" />
          <span>Sign In</span>
        </Button>
      </div>
    );
  }

  // Superadministrator privilege detection: isAdmin flag or designated email
  const isSuperAdmin =
    isAdmin ||
    role === "admin" ||
    user.role === "admin" ||
    user.email?.trim().toLowerCase() === "phuriphathem@gmail.com";

  // Resolve user display moniker and initials
  const displayName =
    user.name ||
    (user.email ? user.email.split("@")[0] : null) ||
    "Streamer";

  const email = user.email || "streamer@streamvox.live";

  const initials =
    displayName
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 2)
      .toUpperCase() || "SV";

  return (
    <div ref={containerRef} className={cn("relative select-none", className)}>
      {/* Profile Chip Button (Touch target >= 44x44px) */}
      <button
        type="button"
        onClick={() => setDropdownOpen((prev) => !prev)}
        aria-expanded={dropdownOpen}
        aria-haspopup="menu"
        aria-label={`User profile for ${displayName}`}
        className="flex items-center justify-center gap-2.5 h-11 min-h-[44px] min-w-[44px] px-3 rounded-full bg-card hover:bg-accent text-card-foreground hover:text-accent-foreground border border-border transition-colors shadow-xs active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
      >
        {/* Avatar Circle with Initials or User Photo */}
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={displayName}
            className="w-7 h-7 rounded-full object-cover border border-border shrink-0"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shadow-xs shrink-0 select-none">
            {initials}
          </div>
        )}

        {/* Username Moniker (Hidden on narrow viewports) */}
        <span className="hidden sm:inline-block text-xs font-medium text-foreground max-w-[120px] truncate">
          {displayName}
        </span>

        {/* Role-Based Access Control (RBAC) Status Badge */}
        {isSuperAdmin ? (
          <Badge variant="admin">ADMIN</Badge>
        ) : (
          <Badge variant="secondary">STREAMER</Badge>
        )}

        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 text-muted-foreground transition-transform duration-200",
            dropdownOpen && "rotate-180"
          )}
        />
      </button>

      {/* Profile Dropdown Menu Card */}
      {dropdownOpen && (
        <Card
          role="menu"
          aria-label="User profile actions"
          className="absolute right-0 mt-2 w-72 rounded-xl bg-popover text-popover-foreground border border-border shadow-xl backdrop-blur-md p-4 z-50 animate-in fade-in-0 zoom-in-95"
        >
          {/* Identity Information Section */}
          <div className="pb-3 border-b border-border">
            <div className="flex items-center gap-3">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={displayName}
                  className="w-9 h-9 rounded-full object-cover border border-border shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-black text-sm shadow-xs shrink-0 select-none">
                  {initials}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {displayName}
                </p>
                <p className="text-xs text-muted-foreground truncate">{email}</p>
              </div>
            </div>

            {/* Role-Based Access Control (RBAC) Tier Indicator */}
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                <Shield className="w-3.5 h-3.5 text-primary" />
                RBAC Access Tier
              </span>
              {isSuperAdmin ? (
                <Badge variant="admin">ADMIN</Badge>
              ) : (
                <Badge variant="secondary">STREAMER</Badge>
              )}
            </div>
          </div>

          {/* Master Voice Actor Attribution Section */}
          <div className="py-2.5 border-b border-border text-[11px] text-muted-foreground space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-medium text-foreground">เสียงพากย์หลัก:</span>
              <span className="text-right">คุณพิพัฒน์ บุญสิทธิเลิศ</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span>Master Voice:</span>
              <span className="text-right font-mono text-muted-foreground">Phiphat Boonsitthilert</span>
            </div>
          </div>

          {/* Session Termination / Logout Action Button */}
          <div className="pt-3">
            <Button
              type="button"
              variant="outline"
              size="default"
              onClick={handleSignOut}
              className="w-full h-11 min-h-[44px] min-w-[44px] flex items-center justify-center gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive active:scale-[0.98] transition-colors"
              aria-label="Log Out from StreamVox Live"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

export default UserProfileButton;
