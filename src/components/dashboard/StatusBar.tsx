import { motion } from "framer-motion";
import { Users, Clock, Minus, Plus } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import { Switch } from "@/components/ui/switch";

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
            <span className="text-amber-500 font-semibold tabular-nums">{waitingCount}</span>{" "}
            waiting
          </span>
        </div>
      </div>

      {/* Center: Current Wait Time */}
      <div className="flex items-center gap-3">
        <Clock size={18} strokeWidth={1.5} className="text-zinc-500" />
        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setCurrentWaitTime(Math.max(0, currentWaitTime - 5))}
            className="w-7 h-7 rounded-md bg-zinc-800 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <Minus size={14} strokeWidth={1.5} />
          </motion.button>
          <div className="flex items-baseline gap-1">
            <span className="text-[48px] font-bold text-amber-500 tabular-nums leading-none tracking-tight">
              {currentWaitTime}
            </span>
            <span className="text-sm text-zinc-500 font-medium">min</span>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setCurrentWaitTime(currentWaitTime + 5)}
            className="w-7 h-7 rounded-md bg-zinc-800 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <Plus size={14} strokeWidth={1.5} />
          </motion.button>
        </div>
      </div>

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
