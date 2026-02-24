import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, X, Armchair, Bell, BellRing, UserPlus } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import { WaitlistEntry } from "@/types/dashboard";
import { ScrollArea } from "@/components/ui/scroll-area";
import SeatPartyModal from "./SeatPartyModal";
import AddWalkInModal from "./AddWalkInModal";

function getWaitMinutes(addedAt: Date): number {
  return Math.floor((Date.now() - addedAt.getTime()) / 60000);
}

function getWaitColor(minutes: number): string {
  if (minutes < 15) return "text-emerald-400";
  if (minutes <= 30) return "text-amber-400";
  return "text-red-400";
}

function getWaitBg(minutes: number): string {
  if (minutes < 15) return "bg-emerald-500/10 border-emerald-500/20";
  if (minutes <= 30) return "bg-amber-500/10 border-amber-500/20";
  return "bg-red-500/10 border-red-500/20";
}

export default function WaitlistFeed() {
  const { waitlist, waitlistLoading, cancelParty, notifyParty } = useDashboard();
  const [selectedEntry, setSelectedEntry] = useState<WaitlistEntry | null>(null);
  const [showSeatModal, setShowSeatModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const waitingList = waitlist.filter((w) => w.status === "waiting");

  const handleSeat = (entry: WaitlistEntry) => {
    setSelectedEntry(entry);
    setShowSeatModal(true);
    setExpandedRow(null);
  };

  const handleCancel = (id: string) => {
    cancelParty(id);
    setExpandedRow(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <h2 className="text-xl font-bold text-zinc-100 tracking-tight">
          Waitlist
          <span className="ml-2.5 text-sm font-medium text-zinc-500">
            {waitingList.length} {waitingList.length === 1 ? "party" : "parties"}
          </span>
        </h2>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
        >
          <UserPlus size={16} strokeWidth={1.5} />
          Add Walk-In
        </motion.button>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-[1fr_80px_100px_140px_48px] gap-4 px-5 py-2.5 text-[11px] font-bold text-zinc-500 uppercase tracking-widest border-b border-white/5">
        <span>Guest</span>
        <span>Party</span>
        <span>Wait</span>
        <span>Phone</span>
        <span />
      </div>

      {/* Waitlist Rows */}
      <ScrollArea className="flex-1">
        <div className="px-5 py-2">
          <AnimatePresence mode="popLayout">
            {waitingList.map((entry, index) => {
              const minutes = getWaitMinutes(entry.addedAt);
              const isExpanded = expandedRow === entry.id;

              return (
                <motion.div
                  key={entry.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                  className="mb-1"
                >
                  <motion.div
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setExpandedRow(isExpanded ? null : entry.id)}
                    className={`grid grid-cols-[1fr_80px_100px_140px_48px] gap-4 items-center h-16 px-4 rounded-lg cursor-pointer transition-colors duration-150 ${isExpanded
                        ? "bg-zinc-800/80 border border-amber-500/20"
                        : "hover:bg-zinc-800/50 border border-transparent"
                      }`}
                  >
                    {/* Guest Name */}
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base font-bold text-zinc-100 truncate">
                        {entry.guestName}
                      </span>
                      {entry.notifiedAt && (
                        <BellRing size={13} strokeWidth={1.5} className="text-emerald-400 shrink-0" />
                      )}
                    </div>

                    {/* Party Size Badge */}
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20">
                        <Users size={14} strokeWidth={1.5} className="text-amber-500" />
                        <span className="text-sm font-semibold text-amber-500 tabular-nums">
                          {entry.partySize}
                        </span>
                      </div>
                    </div>

                    {/* Wait Duration */}
                    <div className={`flex items-center gap-1 px-2.5 py-1 rounded-md border ${getWaitBg(minutes)}`}>
                      <span className={`text-sm font-semibold tabular-nums ${getWaitColor(minutes)}`}>
                        {minutes}m
                      </span>
                    </div>

                    {/* Phone */}
                    <span className="text-sm text-zinc-400 font-mono tabular-nums">
                      {entry.phone}
                    </span>

                    {/* Expand Indicator */}
                    <div className="flex justify-end">
                      <motion.div
                        animate={{ rotate: isExpanded ? 45 : 0 }}
                        className="w-6 h-6 rounded-md bg-zinc-800 border border-white/10 flex items-center justify-center text-zinc-500"
                      >
                        <X size={12} strokeWidth={2} />
                      </motion.div>
                    </div>
                  </motion.div>

                  {/* Action Drawer */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="flex items-center gap-3 px-4 py-3 ml-4 border-l-2 border-amber-500/30">
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleSeat(entry)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400 transition-colors amber-glow-sm"
                          >
                            <Armchair size={16} strokeWidth={1.5} />
                            Seat Party
                          </motion.button>
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => notifyParty(entry.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors ${entry.notifiedAt
                                ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                                : "bg-zinc-800 border border-white/10 text-zinc-300 hover:bg-zinc-700"
                              }`}
                          >
                            <Bell size={16} strokeWidth={1.5} />
                            {entry.notifiedAt ? "Notified" : "Notify"}
                          </motion.button>
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleCancel(entry.id)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 font-medium text-sm hover:bg-red-500/20 transition-colors"
                          >
                            <X size={16} strokeWidth={1.5} />
                            Cancel
                          </motion.button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {waitlistLoading && (
            <div className="flex flex-col items-center justify-center py-24 text-zinc-600">
              <div className="w-8 h-8 rounded-full border-2 border-zinc-700 border-t-amber-500 animate-spin mb-4" />
              <p className="text-sm text-zinc-500">Loading waitlist…</p>
            </div>
          )}

          {!waitlistLoading && waitingList.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="w-16 h-16 rounded-2xl bg-zinc-800/60 border border-white/5 flex items-center justify-center mb-4">
                <Users size={28} strokeWidth={1} className="text-zinc-600" />
              </div>
              <p className="text-base font-semibold text-zinc-400">No parties waiting</p>
              <p className="text-sm text-zinc-600 mt-1">Add a walk-in to get started</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Modals */}
      <SeatPartyModal
        open={showSeatModal}
        onClose={() => setShowSeatModal(false)}
        entry={selectedEntry}
      />
      <AddWalkInModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
    </div>
  );
}
