import {
  getDisplaySpiceLevel,
  getSpiceLevelStyle,
  itemSupportsSpice,
  SPICE_LABELS,
} from "@/clove/lib/spice";
import { SpiceDots } from "@/clove/components/SpiceDots";
import type { CloveMenuItem } from "@/clove/lib/menu";

export function SpicyBadge({
  item,
  level,
}: {
  item: CloveMenuItem;
  /** Override display level (e.g. picker selection in detail view). */
  level?: number;
}) {
  if (!itemSupportsSpice(item)) return null;

  const displayLevel = level ?? getDisplaySpiceLevel(item);
  if (displayLevel <= 0) return null;

  const style = getSpiceLevelStyle(displayLevel);

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
      style={{
        color: style.color,
        backgroundColor: style.backgroundColor,
        borderColor: style.borderColor,
      }}
    >
      <SpiceDots level={displayLevel} size="sm" />
      {SPICE_LABELS[displayLevel]}
    </span>
  );
}
