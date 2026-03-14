import { motion, AnimatePresence } from "framer-motion";
import { X, PauseCircle, Clock, Play } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";

interface HeldOrdersListProps {
  open: boolean;
  onClose: () => void;
  onResume: (heldOrderId: string) => void;
}

function timeSince(date: Date): string {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
}

export default function HeldOrdersList({ open, onClose, onResume }: HeldOrdersListProps) {
  const { heldOrders } = useDashboard();

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
          className="w-full max-w-md max-h-[60vh] rounded-2xl border border-white/10 bg-zinc-900/95 backdrop-blur-xl overflow-hidden flex flex-col"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <PauseCircle size={16} strokeWidth={1.5} className="text-amber-400" />
              Held Orders ({heldOrders.length})
            </h3>
            <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300"><X size={18} /></button>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-2">
            {heldOrders.length === 0 && (
              <div className="text-center py-12 text-zinc-500">
                <PauseCircle size={32} strokeWidth={1} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">No held orders</p>
              </div>
            )}
            {heldOrders.map((held) => {
              const data = held.orderData;
              const items = (data.items as Array<{ name: string; quantity: number }>) ?? [];
              const guestName = (data.guestName as string) ?? "Guest";
              const total = (data.total as number) ?? 0;

              return (
                <div
                  key={held.id}
                  className="px-4 py-3 rounded-xl border border-white/5 bg-zinc-800/40"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold text-zinc-100">{guestName}</p>
                      <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                        <Clock size={10} />
                        <span>{timeSince(held.createdAt)}</span>
                        {held.reason && <span className="text-zinc-600">· {held.reason}</span>}
                      </div>
                    </div>
                    <span className="text-sm font-bold text-amber-400">${total.toFixed(2)}</span>
                  </div>

                  {items.length > 0 && (
                    <div className="text-xs text-zinc-500 mb-2">
                      {items.slice(0, 3).map((item, i) => (
                        <span key={i}>{item.quantity}x {item.name}{i < Math.min(items.length, 3) - 1 ? ", " : ""}</span>
                      ))}
                      {items.length > 3 && <span> +{items.length - 3} more</span>}
                    </div>
                  )}

                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { onResume(held.id); onClose(); }}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold hover:bg-amber-500/15 transition-colors"
                  >
                    <Play size={12} strokeWidth={2} />
                    Resume Order
                  </motion.button>
                </div>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
