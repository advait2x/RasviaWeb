import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Split, X, Check } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { Order } from "@/types/dashboard";

interface SplitBillModalProps {
  open: boolean;
  onClose: () => void;
  order: Order | null;
  onSplit: (itemIds: string[]) => void;
}

export default function SplitBillModal({ open, onClose, order, onSplit }: SplitBillModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const activeItems = useMemo(
    () => (order?.items ?? []).filter((i) => !i.voided && !i.comped),
    [order]
  );

  const toggleItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectedTotal = useMemo(
    () => activeItems.filter((i) => selectedIds.has(i.id)).reduce((s, i) => s + i.unitPrice * i.quantity, 0),
    [activeItems, selectedIds]
  );

  const handleSplit = () => {
    if (selectedIds.size === 0) return;
    onSplit(Array.from(selectedIds));
    setSelectedIds(new Set());
    onClose();
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setSelectedIds(new Set()); onClose(); } }}>
      <DialogContent className="glass-modal max-w-md border-white/10 bg-zinc-900/95 backdrop-blur-xl p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
              <Split size={16} strokeWidth={1.5} className="text-amber-400" />
              Split Bill
            </h3>
            <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300"><X size={16} /></button>
          </div>

          <p className="text-xs text-zinc-500">
            Select items to move to a new separate order
          </p>

          <div className="space-y-1.5 max-h-60 overflow-auto">
            {activeItems.map((item) => {
              const isSelected = selectedIds.has(item.id);
              return (
                <motion.button
                  key={item.id}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => toggleItem(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left ${
                    isSelected
                      ? "bg-amber-500/10 border-amber-500/30"
                      : "bg-zinc-800/40 border-white/5 hover:border-white/10"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 ${
                    isSelected ? "bg-amber-500 border-amber-500" : "border-zinc-600"
                  }`}>
                    {isSelected && <Check size={12} strokeWidth={2.5} className="text-black" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-zinc-500 tabular-nums">{item.quantity}x </span>
                    <span className="text-sm text-zinc-100">{item.menuItemName}</span>
                  </div>
                  <span className="text-sm font-semibold text-amber-400 tabular-nums">
                    ${(item.unitPrice * item.quantity).toFixed(2)}
                  </span>
                </motion.button>
              );
            })}
          </div>

          {selectedIds.size > 0 && (
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-800/60 border border-white/5">
              <span className="text-xs text-zinc-400">{selectedIds.size} item(s) selected</span>
              <span className="text-sm font-bold text-amber-400">${selectedTotal.toFixed(2)}</span>
            </div>
          )}

          <div className="flex gap-3">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => { setSelectedIds(new Set()); onClose(); }}
              className="flex-1 py-2.5 rounded-xl bg-zinc-800 border border-white/10 text-zinc-300 text-sm font-medium hover:bg-zinc-700 transition-colors"
            >
              Cancel
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleSplit}
              disabled={selectedIds.size === 0}
              className="flex-1 py-2.5 rounded-xl bg-amber-500 text-black text-sm font-bold hover:bg-amber-400 transition-colors disabled:opacity-40"
            >
              Split ({selectedIds.size} items)
            </motion.button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
