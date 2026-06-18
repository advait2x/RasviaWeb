import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CLOVE_PROMO } from "@/clove/data";
import type { CloveMenuItem } from "@/clove/lib/menu";

export type CloveCartLine = {
  id: number;
  name: string;
  price: number;
  qty: number;
};

type PromoState = {
  /** The applied promo code (already normalized), or null. */
  applied: string | null;
  /** Discount in dollars from the applied promo. */
  discount: number;
};

type CloveCartContextValue = {
  lines: CloveCartLine[];
  itemCount: number;
  subtotal: number;
  discount: number;
  total: number;
  promoApplied: string | null;
  addItem: (item: CloveMenuItem) => void;
  removeItem: (id: number) => void;
  setQty: (id: number, qty: number) => void;
  clear: () => void;
  /** Returns true if the code was valid and applied. */
  applyPromo: (code: string) => boolean;
  removePromo: () => void;
};

const STORAGE_KEY = "clove:cart:v1";

const CloveCartContext = createContext<CloveCartContextValue | null>(null);

function readStoredLines(): CloveCartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (l) => l && typeof l.id === "number" && typeof l.qty === "number",
    );
  } catch {
    return [];
  }
}

export function CloveCartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CloveCartLine[]>(readStoredLines);
  const [promo, setPromo] = useState<PromoState>({ applied: null, discount: 0 });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* ignore quota / privacy errors */
    }
  }, [lines]);

  const addItem = useCallback((item: CloveMenuItem) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.id === item.id);
      if (existing) {
        return prev.map((l) =>
          l.id === item.id ? { ...l, qty: l.qty + 1 } : l,
        );
      }
      return [
        ...prev,
        {
          id: item.id,
          name: item.name,
          price: item.price,
          qty: 1,
        },
      ];
    });
  }, []);

  const removeItem = useCallback((id: number) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const setQty = useCallback((id: number, qty: number) => {
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => l.id !== id)
        : prev.map((l) => (l.id === id ? { ...l, qty } : l)),
    );
  }, []);

  const clear = useCallback(() => {
    setLines([]);
    setPromo({ applied: null, discount: 0 });
  }, []);

  const applyPromo = useCallback((code: string): boolean => {
    const normalized = code.trim().toLowerCase();
    if (normalized === CLOVE_PROMO.code) {
      setPromo({ applied: CLOVE_PROMO.code, discount: CLOVE_PROMO.discountCents / 100 });
      return true;
    }
    return false;
  }, []);

  const removePromo = useCallback(() => {
    setPromo({ applied: null, discount: 0 });
  }, []);

  const subtotal = useMemo(
    () => lines.reduce((sum, l) => sum + l.price * l.qty, 0),
    [lines],
  );

  const itemCount = useMemo(
    () => lines.reduce((sum, l) => sum + l.qty, 0),
    [lines],
  );

  // Cap discount at the subtotal so the total never goes negative.
  const effectiveDiscount = promo.applied ? Math.min(promo.discount, subtotal) : 0;
  const total = Math.max(0, subtotal - effectiveDiscount);

  const value = useMemo<CloveCartContextValue>(
    () => ({
      lines,
      itemCount,
      subtotal,
      discount: effectiveDiscount,
      total,
      promoApplied: promo.applied,
      addItem,
      removeItem,
      setQty,
      clear,
      applyPromo,
      removePromo,
    }),
    [
      lines,
      itemCount,
      subtotal,
      effectiveDiscount,
      total,
      promo.applied,
      addItem,
      removeItem,
      setQty,
      clear,
      applyPromo,
      removePromo,
    ],
  );

  return <CloveCartContext.Provider value={value}>{children}</CloveCartContext.Provider>;
}

export function useCloveCart(): CloveCartContextValue {
  const ctx = useContext(CloveCartContext);
  if (!ctx) throw new Error("useCloveCart must be used within CloveCartProvider");
  return ctx;
}
