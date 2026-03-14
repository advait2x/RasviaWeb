import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, Coffee, Sun, Moon, Star, Leaf } from "lucide-react";
import type { MenuItem, MealTime } from "@/types/dashboard";
import { Input } from "@/components/ui/input";

// ── Types ─────────────────────────────────────────────────────────────────────

type MealFilter = MealTime | "all";

interface POSMenuGridProps {
  menuItems: MenuItem[];
  onAddItem: (item: MenuItem) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

const MEAL_TABS: { value: MealFilter; label: string; icon: typeof Coffee }[] = [
  { value: "all", label: "All", icon: Search },
  { value: "breakfast", label: "Breakfast", icon: Coffee },
  { value: "lunch", label: "Lunch", icon: Sun },
  { value: "dinner", label: "Dinner", icon: Moon },
  { value: "specials", label: "Specials", icon: Star },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function POSMenuGrid({
  menuItems,
  onAddItem,
  searchQuery,
  onSearchChange,
}: POSMenuGridProps) {
  const [mealFilter, setMealFilter] = useState<MealFilter>("all");

  const filteredItems = useMemo(() => {
    let items = menuItems.filter((m) => m.price != null);
    if (mealFilter !== "all") {
      items = items.filter(
        (m) =>
          m.mealTimes.includes(mealFilter) || m.mealTimes.includes("all_day")
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q)
      );
    }
    return items.sort((a, b) => a.name.localeCompare(b.name));
  }, [menuItems, mealFilter, searchQuery]);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(price);

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Search */}
      <div className="relative shrink-0">
        <Search
          size={18}
          strokeWidth={1.5}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
        />
        <Input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search menu..."
          className="pl-9 h-11 bg-zinc-800/60 border-white/5 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-500/50 focus:ring-amber-500/20"
        />
      </div>

      {/* Meal time tabs */}
      <div className="flex gap-1.5 p-1 rounded-xl bg-zinc-800/40 border border-white/5 shrink-0 overflow-x-auto">
        {MEAL_TABS.map((tab) => {
          const isActive = mealFilter === tab.value;
          const Icon = tab.icon;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setMealFilter(tab.value)}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors
                ${isActive
                  ? "bg-amber-500/20 border border-amber-500/40 text-amber-400"
                  : "border border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/40"
                }
              `}
            >
              <Icon size={16} strokeWidth={1.5} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Menu grid */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
          {filteredItems.map((item) => {
            const price = item.price!;
            const isOutOfStock = !item.inStock;
            return (
              <motion.button
                key={item.id}
                type="button"
                disabled={isOutOfStock}
                onClick={() => !isOutOfStock && onAddItem(item)}
                whileTap={isOutOfStock ? undefined : { scale: 0.95 }}
                className={`
                  relative flex flex-col items-stretch p-4 rounded-xl border text-left
                  min-h-[100px] touch-manipulation
                  ${isOutOfStock
                    ? "opacity-50 cursor-not-allowed bg-zinc-800/20 border-white/5"
                    : "bg-zinc-800/40 border-white/5 text-zinc-100 hover:border-amber-500/30 hover:bg-zinc-800/60 active:border-amber-500/40 cursor-pointer"
                  }
                `}
              >
                {isOutOfStock && (
                  <span className="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-500/20 border border-red-500/40 text-red-400">
                    86'd
                  </span>
                )}
                {item.dietType && (
                  <span
                    className={`
                      absolute top-2 left-2 w-2 h-2 rounded-full
                      ${item.dietType === "veg" ? "bg-emerald-500" : ""}
                      ${item.dietType === "non_veg" ? "bg-red-500" : ""}
                      ${item.dietType === "halal" ? "bg-blue-500" : ""}
                    `}
                    title={item.dietType}
                  />
                )}
                <span className="font-semibold text-sm leading-tight mt-1 line-clamp-2">
                  {item.name}
                </span>
                <span className="mt-auto pt-2 text-amber-400 font-bold text-sm tabular-nums">
                  {formatPrice(price)}
                </span>
              </motion.button>
            );
          })}
        </div>
        {filteredItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
            <Leaf size={40} strokeWidth={1} className="mb-3 opacity-50" />
            <p className="text-sm font-medium">No items match your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
