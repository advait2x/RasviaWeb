import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { Switch } from "@/components/ui/switch";
import { WaitTimeWidget } from "@/components/WaitTimeWidget";
import DebugPanel from "./DebugPanel";



/** Returns true if the current local time falls within open_time..close_time for today. */
function checkIsOpenNow(openTime: string, closeTime: string): boolean {
  const now = new Date();
  const [oh, om] = openTime.split(":").map(Number);
  const [ch, cm] = closeTime.split(":").map(Number);
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const openMins = oh * 60 + om;
  const closeMins = ch * 60 + cm;
  // Handle overnight spans (e.g. 22:00 – 02:00)
  if (closeMins < openMins) {
    return nowMins >= openMins || nowMins < closeMins;
  }
  return nowMins >= openMins && nowMins < closeMins;
}

export default function StatusBar() {
  const { waitlistOpen, setWaitlistOpen, waitlist, tables } = useDashboard();
  const { restaurantId, isAdmin, session } = useAuth();

  const waitingCount = waitlist.filter((w) => w.status === "waiting").length;
  const occupiedCount = tables.filter((t) => t.status === "occupied").length;
  const totalTables = tables.length;

  // Whether the restaurant is currently open per its operating hours
  const [restaurantOpen, setRestaurantOpen] = useState<boolean | null>(null);

  // Fetch operating hours for today and determine open/closed
  useEffect(() => {
    if (!restaurantId) return;
    const todayIndex = new Date().getDay(); // 0=Sun … 6=Sat
    const fetch = async () => {
      const { data } = await supabase
        .from("restaurant_hours")
        .select("open_time, close_time")
        .eq("restaurant_id", restaurantId)
        .eq("day_of_week", todayIndex)
        .single();
      if (!data) {
        // No row for today → treat as closed
        setRestaurantOpen(false);
      } else {
        const openTime = (data.open_time as string).slice(0, 5);
        const closeTime = (data.close_time as string).slice(0, 5);
        setRestaurantOpen(checkIsOpenNow(openTime, closeTime));
      }
    };
    fetch();
    // Re-evaluate every minute
    const interval = setInterval(fetch, 60_000);
    return () => clearInterval(interval);
  }, [restaurantId]);

  // Fetch initial waitlist_open state from Supabase
  useEffect(() => {
    if (!restaurantId) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("restaurants")
        .select("waitlist_open")
        .eq("id", restaurantId)
        .single();
      if (data && typeof data.waitlist_open === "boolean") {
        setWaitlistOpen(data.waitlist_open);
      }
    };
    fetch();
  }, [restaurantId, setWaitlistOpen]);

  const handleToggleWaitlist = async (open: boolean) => {
    setWaitlistOpen(open);
    if (!restaurantId) return;
    const { error } = await supabase
      .from("restaurants")
      .update({ waitlist_open: open })
      .eq("id", restaurantId);
    if (error) {
      console.error("Failed to update waitlist_open:", error.message);
      setWaitlistOpen(!open);
    }
  };

  // Disable the toggle when the restaurant is known to be closed
  const isToggleDisabled = restaurantOpen === false;

  return (
    <header className="relative">
      {/* Main bar */}
      <div
        className="h-[72px] flex items-center justify-between px-6 gap-6"
        style={{
          background: "rgba(14,14,16,0.9)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          boxShadow: "0 1px 12px rgba(0,0,0,0.3)",
        }}
      >
        {/* Left: Waitlist Toggle */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <Switch
              checked={waitlistOpen}
              onCheckedChange={handleToggleWaitlist}
              disabled={isToggleDisabled}
              className={`${waitlistOpen && !isToggleDisabled
                  ? "data-[state=checked]:bg-emerald-500"
                  : "data-[state=unchecked]:bg-zinc-700"
                } disabled:opacity-40 disabled:cursor-not-allowed`}
            />
            <motion.span
              animate={{ opacity: 1 }}
              className={`text-sm font-semibold tracking-tight ${
                isToggleDisabled
                  ? "text-zinc-600"
                  : waitlistOpen
                  ? "text-emerald-400"
                  : "text-zinc-500"
              }`}
            >
              {waitlistOpen && !isToggleDisabled ? "Waitlist Open" : "Waitlist Closed"}
            </motion.span>
            {isToggleDisabled && (
              <span className="flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-800 border border-zinc-700 text-zinc-500 select-none">
                Restaurant Closed
              </span>
            )}
          </div>

          <div className="w-px h-8 bg-white/8" />

          {/* Party Count */}
          <div className="flex items-center gap-2">
            <Users size={15} strokeWidth={1.5} className="text-zinc-500" />
            <span className="text-sm text-zinc-400">
              <span className="text-amber-500 font-bold tabular-nums">
                {waitingCount}
              </span>{" "}
              waiting
            </span>
          </div>

          {/* Debug Panel */}
          {(isAdmin || session) && <DebugPanel />}
        </div>

        {/* Center: Current Wait Time */}
        <WaitTimeWidget />

        {/* Right: Table Stats */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <div
              className="w-2 h-2 rounded-full bg-emerald-500"
              style={{ boxShadow: "0 0 6px rgba(16,185,129,0.4)" }}
            />
            <span className="text-zinc-400">
              <span className="text-zinc-100 font-bold tabular-nums">
                {totalTables - occupiedCount}
              </span>{" "}
              available
            </span>
          </div>
          <div className="w-px h-8 bg-white/8" />
          <div className="flex items-center gap-2 text-sm">
            <div
              className="w-2 h-2 rounded-full bg-amber-500"
              style={{ boxShadow: "0 0 6px rgba(245,158,11,0.4)" }}
            />
            <span className="text-zinc-400">
              <span className="text-zinc-100 font-bold tabular-nums">
                {occupiedCount}
              </span>{" "}
              occupied
            </span>
          </div>
        </div>
      </div>
      {/* Subtle gradient accent line */}
      <div className="gradient-accent-bar" />
    </header>
  );
}
