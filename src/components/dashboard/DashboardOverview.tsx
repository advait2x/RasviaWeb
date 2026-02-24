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
import { useAuth } from "@/context/AuthContext";
import LiveGroupWidget from "@/components/LiveGroupWidget";

function getWaitMinutes(addedAt: Date): number {
  return Math.floor((Date.now() - addedAt.getTime()) / 60000);
}

export default function DashboardOverview() {
  const { waitlist, tables, menuItems } = useDashboard();
  const { restaurantId } = useAuth();

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
      iconBg: "bg-amber-500/10 border-amber-500/20",
      glowColor: "rgba(245,158,11,0.06)",
    },
    {
      label: "Avg Wait Time",
      value: `${avgWait}m`,
      icon: Clock,
      color: "text-emerald-400",
      iconBg: "bg-emerald-500/10 border-emerald-500/20",
      glowColor: "rgba(16,185,129,0.06)",
    },
    {
      label: "Tables Available",
      value: availableCount,
      icon: Armchair,
      color: "text-emerald-400",
      iconBg: "bg-emerald-500/10 border-emerald-500/20",
      glowColor: "rgba(16,185,129,0.06)",
    },
    {
      label: "Tables Occupied",
      value: occupiedCount,
      icon: TrendingUp,
      color: "text-blue-400",
      iconBg: "bg-blue-500/10 border-blue-500/20",
      glowColor: "rgba(59,130,246,0.06)",
    },
    {
      label: "Longest Wait",
      value: `${longestWait}m`,
      icon: AlertTriangle,
      color: longestWait > 30 ? "text-red-400" : "text-amber-400",
      iconBg: longestWait > 30 ? "bg-red-500/10 border-red-500/20" : "bg-amber-500/10 border-amber-500/20",
      glowColor: longestWait > 30 ? "rgba(239,68,68,0.06)" : "rgba(245,158,11,0.06)",
    },
    {
      label: "Items 86'd",
      value: eightySixed,
      icon: UtensilsCrossed,
      color: eightySixed > 0 ? "text-red-400" : "text-zinc-400",
      iconBg: eightySixed > 0 ? "bg-red-500/10 border-red-500/20" : "bg-zinc-500/10 border-zinc-500/20",
      glowColor: eightySixed > 0 ? "rgba(239,68,68,0.06)" : "rgba(0,0,0,0)",
    },
  ];

  return (
    <div className="flex flex-col h-full p-5 overflow-y-auto">
      <h2 className="text-xl font-bold text-zinc-100 tracking-tight mb-5">
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
            className="card-premium rounded-xl p-5 group"
            style={{ boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04), 0 0 20px ${stat.glowColor}` }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg border flex items-center justify-center ${stat.iconBg}`}>
                <stat.icon size={18} strokeWidth={1.5} className={stat.color} />
              </div>
            </div>
            <p className={`text-3xl font-bold tabular-nums ${stat.color}`}>
              {stat.value}
            </p>
            <p className="text-xs text-zinc-500 font-medium mt-1.5 tracking-wide uppercase">
              {stat.label}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Lower Section Grid */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4 pb-4">
        {/* Quick Waitlist Preview */}
        {waitingCount > 0 ? (
          <div className="card-premium rounded-xl p-5 flex flex-col">
            <h3 className="text-xs font-bold text-zinc-400 mb-4 uppercase tracking-widest">
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
                      className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0"
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
                        className={`text-sm font-bold tabular-nums ${minutes < 15
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
        ) : (
          <div className="card-premium rounded-xl p-5 flex items-center justify-center">
            <div className="text-center py-4">
              <Users size={32} strokeWidth={1} className="text-zinc-700 mx-auto mb-2" />
              <p className="text-sm text-zinc-500">No parties currently waiting</p>
            </div>
          </div>
        )}

        {/* Live Group Widget */}
        {restaurantId && <LiveGroupWidget restaurantId={restaurantId} />}
      </div>
    </div>
  );
}
