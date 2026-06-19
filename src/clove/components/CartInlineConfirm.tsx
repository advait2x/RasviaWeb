import { useEffect, useLayoutEffect, useRef, useState } from "react";

const VIEWPORT_MARGIN = 8;
const GAP_FROM_ANCHOR = 10;

type PopoverPosition = {
  left: number;
  top: number;
  transform: string;
};

function clampToViewport(
  anchorX: number,
  anchorY: number,
  width: number,
  height: number,
): PopoverPosition {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const halfW = width / 2;

  const left = Math.max(
    VIEWPORT_MARGIN + halfW,
    Math.min(vw - VIEWPORT_MARGIN - halfW, anchorX),
  );

  const belowTop = anchorY + GAP_FROM_ANCHOR;
  const aboveTop = anchorY - GAP_FROM_ANCHOR - height;
  const maxTop = vh - VIEWPORT_MARGIN - height;

  const fitsBelow = belowTop + height <= vh - VIEWPORT_MARGIN;
  const fitsAbove = aboveTop >= VIEWPORT_MARGIN;

  let top: number;
  if (fitsBelow) {
    top = belowTop;
  } else if (fitsAbove) {
    top = aboveTop;
  } else {
    top = Math.max(VIEWPORT_MARGIN, Math.min(maxTop, belowTop));
  }

  return { left, top, transform: "translateX(-50%)" };
}

/** Compact remove popover anchored below the click position (viewport coords). */
export function CartInlineConfirm({
  itemName,
  x,
  y,
  onConfirm,
  onCancel,
}: {
  itemName: string;
  x: number;
  y: number;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<PopoverPosition>(() => ({
    left: x,
    top: y + GAP_FROM_ANCHOR,
    transform: "translateX(-50%)",
  }));

  useLayoutEffect(() => {
    const el = dialogRef.current;
    if (!el) return;

    const updatePosition = () => {
      const { width, height } = el.getBoundingClientRect();
      setPosition(clampToViewport(x, y, width, height));
    };

    updatePosition();

    const ro = new ResizeObserver(updatePosition);
    ro.observe(el);
    window.addEventListener("resize", updatePosition);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updatePosition);
    };
  }, [x, y, itemName]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const el = dialogRef.current;
      if (!el || el.contains(e.target as Node)) return;
      onCancel();
    };
    const timer = window.setTimeout(() => {
      document.addEventListener("pointerdown", onPointerDown, true);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [onCancel]);

  return (
    <div
      ref={dialogRef}
      role="alertdialog"
      aria-labelledby="cart-remove-title"
      aria-describedby="cart-remove-desc"
      className="fixed z-[110] w-[168px] max-w-[calc(100vw-16px)] rounded-lg border border-border bg-card p-2 shadow-lg"
      style={{
        left: position.left,
        top: position.top,
        transform: position.transform,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <h3 id="cart-remove-title" className="text-[11px] font-bold text-foreground">
        Remove item?
      </h3>
      <p
        id="cart-remove-desc"
        className="mt-0.5 line-clamp-2 text-[9px] leading-snug text-muted-foreground"
      >
        Remove {itemName}?
      </p>
      <div className="mt-1.5 flex gap-1">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-6 flex-1 items-center justify-center rounded-md border border-border bg-secondary text-[9px] font-bold text-foreground transition-colors hover:bg-muted"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="inline-flex h-6 flex-1 items-center justify-center rounded-md bg-destructive text-[9px] font-bold text-destructive-foreground transition-opacity hover:opacity-90"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
