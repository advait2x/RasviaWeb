import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

/**
 * Shared translucent modal shell for the Clove microsite overlays.
 * Renders a blurred backdrop + centered card. Closes on backdrop click + Esc.
 */
export function CloveOverlay({
  open,
  onClose,
  title,
  children,
  maxWidthClass = "max-w-md",
  zIndexClass = "z-[100]",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxWidthClass?: string;
  zIndexClass?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 ${zIndexClass} flex items-start justify-center overflow-y-auto px-4 py-10 sm:items-center`}
      style={{ backgroundColor: "rgba(15, 23, 42, 0.55)" }}
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`relative w-full rounded-2xl border-2 border-border bg-card p-6 shadow-2xl ${maxWidthClass}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <X size={18} />
        </button>
        {title ? (
          <h2 className="mb-5 text-2xl font-black tracking-tight text-foreground">{title}</h2>
        ) : null}
        {children}
      </div>
    </div>
  );
}
