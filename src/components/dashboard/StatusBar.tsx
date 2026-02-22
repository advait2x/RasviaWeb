import { motion } from "framer-motion";
import { Users } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import { Switch } from "@/components/ui/switch";
import { WaitTimeWidget } from "@/components/WaitTimeWidget";

export default function StatusBar() {
  const {
    waitlistOpen,
    setWaitlistOpen,
    currentWaitTime,
    setCurrentWaitTime,
    waitlist,
    tables,
  } = useDashboard();

  const waitingCount = waitlist.filter((w) => w.status === "waiting").length;
  const occupiedCount = tables.filter((t) => t.status === "occupied").length;
  const totalTables = tables.length;

  return (
    <header className="h-[72px] glass-card flex items-center justify-between px-6 gap-6">
      {/* Left: Waitlist Toggle */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <Switch
            checked={waitlistOpen}
            onCheckedChange={setWaitlistOpen}
            className={`${waitlistOpen
              ? "data-[state=checked]:bg-emerald-500"
              : "data-[state=unchecked]:bg-zinc-700"
              }`}
          />
          <motion.span
            animate={{ opacity: 1 }}
            className={`text-sm font-medium tracking-tight ${waitlistOpen ? "text-emerald-400" : "text-zinc-500"
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
            <span className="text-amber-500 font-semibold tabular-nums">{waitingCount}</span>{" "}
            waiting
          </span>
        </div>
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
            <span className="text-zinc-200 font-semibold tabular-nums">{occupiedCount}</span>{" "}
            occupied
          </span>
        </div>
      </div>
    </header>
  );
}
