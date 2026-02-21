import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, Users, X } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import { WaitlistEntry } from "@/types/dashboard";
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

export default function SeatPartyModal({ open, onClose, entry }: SeatPartyModalProps) {
  const { tables, seatParty } = useDashboard();
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const availableTables = tables.filter((t) => t.status === "available");

  const handleSelectTable = (tableId: string) => {
    setSelectedTable(tableId);
    setConfirming(true);
  };

  const handleConfirm = () => {
    if (entry && selectedTable) {
      seatParty(entry.id, selectedTable);
    }
    handleClose();
  };

  const handleClose = () => {
    setSelectedTable(null);
    setConfirming(false);
    onClose();
  };

  const selectedTableInfo = tables.find((t) => t.id === selectedTable);

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
              <div className="flex items-center gap-3 mb-6 p-3 rounded-lg bg-zinc-800/60 border border-white/5">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/20">
                  <Users size={14} strokeWidth={1.5} className="text-amber-500" />
                  <span className="text-sm font-semibold text-amber-500 tabular-nums">
                    {entry.partySize}
                  </span>
                </div>
                <span className="text-base font-bold text-zinc-100">{entry.guestName}</span>
              </div>

              {/* Table Grid */}
              <div className="grid grid-cols-4 gap-3">
                {tables.map((table) => {
                  const isAvailable = table.status === "available";
                  const fits = table.capacity >= entry.partySize;
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
                      <div className="text-2xl font-bold text-zinc-200 tabular-nums">
                        {table.tableNumber}
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

              {availableTables.length === 0 && (
                <div className="text-center py-8 text-zinc-500">
                  No tables available right now
                </div>
              )}
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
                  <p className="text-sm text-zinc-500 mb-1">Table</p>
                  <p className="text-4xl font-bold text-zinc-100 tabular-nums">
                    {selectedTableInfo?.tableNumber}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Seats {selectedTableInfo?.capacity}
                  </p>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-3 justify-end mt-4">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setConfirming(false);
                    setSelectedTable(null);
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
