import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, X, Armchair, Bell, BellRing, UserPlus, AlertTriangle } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import { WaitlistEntry } from "@/types/dashboard";
import { ScrollArea } from "@/components/ui/scroll-area";
import SeatPartyModal from "./SeatPartyModal";
import AddWalkInModal from "./AddWalkInModal";
import { formatMinutesHumanReadable } from "@/lib/formatWait";
import { DASH_BTN_ADD, dashWaitRowBgClass, dashWaitTextClass } from "@/lib/dashboardUi";

function getWaitMinutes(addedAt: Date): number {
  return Math.floor((Date.now() - addedAt.getTime()) / 60000);
}

function getWaitColor(minutes: number): string {
  return dashWaitTextClass(minutes);
}

function getWaitBg(minutes: number): string {
  return dashWaitRowBgClass(minutes);
}

export default function WaitlistFeed() {
  const { waitlist, waitlistLoading, cancelParty, notifyParty } = useDashboard();
  const [selectedEntry, setSelectedEntry] = useState<WaitlistEntry | null>(null);
  const [showSeatModal, setShowSeatModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);
  const [notifyConfirmId, setNotifyConfirmId] = useState<string | null>(null);

  const waitingList = waitlist.filter((w) => w.status === "waiting");

  const handleSeat = (entry: WaitlistEntry) => {
    setSelectedEntry(entry);
    setShowSeatModal(true);
    setExpandedRow(null);
  };

  const handleCancelRequest = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setCancelConfirmId(id);
  };

  const handleCancelConfirm = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    cancelParty(id);
    setCancelConfirmId(null);
    setExpandedRow(null);
  };

  const handleCancelDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCancelConfirmId(null);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-6">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-100">
          Waitlist
          <span className="ml-3 text-sm font-normal text-zinc-500">
            {waitingList.length} {waitingList.length === 1 ? "party" : "parties"}
          </span>
        </h2>
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowAddModal(true)}
          className={`${DASH_BTN_ADD} rounded-xl px-5 py-2.5`}
        >
          <UserPlus size={16} strokeWidth={1.5} />
          Add walk-in
        </motion.button>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-[minmax(0,1fr)_88px_112px_140px_48px] items-center gap-4 border-b border-white/[0.08] px-8 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
        <span>Guest</span>
        <span>Party</span>
        <span>Wait</span>
        <span>Phone</span>
        <span />
      </div>

      {/* Waitlist Rows */}
      <ScrollArea className="flex-1">
        <div className="px-8 py-2">
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
                    className={`grid h-16 cursor-pointer grid-cols-[minmax(0,1fr)_88px_112px_140px_48px] items-center gap-4 rounded-lg border px-4 transition-colors duration-150 ${
                      isExpanded
                        ? "border-white/[0.1] bg-white/[0.04]"
                        : "border-transparent hover:bg-white/[0.03]"
                    }`}
                  >
                    {/* Guest Name */}
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="truncate text-sm font-medium text-zinc-100">
                        {entry.guestName}
                      </span>
                      {entry.source === "walk_in" && (
                        <span className="shrink-0 rounded-md border border-amber-400/22 bg-amber-500/[0.08] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200/90">
                          Walk-in
                        </span>
                      )}
                      {entry.notifiedAt && (
                        <BellRing size={13} strokeWidth={1.5} className="shrink-0 text-amber-300/90" />
                      )}
                    </div>

                    {/* Party Size Badge */}
                    <div className="flex items-center justify-center gap-1.5">
                      <div className="inline-flex items-center gap-1 rounded-md border border-white/[0.1] bg-white/[0.03] px-2.5 py-1">
                        <Users size={14} strokeWidth={1.5} className="text-zinc-500" />
                        <span className="text-sm font-medium tabular-nums text-zinc-300">
                          {entry.partySize}
                        </span>
                      </div>
                    </div>

                    {/* Wait Duration */}
                    <div className={`flex items-center justify-center rounded-md border px-2.5 py-1 ${getWaitBg(minutes)}`}>
                      <span className={`text-sm font-medium tabular-nums ${getWaitColor(minutes)}`}>
                        {formatMinutesHumanReadable(minutes)}
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
                        <X size={12} strokeWidth={1.5} />
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
                        <div className="ml-4 flex items-center gap-3 border-l-2 border-white/[0.1] px-4 py-3">
                          <motion.button
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleSeat(entry)}
                            className="flex items-center gap-2 rounded-lg border border-white/[0.12] bg-white/[0.08] px-4 py-2.5 text-sm font-medium text-zinc-100 transition-colors hover:bg-white/[0.12]"
                          >
                            <Armchair size={16} strokeWidth={1.5} />
                            Seat Party
                          </motion.button>
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setNotifyConfirmId(entry.id)}
                            className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${entry.notifiedAt
                                ? "border-amber-400/22 bg-amber-500/[0.08] text-amber-200/90 hover:bg-amber-500/[0.12]"
                                : "border-white/[0.1] bg-white/[0.04] text-zinc-300 hover:bg-white/[0.07]"
                              }`}
                          >
                            <Bell size={16} strokeWidth={1.5} />
                            {entry.notifiedAt ? "Notified" : "Notify"}
                          </motion.button>
                          {notifyConfirmId === entry.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="flex items-center gap-2 rounded-lg border border-amber-400/22 bg-amber-500/[0.07] px-3 py-2"
                            >
                              <Bell size={13} strokeWidth={1.5} className="shrink-0 text-amber-400" />
                              <span className="text-xs font-medium text-amber-200/95">Party will be notified via SMS</span>
                              <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setNotifyConfirmId(null)}
                                className="px-2.5 py-1 rounded-md bg-zinc-700 border border-white/10 text-zinc-300 text-xs font-medium hover:bg-zinc-600 transition-colors"
                              >
                                Cancel
                              </motion.button>
                              <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => { notifyParty(entry.id); setNotifyConfirmId(null); }}
                                className="rounded-md border border-amber-500/35 bg-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-200 transition-colors hover:bg-amber-500/30"
                              >
                                Send
                              </motion.button>
                            </motion.div>
                          )}
                          {cancelConfirmId === entry.id ? (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="flex items-center gap-2 rounded-lg border border-rose-400/25 bg-rose-500/[0.08] px-3 py-2"
                            >
                              <AlertTriangle size={14} strokeWidth={1.5} className="shrink-0 text-rose-200/90" />
                              <span className="text-xs font-medium text-rose-100/90">Remove from waitlist?</span>
                              <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={handleCancelDismiss}
                                className="px-2.5 py-1 rounded-md bg-zinc-700 border border-white/10 text-zinc-300 text-xs font-medium hover:bg-zinc-600 transition-colors"
                              >
                                Keep
                              </motion.button>
                              <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={(e) => handleCancelConfirm(e, entry.id)}
                                className="rounded-md border border-rose-400/30 bg-rose-500/[0.15] px-2.5 py-1 text-xs font-semibold text-rose-100/95 transition-colors hover:bg-rose-500/[0.22]"
                              >
                                Remove
                              </motion.button>
                            </motion.div>
                          ) : (
                            <motion.button
                              whileTap={{ scale: 0.95 }}
                              onClick={(e) => handleCancelRequest(e, entry.id)}
                              className="flex items-center gap-2 rounded-lg border border-rose-400/20 bg-rose-500/[0.08] px-4 py-2.5 text-sm font-medium text-rose-200/90 transition-colors hover:bg-rose-500/[0.12]"
                            >
                              <X size={16} strokeWidth={1.5} />
                              Cancel
                            </motion.button>
                          )}
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
              <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-zinc-800 border-t-zinc-500" />
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
