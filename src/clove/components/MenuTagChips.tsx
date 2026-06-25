import type { MenuTagConfig } from "@/lib/menu-tags";
import { DEFAULT_MENU_TAGS, normalizeMenuItemTags } from "@/lib/menu-tags";

/** Meal-type tags are redundant with menu categories on the Clove web menu. */
const HIDDEN_TAG_KEYS = new Set([
  ...DEFAULT_MENU_TAGS.map((t) => t.key),
  "breakfast",
  "lunch",
  "dinner",
  "special",
  "all_day",
  "all",
]);

export function MenuTagChips({
  mealTimes,
  activeTags,
  size = "sm",
}: {
  mealTimes: string[];
  activeTags: MenuTagConfig[];
  size?: "sm" | "md";
}) {
  const keys = normalizeMenuItemTags(mealTimes, activeTags).filter(
    (key) => !HIDDEN_TAG_KEYS.has(key),
  );
  if (keys.length === 0) return null;

  const tagMap = new Map(activeTags.map((t) => [t.key, t]));
  const seen = new Set<string>();
  const unique: MenuTagConfig[] = [];

  for (const key of keys) {
    const tag = tagMap.get(key);
    if (!tag || HIDDEN_TAG_KEYS.has(tag.key) || seen.has(tag.label)) continue;
    seen.add(tag.label);
    unique.push(tag);
  }

  if (unique.length === 0) return null;

  const pad = size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs";

  return (
    <span className="flex flex-wrap gap-1">
      {unique.map((tag) => (
        <span
          key={tag.key}
          className={`inline-flex items-center rounded-md border font-semibold ${tag.bg} ${tag.border} ${pad}`}
          style={{ color: tag.color }}
        >
          {tag.label}
        </span>
      ))}
    </span>
  );
}
