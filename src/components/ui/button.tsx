import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Button variant and sizing definitions for Clean Minimal Enterprise Design System (DS).
 *
 * Adheres to:
 * - Web Content Accessibility Guidelines (WCAG) 2.1 Level AA touch target compliance (>= 44px).
 * - Single-Page Application (SPA) responsive ergonomics across desktop and mobile viewports.
 * - Voice Actor Attribution: คุณพิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert).
 */
export type ButtonVariant =
  | "default"
  | "destructive"
  | "outline"
  | "secondary"
  | "ghost"
  | "link"
  | "broadcast";

export type ButtonSize = "default" | "sm" | "lg" | "icon";

export interface ButtonVariantsArgs {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

const variantStyles: Record<ButtonVariant, string> = {
  default:
    "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.98]",
  destructive:
    "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 active:scale-[0.98]",
  outline:
    "border border-border bg-background shadow-sm hover:bg-accent hover:text-accent-foreground active:scale-[0.98]",
  secondary:
    "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 active:scale-[0.98]",
  ghost:
    "hover:bg-accent hover:text-accent-foreground active:scale-[0.98]",
  link:
    "text-primary underline-offset-4 hover:underline",
  broadcast:
    "bg-broadcast-red text-white shadow-sm hover:bg-broadcast-red-hover active:scale-[0.98]",
};

const sizeStyles: Record<ButtonSize, string> = {
  default: "h-11 px-4 py-2 min-h-[44px]",
  sm: "h-9 rounded-md px-3 text-xs",
  lg: "h-12 rounded-md px-8 text-base min-h-[48px]",
  icon: "h-11 w-11 min-h-[44px] min-w-[44px]",
};

export function buttonVariants({
  variant = "default",
  size = "default",
  className,
}: ButtonVariantsArgs = {}): string {
  return cn(
    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors duration-150 select-none",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-50",
    variantStyles[variant],
    sizeStyles[size],
    className
  );
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, children, ...props }, ref) => {
    const computedClass = buttonVariants({ variant, size, className });

    if (asChild && React.isValidElement(children)) {
      const childElement = children as React.ReactElement<{
        className?: string;
        ref?: React.Ref<HTMLButtonElement>;
      }>;
      return React.cloneElement(childElement, {
        ...props,
        className: cn(computedClass, childElement.props.className),
        ref: ref || childElement.props.ref,
      });
    }

    return (
      <button
        ref={ref}
        className={computedClass}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button };
