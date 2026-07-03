import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { resolveMenuQrScan } from "@/lib/menu-qr-bindings";
import { MapPin, Clock, Star, X } from "lucide-react";
import { DASH_PRIMARY_CTA } from "@/lib/dashboardUi";
import { cn } from "@/lib/utils";

type Restaurant = {
  id: number;
  name: string;
  description: string | null;
  address: string | null;
  image_url: string | null;
  rating: number | null;
  current_wait_time: number | null;
};

type RestaurantHourRow = {
  day_of_week: number;
  open_time: string;
  close_time: string;
};

export default function RestaurantSharePreview() {
  const params = new URLSearchParams(window.location.search);
  const restaurantId = Number(params.get("restaurantId") ?? "");
  const slotIndex = Math.max(0, Number(params.get("slot") ?? "0") || 0);

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menu, setMenu] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBanner, setShowBanner] = useState(true);
  const [todayHoursLabel, setTodayHoursLabel] = useState<string>("Not listed");
  const [tableLabel, setTableLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!restaurantId || Number.isNaN(restaurantId)) {
      setError("Missing restaurant id.");
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const scan = await resolveMenuQrScan(supabase, restaurantId, slotIndex);
        if (scan.mode === "table" && scan.redirect) {
          const joinPath = scan.redirect.startsWith("/") ? scan.redirect : `/${scan.redirect}`;
          window.location.replace(`${window.location.origin}${joinPath}`);
          return;
        }
        if (scan.tableLabel) setTableLabel(scan.tableLabel);

        const [
          { data: restaurantData, error: restaurantError },
          { data: menuData, error: menuError },
          { data: hoursData },
        ] = await Promise.all([
          supabase
            .from("restaurants")
            .select("id, name, description, address, image_url, rating, current_wait_time")
            .eq("id", restaurantId)
            .maybeSingle(),
          supabase
            .from("menu_items")
            .select("*")
            .eq("restaurant_id", restaurantId)
            .neq("is_available", false)
            .limit(16),
          supabase
            .from("restaurant_hours")
            .select("day_of_week, open_time, close_time")
            .eq("restaurant_id", restaurantId),
        ]);

        if (restaurantError || !restaurantData) throw new Error("Restaurant not found.");
        if (menuError) throw menuError;

        setRestaurant(restaurantData as Restaurant);
        setMenu(
          (menuData ?? []).filter(
            (row) => (row as { is_available?: boolean | null }).is_available !== false
              && ((row as { in_stock?: boolean | null }).in_stock ?? true),
          ),
        );
        const formatTime = (raw?: string | null) => {
          if (!raw) return "";
          const [h, m] = raw.split(":").map((x) => Number(x));
          if (Number.isNaN(h) || Number.isNaN(m)) return raw;
          const suffix = h >= 12 ? "PM" : "AM";
          const hour = h % 12 === 0 ? 12 : h % 12;
          return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
        };
        const weekday = new Intl.DateTimeFormat("en-US", {
          timeZone: "America/Chicago",
          weekday: "short",
        }).format(new Date());
        const weekdayToIndex: Record<string, number> = {
          Sun: 0,
          Mon: 1,
          Tue: 2,
          Wed: 3,
          Thu: 4,
          Fri: 5,
          Sat: 6,
        };
        const todayIndex = weekdayToIndex[weekday] ?? new Date().getDay();
        const todayRows = ((hoursData ?? []) as RestaurantHourRow[])
          .filter((r) => r.day_of_week === todayIndex)
          .sort((a, b) => a.open_time.localeCompare(b.open_time));

        if (todayRows.length > 0) {
          const periods = todayRows.map(
            (r) => `${formatTime(r.open_time)} - ${formatTime(r.close_time)}`,
          );
          setTodayHoursLabel(periods.join(", "));
        } else {
          setTodayHoursLabel("Not listed");
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Could not load preview.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [restaurantId, slotIndex]);

  const waitMeta = useMemo(() => {
    if (!restaurant) return { label: "--", color: "#888888" };
    const wt = restaurant.current_wait_time ?? -1;
    if (wt >= 999) return { label: "Closed", color: "#555555" };
    if (wt < 0) return { label: "No wait", color: "#888888" };
    if (wt < 15) return { label: `${wt} min`, color: "#22C55E" };
    if (wt < 45) return { label: `${wt} min`, color: "#F59E0B" };
    return { label: `${wt} min`, color: "#EF4444" };
  }, [restaurant]);

  const mapUrl = useMemo(() => {
    if (!restaurant?.address) return "";
    const query = encodeURIComponent(`${restaurant.name}, ${restaurant.address}`);
    const useAppleMaps = /iPhone|iPad|iPod|Macintosh/i.test(navigator.userAgent);
    return useAppleMaps
      ? `https://maps.apple.com/?q=${query}`
      : `https://www.google.com/maps/search/?api=1&query=${query}`;
  }, [restaurant]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-zinc-200 flex items-center justify-center">
        Loading…
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-red-300 flex items-center justify-center">
        {error ?? "Preview unavailable."}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100">
      {showBanner && (
        <div
          className={cn(
            "sticky top-0 z-50 w-full border-b border-amber-800/50 dark:border-amber-500/50",
            DASH_PRIMARY_CTA,
          )}
        >
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2">
            <div className="text-sm font-medium text-amber-50 dark:text-zinc-950">
              {tableLabel
                ? `Menu for ${tableLabel} — order in the Rasvia app for checkout.`
                : "Order within the Rasvia app for the full experience."}
            </div>
            <button
              type="button"
              onClick={() => setShowBanner(false)}
              className="text-amber-50/90 hover:text-amber-100 dark:text-zinc-950/90 dark:hover:text-zinc-900"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-5xl px-4 py-5">
        <div className="rounded-2xl overflow-hidden border border-white/10 bg-zinc-900/80">
          <img
            src={
              restaurant.image_url ||
              "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&q=80"
            }
            alt={restaurant.name}
            className="w-full h-56 object-cover"
          />
          <div className="p-5">
            <h1 className="text-3xl font-bold tracking-tight">{restaurant.name}</h1>
            {tableLabel ? (
              <p className="mt-1 text-sm text-amber-400/90">{tableLabel}</p>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-zinc-400">
              <span className="inline-flex items-center gap-1">
                <Star size={14} className="text-amber-400" />{" "}
                {Number(restaurant.rating ?? 0).toFixed(1)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock size={14} style={{ color: waitMeta.color }} />{" "}
                <span style={{ color: waitMeta.color }}>{waitMeta.label}</span>
              </span>
              {restaurant.address && mapUrl && (
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-zinc-400 hover:text-zinc-300 underline decoration-zinc-500/40"
                >
                  <MapPin size={14} className="text-purple-400" /> {restaurant.address}
                </a>
              )}
            </div>
            <div className="mt-2 text-xs text-zinc-500">
              Today&apos;s hours: <span className="text-zinc-400">{todayHoursLabel}</span>
            </div>
            {restaurant.description && (
              <p className="mt-4 text-zinc-300 text-sm leading-relaxed">{restaurant.description}</p>
            )}
          </div>
        </div>

        <div className="mt-6">
          <h2 className="text-xl font-bold mb-3">Menu Preview</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {menu.map((item) => (
              <div
                key={String(item.id)}
                className="rounded-xl border border-white/10 bg-zinc-900/80 p-3"
              >
                <div className="flex gap-3">
                  <img
                    src={
                      (item.image_url as string) ||
                      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=70"
                    }
                    alt={String(item.name)}
                    className="w-16 h-16 rounded-lg object-cover border border-white/10"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">{String(item.name)}</div>
                    <div className="text-xs text-zinc-400 mt-1 line-clamp-2">
                      {String(item.description || "No description available.")}
                    </div>
                    <div className="text-sm text-amber-400 mt-2">
                      ${Number(item.price ?? 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {menu.length === 0 && (
              <div className="text-zinc-500 text-sm">No menu items available.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
