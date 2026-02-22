import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Clock, LogOut, Armchair, Plus, Trash2, CheckCircle2, Ban, CalendarClock } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import { TableInfo, WaitlistEntry } from "@/types/dashboard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function getSeatedDuration(seatedAt?: Date): string {
  if (!seatedAt) return "";
  const minutes = Math.floor((Date.now() - seatedAt.getTime()) / 60000);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function getTimerColor(seatedAt?: Date): string {
  if (!seatedAt) return "text-zinc-500";
  const minutes = Math.floor((Date.now() - seatedAt.getTime()) / 60000);
  if (minutes < 30) return "text-emerald-400";
  if (minutes < 60) return "text-amber-400";
  return "text-red-400";
}

const STATUS_CONFIG = {
  available: {
    label: "Available",
    dot: "bg-emerald-500",
    border: "border-emerald-500/30 hover:border-emerald-500/60",
    bg: "bg-zinc-900/40 hover:bg-zinc-800/40",
    badge: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
  },
  occupied: {
    label: "Occupied",
    dot: "bg-amber-500",
    border: "border-zinc-700 hover:border-zinc-600",
    bg: "bg-zinc-800/80",
    badge: "bg-amber-500/10 border-amber-500/20 text-amber-400",
  },
  reserved: {
    label: "Reserved",
    dot: "bg-blue-500",
    border: "border-blue-500/30 hover:border-blue-500/50",
    bg: "bg-zinc-900/40 hover:bg-zinc-800/30",
    badge: "bg-blue-500/10 border-blue-500/20 text-blue-400",
  },
  unavailable: {
    label: "Unavailable",
    dot: "bg-zinc-600",
    border: "border-zinc-700/50 hover:border-zinc-600/60",
    bg: "bg-zinc-900/60 hover:bg-zinc-800/40 opacity-60",
    badge: "bg-zinc-700/30 border-zinc-600/30 text-zinc-500",
  },
};

const CAPACITY_OPTIONS = [2, 4, 6, 8, 10, 12];

export default function FloorPlan() {
  const { tables, clearTable, seatParty, waitlist, setTableStatus, addTable, removeTable } = useDashboard();
  const [selectedTable, setSelectedTable] = useState<TableInfo | null>(null);
  const [showManage, setShowManage] = useState(false);
  const [showAddTable, setShowAddTable] = useState(false);
  const [newCapacity, setNewCapacity] = useState(4);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [pickingParty, setPickingParty] = useState(false);
  const [confirmSeat, setConfirmSeat] = useState<WaitlistEntry | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const waitingCount = waitlist.filter((w) => w.status === "waiting").length;

  const eligibleParties = selectedTable
    ? waitlist
        .filter((w) => w.status === "waiting" && w.partySize <= selectedTable.capacity)
        .sort((a, b) => a.addedAt.getTime() - b.addedAt.getTime())
    : [];

  const handleTableTap = (table: TableInfo) => {
    setSelectedTable(table);
    setConfirmRemove(false);
    setShowManage(true);
  };

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const handleClearTable = () => {
    if (selectedTable) {
      clearTable(selectedTable.id);
      setShowManage(false);
      setSelectedTable(null);
      showToast(`Table ${selectedTable.tableNumber} cleared`);
    }
  };

  const handleConfirmSeat = async () => {
    if (selectedTable && confirmSeat) {
      const guestName = confirmSeat.guestName;
      const tableNum = selectedTable.tableNumber;
      await seatParty(confirmSeat.id, selectedTable.id);
      showToast(`${guestName} seated at Table ${tableNum}`);
      setConfirmSeat(null);
      setPickingParty(false);
      setShowManage(false);
      setSelectedTable(null);
    }
  };

  const handleStatusChange = (status: TableInfo["status"]) => {
    if (selectedTable) {
      setTableStatus(selectedTable.id, status);
      setSelectedTable((prev) => prev ? { ...prev, status } : null);
      showToast(`Table ${selectedTable.tableNumber} → ${STATUS_CONFIG[status].label}`);
    }
  };

  const handleRemoveTable = () => {
    if (selectedTable) {
      removeTable(selectedTable.id);
      setShowManage(false);
      setSelectedTable(null);
      setConfirmRemove(false);
      showToast(`Table ${selectedTable.tableNumber} removed`);
    }
  };

  const handleAddTable = () => {
    addTable(newCapacity);
    setShowAddTable(false);
    showToast(`New table added (seats ${newCapacity})`);
  };

  const closeManage = () => {
    setShowManage(false);
    setSelectedTable(null);
    setConfirmRemove(false);
    setPickingParty(false);
    setConfirmSeat(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-lg font-semibold text-zinc-100 tracking-tight">
          Floor Plan
        </h2>
        <div className="flex items-center gap-4">
          {/* Legend */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-zinc-400">Available</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-zinc-400">Occupied</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span className="text-zinc-400">Reserved</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-600" />
              <span className="text-zinc-400">Unavailable</span>
            </div>
          </div>
          {/* Add Table */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAddTable(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 border border-white/10 text-zinc-300 text-xs font-medium hover:bg-zinc-700 transition-colors"
          >
            <Plus size={13} strokeWidth={2} />
            Add Table
          </motion.button>
        </div>
      </div>

      {/* Floor Grid */}
      <div className="flex-1 p-4 floor-grid rounded-lg mx-4 mb-4">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3 h-full content-start">
          {tables.map((table, index) => {
            const cfg = STATUS_CONFIG[table.status];
            return (
              <motion.button
                key={table.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: index * 0.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => handleTableTap(table)}
                className={`relative p-4 rounded-xl border transition-all duration-200 text-left min-h-[120px] flex flex-col justify-between ${cfg.bg} ${cfg.border}`}
              >
                <div className="flex items-start justify-between">
                  <span className="text-2xl font-bold text-zinc-200 tabular-nums">
                    {table.tableNumber}
                  </span>
                  <div className={`w-2.5 h-2.5 rounded-full mt-1 ${cfg.dot}`} />
                </div>

                <div className="mt-auto">
                  {table.status === "occupied" && (
                    <>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Users size={14} strokeWidth={1.5} className="text-zinc-500" />
                        <span className="text-sm font-medium text-zinc-300">
                          {table.guestName}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} strokeWidth={1.5} className={getTimerColor(table.seatedAt)} />
                        <span className={`text-xs font-medium tabular-nums ${getTimerColor(table.seatedAt)}`}>
                          {getSeatedDuration(table.seatedAt)} ago
                        </span>
                      </div>
                    </>
                  )}
                  {table.status === "available" && (
                    <div className="flex items-center gap-1.5">
                      <Armchair size={14} strokeWidth={1.5} className="text-emerald-500/60" />
                      <span className="text-xs text-zinc-500">
                        Seats {table.capacity}
                      </span>
                    </div>
                  )}
                  {table.status === "reserved" && (
                    <div className="flex items-center gap-1.5">
                      <CalendarClock size={14} strokeWidth={1.5} className="text-blue-400/60" />
                      <span className="text-xs text-blue-400/80">Reserved · Seats {table.capacity}</span>
                    </div>
                  )}
                  {table.status === "unavailable" && (
                    <div className="flex items-center gap-1.5">
                      <Ban size={14} strokeWidth={1.5} className="text-zinc-600" />
                      <span className="text-xs text-zinc-600">Unavailable</span>
                    </div>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl glass-modal text-sm font-medium text-zinc-100 amber-glow-sm"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table Management Modal */}
      <Dialog open={showManage} onOpenChange={(o) => !o && closeManage()}>
        <DialogContent className="glass-modal max-w-sm border-white/10 bg-zinc-900/95 backdrop-blur-xl p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-xl font-bold text-zinc-100 tracking-tight">
                Table {selectedTable?.tableNumber}
              </DialogTitle>
              {selectedTable && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_CONFIG[selectedTable.status].badge}`}>
                  {STATUS_CONFIG[selectedTable.status].label}
                </span>
              )}
            </div>
            {selectedTable && (
              <p className="text-xs text-zinc-500 mt-1">Seats {selectedTable.capacity}</p>
            )}
          </DialogHeader>

          {selectedTable && (
            <div className="p-6 space-y-5">
              {/* Occupied guest info */}
              {selectedTable.status === "occupied" && (
                <div className="space-y-2.5 pb-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-500">Guest</span>
                    <span className="text-sm font-semibold text-zinc-100">{selectedTable.guestName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-500">Party Size</span>
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20">
                      <Users size={12} strokeWidth={1.5} className="text-amber-500" />
                      <span className="text-sm font-semibold text-amber-500 tabular-nums">{selectedTable.partySize}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-500">Seated</span>
                    <span className={`text-sm font-semibold tabular-nums ${getTimerColor(selectedTable.seatedAt)}`}>
                      {getSeatedDuration(selectedTable.seatedAt)} ago
                    </span>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleClearTable}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-800 border border-white/10 text-zinc-300 font-medium text-sm hover:bg-zinc-700 transition-colors mt-1"
                  >
                    <LogOut size={15} strokeWidth={1.5} />
                    Clear Table
                  </motion.button>
                </div>
              )}

              {/* Quick seat section for available tables */}
              {selectedTable.status === "available" && waitingCount > 0 && (
                <div>
                  {confirmSeat ? (
                    /* Step 3: Confirm the selected party */
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
                      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Confirm Seating</p>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-zinc-100">{confirmSeat.guestName}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <Users size={12} strokeWidth={1.5} className="text-amber-500" />
                            <span className="text-xs font-semibold text-amber-500">
                              {confirmSeat.partySize} guests
                            </span>
                            <span className="text-zinc-600 mx-1">·</span>
                            <span className="text-xs text-zinc-500">
                              {Math.floor((Date.now() - confirmSeat.addedAt.getTime()) / 60000)}m waiting
                            </span>
                          </div>
                        </div>
                        <span className="text-xs text-zinc-500">→ Table {selectedTable.tableNumber}</span>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => { setConfirmSeat(null); setPickingParty(true); }}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 border border-white/10 text-zinc-400 text-xs font-medium hover:bg-zinc-700 transition-colors"
                        >
                          Back
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={handleConfirmSeat}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/25 transition-colors"
                        >
                          <CheckCircle2 size={14} strokeWidth={2} />
                          Confirm
                        </motion.button>
                      </div>
                    </div>
                  ) : pickingParty ? (
                    /* Step 2: Pick which eligible party to seat */
                    <div className="space-y-2">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                          Choose a Party
                        </p>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setPickingParty(false)}
                          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                          Cancel
                        </motion.button>
                      </div>
                      <div className="space-y-1.5 max-h-52 overflow-y-auto pr-0.5">
                        {eligibleParties.map((party) => {
                          const waited = Math.floor((Date.now() - party.addedAt.getTime()) / 60000);
                          return (
                            <motion.button
                              key={party.id}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => { setConfirmSeat(party); setPickingParty(false); }}
                              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-800/60 border border-white/8 hover:bg-zinc-700/60 hover:border-emerald-500/30 transition-all text-left"
                            >
                              <div>
                                <p className="text-sm font-semibold text-zinc-100">{party.guestName}</p>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <Users size={11} strokeWidth={1.5} className="text-amber-500" />
                                  <span className="text-xs text-amber-500 font-medium">{party.partySize}</span>
                                </div>
                              </div>
                              <span className={`text-xs font-semibold tabular-nums ${
                                waited < 15 ? "text-emerald-400" : waited <= 30 ? "text-amber-400" : "text-red-400"
                              }`}>
                                {waited}m
                              </span>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  ) : eligibleParties.length > 0 ? (
                    /* Step 1: Initial button */
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setPickingParty(true)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium text-sm hover:bg-emerald-500/20 transition-colors"
                    >
                      <Users size={15} strokeWidth={1.5} />
                      Seat a Party · {eligibleParties.length} eligible
                    </motion.button>
                  ) : (
                    <div className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-800/40 border border-white/5 text-zinc-500 text-sm">
                      <Users size={15} strokeWidth={1.5} />
                      No parties fit (table seats {selectedTable.capacity})
                    </div>
                  )}
                </div>
              )}

              {/* Status section */}
              <div>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2.5">Set Status</p>
                <div className="grid grid-cols-3 gap-2">
                  {(["available", "reserved", "unavailable"] as const).map((s) => (
                    <motion.button
                      key={s}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleStatusChange(s)}
                      disabled={selectedTable.status === s}
                      className={`flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-lg border text-xs font-medium transition-all ${
                        selectedTable.status === s
                          ? `${STATUS_CONFIG[s].badge} opacity-100 cursor-default`
                          : "bg-zinc-800/60 border-white/8 text-zinc-400 hover:bg-zinc-700/60 hover:text-zinc-200"
                      }`}
                    >
                      {s === "available" && <CheckCircle2 size={15} strokeWidth={1.5} />}
                      {s === "reserved" && <CalendarClock size={15} strokeWidth={1.5} />}
                      {s === "unavailable" && <Ban size={15} strokeWidth={1.5} />}
                      {STATUS_CONFIG[s].label}
                      {selectedTable.status === s && (
                        <span className="text-[9px] opacity-60">current</span>
                      )}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Remove table */}
              <div className="pt-1 border-t border-white/5">
                {confirmRemove ? (
                  <div className="space-y-2">
                    <p className="text-xs text-zinc-400 text-center">Remove Table {selectedTable.tableNumber}?</p>
                    <div className="flex gap-2">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setConfirmRemove(false)}
                        className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-white/10 text-zinc-400 text-xs font-medium hover:bg-zinc-700 transition-colors"
                      >
                        Cancel
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={handleRemoveTable}
                        className="flex-1 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors"
                      >
                        Yes, Remove
                      </motion.button>
                    </div>
                  </div>
                ) : (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setConfirmRemove(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-zinc-600 text-xs font-medium hover:text-red-400 hover:bg-red-500/5 transition-colors"
                  >
                    <Trash2 size={13} strokeWidth={1.5} />
                    Remove Table
                  </motion.button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Table Modal */}
      <Dialog open={showAddTable} onOpenChange={setShowAddTable}>
        <DialogContent className="glass-modal max-w-xs border-white/10 bg-zinc-900/95 backdrop-blur-xl p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-white/5">
            <DialogTitle className="text-lg font-bold text-zinc-100 tracking-tight">
              Add New Table
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">Capacity</p>
              <div className="grid grid-cols-3 gap-2">
                {CAPACITY_OPTIONS.map((cap) => (
                  <motion.button
                    key={cap}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setNewCapacity(cap)}
                    className={`flex flex-col items-center gap-0.5 px-3 py-2.5 rounded-lg border text-sm font-semibold transition-all ${
                      newCapacity === cap
                        ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                        : "bg-zinc-800/60 border-white/8 text-zinc-400 hover:bg-zinc-700/60 hover:text-zinc-200"
                    }`}
                  >
                    {cap}
                    <span className="text-[10px] font-normal opacity-60">seats</span>
                  </motion.button>
                ))}
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleAddTable}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium text-sm hover:bg-emerald-500/20 transition-colors"
            >
              <Plus size={15} strokeWidth={2} />
              Add Table (seats {newCapacity})
            </motion.button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
