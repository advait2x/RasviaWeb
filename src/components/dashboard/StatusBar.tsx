import { useEffect } from "react";
import { motion } from "framer-motion";
import { Users } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { Switch } from "@/components/ui/switch";
import { WaitTimeWidget } from "@/components/WaitTimeWidget";
import DebugPanel from "./DebugPanel";

export default function StatusBar() {
  const {
    waitlistOpen,
    setWaitlistOpen,
    waitlist,
    tables,
  } = useDashboard();
  const { restaurantId, isAdmin, session } = useAuth();

  const waitingCount = waitlist.filter((w) => w.status === "waiting").length;
  const occupiedCount = tables.filter((t) => t.status === "occupied").length;
  const totalTables = tables.length;

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

  return (
    <header className="h-[72px] glass-card flex items-center justify-between px-6 gap-6">
      {/* Left: Waitlist Toggle */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <Switch
            checked={waitlistOpen}
            onCheckedChange={handleToggleWaitlist}
            className={`${
              waitlistOpen
                ? "data-[state=checked]:bg-emerald-500"
                : "data-[state=unchecked]:bg-zinc-700"
            }`}
          />
          <motion.span
            animate={{ opacity: 1 }}
            className={`text-sm font-medium tracking-tight ${
              waitlistOpen ? "text-emerald-400" : "text-zinc-500"
            }`}
          >
            {waitlistOpen ? "Waitlist Open" : "Waitlist Closed"}
          </motion.span>
        </div>

        <div className="w-px h-8 bg-white/10" />

        {/* Party Count */}
        <div className="flex items-center gap-2">
          <Users size={16} strokeWidth={1.5} className="text-zinc-500" />
          <span className="text-sm text-zinc-400">
            <span className="text-amber-500 font-semibold tabular-nums">
              {waitingCount}
            </span>{" "}
            waiting
          </span>
        </div>

        {/* Debug Panel: visible to admins, or to any user when role isn't configured yet */}
        {(isAdmin || session) && <DebugPanel />}
      </div>

      {/* Center: Current Wait Time */}
      <WaitTimeWidget />

      {/* Right: Table Stats */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-zinc-400">
            <span className="text-zinc-200 font-semibold tabular-nums">
              {totalTables - occupiedCount}
            </span>{" "}
            available
          </span>
        </div>
        <div className="w-px h-8 bg-white/10" />
        <div className="flex items-center gap-2 text-sm">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-zinc-400">
            <span className="text-zinc-200 font-semibold tabular-nums">
              {occupiedCount}
            </span>{" "}
            occupied
          </span>
        </div>
      </div>
    </header>
  );
}
