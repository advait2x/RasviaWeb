import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Gift,
  Minus,
  Plus,
  ShoppingBag,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { useCloveCart } from "@/clove/CloveCartContext";
import { useCloveAuth } from "@/clove/CloveAuthContext";
import { MenuItemNoImage } from "@/clove/components/MenuItemNoImage";
import { formatPrice } from "@/clove/lib/menu";
import { buildPromoAppliedMessage } from "@/clove/data";

export function CartDrawer({
  open,
  onClose,
  onRequestSignIn,
}: {
  open: boolean;
  onClose: () => void;
  onRequestSignIn: () => void;
}) {
  const {
    lines,
    subtotal,
    discount,
    total,
    promoApplied,
    setQty,
    removeItem,
    applyPromo,
    removePromo,
    clear,
  } = useCloveCart();
  const { session } = useCloveAuth();
  const loggedIn = !!session?.user;

  const [promoInput, setPromoInput] = useState("");
  const [promoError, setPromoError] = useState<string | null>(null);
  const [placed, setPlaced] = useState(false);

  useEffect(() => {
    if (!open) {
      setPlaced(false);
      setPromoError(null);
    }
  }, [open]);

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

  function handleApplyPromo(e: React.FormEvent) {
    e.preventDefault();
    const ok = applyPromo(promoInput);
    if (ok) {
      setPromoError(null);
      setPromoInput("");
    } else {
      setPromoError("That promo code isn't valid.");
    }
  }

  function handleCheckout() {
    if (lines.length === 0) return;
    setPlaced(true);
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex justify-end"
      style={{ backgroundColor: "rgba(15, 23, 42, 0.55)" }}
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Your cart"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <ShoppingBag size={18} className="text-primary" />
            <h2 className="text-lg font-black tracking-tight text-foreground">Your Cart</h2>
          </div>
          <div className="flex items-center gap-1">
            {lines.length > 0 && !placed ? (
              <button
                type="button"
                onClick={clear}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                Clear
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close cart"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {placed ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
            <CheckCircle2 size={56} className="text-primary" />
            <p className="text-xl font-black tracking-tight text-foreground">
              Order placed! (demo only)
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              This is a demonstration checkout — no real order was submitted and no
              payment was taken. Download the Rasvia app to place real orders and earn
              rewards.
            </p>
            <button
              type="button"
              onClick={() => {
                clear();
                setPlaced(false);
                onClose();
              }}
              className="mt-3 inline-flex h-11 items-center justify-center rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Done
            </button>
          </div>
        ) : lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
            <ShoppingBag size={48} className="text-muted-foreground" />
            <p className="text-base font-bold text-foreground">Your cart is empty</p>
            <p className="text-sm text-muted-foreground">
              Browse the menu and add a few dishes to get started.
            </p>
          </div>
        ) : (
          <>
            {/* Line items */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <ul className="flex flex-col gap-3">
                {lines.map((line) => (
                  <li
                    key={line.id}
                    className="flex gap-3 rounded-2xl border border-border bg-background p-3"
                  >
                    <MenuItemNoImage className="h-16 w-16 rounded-xl border border-border" compact />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-bold text-foreground">{line.name}</p>
                        <button
                          type="button"
                          onClick={() => removeItem(line.id)}
                          aria-label={`Remove ${line.name}`}
                          className="text-muted-foreground transition-colors hover:text-destructive"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">{formatPrice(line.price)} each</p>
                      <div className="mt-auto flex items-center justify-between pt-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setQty(line.id, line.qty - 1)}
                            aria-label="Decrease quantity"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-secondary"
                          >
                            <Minus size={13} />
                          </button>
                          <span className="w-6 text-center text-sm font-bold tabular-nums text-foreground">
                            {line.qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => setQty(line.id, line.qty + 1)}
                            aria-label="Increase quantity"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-secondary"
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                        <span className="text-sm font-black text-foreground">
                          {formatPrice(line.price * line.qty)}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Rewards (logged-in only) */}
              {loggedIn ? (
                <div className="mt-5 rounded-2xl border-2 border-primary bg-secondary p-4">
                  <div className="flex items-center gap-2">
                    <Gift size={16} className="text-primary" />
                    <p className="text-sm font-bold text-foreground">Your Rewards</p>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    You have <span className="font-bold text-primary">0</span> reward points.
                    Earn points on every order — redeem them for free dishes in the app.
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onRequestSignIn();
                  }}
                  className="mt-5 flex w-full items-center gap-2 rounded-2xl border-2 border-dashed border-border bg-background p-4 text-left transition-colors hover:border-primary"
                >
                  <Gift size={16} className="text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    <span className="font-bold text-foreground">Log in</span> to view and redeem
                    your rewards.
                  </span>
                </button>
              )}

              {/* Promo code (always visible) */}
              <div className="mt-3 rounded-2xl border-2 border-border bg-background p-4">
                <div className="flex items-center gap-2">
                  <Tag size={16} className="text-primary" />
                  <p className="text-sm font-bold text-foreground">Promo code</p>
                </div>

                {promoApplied ? (
                  <div className="mt-2 flex items-start justify-between gap-3">
                    <p className="text-xs leading-relaxed text-primary">
                      {buildPromoAppliedMessage(promoApplied)}
                    </p>
                    <button
                      type="button"
                      onClick={removePromo}
                      className="flex-shrink-0 text-xs font-semibold text-muted-foreground underline-offset-2 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyPromo} className="mt-2 flex gap-2">
                    <input
                      value={promoInput}
                      onChange={(e) => {
                        setPromoInput(e.target.value);
                        setPromoError(null);
                      }}
                      placeholder="Enter code"
                      className="h-10 flex-1 rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-primary placeholder:text-muted-foreground"
                    />
                    <button
                      type="submit"
                      className="inline-flex h-10 items-center justify-center rounded-xl bg-secondary px-4 text-sm font-bold text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                    >
                      Apply
                    </button>
                  </form>
                )}
                {promoError ? (
                  <p className="mt-2 text-xs font-medium text-destructive">{promoError}</p>
                ) : null}
              </div>
            </div>

            {/* Totals + checkout */}
            <div className="border-t border-border px-5 py-4">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{formatPrice(subtotal)}</span>
                </div>
                {discount > 0 ? (
                  <div className="flex items-center justify-between text-sm text-clove-saffron">
                    <span>Promo discount</span>
                    <span className="tabular-nums">-{formatPrice(discount)}</span>
                  </div>
                ) : null}
                <div className="mt-1 flex items-center justify-between border-t border-border pt-2">
                  <span className="text-base font-bold text-foreground">Total</span>
                  <span className="text-lg font-black tabular-nums text-foreground">
                    {formatPrice(total)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCheckout}
                className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
              >
                <ShoppingBag size={16} />
                Place order
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
