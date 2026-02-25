import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Clock, LogOut, Armchair, Plus, Trash2, CheckCircle2, Ban,
  CalendarClock, Link2, Unlink, X, Check,
} from "lucide-react";
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
  const {
    tables, clearTable, seatParty, waitlist, setTableStatus,
    addTable, removeTable, combineTablesForParty, splitCombinedTable,
  } = useDashboard();

  const [selectedTable, setSelectedTable] = useState<TableInfo | null>(null);
  const [showManage, setShowManage] = useState(false);
  const [showAddTable, setShowAddTable] = useState(false);
  const [newCapacity, setNewCapacity] = useState(4);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [pickingParty, setPickingParty] = useState(false);
  const [confirmSeat, setConfirmSeat] = useState<WaitlistEntry | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmSplit, setConfirmSplit] = useState(false);

  // Combine mode state
  const [combineMode, setCombineMode] = useState(false);
  const [combineSelection, setCombineSelection] = useState<string[]>([]);

  const waitingCount = waitlist.filter((w) => w.status === "waiting").length;

  const eligibleParties = selectedTable
    ? waitlist
      .filter((w) => w.status === "waiting" && w.partySize <= selectedTable.capacity)
      .sort((a, b) => a.addedAt.getTime() - b.addedAt.getTime())
    : [];

  // Visible tables (exclude children that are absorbed into a combined table)
  const visibleTables = useMemo(
    () => tables.filter((t) => !t.isCombinedChild),
    [tables]
  );

  // Parties that can't fit in any single available table — suggest combinations
  const oversizedParties = useMemo(() => {
    const maxAvailable = visibleTables
      .filter((t) => t.status === "available" && !t.combinedTableIds)
      .reduce((max, t) => Math.max(max, t.capacity), 0);
    return waitlist.filter((w) => w.status === "waiting" && w.partySize > maxAvailable);
  }, [visibleTables, waitlist]);

  // Combined capacity of selected tables
  const combinedCapacity = useMemo(() => {
    return tables
      .filter((t) => combineSelection.includes(t.id))
      .reduce((sum, t) => sum + t.capacity, 0);
  }, [tables, combineSelection]);

  // Which waiting parties fit in the current combine selection
  const partiesFitInSelection = useMemo(() => {
    if (combinedCapacity === 0) return [];
    return waitlist.filter((w) => w.status === "waiting" && w.partySize <= combinedCapacity && w.partySize > combinedCapacity - 2);
  }, [waitlist, combinedCapacity]);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const handleTableTap = (table: TableInfo) => {
    if (combineMode) {
      // Only allow selecting available, non-combined tables
      if (table.status !== "available" || table.combinedTableIds) return;
      setCombineSelection((prev) =>
        prev.includes(table.id) ? prev.filter((id) => id !== table.id) : [...prev, table.id]
      );
      return;
    }
    setSelectedTable(table);
    setConfirmRemove(false);
    setConfirmSplit(false);
    setShowManage(true);
  };

  const handleClearTable = () => {
    if (selectedTable) {
      const isCombined = !!selectedTable.combinedTableIds?.length;
      const tableNum = selectedTable.combinedTableIds
        ? selectedTable.combinedTableIds.map((cid) => {
            const t = tables.find((x) => x.id === cid);
            return t ? t.tableNumber : "";
          }).join("+")
        : selectedTable.tableNumber;
      clearTable(selectedTable.id);
      setShowManage(false);
      setSelectedTable(null);
      showToast(isCombined ? `Combined table ${tableNum} cleared` : `Table ${tableNum} cleared`);
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

  const handleConfirmCombine = () => {
    if (combineSelection.length < 2) return;
    combineTablesForParty(combineSelection);
    const nums = tables
      .filter((t) => combineSelection.includes(t.id))
      .map((t) => t.tableNumber)
      .sort((a, b) => a - b)
      .join(" + ");
    showToast(`Tables ${nums} combined (${combinedCapacity} seats)`);
    setCombineMode(false);
    setCombineSelection([]);
  };

  const handleSplitCombined = () => {
    if (selectedTable) {
      const childNums = (selectedTable.combinedTableIds ?? [])
        .map((cid) => tables.find((x) => x.id === cid)?.tableNumber ?? "")
        .join("+");
      splitCombinedTable(selectedTable.id);
      setShowManage(false);
      setSelectedTable(null);
      setConfirmSplit(false);
      showToast(`Combined table split back into Tables ${childNums}`);
    }
  };

  const exitCombineMode = () => {
    setCombineMode(false);
    setCombineSelection([]);
  };

  const closeManage = () => {
    setShowManage(false);
    setSelectedTable(null);
    setConfirmRemove(false);
    setConfirmSplit(false);
    setPickingParty(false);
    setConfirmSeat(null);
  };

  // Label for a combined table card
  const getCombinedLabel = (table: TableInfo): string => {
    if (!table.combinedTableIds) return String(table.tableNumber);
    const nums = table.combinedTableIds
      .map((cid) => tables.find((x) => x.id === cid)?.tableNumber ?? "?")
      .sort((a, b) => Number(a) - Number(b))
      .join("+");
    return nums;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <h2 className="text-xl font-bold text-zinc-100 tracking-tight">
          Floor Plan
        </h2>
        <div className="flex items-center gap-4">
          {/* Legend */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" style={{ boxShadow: "0 0 6px rgba(16,185,129,0.4)" }} />
              <span className="text-zinc-400">Available</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500" style={{ boxShadow: "0 0 6px rgba(245,158,11,0.4)" }} />
              <span className="text-zinc-400">Occupied</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500" style={{ boxShadow: "0 0 6px rgba(59,130,246,0.4)" }} />
              <span className="text-zinc-400">Reserved</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-600" />
              <span className="text-zinc-400">Unavailable</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Combine Tables button */}
            {!combineMode && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setCombineMode(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-400 text-xs font-medium hover:bg-violet-500/20 hover:border-violet-500/50 transition-colors"
              >
                <Link2 size={13} strokeWidth={2} />
                Combine Tables
              </motion.button>
            )}
            {combineMode && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                whileTap={{ scale: 0.95 }}
                onClick={exitCombineMode}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 border border-white/10 text-zinc-400 text-xs font-medium hover:bg-zinc-700 transition-colors"
              >
                <X size={13} strokeWidth={2} />
                Cancel
              </motion.button>
            )}
            {/* Add Table */}
            {!combineMode && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowAddTable(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 border border-white/10 text-zinc-300 text-xs font-medium hover:bg-zinc-700 hover:border-white/15 transition-colors"
              >
                <Plus size={13} strokeWidth={2} />
                Add Table
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* Combine mode banner */}
      <AnimatePresence>
        {combineMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mx-5 mb-3 px-4 py-3 rounded-xl bg-violet-500/10 border border-violet-500/25 flex items-center gap-3"
          >
            <Link2 size={15} strokeWidth={2} className="text-violet-400 shrink-0" />
            <p className="text-xs text-violet-300 flex-1">
              {combineSelection.length === 0
                ? "Select two or more available tables to combine them into a single larger table."
                : combineSelection.length === 1
                ? "Select at least one more table to combine."
                : `${combineSelection.length} tables selected · ${combinedCapacity} total seats${partiesFitInSelection.length > 0 ? ` — fits ${partiesFitInSelection.map(p => p.guestName).join(", ")}` : ""}`}
            </p>
            {/* Oversized party hint */}
            {combineSelection.length === 0 && oversizedParties.length > 0 && (
              <span className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-1 shrink-0">
                {oversizedParties[0].guestName} (party of {oversizedParties[0].partySize}) needs a combined table
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floor Grid */}
      <div className="flex-1 p-4 floor-grid rounded-lg mx-5 mb-4" style={{ marginBottom: combineMode && combineSelection.length >= 2 ? "80px" : undefined }}>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3 h-full content-start">
          {visibleTables.map((table, index) => {
            const cfg = STATUS_CONFIG[table.status];
            const isCombined = !!table.combinedTableIds?.length;
            const isSelected = combineSelection.includes(table.id);
            const isSelectable = combineMode && table.status === "available" && !isCombined;

            return (
              <motion.button
                key={table.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: index * 0.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => handleTableTap(table)}
                className={`relative p-4 rounded-xl border transition-all duration-200 text-left min-h-[120px] flex flex-col justify-between
                  ${isCombined
                    ? "border-dashed border-violet-500/50 bg-violet-500/5 hover:bg-violet-500/10"
                    : combineMode && !isSelectable
                    ? `${cfg.bg} ${cfg.border} opacity-40 cursor-not-allowed`
                    : isSelected
                    ? "border-violet-500/70 bg-violet-500/15 ring-2 ring-violet-500/30"
                    : `${cfg.bg} ${cfg.border}`
                  }`}
              >
                {/* Selection checkbox */}
                {combineMode && isSelectable && (
                  <div className={`absolute top-2.5 right-2.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? "bg-violet-500 border-violet-500" : "border-zinc-600"}`}>
                    {isSelected && <Check size={11} strokeWidth={3} className="text-white" />}
                  </div>
                )}

                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-1.5">
                    {isCombined && <Link2 size={14} strokeWidth={2} className="text-violet-400 shrink-0" />}
                    <span className="text-2xl font-bold text-zinc-200 tabular-nums">
                      {getCombinedLabel(table)}
                    </span>
                  </div>
                  {!combineMode && (
                    <div className={`w-2.5 h-2.5 rounded-full mt-1 ${isCombined ? "bg-violet-500" : cfg.dot}`} />
                  )}
                </div>

                <div className="mt-auto">
                  {isCombined && table.status === "available" && (
                    <div className="flex items-center gap-1.5">
                      <Armchair size={14} strokeWidth={1.5} className="text-violet-400/60" />
                      <span className="text-xs text-violet-400/80">Combined · Seats {table.capacity}</span>
                    </div>
                  )}
                  {isCombined && table.status === "occupied" && (
                    <>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Users size={14} strokeWidth={1.5} className="text-zinc-500" />
                        <span className="text-sm font-medium text-zinc-300">{table.guestName}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} strokeWidth={1.5} className={getTimerColor(table.seatedAt)} />
                        <span className={`text-xs font-medium tabular-nums ${getTimerColor(table.seatedAt)}`}>
                          {getSeatedDuration(table.seatedAt)} ago
                        </span>
                      </div>
                    </>
                  )}
                  {!isCombined && table.status === "occupied" && (
                    <>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Users size={14} strokeWidth={1.5} className="text-zinc-500" />
                        <span className="text-sm font-medium text-zinc-300">{table.guestName}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} strokeWidth={1.5} className={getTimerColor(table.seatedAt)} />
                        <span className={`text-xs font-medium tabular-nums ${getTimerColor(table.seatedAt)}`}>
                          {getSeatedDuration(table.seatedAt)} ago
                        </span>
                      </div>
                    </>
                  )}
                  {!isCombined && table.status === "available" && (
                    <div className="flex items-center gap-1.5">
                      <Armchair size={14} strokeWidth={1.5} className="text-emerald-500/60" />
                      <span className="text-xs text-zinc-500">Seats {table.capacity}</span>
                    </div>
                  )}
                  {!isCombined && table.status === "reserved" && (
                    <div className="flex items-center gap-1.5">
                      <CalendarClock size={14} strokeWidth={1.5} className="text-blue-400/60" />
                      <span className="text-xs text-blue-400/80">Reserved · Seats {table.capacity}</span>
                    </div>
                  )}
                  {!isCombined && table.status === "unavailable" && (
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

      {/* Combine mode — floating confirm bar */}
      <AnimatePresence>
        {combineMode && combineSelection.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl glass-modal border border-violet-500/30 shadow-xl"
          >
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-zinc-100">
                {combineSelection.length} tables · {combinedCapacity} seats total
              </span>
              {combinedCapacity > 0 && (
                <span className="text-[11px] text-zinc-400">
                  Fits parties of up to {combinedCapacity}
                </span>
              )}
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleConfirmCombine}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-500/20 border border-violet-500/50 text-violet-300 text-sm font-semibold hover:bg-violet-500/30 transition-colors"
            >
              <Link2 size={15} strokeWidth={2} />
              Combine
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

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
              {selectedTable?.combinedTableIds && (
                <Link2 size={16} strokeWidth={2} className="text-violet-400 shrink-0" />
              )}
              <DialogTitle className="text-xl font-bold text-zinc-100 tracking-tight">
                {selectedTable?.combinedTableIds
                  ? `Tables ${getCombinedLabel(selectedTable)}`
                  : `Table ${selectedTable?.tableNumber}`}
              </DialogTitle>
              {selectedTable && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                  selectedTable.combinedTableIds
                    ? "bg-violet-500/10 border-violet-500/20 text-violet-400"
                    : STATUS_CONFIG[selectedTable.status].badge
                }`}>
                  {selectedTable.combinedTableIds ? "Combined" : STATUS_CONFIG[selectedTable.status].label}
                </span>
              )}
            </div>
            {selectedTable && (
              <p className="text-xs text-zinc-500 mt-1">
                {selectedTable.combinedTableIds
                  ? `${selectedTable.capacity} total seats`
                  : `Seats ${selectedTable.capacity}`}
              </p>
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
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
                      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Confirm Seating</p>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-zinc-100">{confirmSeat.guestName}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <Users size={12} strokeWidth={1.5} className="text-amber-500" />
                            <span className="text-xs font-semibold text-amber-500">{confirmSeat.partySize} guests</span>
                            <span className="text-zinc-600 mx-1">·</span>
                            <span className="text-xs text-zinc-500">
                              {Math.floor((Date.now() - confirmSeat.addedAt.getTime()) / 60000)}m waiting
                            </span>
                          </div>
                        </div>
                        <span className="text-xs text-zinc-500">
                          → {selectedTable.combinedTableIds ? `Tables ${getCombinedLabel(selectedTable)}` : `Table ${selectedTable.tableNumber}`}
                        </span>
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
                    <div className="space-y-2">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Choose a Party</p>
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
                              <span className={`text-xs font-semibold tabular-nums ${waited < 15 ? "text-emerald-400" : waited <= 30 ? "text-amber-400" : "text-red-400"}`}>
                                {waited}m
                              </span>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  ) : eligibleParties.length > 0 ? (
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

              {/* Status section — hide for combined tables */}
              {!selectedTable.combinedTableIds && (
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
                        {selectedTable.status === s && <span className="text-[9px] opacity-60">current</span>}
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* Split or Remove */}
              <div className="pt-1 border-t border-white/5">
                {selectedTable.combinedTableIds ? (
                  /* Combined table → Split button */
                  confirmSplit ? (
                    <div className="space-y-2">
                      <p className="text-xs text-zinc-400 text-center">
                        Split Tables {getCombinedLabel(selectedTable)} back to individual tables?
                      </p>
                      <div className="flex gap-2">
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setConfirmSplit(false)}
                          className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-white/10 text-zinc-400 text-xs font-medium hover:bg-zinc-700 transition-colors"
                        >
                          Cancel
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={handleSplitCombined}
                          className="flex-1 px-3 py-2 rounded-lg bg-violet-500/10 border border-violet-500/30 text-violet-400 text-xs font-medium hover:bg-violet-500/20 transition-colors"
                        >
                          Yes, Split
                        </motion.button>
                      </div>
                    </div>
                  ) : (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setConfirmSplit(true)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-zinc-500 text-xs font-medium hover:text-violet-400 hover:bg-violet-500/5 transition-colors"
                    >
                      <Unlink size={13} strokeWidth={1.5} />
                      Split Tables
                    </motion.button>
                  )
                ) : (
                  /* Normal table → Remove button */
                  confirmRemove ? (
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
                  )
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
