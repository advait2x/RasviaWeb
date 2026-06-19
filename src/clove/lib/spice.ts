import type { CloveMenuItem } from "@/clove/lib/menu";

export const SPICE_LABELS = ["", "Mild", "Medium", "Hot", "Extra Hot", "Extreme"] as const;

const NON_SPICY_CATEGORY_PATTERNS = [
  /meetha/i,
  /dessert/i,
  /naan/i,
  /bread/i,
  /pey/i,
  /beverage/i,
  /drink/i,
  /sides/i,
  /condiment/i,
];

const SPICY_CATEGORY_PATTERNS = [
  /tandoor/i,
  /murgh/i,
  /gosht/i,
  /curry/i,
  /sabzi/i,
  /indo-chinese/i,
  /chaat/i,
  /street/i,
  /samundari/i,
  /seafood/i,
  /biryani/i,
  /chawal/i,
  /shuruwaat/i,
  /appetizer/i,
];

/** Whether the item should show spice level UI and tags. */
export function itemSupportsSpice(item: CloveMenuItem): boolean {
  const cat = item.category.toLowerCase();
  if (NON_SPICY_CATEGORY_PATTERNS.some((p) => p.test(cat))) return false;
  if (item.isSpicy || item.spiceLevel > 0) return true;
  return SPICY_CATEGORY_PATTERNS.some((p) => p.test(cat));
}

/** Map DB spice_level (0–3) to customer picker default (1–5). */
export function defaultPickerSpiceLevel(item: CloveMenuItem): number {
  if (item.spiceLevel > 0) {
    const map: Record<number, number> = { 1: 2, 2: 3, 3: 5 };
    return map[item.spiceLevel] ?? Math.min(5, item.spiceLevel + 1);
  }
  if (item.isSpicy) return 3;
  return 1;
}

export function cartLineKey(id: number, spicyLevel = 0): string {
  return `${id}:${spicyLevel}`;
}

/** Menu default spice level mapped to 1–5 display scale; 0 = not spicy. */
export function getDisplaySpiceLevel(item: CloveMenuItem): number {
  if (item.spiceLevel > 0) {
    const map: Record<number, number> = { 1: 2, 2: 3, 3: 5 };
    return map[item.spiceLevel] ?? Math.min(5, item.spiceLevel + 1);
  }
  if (item.isSpicy) return 3;
  return 0;
}

export type SpiceLevelStyle = {
  color: string;
  backgroundColor: string;
  borderColor: string;
  dotColor: string;
};

const SPICE_LEVEL_STYLES: SpiceLevelStyle[] = [
  { color: "", backgroundColor: "", borderColor: "", dotColor: "" },
  {
    color: "#A16207",
    backgroundColor: "rgba(202,138,4,0.14)",
    borderColor: "rgba(202,138,4,0.35)",
    dotColor: "#CA8A04",
  },
  {
    color: "#C2410C",
    backgroundColor: "rgba(234,88,12,0.14)",
    borderColor: "rgba(234,88,12,0.35)",
    dotColor: "#EA580C",
  },
  {
    color: "#EA580C",
    backgroundColor: "rgba(249,115,22,0.14)",
    borderColor: "rgba(249,115,22,0.35)",
    dotColor: "#F97316",
  },
  {
    color: "#EF4444",
    backgroundColor: "rgba(239,68,68,0.14)",
    borderColor: "rgba(239,68,68,0.35)",
    dotColor: "#EF4444",
  },
  {
    color: "#DC2626",
    backgroundColor: "rgba(220,38,38,0.16)",
    borderColor: "rgba(220,38,38,0.4)",
    dotColor: "#DC2626",
  },
];

export function getSpiceLevelStyle(level: number): SpiceLevelStyle {
  const clamped = Math.max(1, Math.min(5, level));
  return SPICE_LEVEL_STYLES[clamped];
}
