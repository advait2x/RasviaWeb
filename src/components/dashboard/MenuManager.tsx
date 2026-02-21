import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Search, Check, X } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";

const CATEGORY_COLORS: Record<string, string> = {
  Appetizer: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Soup: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  Salad: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "Entrée": "bg-purple-500/10 text-purple-400 border-purple-500/20",
  Dessert: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  Cocktail: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
};

export default function MenuManager() {
  const { menuItems, toggleMenuItem } = useDashboard();
  const [search, setSearch] = useState("");

  const filteredItems = useMemo(() => {
    if (!search.trim()) return menuItems;
    const q = search.toLowerCase();
    return menuItems.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q)
    );
  }, [menuItems, search]);

  const eightySixed = menuItems.filter((m) => !m.inStock).length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-lg font-semibold text-zinc-100 tracking-tight">
          Menu Manager
          {eightySixed > 0 && (
            <span className="ml-2 text-sm font-medium text-red-400">
              {eightySixed} item{eightySixed > 1 ? "s" : ""} 86'd
            </span>
          )}
        </h2>
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="relative">
          <Search
            size={16}
            strokeWidth={1.5}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search menu items..."
            className="pl-10 h-11 bg-zinc-800/60 border-white/10 text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500/50 focus:ring-amber-500/20"
          />
        </div>
      </div>

      {/* Item List */}
      <ScrollArea className="flex-1">
        <div className="px-4 pb-4 space-y-2">
          {filteredItems.map((item, index) => {
            const catColor =
              CATEGORY_COLORS[item.category] ||
              "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, delay: index * 0.02 }}
                className={`flex items-center justify-between h-12 px-4 rounded-lg border transition-all duration-200 ${
                  item.inStock
                    ? "bg-zinc-800/40 border-white/5 hover:border-white/10"
                    : "bg-red-500/5 border-red-500/10"
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Status indicator */}
                  <div className="flex items-center justify-center w-5 h-5">
                    {item.inStock ? (
                      <Check size={14} strokeWidth={2} className="text-emerald-500" />
                    ) : (
                      <X size={14} strokeWidth={2} className="text-red-400" />
                    )}
                  </div>

                  {/* Item Name */}
                  <span
                    className={`text-sm font-medium ${
                      item.inStock ? "text-zinc-200" : "text-zinc-500 line-through"
                    }`}
                  >
                    {item.name}
                  </span>

                  {/* Category Tag */}
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${catColor}`}
                  >
                    {item.category}
                  </span>
                </div>

                {/* Toggle */}
                <Switch
                  checked={item.inStock}
                  onCheckedChange={() => toggleMenuItem(item.id)}
                  className={`${
                    item.inStock
                      ? "data-[state=checked]:bg-amber-500"
                      : "data-[state=unchecked]:bg-zinc-700"
                  }`}
                />
              </motion.div>
            );
          })}

          {filteredItems.length === 0 && (
            <div className="text-center py-12 text-zinc-600">
              <p className="text-sm">No items match your search</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
