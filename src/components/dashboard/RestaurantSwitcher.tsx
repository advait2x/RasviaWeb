import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Building2, Check, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { getRestaurantFallback } from "@/lib/fallbackImages";
import { useTheme } from "@/context/ThemeContext";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Restaurant {
  id: number;
  name: string;
  image_url: string | null;
}

export default function RestaurantSwitcher({ layout = "bar" }: { layout?: "bar" | "sidebar" }) {
  const { restaurantId, setActiveRestaurantId } = useAuth();
  const { resolvedTheme } = useTheme();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const shellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (shellRef.current && !shellRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [open]);

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return restaurants;
    return restaurants.filter((r) => r.name.toLowerCase().includes(q));
  }, [restaurants, search]);

  const handleSelect = (id: number) => {
    setActiveRestaurantId(id);
    setOpen(false);
    setSearch("");
  };

  const shell =
    layout === "bar"
      ? "relative max-w-[220px] shrink-0 px-0"
      : "relative w-full px-2 mb-4";

  return (
    <div ref={shellRef} className={shell}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => {
            if (v) setSearch("");
            return !v;
          });
        }}
        className={cn(
          "group flex w-full min-w-0 max-w-[240px] items-center gap-2 rounded-xl border px-2.5 py-2 transition-all duration-200",
          resolvedTheme === "light"
            ? "border-zinc-200/90 bg-white text-zinc-900 shadow-sm hover:border-amber-400/60 hover:bg-amber-50/80"
            : "border-white/[0.08] bg-zinc-800/50 hover:border-white/15 hover:bg-zinc-700/45",
          layout === "bar" ? "min-w-0" : "",
        )}
        title="Switch restaurant"
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
        <span
          className={cn(
            "flex-1 truncate text-left text-[11px] font-semibold leading-tight tracking-tight",
            resolvedTheme === "light" ? "text-zinc-900" : "text-zinc-200",
          )}
        >
          {loading ? "Loading…" : (active?.name ?? "Select restaurant")}
        </span>
        <ChevronDown
          size={12}
          strokeWidth={2}
          className={cn(
            "shrink-0 transition-transform duration-200",
            resolvedTheme === "light" ? "text-zinc-500" : "text-zinc-500",
            open && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.96 }}
              transition={{ duration: 0.14 }}
              className={cn(
                "absolute left-0 top-full z-[200] mt-1.5 flex max-h-80 w-[min(100vw-1.5rem,280px)] flex-col overflow-hidden rounded-xl border py-1 shadow-2xl",
                resolvedTheme === "light"
                  ? "border-zinc-200 bg-white shadow-xl ring-1 ring-zinc-950/8"
                  : "border-white/[0.08] bg-zinc-950/98 backdrop-blur-xl",
              )}
            >
              <div
                className={cn(
                  "shrink-0 border-b px-2 py-1.5",
                  resolvedTheme === "light" ? "border-zinc-200 bg-zinc-50" : "border-white/10 bg-zinc-950/50",
                )}
              >
                <div className="relative">
                  <Search
                    className={cn("pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2", resolvedTheme === "light" ? "text-zinc-400" : "text-zinc-500")}
                    strokeWidth={2}
                  />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search restaurants…"
                    className={cn(
                      "h-8 border pl-8 text-xs",
                      resolvedTheme === "light"
                        ? "border-zinc-200 bg-zinc-50 text-zinc-900 placeholder:text-zinc-400"
                        : "border-white/10 bg-zinc-950/80 text-zinc-100 placeholder:text-zinc-500",
                    )}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto py-0.5">
                {restaurants.length === 0 ? (
                  <p
                    className={cn("px-3 py-2 text-[11px] font-medium tracking-tight", resolvedTheme === "light" ? "text-zinc-500" : "text-zinc-500")}
                  >
                    No restaurants found
                  </p>
                ) : filtered.length === 0 ? (
                  <p
                    className={cn("px-3 py-2 text-[11px] font-medium tracking-tight", resolvedTheme === "light" ? "text-zinc-500" : "text-zinc-500")}
                  >
                    No matches
                  </p>
                ) : (
                  filtered.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => handleSelect(r.id)}
                      className={cn(
                        "flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors",
                        resolvedTheme === "light" ? "hover:bg-zinc-100" : "hover:bg-zinc-800/60",
                      )}
                    >
                      <div
                        className={cn("h-6 w-6 shrink-0 overflow-hidden rounded-md border", resolvedTheme === "light" ? "border-zinc-200" : "border-white/8")}
                      >
                        <img
                          src={r.image_url || getRestaurantFallback(r.id)}
                          alt={r.name}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = getRestaurantFallback(r.id);
                          }}
                        />
                      </div>
                      <span
                        className={cn(
                          "flex-1 truncate text-[11px] tracking-tight",
                          r.id === restaurantId
                            ? "font-semibold text-amber-500 dark:text-amber-400"
                            : resolvedTheme === "light"
                              ? "font-medium text-zinc-800"
                              : "font-medium text-zinc-300",
                        )}
                      >
                        {r.name}
                      </span>
                      {r.id === restaurantId && <Check size={11} strokeWidth={2.5} className="shrink-0 text-amber-500 dark:text-amber-400" />}
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
