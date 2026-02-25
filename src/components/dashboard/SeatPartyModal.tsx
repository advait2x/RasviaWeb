import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, Users, X, Link2, Armchair } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import { TableInfo, WaitlistEntry } from "@/types/dashboard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SeatPartyModalProps {
  open: boolean;
  onClose: () => void;
  entry: WaitlistEntry | null;
}

/** All subsets of `available` tables whose combined capacity exactly fits partySize (>=) but is as tight as possible.
 *  Returns combos sorted by total capacity (tightest first), then by number of tables (fewest first). */
function getCombinations(tables: TableInfo[], partySize: number): TableInfo[][] {
  const available = tables.filter(
    (t) => t.status === "available" && !t.isCombinedChild
  );

  const results: TableInfo[][] = [];

  function backtrack(start: number, current: TableInfo[], currentCap: number) {
    if (currentCap >= partySize) {
      results.push([...current]);
      return; // don't add more once satisfied
    }
    for (let i = start; i < available.length; i++) {
      current.push(available[i]);
      backtrack(i + 1, current, currentCap + available[i].capacity);
      current.pop();
    }
  }

  backtrack(0, [], 0);

  // Deduplicate by sorted id string
  const seen = new Set<string>();
  const unique: TableInfo[][] = [];
  for (const combo of results) {
    const key = combo
      .map((t) => t.id)
      .sort()
      .join(",");
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(combo);
    }
  }

  // Sort: tightest capacity first, then fewest tables
  unique.sort((a, b) => {
    const capA = a.reduce((s, t) => s + t.capacity, 0);
    const capB = b.reduce((s, t) => s + t.capacity, 0);
    if (capA !== capB) return capA - capB;
    return a.length - b.length;
  });

  // Cap at 12 results for UI clarity
  return unique.slice(0, 12);
}

type TabMode = "single" | "combine";

export default function SeatPartyModal({ open, onClose, entry }: SeatPartyModalProps) {
  const { tables, seatParty, combineTablesForParty } = useDashboard();
  const [tab, setTab] = useState<TabMode>("single");
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [selectedCombo, setSelectedCombo] = useState<TableInfo[] | null>(null);
  const [confirming, setConfirming] = useState(false);

  const availableTables = tables.filter(
    (t) => t.status === "available" && !t.isCombinedChild
  );

  // Single tables that fit the party
  const fittingTables = availableTables.filter(
    (t) => entry ? t.capacity >= entry.partySize : false
  );

  // Multi-table combinations that fit (only relevant when no single table fits, or always offer it)
  const combinations = useMemo(
    () => (entry ? getCombinations(tables, entry.partySize) : []),
    // Only recalculate when entry + tables change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entry?.id, tables]
  );

  // Only show multi-table combos that use 2+ tables (exclude single-table results)
  const multiCombinations = combinations.filter((c) => c.length >= 2);

  const handleSelectTable = (tableId: string) => {
    setSelectedTable(tableId);
    setSelectedCombo(null);
    setConfirming(true);
  };

  const handleSelectCombo = (combo: TableInfo[]) => {
    setSelectedCombo(combo);
    setSelectedTable(null);
    setConfirming(true);
  };

  const handleConfirm = async () => {
    if (!entry) return;

    if (selectedTable) {
      await seatParty(entry.id, selectedTable);
    } else if (selectedCombo && selectedCombo.length > 0) {
      if (selectedCombo.length === 1) {
        await seatParty(entry.id, selectedCombo[0].id);
      } else {
        const ids = selectedCombo.map((t) => t.id);
        const newCombinedId = combineTablesForParty(ids);
        if (newCombinedId) {
          await seatParty(entry.id, newCombinedId);
        }
      }
    }
    handleClose();
  };

  const handleClose = () => {
    setSelectedTable(null);
    setSelectedCombo(null);
    setConfirming(false);
    setTab("single");
    onClose();
  };

  const selectedTableInfo = tables.find((t) => t.id === selectedTable);

  const comboCapacity = selectedCombo
    ? selectedCombo.reduce((s, t) => s + t.capacity, 0)
    : 0;
  const comboLabel = selectedCombo
    ? selectedCombo
        .map((t) => t.tableNumber)
        .sort((a, b) => a - b)
        .join(" + ")
    : "";

  if (!entry) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="glass-modal max-w-2xl border-white/10 bg-zinc-900/95 backdrop-blur-xl p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-white/5">
          <DialogTitle className="text-xl font-bold text-zinc-100 tracking-tight">
            {confirming ? "Confirm Seating" : "Select a Table"}
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {!confirming ? (
            <motion.div
              key="table-select"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-6"
            >
              {/* Guest Info */}
              <div className="flex items-center gap-3 mb-5 p-3 rounded-lg bg-zinc-800/60 border border-white/5">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/20">
                  <Users size={14} strokeWidth={1.5} className="text-amber-500" />
                  <span className="text-sm font-semibold text-amber-500 tabular-nums">
                    {entry.partySize}
                  </span>
                </div>
                <span className="text-base font-bold text-zinc-100">{entry.guestName}</span>
              </div>

              {/* Tab switcher */}
              <div className="flex gap-1 mb-4 p-1 rounded-xl bg-zinc-800/60 border border-white/5 w-fit">
                <button
                  onClick={() => setTab("single")}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    tab === "single"
                      ? "bg-zinc-700 text-zinc-100"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  Single Table
                </button>
                <button
                  onClick={() => setTab("combine")}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    tab === "combine"
                      ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <Link2 size={11} strokeWidth={2} />
                  Combine Tables
                  {multiCombinations.length > 0 && (
                    <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-400">
                      {multiCombinations.length}
                    </span>
                  )}
                </button>
              </div>

              <AnimatePresence mode="wait">
                {tab === "single" ? (
                  <motion.div
                    key="single"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                  >
                    {/* Table Grid */}
                    <div className="grid grid-cols-4 gap-3">
                      {tables
                        .filter((t) => !t.isCombinedChild)
                        .map((table) => {
                          const isAvailable = table.status === "available";
                          const fits = table.capacity >= entry.partySize;
                          const isCombined = !!table.combinedTableIds?.length;
                          const canSelect = isAvailable && fits;

                          return (
                            <motion.button
                              key={table.id}
                              whileTap={canSelect ? { scale: 0.95 } : undefined}
                              onClick={() => canSelect && handleSelectTable(table.id)}
                              disabled={!canSelect}
                              className={`relative p-4 rounded-xl border text-left transition-all duration-150 ${
                                canSelect
                                  ? "bg-zinc-800/60 border-emerald-500/30 hover:border-emerald-500/60 hover:bg-zinc-800 cursor-pointer"
                                  : "bg-zinc-900/40 border-white/5 opacity-40 cursor-not-allowed"
                              }`}
                            >
                              <div className="flex items-center gap-1.5">
                                {isCombined && <Link2 size={12} strokeWidth={2} className="text-violet-400" />}
                                <span className="text-2xl font-bold text-zinc-200 tabular-nums">
                                  {isCombined
                                    ? (table.combinedTableIds ?? [])
                                        .map((cid) => tables.find((x) => x.id === cid)?.tableNumber ?? "?")
                                        .sort((a, b) => Number(a) - Number(b))
                                        .join("+")
                                    : table.tableNumber}
                                </span>
                              </div>
                              <div className="text-xs text-zinc-500 mt-1">
                                Seats {table.capacity}
                              </div>
                              {!isAvailable && (
                                <div className="absolute top-2 right-2">
                                  <div className={`w-2 h-2 rounded-full ${
                                    table.status === "occupied" ? "bg-amber-500" : "bg-blue-500"
                                  }`} />
                                </div>
                              )}
                              {isAvailable && (
                                <div className="absolute top-2 right-2">
                                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                </div>
                              )}
                              {isAvailable && !fits && (
                                <div className="text-[10px] text-red-400 mt-1">Too small</div>
                              )}
                            </motion.button>
                          );
                        })}
                    </div>

                    {fittingTables.length === 0 && availableTables.length === 0 && (
                      <div className="text-center py-8 text-zinc-500">
                        No tables available right now
                      </div>
                    )}
                    {fittingTables.length === 0 && availableTables.length > 0 && (
                      <div className="mt-4 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-center">
                        <p className="text-sm text-amber-400 font-medium">No single table fits a party of {entry.partySize}</p>
                        <button
                          onClick={() => setTab("combine")}
                          className="text-xs text-violet-400 underline mt-1 hover:text-violet-300 transition-colors"
                        >
                          Try combining tables →
                        </button>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="combine"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                  >
                    {multiCombinations.length === 0 ? (
                      <div className="text-center py-10 text-zinc-500">
                        <Link2 size={28} strokeWidth={1} className="mx-auto mb-3 text-zinc-700" />
                        <p className="text-sm">Not enough available tables to combine for a party of {entry.partySize}</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        {multiCombinations.map((combo, i) => {
                          const totalCap = combo.reduce((s, t) => s + t.capacity, 0);
                          const nums = combo
                            .map((t) => t.tableNumber)
                            .sort((a, b) => a - b);
                          const label = nums.join(" + ");
                          const capacityLabel = combo
                            .map((t) => t.capacity)
                            .sort((a, b) => b - a)
                            .join("+");

                          return (
                            <motion.button
                              key={i}
                              whileTap={{ scale: 0.97 }}
                              onClick={() => handleSelectCombo(combo)}
                              className="relative p-4 rounded-xl border border-violet-500/25 bg-violet-500/5 hover:bg-violet-500/12 hover:border-violet-500/50 text-left transition-all duration-150 group"
                            >
                              {/* Table number label */}
                              <div className="flex items-center gap-2 mb-2">
                                <Link2 size={13} strokeWidth={2} className="text-violet-400 shrink-0" />
                                <span className="text-lg font-bold text-zinc-100 tabular-nums">
                                  Tables {label}
                                </span>
                              </div>

                              {/* Individual seat chips */}
                              <div className="flex flex-wrap gap-1.5 mb-3">
                                {nums.map((num, j) => {
                                  const tableObj = combo.find((t) => t.tableNumber === num)!;
                                  return (
                                    <span
                                      key={j}
                                      className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800 border border-white/8 text-xs text-zinc-400"
                                    >
                                      <Armchair size={10} strokeWidth={1.5} className="text-emerald-500/60" />
                                      {tableObj.capacity}
                                    </span>
                                  );
                                })}
                              </div>

                              {/* Total capacity badge */}
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-zinc-500">{capacityLabel} seats</span>
                                <span className="text-xs font-semibold text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full">
                                  {totalCap} total
                                </span>
                              </div>
                            </motion.button>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="p-6"
            >
              {/* Confirmation Display */}
              <div className="flex items-center justify-center gap-6 py-8">
                <div className="text-center">
                  <p className="text-sm text-zinc-500 mb-1">Guest</p>
                  <p className="text-xl font-bold text-zinc-100">{entry.guestName}</p>
                  <div className="flex items-center justify-center gap-1 mt-2">
                    <Users size={14} strokeWidth={1.5} className="text-amber-500" />
                    <span className="text-sm font-semibold text-amber-500">{entry.partySize}</span>
                  </div>
                </div>
                <ArrowRight size={24} strokeWidth={1.5} className="text-amber-500" />
                <div className="text-center">
                  <p className="text-sm text-zinc-500 mb-1">
                    {selectedCombo ? "Combined Table" : "Table"}
                  </p>
                  {selectedTableInfo && (
                    <>
                      <p className="text-4xl font-bold text-zinc-100 tabular-nums">
                        {selectedTableInfo.combinedTableIds
                          ? selectedTableInfo.combinedTableIds
                              .map((cid) => tables.find((x) => x.id === cid)?.tableNumber ?? "?")
                              .sort((a, b) => Number(a) - Number(b))
                              .join("+")
                          : selectedTableInfo.tableNumber}
                      </p>
                      <p className="text-xs text-zinc-500 mt-1">Seats {selectedTableInfo.capacity}</p>
                    </>
                  )}
                  {selectedCombo && (
                    <>
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <Link2 size={16} strokeWidth={2} className="text-violet-400" />
                        <p className="text-2xl font-bold text-zinc-100 tabular-nums">
                          {comboLabel}
                        </p>
                      </div>
                      <p className="text-xs text-violet-400 mt-1">{comboCapacity} seats combined</p>
                    </>
                  )}
                </div>
              </div>

              {selectedCombo && (
                <div className="mb-4 p-3 rounded-lg bg-violet-500/8 border border-violet-500/20 text-center">
                  <p className="text-xs text-violet-300">
                    Tables {comboLabel} will be combined into one table for this party
                  </p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex items-center gap-3 justify-end mt-4">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setConfirming(false);
                    setSelectedTable(null);
                    setSelectedCombo(null);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-800 border border-white/10 text-zinc-300 font-medium text-sm hover:bg-zinc-700 transition-colors"
                >
                  <X size={16} strokeWidth={1.5} />
                  Go Back
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleConfirm}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400 transition-colors amber-glow-sm"
                >
                  <Check size={16} strokeWidth={1.5} />
                  Confirm Seating
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

