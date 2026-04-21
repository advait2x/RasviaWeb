import { useMemo } from "react";
import { motion } from "framer-motion";
import { ClipboardList } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import { DASH_HEADER_DOT, DASH_HEADER_DOT_PING } from "@/lib/dashboardUi";
import type { Order, OrderStatus } from "@/types/dashboard";

const INACTIVE_STATUSES: OrderStatus[] = ["served", "completed", "cancelled"];

function isActiveOrderStatus(status: string): boolean {
  if (INACTIVE_STATUSES.includes(status as OrderStatus)) return false;
  return true;
}

function formatStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ActiveOrdersWidget() {
  const { orders, setActiveView } = useDashboard();

  const active = useMemo(() => {
    return orders
      .filter((o) => isActiveOrderStatus(o.status))
      .slice()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 6);
  }, [orders]);

  return (
    <div className="card-premium flex h-full flex-col rounded-xl p-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
          <span className="relative flex h-2 w-2">
            <span className={DASH_HEADER_DOT_PING} />
            <span className={DASH_HEADER_DOT} />
          </span>
          Active orders
        </h3>
        <button
          type="button"
          onClick={() => setActiveView("orders")}
          className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 transition-colors hover:text-zinc-300"
        >
          View all
        </button>
      </div>

      {active.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-8 text-center">
          <div>
            <ClipboardList size={28} strokeWidth={1.5} className="mx-auto mb-3 text-zinc-600" />
            <p className="text-sm text-zinc-500">No active orders</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {active.map((order: Order, i: number) => (
            <motion.button
              key={order.id}
              type="button"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => setActiveView("orders")}
              className="flex w-full items-center justify-between gap-4 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-left transition-colors hover:border-white/[0.1] hover:bg-white/[0.04]"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-200">
                  {order.guestName || "Guest"}{" "}
                  <span className="text-zinc-500">· Table {order.tableNumber}</span>
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {order.items.length} item{order.items.length === 1 ? "" : "s"} · ${order.total.toFixed(2)}
                </p>
              </div>
              <span className="shrink-0 rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                {formatStatus(order.status)}
              </span>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}
