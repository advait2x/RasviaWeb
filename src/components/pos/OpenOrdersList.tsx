import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Clock, Users, ChefHat, CheckCircle2 } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import type { Order, OrderStatus } from "@/types/dashboard";

interface OpenOrdersListProps {
  open: boolean;
  onClose: () => void;
  onSelectOrder: (order: Order) => void;
}

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
  preparing: "bg-blue-500/10 border-blue-500/30 text-blue-400",
  ready: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
  served: "bg-violet-500/10 border-violet-500/30 text-violet-400",
  completed: "bg-zinc-700/30 border-zinc-600/30 text-zinc-400",
  cancelled: "bg-red-500/10 border-red-500/30 text-red-400",
};

function timeSince(date: Date): string {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export default function OpenOrdersList({ open, onClose, onSelectOrder }: OpenOrdersListProps) {
  const { orders } = useDashboard();

  const activeOrders = useMemo(
    () => orders.filter((o) => !["completed", "cancelled"].includes(o.status))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    [orders]
  );

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
          className="w-full max-w-lg max-h-[70vh] rounded-2xl border border-white/10 bg-zinc-900/95 backdrop-blur-xl overflow-hidden flex flex-col"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <h3 className="text-base font-bold text-zinc-100">Open Orders ({activeOrders.length})</h3>
            <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300"><X size={18} /></button>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-2">
            {activeOrders.length === 0 && (
              <div className="text-center py-12 text-zinc-500">
                <p className="text-sm font-medium">No open orders</p>
              </div>
            )}
            {activeOrders.map((order) => (
              <motion.button
                key={order.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => { onSelectOrder(order); onClose(); }}
                className="w-full text-left px-4 py-3 rounded-xl border border-white/5 bg-zinc-800/40 hover:border-amber-500/20 transition-all"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-300 bg-zinc-700/50 px-2 py-0.5 rounded">
                      T{order.tableNumber}
                    </span>
                    <span className="text-sm font-semibold text-zinc-100">{order.guestName}</span>
                  </div>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${STATUS_COLORS[order.status]}`}>
                    {order.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-zinc-500">
                  <span className="flex items-center gap-1"><Users size={10} />{order.partySize}</span>
                  <span className="flex items-center gap-1"><Clock size={10} />{timeSince(order.createdAt)}</span>
                  <span>{order.items.length} items</span>
                  <span className="ml-auto font-bold text-amber-400">${order.total.toFixed(2)}</span>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
