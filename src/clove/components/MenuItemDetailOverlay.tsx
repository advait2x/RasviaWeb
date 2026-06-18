import { Leaf, Plus } from "lucide-react";
import { CloveOverlay } from "@/clove/components/CloveOverlay";
import { MenuItemNoImage } from "@/clove/components/MenuItemNoImage";
import { formatPrice, type CloveMenuItem } from "@/clove/lib/menu";

export function MenuItemDetailOverlay({
  item,
  open,
  onClose,
  onAddToCart,
  justAdded,
}: {
  item: CloveMenuItem | null;
  open: boolean;
  onClose: () => void;
  onAddToCart: (item: CloveMenuItem) => void;
  justAdded: boolean;
}) {
  if (!item) return null;

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

        {item.description ? (
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
        ) : (
          <p className="mt-4 text-sm italic text-muted-foreground">No description provided.</p>
        )}

        <button
          type="button"
          onClick={() => onAddToCart(item)}
          className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Plus size={16} />
          {justAdded ? "Added to cart!" : `Add to cart — ${formatPrice(item.price)}`}
        </button>
      </div>
    </CloveOverlay>
  );
}
