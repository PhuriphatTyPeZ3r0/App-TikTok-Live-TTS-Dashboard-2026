import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Badge component variants adhering to Clean Minimal Enterprise Design System (DS).
 *
 * Implements:
 * - Semantic Design Tokens mapping to HSL CSS variables.
 * - Role-Based Access Control (RBAC) administrator variant.
 * - Voice Actor Attribution: คุณพิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert) dedicated profile variant.
 * - Web Content Accessibility Guidelines (WCAG) 2.1 Level AA color contrast requirements.
 */
export type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "admin"
  | "yuta";

export interface BadgeVariantsArgs {
  variant?: BadgeVariant;
  className?: string;
}

const badgeVariantStyles: Record<BadgeVariant, string> = {
  default:
    "border-transparent bg-primary text-primary-foreground hover:bg-primary/80 shadow-sm",
  secondary:
    "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
  destructive:
    "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80 shadow-sm",
  outline:
    "border-border text-foreground hover:bg-accent hover:text-accent-foreground",
  admin:
    "border-destructive/40 bg-destructive/15 text-destructive font-bold tracking-wider uppercase shadow-xs",
  yuta:
    "border-broadcast-red/40 bg-broadcast-red/10 text-foreground font-semibold shadow-xs hover:border-broadcast-red/60",
};

export function badgeVariants({
  variant = "default",
  className,
}: BadgeVariantsArgs = {}): string {
  return cn(
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors select-none",
    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ring-offset-background",
    badgeVariantStyles[variant],
    className
  );
}

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
}

function Badge({ className, variant = "default", ...props }: BadgeProps): React.JSX.Element {
  return (
    <div className={badgeVariants({ variant, className })} {...props} />
  );
}

export { Badge };
