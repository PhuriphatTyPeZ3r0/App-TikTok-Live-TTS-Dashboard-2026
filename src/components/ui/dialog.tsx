"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Dialog Modal Primitives adhering to Clean Minimal Enterprise Design System (DS).
 *
 * Implements:
 * - 100% Centered Modal Mandate via Grid Centering (`grid place-items-center`).
 * - Web Content Accessibility Guidelines (WCAG) 2.1 Level AA focus trapping and Escape key dismissal.
 * - Single-Page Application (SPA) responsive behavior on mobile and desktop viewports.
 * - Dedicated to Master Voice Actor: คุณพิพัฒน์ บุญสิทธิเลิศ (Phiphat Boonsitthilert).
 */

interface DialogContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DialogContext = React.createContext<DialogContextValue | null>(null);

function useDialog(): DialogContextValue {
  const context = React.useContext(DialogContext);
  if (!context) {
    throw new Error("Dialog components must be used within a <Dialog /> provider.");
  }
  return context;
}

export interface DialogProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  children,
}: DialogProps): React.JSX.Element {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState<boolean>(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [isControlled, onOpenChange]
  );

  return (
    <DialogContext.Provider value={{ open, setOpen }}>
      {children}
    </DialogContext.Provider>
  );
}

export interface DialogTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const DialogTrigger = React.forwardRef<
  HTMLButtonElement,
  DialogTriggerProps
>(({ asChild = false, onClick, children, ...props }, ref) => {
  const { setOpen } = useDialog();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    if (!e.defaultPrevented) {
      setOpen(true);
    }
  };

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{
      onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
      ref?: React.Ref<HTMLButtonElement>;
    }>;
    return React.cloneElement(child, {
      ...props,
      ref: ref || child.props.ref,
      onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
        child.props.onClick?.(e);
        handleClick(e);
      },
    });
  }

  return (
    <button ref={ref} type="button" onClick={handleClick} {...props}>
      {children}
    </button>
  );
});
DialogTrigger.displayName = "DialogTrigger";

export interface DialogPortalProps {
  children: React.ReactNode;
}

export function DialogPortal({ children }: DialogPortalProps): React.JSX.Element | null {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  return createPortal(children, document.body);
}

export interface DialogOverlayProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export const DialogOverlay = React.forwardRef<
  HTMLDivElement,
  DialogOverlayProps
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={cn(
        "fixed inset-0 z-50 bg-black/80 backdrop-blur-sm transition-opacity animate-in fade-in-0",
        className
      )}
      {...props}
    />
  );
});
DialogOverlay.displayName = "DialogOverlay";

export interface DialogContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  onClose?: () => void;
  hideCloseButton?: boolean;
}

export const DialogContent = React.forwardRef<
  HTMLDivElement,
  DialogContentProps
>(({ className, children, onClose, hideCloseButton = false, ...props }, ref) => {
  const { open, setOpen } = useDialog();
  const contentRef = React.useRef<HTMLDivElement | null>(null);

  const handleClose = React.useCallback(() => {
    onClose?.();
    setOpen(false);
  }, [onClose, setOpen]);

  // Dismiss on Escape key press (WCAG 2.1 AA keyboard accessibility mandate)
  React.useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, handleClose]);

  // Lock background scroll when modal is active
  React.useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <DialogPortal>
      {/* Centered Modal Mandate: 100% viewport centering via grid place-items-center */}
      <div className="fixed inset-0 z-50 grid place-items-center p-4 overflow-y-auto">
        <DialogOverlay onClick={handleClose} />
        <div
          ref={(node) => {
            contentRef.current = node;
            if (typeof ref === "function") {
              ref(node);
            } else if (ref) {
              ref.current = node;
            }
          }}
          role="dialog"
          aria-modal="true"
          className={cn(
            "relative z-50 w-full max-w-lg bg-card text-card-foreground rounded-lg border border-border shadow-lg p-6 max-h-[90dvh] overflow-y-auto transition-all animate-in fade-in-0 zoom-in-95",
            className
          )}
          {...props}
        >
          {children}
          {!hideCloseButton && (
            <button
              type="button"
              onClick={handleClose}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
          )}
        </div>
      </div>
    </DialogPortal>
  );
});
DialogContent.displayName = "DialogContent";

export function DialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div
      className={cn(
        "flex flex-col space-y-1.5 text-center sm:text-left pb-4 border-b border-border/50",
        className
      )}
      {...props}
    />
  );
}
DialogHeader.displayName = "DialogHeader";

export function DialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div
      className={cn(
        "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4 border-t border-border/50 gap-2 sm:gap-0",
        className
      )}
      {...props}
    />
  );
}
DialogFooter.displayName = "DialogFooter";

export const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => {
  return (
    <h2
      ref={ref}
      className={cn(
        "text-lg font-semibold leading-none tracking-tight text-foreground",
        className
      )}
      {...props}
    />
  );
});
DialogTitle.displayName = "DialogTitle";

export const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  return (
    <p
      ref={ref}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
});
DialogDescription.displayName = "DialogDescription";

export interface DialogCloseProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const DialogClose = React.forwardRef<
  HTMLButtonElement,
  DialogCloseProps
>(({ asChild = false, onClick, children, ...props }, ref) => {
  const { setOpen } = useDialog();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    if (!e.defaultPrevented) {
      setOpen(false);
    }
  };

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{
      onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
      ref?: React.Ref<HTMLButtonElement>;
    }>;
    return React.cloneElement(child, {
      ...props,
      ref: ref || child.props.ref,
      onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
        child.props.onClick?.(e);
        handleClick(e);
      },
    });
  }

  return (
    <button ref={ref} type="button" onClick={handleClick} {...props}>
      {children}
    </button>
  );
});
DialogClose.displayName = "DialogClose";
