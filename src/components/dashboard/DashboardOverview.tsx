import { motion } from "framer-motion";
import {
  Users,
  Clock,
  Armchair,
  TrendingUp,
  AlertTriangle,
  UtensilsCrossed,
} from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";

function getWaitMinutes(addedAt: Date): number {
  return Math.floor((Date.now() - addedAt.getTime()) / 60000);
}

export default function DashboardOverview() {
  const { waitlist, tables, menuItems } = useDashboard();

  const waitingCount = waitlist.filter((w) => w.status === "waiting").length;
  const occupiedCount = tables.filter((t) => t.status === "occupied").length;
  const availableCount = tables.filter((t) => t.status === "available").length;
  const eightySixed = menuItems.filter((m) => !m.inStock).length;
  const avgWait =
    waitingCount > 0
      ? Math.round(
          waitlist
            .filter((w) => w.status === "waiting")
            .reduce((acc, w) => acc + getWaitMinutes(w.addedAt), 0) / waitingCount
        )
      : 0;

  const longestWait =
    waitingCount > 0
      ? Math.max(
          ...waitlist
            .filter((w) => w.status === "waiting")
            .map((w) => getWaitMinutes(w.addedAt))
        )
      : 0;

  const stats = [
    {
      label: "Parties Waiting",
      value: waitingCount,
      icon: Users,
      color: "text-amber-500",
      bg: "bg-amber-500/10 border-amber-500/20",
    },
    {
      label: "Avg Wait Time",
      value: `${avgWait}m`,
      icon: Clock,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      label: "Tables Available",
      value: availableCount,
      icon: Armchair,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      label: "Tables Occupied",
      value: occupiedCount,
      icon: TrendingUp,
      color: "text-blue-400",
      bg: "bg-blue-500/10 border-blue-500/20",
    },
    {
      label: "Longest Wait",
      value: `${longestWait}m`,
      icon: AlertTriangle,
      color: longestWait > 30 ? "text-red-400" : "text-amber-400",
      bg: longestWait > 30 ? "bg-red-500/10 border-red-500/20" : "bg-amber-500/10 border-amber-500/20",
    },
    {
      label: "Items 86'd",
      value: eightySixed,
      icon: UtensilsCrossed,
      color: eightySixed > 0 ? "text-red-400" : "text-zinc-400",
      bg: eightySixed > 0 ? "bg-red-500/10 border-red-500/20" : "bg-zinc-500/10 border-zinc-500/20",
    },
  ];

  return (
    <div className="flex flex-col h-full p-4 overflow-y-auto">
      <h2 className="text-lg font-semibold text-zinc-100 tracking-tight mb-4">
        Dashboard Overview
      </h2>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
            className={`glass-card rounded-xl p-5`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${stat.bg}`}>
                <stat.icon size={18} strokeWidth={1.5} className={stat.color} />
              </div>
            </div>
            <p className={`text-2xl font-bold tabular-nums ${stat.color}`}>
              {stat.value}
            </p>
            <p className="text-xs text-zinc-500 font-medium mt-1">
              {stat.label}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Quick Waitlist Preview */}
      {waitingCount > 0 && (
        <div className="mt-6 glass-card rounded-xl p-4">
          <h3 className="text-sm font-semibold text-zinc-400 mb-3 uppercase tracking-wider">
            Next Up
          </h3>
          <div className="space-y-2">
            {waitlist
              .filter((w) => w.status === "waiting")
              .slice(0, 3)
              .map((entry) => {
                const minutes = getWaitMinutes(entry.addedAt);
                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-zinc-200">
                        {entry.guestName}
                      </span>
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20">
                        <Users size={12} strokeWidth={1.5} className="text-amber-500" />
                        <span className="text-xs font-semibold text-amber-500 tabular-nums">
                          {entry.partySize}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`text-sm font-semibold tabular-nums ${
                        minutes < 15
                          ? "text-emerald-400"
                          : minutes <= 30
                          ? "text-amber-400"
                          : "text-red-400"
                      }`}
                    >
                      {minutes}m
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
