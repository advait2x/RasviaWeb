import { motion } from "framer-motion";
import { Users } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import ActiveOrdersWidget from "./ActiveOrdersWidget";
import { formatMinutesHumanReadable } from "@/lib/formatWait";

function getWaitMinutes(addedAt: Date): number {
  return Math.floor((Date.now() - addedAt.getTime()) / 60000);
}

export default function DashboardOverview() {
  const { waitlist, setActiveView } = useDashboard();

  const waitingCount = waitlist.filter((w) => w.status === "waiting").length;

  const nextUpHeader = (
    <div className="mb-6 flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={() => setActiveView("waitlist")}
        className="group flex items-center gap-3 rounded-sm text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
      >
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/30 opacity-50" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400/70" />
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500 transition-colors group-hover:text-zinc-400">
          Next up
        </span>
      </button>
    </div>
  );

  return (
    <div className="flex h-full flex-col overflow-y-auto p-8">
      <h2 className="mb-8 text-lg font-semibold tracking-tight text-zinc-100">
        Dashboard overview
      </h2>

      <div className="grid grid-cols-1 gap-6 pb-8 lg:grid-cols-2">
        {waitingCount > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="card-premium flex h-full flex-col rounded-xl p-6"
          >
            {nextUpHeader}
            <div className="flex flex-col">
              <div className="mb-3 grid grid-cols-[minmax(0,1fr)_56px_72px] items-center gap-4 border-b border-white/[0.08] pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                <span>Guest</span>
                <span className="text-center">Party</span>
                <span className="text-right">Wait</span>
              </div>
              {waitlist
                .filter((w) => w.status === "waiting")
                .slice(0, 3)
                .map((entry) => {
                  const minutes = getWaitMinutes(entry.addedAt);
                  const waitTone =
                    minutes < 15
                      ? "text-emerald-200/90"
                      : minutes <= 30
                        ? "text-amber-200/85"
                        : "text-rose-200/90";
                  return (
                    <div
                      key={entry.id}
                      className="grid grid-cols-[minmax(0,1fr)_56px_72px] items-center gap-4 border-b border-white/[0.06] py-3 last:border-0"
                    >
                      <span className="min-w-0 truncate text-sm font-medium text-zinc-200">
                        {entry.guestName}
                      </span>
                      <div className="flex justify-center">
                        <div className="inline-flex items-center gap-1 rounded-md border border-white/[0.1] bg-white/[0.03] px-2 py-0.5">
                          <Users size={12} strokeWidth={1.5} className="text-zinc-500" />
                          <span className="text-xs font-medium tabular-nums text-zinc-300">
                            {entry.partySize}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`text-right text-sm font-medium tabular-nums ${waitTone}`}
                      >
                        {formatMinutesHumanReadable(minutes)}
                      </span>
                    </div>
                  );
                })}
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-premium flex h-full flex-col rounded-xl p-6"
          >
            {nextUpHeader}
            <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
              <Users size={28} strokeWidth={1.5} className="mb-3 text-zinc-600" />
              <p className="text-sm text-zinc-500">No parties currently waiting</p>
            </div>
          </motion.div>
        )}

        <ActiveOrdersWidget />
      </div>
    </div>
  );
}
