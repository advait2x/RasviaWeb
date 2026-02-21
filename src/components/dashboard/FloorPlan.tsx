import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Clock, LogOut, Armchair } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import { TableInfo } from "@/types/dashboard";
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

export default function FloorPlan() {
  const { tables, clearTable, quickSeatNext, waitlist } = useDashboard();
  const [selectedTable, setSelectedTable] = useState<TableInfo | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const waitingCount = waitlist.filter((w) => w.status === "waiting").length;

  const handleTableTap = (table: TableInfo) => {
    if (table.status === "available") {
      // Quick seat next party
      if (waitingCount > 0) {
        const seated = quickSeatNext(table.id);
        if (seated) {
          showToast(`${seated.guestName} seated at Table ${table.tableNumber}`);
        }
      } else {
        showToast("No parties waiting");
      }
    } else if (table.status === "occupied") {
      setSelectedTable(table);
      setShowDetails(true);
    }
  };

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const handleClearTable = () => {
    if (selectedTable) {
      clearTable(selectedTable.id);
      setShowDetails(false);
      setSelectedTable(null);
      showToast(`Table ${selectedTable.tableNumber} is now available`);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-lg font-semibold text-zinc-100 tracking-tight">
          Floor Plan
        </h2>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm border-2 border-emerald-500 bg-transparent" />
            <span className="text-zinc-400">Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-zinc-700 border border-zinc-600" />
            <span className="text-zinc-400">Occupied</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm border-2 border-blue-500 bg-transparent" />
            <span className="text-zinc-400">Reserved</span>
          </div>
        </div>
      </div>

      {/* Floor Grid */}
      <div className="flex-1 p-4 floor-grid rounded-lg mx-4 mb-4">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3 h-full content-start">
          {tables.map((table, index) => (
            <motion.button
              key={table.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, delay: index * 0.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => handleTableTap(table)}
              className={`relative p-4 rounded-xl border transition-all duration-200 text-left min-h-[120px] flex flex-col justify-between ${
                table.status === "available"
                  ? "bg-zinc-900/40 border-emerald-500/30 hover:border-emerald-500/60 hover:bg-zinc-800/40"
                  : table.status === "occupied"
                  ? "bg-zinc-800/80 border-zinc-700 hover:border-zinc-600"
                  : "bg-zinc-900/40 border-blue-500/30 hover:border-blue-500/50"
              }`}
            >
              <div className="flex items-start justify-between">
                <span className="text-2xl font-bold text-zinc-200 tabular-nums">
                  {table.tableNumber}
                </span>
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    table.status === "available"
                      ? "bg-emerald-500"
                      : table.status === "occupied"
                      ? "bg-amber-500"
                      : "bg-blue-500"
                  }`}
                />
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
                        seated {getSeatedDuration(table.seatedAt)} ago
                      </span>
                    </div>
                  </>
                )}
                {table.status === "available" && (
                  <div className="flex items-center gap-1.5">
                    <Armchair size={14} strokeWidth={1.5} className="text-emerald-500/60" />
                    <span className="text-xs text-zinc-500">
                      Seats {table.capacity} · Tap to seat
                    </span>
                  </div>
                )}
                {table.status === "reserved" && (
                  <span className="text-xs text-blue-400 font-medium">Reserved</span>
                )}
              </div>
            </motion.button>
          ))}
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

      {/* Party Details Modal */}
      <Dialog open={showDetails} onOpenChange={(o) => !o && setShowDetails(false)}>
        <DialogContent className="glass-modal max-w-sm border-white/10 bg-zinc-900/95 backdrop-blur-xl p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-white/5">
            <DialogTitle className="text-xl font-bold text-zinc-100 tracking-tight">
              Table {selectedTable?.tableNumber} Details
            </DialogTitle>
          </DialogHeader>
          {selectedTable && (
            <div className="p-6 space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-500">Guest</span>
                  <span className="text-sm font-semibold text-zinc-100">
                    {selectedTable.guestName}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-500">Party Size</span>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20">
                    <Users size={12} strokeWidth={1.5} className="text-amber-500" />
                    <span className="text-sm font-semibold text-amber-500 tabular-nums">
                      {selectedTable.partySize}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-500">Seated Duration</span>
                  <span className={`text-sm font-semibold tabular-nums ${getTimerColor(selectedTable.seatedAt)}`}>
                    {getSeatedDuration(selectedTable.seatedAt)}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleClearTable}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-zinc-800 border border-white/10 text-zinc-300 font-medium text-sm hover:bg-zinc-700 transition-colors"
                >
                  <LogOut size={16} strokeWidth={1.5} />
                  Clear Table
                </motion.button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
