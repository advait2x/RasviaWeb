export type MenuTagConfig = {
  key: string;
  label: string;
  color: string;
  bg: string;
  border: string;
  enabled: boolean;
  position: number;
};

export const DEFAULT_MENU_TAGS: MenuTagConfig[] = [
  { key: "entree", label: "Entree", color: "#F97316", bg: "bg-orange-500/10", border: "border-orange-500/30", enabled: true, position: 0 },
  { key: "appetizer", label: "Appetizer", color: "#22C55E", bg: "bg-emerald-500/10", border: "border-emerald-500/30", enabled: true, position: 1 },
  { key: "main_course", label: "Main Course", color: "#818CF8", bg: "bg-indigo-500/10", border: "border-indigo-500/30", enabled: true, position: 2 },
  { key: "specials", label: "Specials", color: "#F59E0B", bg: "bg-amber-500/10", border: "border-amber-500/30", enabled: true, position: 3 },
  { key: "dessert", label: "Dessert", color: "#EC4899", bg: "bg-pink-500/10", border: "border-pink-500/30", enabled: true, position: 4 },
  { key: "beverage", label: "Beverage", color: "#38BDF8", bg: "bg-sky-500/10", border: "border-sky-500/30", enabled: true, position: 5 },
  { key: "sides", label: "Sides", color: "#94A3B8", bg: "bg-slate-500/10", border: "border-slate-500/30", enabled: true, position: 6 },
];

const WEB_BG_TO_RGBA: Record<string, string> = {
  "bg-orange-500/10": "rgba(249,115,22,0.15)",
  "bg-emerald-500/10": "rgba(34,197,94,0.15)",
  "bg-indigo-500/10": "rgba(129,140,248,0.15)",
  "bg-amber-500/10": "rgba(245,158,11,0.15)",
  "bg-pink-500/10": "rgba(236,72,153,0.15)",
  "bg-sky-500/10": "rgba(56,189,248,0.15)",
  "bg-slate-500/10": "rgba(148,163,184,0.15)",
};

const WEB_BORDER_TO_RGBA: Record<string, string> = {
  "border-orange-500/30": "rgba(249,115,22,0.45)",
  "border-emerald-500/30": "rgba(34,197,94,0.45)",
  "border-indigo-500/30": "rgba(129,140,248,0.45)",
  "border-amber-500/30": "rgba(245,158,11,0.45)",
  "border-pink-500/30": "rgba(236,72,153,0.45)",
  "border-sky-500/30": "rgba(56,189,248,0.45)",
  "border-slate-500/30": "rgba(148,163,184,0.45)",
};

function toWebRgba(value: string, map: Record<string, string>): string {
  const trimmed = String(value || "").trim();
  if (!trimmed) return trimmed;
  return map[trimmed] ?? trimmed;
}

const LEGACY_KEY_MAP: Record<string, string> = {
  breakfast: "entree",
  lunch: "main_course",
  dinner: "main_course",
  specials: "specials",
  special: "specials",
  all_day: "main_course",
  all: "main_course",
};

export function slugifyTag(value: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32);
}

export function parseRestaurantMenuTags(raw: unknown): MenuTagConfig[] {
  if (!Array.isArray(raw)) return DEFAULT_MENU_TAGS;
  const parsed = raw
    .map((entry, idx) => {
      if (!entry || typeof entry !== "object") return null;
      const o = entry as Record<string, unknown>;
      const key = slugifyTag(String(o.key ?? o.label ?? ""));
      const label = String(o.label ?? "").trim();
      if (!key || !label) return null;
      const fallback = DEFAULT_MENU_TAGS[idx % DEFAULT_MENU_TAGS.length];
      return {
        key,
        label,
        color: String(o.color ?? fallback.color),
        bg: toWebRgba(String(o.bg ?? fallback.bg), WEB_BG_TO_RGBA),
        border: toWebRgba(String(o.border ?? fallback.border), WEB_BORDER_TO_RGBA),
        enabled: o.enabled !== false,
        position: Number.isFinite(Number(o.position)) ? Number(o.position) : idx,
      } as MenuTagConfig;
    })
    .filter((v): v is MenuTagConfig => !!v)
    .sort((a, b) => a.position - b.position);

  return parsed.length > 0 ? parsed : DEFAULT_MENU_TAGS;
}

export function normalizeMenuItemTags(raw: string[] | null | undefined, tags: MenuTagConfig[]): string[] {
  const known = new Set(tags.map((t) => t.key));
  const out: string[] = [];
  const seen = new Set<string>();

  for (const value of raw ?? []) {
    const mapped = LEGACY_KEY_MAP[String(value).trim().toLowerCase()] ?? slugifyTag(String(value));
    if (!mapped || seen.has(mapped)) continue;
    if (!known.has(mapped)) continue;

    out.push(mapped);
    seen.add(mapped);
  }

  return out;
}

export function serializeMenuTags(tags: MenuTagConfig[]): MenuTagConfig[] {
  return tags.map((tag, idx) => ({ ...tag, key: slugifyTag(tag.key || tag.label), position: idx }));
}
