import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Building2, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { getRestaurantFallback } from "@/lib/fallbackImages";

interface Restaurant {
  id: number;
  name: string;
  image_url: string | null;
}

export default function RestaurantSwitcher() {
  const { restaurantId, setActiveRestaurantId } = useAuth();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("restaurants")
        .select("id, name, image_url")
        .order("name", { ascending: true });
      setRestaurants((data ?? []) as Restaurant[]);
      setLoading(false);
    };
    fetch();
  }, []);

  const active = restaurants.find((r) => r.id === restaurantId);

  const handleSelect = (id: number) => {
    setActiveRestaurantId(id);
    setOpen(false);
  };

  return (
    <div className="relative w-full px-2 mb-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl bg-zinc-800/70 border border-white/10 hover:border-white/20 hover:bg-zinc-800 transition-all duration-200 group"
        title="Switch Restaurant"
      >
        {/* Restaurant image or icon */}
        <div className="w-7 h-7 rounded-lg overflow-hidden flex-shrink-0 border border-white/10">
          {active ? (
            <img
              src={active.image_url || getRestaurantFallback(active.id)}
              alt={active.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = getRestaurantFallback(active.id);
              }}
            />
          ) : (
            <div className="w-full h-full bg-amber-500/10 flex items-center justify-center">
              <Building2 size={14} strokeWidth={1.5} className="text-amber-500" />
            </div>
          )}
        </div>

        {/* Name */}
        <span className="flex-1 text-left text-[11px] font-semibold text-zinc-200 truncate leading-tight">
          {loading ? "Loading…" : (active?.name ?? "Select Restaurant")}
        </span>
        <ChevronDown
          size={12}
          strokeWidth={2}
          className={`text-zinc-500 transition-transform duration-200 flex-shrink-0 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.96 }}
              transition={{ duration: 0.14 }}
              className="absolute left-2 top-full mt-1.5 w-56 rounded-xl border border-white/10 bg-zinc-900/98 backdrop-blur-xl shadow-2xl z-50 py-1.5 overflow-hidden"
            >
              {restaurants.length === 0 ? (
                <p className="text-xs text-zinc-600 px-3 py-2 italic">No restaurants found</p>
              ) : (
                restaurants.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => handleSelect(r.id)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-zinc-800/60 transition-colors text-left"
                  >
                    <div className="w-6 h-6 rounded-md overflow-hidden flex-shrink-0 border border-white/8">
                      <img
                        src={r.image_url || getRestaurantFallback(r.id)}
                        alt={r.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = getRestaurantFallback(r.id);
                        }}
                      />
                    </div>
                    <span className={`flex-1 text-xs font-medium truncate ${r.id === restaurantId ? "text-amber-400" : "text-zinc-300"}`}>
                      {r.name}
                    </span>
                    {r.id === restaurantId && (
                      <Check size={11} strokeWidth={2.5} className="text-amber-400 flex-shrink-0" />
                    )}
                  </button>
                ))
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
