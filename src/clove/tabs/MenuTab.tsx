import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Leaf, Loader2, Plus } from "lucide-react";
import { MenuItemNoImage } from "@/clove/components/MenuItemNoImage";
import { MenuItemDetailOverlay } from "@/clove/components/MenuItemDetailOverlay";
import {
  fetchCloveMenu,
  formatPrice,
  type CloveMenuCategory,
  type CloveMenuItem,
} from "@/clove/lib/menu";
import { useCloveCart } from "@/clove/CloveCartContext";

// Staggered grid reveal — each card fans in with a short delay
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
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState<number | null>(null);
  const [selectedItem, setSelectedItem] = useState<CloveMenuItem | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchCloveMenu()
      .then((cats) => {
        if (!active) return;
        setCategories(cats);
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

  function handleAdd(item: CloveMenuItem) {
    addItem(item);
    setJustAdded(item.id);
    window.setTimeout(() => setJustAdded((cur) => (cur === item.id ? null : cur)), 1200);
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      {/*
        The <header> below is always present in the DOM — not gated by any loading
        state — so Google sees "Our Menu" and the description in the initial HTML.
      */}
      <header className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Menu</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-foreground">Our Menu</h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Swipe through our categories and tap a dish to see its full details.
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
        <>
          {/* Category filter bar — rounded-xl harmonizes with rounded-2xl card containers */}
          <div className="sticky top-[60px] z-20 -mx-6 mt-8 border-b border-border bg-background px-6 py-3">
            <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {categories.map((cat) => {
                const isActive = cat.name === activeCategory;
                return (
                  <motion.button
                    key={cat.name}
                    type="button"
                    onClick={() => setActiveCategory(cat.name)}
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className={`whitespace-nowrap rounded-xl border-2 px-4 py-2 text-sm font-semibold transition-colors ${
                      isActive
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-primary bg-card text-primary hover:bg-secondary"
                    }`}
                  >
                    {cat.name}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Item grid — staggered reveal when category changes */}
          <motion.div
            key={activeCategory}
            variants={gridVariants}
            initial="hidden"
            animate="visible"
            className="mt-6 grid gap-4 sm:grid-cols-2"
          >
            {activeItems.map((item) => (
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
                className="flex cursor-pointer gap-4 rounded-2xl border-2 border-border bg-card p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <MenuItemNoImage className="h-24 w-24 rounded-xl border border-border" compact />
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
                      <span className="truncate">{item.name}</span>
                      {item.isVegetarian ? (
                        <Leaf size={14} className="flex-shrink-0 text-primary" />
                      ) : null}
                    </h3>
                    <span className="flex-shrink-0 text-sm font-black text-foreground">
                      {formatPrice(item.price)}
                    </span>
                  </div>
                  {item.description ? (
                    <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
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
                    className="mt-auto inline-flex w-fit items-center gap-2 self-end rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
                  >
                    <Plus size={13} />
                    {justAdded === item.id ? "Added!" : "Add to cart"}
                  </motion.button>
                </div>
              </motion.article>
            ))}
          </motion.div>
        </>
      )}

      <MenuItemDetailOverlay
        item={selectedItem}
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        onAddToCart={(item) => handleAdd(item)}
        justAdded={!!selectedItem && justAdded === selectedItem.id}
      />
    </div>
  );
}
