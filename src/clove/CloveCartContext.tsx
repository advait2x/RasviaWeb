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
import { cartLineKey, defaultPickerSpiceLevel, itemSupportsSpice } from "@/clove/lib/spice";

export type CloveCartLine = {
  lineKey: string;
  id: number;
  name: string;
  price: number;
  qty: number;
  spicyLevel: number;
};

type PromoState = {
  applied: string | null;
  discount: number;
};

type CloveCartContextValue = {
  lines: CloveCartLine[];
  itemCount: number;
  subtotal: number;
  discount: number;
  total: number;
  promoApplied: string | null;
  addItem: (item: CloveMenuItem, spicyLevel?: number) => void;
  removeItem: (lineKey: string) => void;
  setQty: (lineKey: string, qty: number) => void;
  clear: () => void;
  applyPromo: (code: string) => boolean;
  removePromo: () => void;
};

const STORAGE_KEY = "clove:cart:v2";

const CloveCartContext = createContext<CloveCartContextValue | null>(null);

function readStoredLines(): CloveCartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const legacy = window.localStorage.getItem("clove:cart:v1");
      if (!legacy) return [];
      const parsed = JSON.parse(legacy);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((l) => l && typeof l.id === "number" && typeof l.qty === "number")
        .map((l) => {
          const spicyLevel = 0;
          return {
            lineKey: cartLineKey(l.id, spicyLevel),
            id: l.id,
            name: String(l.name ?? ""),
            price: Number(l.price) || 0,
            qty: l.qty,
            spicyLevel,
          };
        });
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((l) => l && typeof l.id === "number" && typeof l.qty === "number")
      .map((l) => {
        const spicyLevel = typeof l.spicyLevel === "number" ? l.spicyLevel : 0;
        return {
          lineKey: l.lineKey ?? cartLineKey(l.id, spicyLevel),
          id: l.id,
          name: String(l.name ?? ""),
          price: Number(l.price) || 0,
          qty: l.qty,
          spicyLevel,
        };
      });
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

  const addItem = useCallback((item: CloveMenuItem, spicyLevel?: number) => {
    const level = itemSupportsSpice(item)
      ? (spicyLevel ?? defaultPickerSpiceLevel(item))
      : 0;
    const key = cartLineKey(item.id, level);

    setLines((prev) => {
      const existing = prev.find((l) => l.lineKey === key);
      if (existing) {
        return prev.map((l) =>
          l.lineKey === key ? { ...l, qty: l.qty + 1 } : l,
        );
      }
      return [
        ...prev,
        {
          lineKey: key,
          id: item.id,
          name: item.name,
          price: item.price,
          qty: 1,
          spicyLevel: level,
        },
      ];
    });
  }, []);

  const removeItem = useCallback((lineKey: string) => {
    setLines((prev) => prev.filter((l) => l.lineKey !== lineKey));
  }, []);

  const setQty = useCallback((lineKey: string, qty: number) => {
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => l.lineKey !== lineKey)
        : prev.map((l) => (l.lineKey === lineKey ? { ...l, qty } : l)),
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
