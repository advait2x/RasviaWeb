import { motion, AnimatePresence } from "framer-motion";
import { X, Map } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";

interface TableQuickSelectProps {
  open: boolean;
  onClose: () => void;
  onSelectTable: (tableId: string) => void;
}

export default function TableQuickSelect({ open, onClose, onSelectTable }: TableQuickSelectProps) {
  const { tables } = useDashboard();
  const visibleTables = tables.filter((t) => !t.isCombinedChild);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900/95 backdrop-blur-xl overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <Map size={16} strokeWidth={1.5} className="text-amber-400" />
              Transfer to Table
            </h3>
            <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300"><X size={18} /></button>
          </div>

          <div className="p-5">
            <div className="grid grid-cols-5 gap-2">
              {visibleTables.map((table) => {
                const statusColor = table.status === "available"
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  : table.status === "occupied"
                  ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                  : table.status === "reserved"
                  ? "bg-blue-500/10 border-blue-500/20 text-blue-400"
                  : "bg-zinc-800/40 border-white/5 text-zinc-600";

                return (
                  <motion.button
                    key={table.id}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => { onSelectTable(table.id); onClose(); }}
                    className={`h-14 rounded-xl border text-sm font-bold transition-all hover:brightness-125 ${statusColor}`}
                  >
                    <div className="text-center">
                      <div>T{table.tableNumber}</div>
                      <div className="text-[9px] font-normal opacity-70">{table.capacity} seats</div>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            <div className="flex items-center gap-4 mt-4 justify-center text-[10px] text-zinc-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />Available</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" />Occupied</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" />Reserved</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
