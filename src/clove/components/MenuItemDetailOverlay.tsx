import { useEffect, useState } from "react";
import { Leaf, Plus } from "lucide-react";
import { CloveOverlay } from "@/clove/components/CloveOverlay";
import { MenuItemNoImage } from "@/clove/components/MenuItemNoImage";
import { MenuTagChips } from "@/clove/components/MenuTagChips";
import { SpiceIndicator } from "@/clove/components/SpiceIndicator";
import { SpiceDots } from "@/clove/components/SpiceDots";
import { SpicyBadge } from "@/clove/components/SpicyBadge";
import { formatPrice, type CloveMenuItem } from "@/clove/lib/menu";
import {
  defaultPickerSpiceLevel,
  getSpiceLevelStyle,
  itemSupportsSpice,
  SPICE_LABELS,
} from "@/clove/lib/spice";
import type { MenuTagConfig } from "@/lib/menu-tags";

export function MenuItemDetailOverlay({
  item,
  open,
  menuTags,
  onClose,
  onAddToCart,
  justAdded,
}: {
  item: CloveMenuItem | null;
  open: boolean;
  menuTags: MenuTagConfig[];
  onClose: () => void;
  onAddToCart: (item: CloveMenuItem, spicyLevel?: number) => void;
  justAdded: boolean;
}) {
  const [selectedSpice, setSelectedSpice] = useState(1);
  const supportsSpice = item ? itemSupportsSpice(item) : false;

  useEffect(() => {
    if (item) setSelectedSpice(defaultPickerSpiceLevel(item));
  }, [item]);

  if (!item || !open) return null;

  return (
    <CloveOverlay open={open} onClose={onClose} maxWidthClass="max-w-lg">
      <MenuItemNoImage
        className="h-44 w-full rounded-xl border border-border"
        label="No image"
      />

      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">{item.category}</p>
        <div className="mt-1 flex items-start justify-between gap-3">
          <h2 className="flex items-center gap-2 text-2xl font-black tracking-tight text-foreground">
            {item.name}
            {item.isVegetarian ? (
              <Leaf size={18} className="flex-shrink-0 text-primary" aria-label="Vegetarian" />
            ) : null}
          </h2>
          <span className="flex-shrink-0 text-xl font-black text-foreground">
            {formatPrice(item.price)}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <SpicyBadge item={item} level={supportsSpice ? selectedSpice : undefined} />
          <MenuTagChips mealTimes={item.mealTimes} activeTags={menuTags} size="sm" />
        </div>

        {item.description ? (
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
        ) : (
          <p className="mt-4 text-sm italic text-muted-foreground">No description provided.</p>
        )}

        {supportsSpice ? (
          <div className="mt-5 rounded-xl border border-border bg-secondary/50 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-foreground">Spice level</p>
              <span className="text-xs text-muted-foreground">1 = mildest · 5 = hottest</span>
            </div>
            <div className="mt-3 flex gap-1.5">
              {[1, 2, 3, 4, 5].map((level) => {
                const active = selectedSpice === level;
                const levelStyle = getSpiceLevelStyle(level);
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setSelectedSpice(level)}
                    aria-label={`Spice level ${level}: ${SPICE_LABELS[level]}`}
                    className={`flex flex-1 flex-col items-center gap-1.5 rounded-lg border-2 px-1 py-2 transition-colors ${
                      active
                        ? ""
                        : "border-border bg-card text-foreground hover:bg-secondary"
                    }`}
                    style={
                      active
                        ? {
                            color: levelStyle.color,
                            backgroundColor: levelStyle.backgroundColor,
                            borderColor: levelStyle.borderColor,
                          }
                        : undefined
                    }
                  >
                    <span className="inline-flex items-center gap-1">
                      <SpiceDots level={level} size="sm" />
                      <span
                        className={`text-[9px] font-semibold leading-tight ${
                          active ? "" : "text-muted-foreground"
                        }`}
                        style={active ? { color: levelStyle.color } : undefined}
                      >
                        {SPICE_LABELS[level]}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex justify-center">
              <SpiceIndicator level={selectedSpice} variant="pill" size="md" />
            </div>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => onAddToCart(item, supportsSpice ? selectedSpice : undefined)}
          className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Plus size={16} />
          {justAdded ? "Added to cart!" : `Add to cart — ${formatPrice(item.price)}`}
        </button>
      </div>
    </CloveOverlay>
  );
}
