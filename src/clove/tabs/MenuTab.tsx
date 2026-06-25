import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Leaf, Loader2, Plus } from "lucide-react";
import { MenuItemNoImage } from "@/clove/components/MenuItemNoImage";
import { MenuItemDetailOverlay } from "@/clove/components/MenuItemDetailOverlay";
import { MenuTagChips } from "@/clove/components/MenuTagChips";
import { SpicyBadge } from "@/clove/components/SpicyBadge";
import {
  fetchCloveMenu,
  fetchCloveMenuTags,
  formatPrice,
  type CloveMenuCategory,
  type CloveMenuItem,
} from "@/clove/lib/menu";
import { cartLineKey, defaultPickerSpiceLevel, itemSupportsSpice } from "@/clove/lib/spice";
import { useCloveCart } from "@/clove/CloveCartContext";
import type { MenuTagConfig } from "@/lib/menu-tags";

const gridVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export function MenuTab() {
  const { addItem } = useCloveCart();
  const [categories, setCategories] = useState<CloveMenuCategory[]>([]);
  const [menuTags, setMenuTags] = useState<MenuTagConfig[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [justAddedKey, setJustAddedKey] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<CloveMenuItem | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([fetchCloveMenu(), fetchCloveMenuTags()])
      .then(([cats, tags]) => {
        if (!active) return;
        setCategories(cats);
        setMenuTags(tags);
        setActiveCategory(cats[0]?.name ?? null);
        setLoading(false);
      })
      .catch((e) => {
        if (!active) return;
        setError(e?.message ?? "Could not load the menu.");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const activeItems = useMemo(
    () => categories.find((c) => c.name === activeCategory)?.items ?? [],
    [categories, activeCategory],
  );

  function handleAdd(item: CloveMenuItem, spicyLevel?: number) {
    addItem(item, spicyLevel);
    const level = itemSupportsSpice(item)
      ? (spicyLevel ?? defaultPickerSpiceLevel(item))
      : 0;
    const key = cartLineKey(item.id, level);
    setJustAddedKey(key);
    window.setTimeout(() => setJustAddedKey((cur) => (cur === key ? null : cur)), 1200);
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Menu</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-foreground">Our Menu</h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Browse categories on the left and tap a dish to customize and add to your cart.
        </p>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 size={22} className="animate-spin" />
        </div>
      ) : error ? (
        <p className="py-24 text-center text-sm font-medium text-destructive">{error}</p>
      ) : categories.length === 0 ? (
        <p className="py-24 text-center text-muted-foreground">
          Our menu is being prepared. Please check back soon.
        </p>
      ) : (
        <div className="mt-8 flex gap-4">
          {/* Left category sidebar — 20% width, all categories visible */}
          <aside className="w-[20%] min-w-[5.5rem] shrink-0">
            <nav className="sticky top-[78px] flex flex-col gap-1.5">
              {categories.map((cat) => {
                const isActive = cat.name === activeCategory;
                return (
                  <motion.button
                    key={cat.name}
                    type="button"
                    onClick={() => setActiveCategory(cat.name)}
                    whileHover={{ scale: 1.01 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className={`whitespace-normal break-words rounded-xl border-2 px-2 py-2 text-left text-[11px] font-semibold leading-snug transition-colors sm:px-3 sm:text-xs ${
                      isActive
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-foreground hover:bg-secondary"
                    }`}
                  >
                    {cat.name}
                  </motion.button>
                );
              })}
            </nav>
          </aside>

          {/* Item grid — 80% */}
          <motion.div
            key={activeCategory}
            variants={gridVariants}
            initial="hidden"
            animate="visible"
            className="min-w-0 flex-1 grid content-start items-start gap-4 sm:grid-cols-2"
          >
            {activeItems.map((item) => {
              const quickKey = cartLineKey(
                item.id,
                itemSupportsSpice(item) ? defaultPickerSpiceLevel(item) : 0,
              );

              return (
                <motion.article
                  key={item.id}
                  variants={cardVariants}
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedItem(item)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedItem(item);
                    }
                  }}
                  className="flex h-auto w-full cursor-pointer self-start gap-4 rounded-2xl border-2 border-border bg-card p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <MenuItemNoImage className="h-24 w-24 shrink-0 rounded-xl border border-border" compact />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
                        <span className="line-clamp-2">{item.name}</span>
                        {item.isVegetarian ? (
                          <Leaf size={14} className="flex-shrink-0 text-primary" />
                        ) : null}
                      </h3>
                      <span className="flex-shrink-0 text-sm font-black text-foreground">
                        {formatPrice(item.price)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <SpicyBadge item={item} />
                    </div>
                    <MenuTagChips
                      mealTimes={item.mealTimes}
                      activeTags={menuTags}
                      size="sm"
                    />
                    {item.description ? (
                      <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                        {item.description}
                      </p>
                    ) : null}
                    <motion.button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAdd(item);
                      }}
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className="mt-2 inline-flex w-fit items-center gap-2 self-end rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
                    >
                      <Plus size={13} />
                      {justAddedKey === quickKey ? "Added!" : "Add to cart"}
                    </motion.button>
                  </div>
                </motion.article>
              );
            })}
          </motion.div>
        </div>
      )}

      <MenuItemDetailOverlay
        item={selectedItem}
        open={!!selectedItem}
        menuTags={menuTags}
        onClose={() => setSelectedItem(null)}
        onAddToCart={(item, spicyLevel) => handleAdd(item, spicyLevel)}
        justAdded={
          !!selectedItem &&
          justAddedKey !== null &&
          justAddedKey.startsWith(`${selectedItem.id}:`)
        }
      />
    </div>
  );
}
