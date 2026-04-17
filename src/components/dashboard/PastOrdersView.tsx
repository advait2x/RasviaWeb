import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Filter, CheckCircle2, XCircle, Clock, Users, Receipt,
  RefreshCw, DollarSign, AlertTriangle, Loader2,
} from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import type {
  PastOrdersFilter, PastOrdersRange, PastOrdersSort, PastOrdersStatus, PastOrdersType,
} from "@/context/DashboardContext";
import { Order, OrderStatus } from "@/types/dashboard";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Pending", color: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400", icon: Clock },
  preparing: { label: "Preparing", color: "bg-blue-500/10 border-blue-500/30 text-blue-400", icon: Clock },
  ready: { label: "Ready", color: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400", icon: CheckCircle2 },
  served: { label: "Served", color: "bg-violet-500/10 border-violet-500/30 text-violet-400", icon: CheckCircle2 },
  completed: { label: "Completed", color: "bg-zinc-700/30 border-zinc-600/30 text-zinc-300", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "bg-red-500/10 border-red-500/30 text-red-400", icon: XCircle },
};

const RANGE_OPTIONS: { value: PastOrdersRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "custom", label: "Custom" },
];

const TYPE_OPTIONS: { value: PastOrdersType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "dine_in", label: "Dine-In" },
  { value: "takeout", label: "Takeout" },
  { value: "pre_order", label: "Pre-Order" },
  { value: "group", label: "Group" },
];

const STATUS_OPTIONS: { value: PastOrdersStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const SORT_OPTIONS: { value: PastOrdersSort; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "amount_desc", label: "Highest total" },
  { value: "amount_asc", label: "Lowest total" },
];

function orderTotalCents(order: Order): number {
  return Math.round(((order.subtotal ?? 0) + (order.tipAmount ?? 0)) * 100);
}

function remainingRefundable(order: Order): number {
  const total = orderTotalCents(order);
  const refunded = order.refundedAmountCents ?? 0;
  return Math.max(0, total - refunded);
}

function toLocalInputValue(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInputValue(v: string): string | undefined {
  if (!v) return undefined;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

export default function PastOrdersView() {
  const {
    pastOrders, pastOrdersLoading, pastOrdersFilter, setPastOrdersFilter, fetchPastOrders,
  } = useDashboard();

  // Default the advanced filter panel open when landing on a Custom range —
  // e.g. a deep-link from Sales Reports — so the From/To inputs are visible.
  const [showFilters, setShowFilters] = useState(() => pastOrdersFilter.range === "custom");
  const [refundTarget, setRefundTarget] = useState<Order | null>(null);
  const [refundBusy, setRefundBusy] = useState(false);
  const [refundAmountDollars, setRefundAmountDollars] = useState("");

  useEffect(() => {
    void fetchPastOrders();
  }, [fetchPastOrders, pastOrdersFilter.range, pastOrdersFilter.type, pastOrdersFilter.status,
      pastOrdersFilter.sort, pastOrdersFilter.from, pastOrdersFilter.to]);

  const updateFilter = (patch: Partial<PastOrdersFilter>) => {
    setPastOrdersFilter({ ...pastOrdersFilter, ...patch });
  };

  const filteredOrders = useMemo(() => {
    if (!pastOrdersFilter.search.trim()) return pastOrders;
    const q = pastOrdersFilter.search.toLowerCase();
    return pastOrders.filter((o) =>
      o.id.toLowerCase().includes(q) ||
      o.guestName.toLowerCase().includes(q) ||
      (o.customerPhone ?? "").toLowerCase().includes(q) ||
      o.items.some((i) => i.menuItemName.toLowerCase().includes(q))
    );
  }, [pastOrders, pastOrdersFilter.search]);

  const totals = useMemo(() => {
    const sum = filteredOrders.reduce((acc, o) => acc + o.total, 0);
    return { count: filteredOrders.length, sum };
  }, [filteredOrders]);

  const openRefund = (order: Order) => {
    const rem = remainingRefundable(order) / 100;
    setRefundAmountDollars(rem > 0 ? rem.toFixed(2) : "");
    setRefundTarget(order);
  };

  const submitRefund = async () => {
    if (!refundTarget) return;
    const parsed = Number(refundAmountDollars);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error("Enter a valid refund amount.");
      return;
    }
    const cents = Math.round(parsed * 100);
    const remaining = remainingRefundable(refundTarget);
    if (cents > remaining) {
      toast.error(`Amount exceeds refundable balance of $${(remaining / 100).toFixed(2)}.`);
      return;
    }
    setRefundBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("refund-order", {
        body: {
          order_id: Number(refundTarget.id),
          amount_cents: cents,
        },
      });
      if (error) throw error;
      if (data && typeof data === "object" && "error" in data && data.error) {
        throw new Error(String((data as { error: string }).error));
      }
      toast.success(`Refunded $${(cents / 100).toFixed(2)}.`);
      setRefundTarget(null);
      await fetchPastOrders();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Refund failed.";
      toast.error(msg);
    } finally {
      setRefundBusy(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Filter bar */}
      <div className="px-5 pb-3 flex flex-wrap items-center gap-2">
        <div className="flex gap-1 p-1 rounded-lg bg-zinc-800/60 border border-white/5">
          {RANGE_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => {
                updateFilter({ range: value });
                // Auto-expand the advanced filter panel when the user picks
                // Custom so the From/To datetime inputs are visible without
                // a second click.
                if (value === "custom") setShowFilters(true);
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                pastOrdersFilter.range === value
                  ? "bg-amber-500/15 text-amber-400"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowFilters((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
            showFilters
              ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
              : "bg-zinc-800 border-white/10 text-zinc-400 hover:bg-zinc-700"
          }`}
        >
          <Filter size={13} strokeWidth={1.5} />
          More
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => void fetchPastOrders()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 border border-white/10 text-zinc-400 text-xs font-medium hover:bg-zinc-700 transition-colors"
        >
          <RefreshCw size={13} strokeWidth={1.5} className={pastOrdersLoading ? "animate-spin" : ""} />
          Refresh
        </motion.button>

        <div className="ml-auto text-xs text-zinc-500 tabular-nums">
          {totals.count} order{totals.count === 1 ? "" : "s"} · ${totals.sum.toFixed(2)}
        </div>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-5 pb-3 overflow-hidden"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-zinc-800/40 border border-white/5">
              {pastOrdersFilter.range === "custom" && (
                <>
                  <label className="flex flex-col gap-1 text-[11px] text-zinc-400">
                    From
                    <input
                      type="datetime-local"
                      value={toLocalInputValue(pastOrdersFilter.from)}
                      onChange={(e) => updateFilter({ from: fromLocalInputValue(e.target.value) })}
                      className="bg-zinc-900 border border-white/10 rounded-md px-2 py-1.5 text-xs text-zinc-200"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-[11px] text-zinc-400">
                    To
                    <input
                      type="datetime-local"
                      value={toLocalInputValue(pastOrdersFilter.to)}
                      onChange={(e) => updateFilter({ to: fromLocalInputValue(e.target.value) })}
                      className="bg-zinc-900 border border-white/10 rounded-md px-2 py-1.5 text-xs text-zinc-200"
                    />
                  </label>
                </>
              )}

              <label className="flex flex-col gap-1 text-[11px] text-zinc-400">
                Order Type
                <select
                  value={pastOrdersFilter.type}
                  onChange={(e) => updateFilter({ type: e.target.value as PastOrdersType })}
                  className="bg-zinc-900 border border-white/10 rounded-md px-2 py-1.5 text-xs text-zinc-200"
                >
                  {TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-[11px] text-zinc-400">
                Status
                <select
                  value={pastOrdersFilter.status}
                  onChange={(e) => updateFilter({ status: e.target.value as PastOrdersStatus })}
                  className="bg-zinc-900 border border-white/10 rounded-md px-2 py-1.5 text-xs text-zinc-200"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-[11px] text-zinc-400">
                Sort
                <select
                  value={pastOrdersFilter.sort}
                  onChange={(e) => updateFilter({ sort: e.target.value as PastOrdersSort })}
                  className="bg-zinc-900 border border-white/10 rounded-md px-2 py-1.5 text-xs text-zinc-200"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      <div className="px-5 pb-3">
        <div className="relative">
          <Search size={15} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <Input
            value={pastOrdersFilter.search}
            onChange={(e) => updateFilter({ search: e.target.value })}
            placeholder="Search by order #, guest, phone, or item..."
            className="pl-9 h-10 bg-zinc-800/60 border-white/10 text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500/50"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-5 pb-4 space-y-2">
          {pastOrdersLoading && pastOrders.length === 0 && (
            <div className="text-center py-16 text-zinc-500 text-sm">Loading past orders…</div>
          )}
          {!pastOrdersLoading && filteredOrders.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-zinc-800/60 border border-white/5 flex items-center justify-center mx-auto mb-4">
                <Receipt size={28} strokeWidth={1} className="text-zinc-700" />
              </div>
              <p className="text-sm text-zinc-500 font-medium">No past orders match these filters</p>
              <p className="text-xs text-zinc-600 mt-1">Try widening the date range or clearing filters.</p>
            </div>
          )}

          {filteredOrders.map((order) => {
            const cfg = STATUS_CONFIG[order.status];
            const StatusIcon = cfg.icon;
            const refundedCents = order.refundedAmountCents ?? 0;
            const totalCents = orderTotalCents(order);
            const fullyRefunded = refundedCents > 0 && refundedCents >= totalCents;
            const partiallyRefunded = refundedCents > 0 && !fullyRefunded;
            const refundable = remainingRefundable(order);
            const canRefund = refundable > 0 && (
              !!order.stripePaymentIntentId || !!order.partySessionId
            );

            return (
              <div
                key={order.id}
                className="rounded-xl border border-white/5 bg-zinc-800/40 hover:border-white/10 transition-all duration-200 p-3"
              >
                <div className="flex items-start justify-between mb-2 gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-zinc-100">#{order.id} · {order.guestName}</p>
                      {order.partySessionId && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded border border-purple-500/30 bg-purple-500/10 text-purple-300">
                          Group
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 text-xs text-zinc-500">
                      <Users size={11} strokeWidth={1.5} />
                      <span>{order.partySize}</span>
                      <span className="text-zinc-700">·</span>
                      <Clock size={11} strokeWidth={1.5} />
                      <span>{order.createdAt.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${cfg.color}`}>
                      <StatusIcon size={10} strokeWidth={1.5} />
                      {cfg.label}
                    </span>
                  </div>
                </div>

                {order.items.length > 0 && (
                  <div className="mb-2 space-y-0.5">
                    {order.items.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-xs">
                        <span className="text-zinc-400 truncate">
                          <span className="text-zinc-500 tabular-nums">{item.quantity}× </span>
                          {item.menuItemName}
                        </span>
                        <span className="text-zinc-500 tabular-nums">${(item.unitPrice * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <p className="text-[10px] text-zinc-600">+{order.items.length - 3} more items</p>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-1.5 border-t border-white/5 gap-2 flex-wrap">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-amber-400 tabular-nums">
                      ${order.total.toFixed(2)}
                    </span>
                    {order.tipAmount != null && order.tipAmount > 0 && (
                      <span className="text-xs text-emerald-400">+${order.tipAmount.toFixed(2)} tip</span>
                    )}
                    {fullyRefunded && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded border border-red-500/30 bg-red-500/10 text-red-300">
                        Fully refunded
                      </span>
                    )}
                    {partiallyRefunded && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-300">
                        ${(refundedCents / 100).toFixed(2)} refunded
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {canRefund ? (
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => openRefund(order)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-[11px] font-medium hover:bg-red-500/20 transition-colors"
                      >
                        <DollarSign size={11} strokeWidth={2} />
                        Refund
                      </motion.button>
                    ) : (
                      <span className="text-[10px] text-zinc-600">
                        {refundable <= 0 ? "No refundable balance" : "Refund unavailable"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <Dialog open={refundTarget !== null} onOpenChange={(o) => !o && setRefundTarget(null)}>
        <DialogContent className="glass-modal max-w-sm border-white/10 bg-zinc-900/95 backdrop-blur-xl p-5">
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle size={18} strokeWidth={1.5} className="text-red-400" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-base font-semibold text-zinc-100">Refund order #{refundTarget?.id}</h3>
                <p className="text-xs text-zinc-400">
                  This will issue a Stripe refund to the customer. Remaining refundable:
                  {" "}
                  ${refundTarget ? (remainingRefundable(refundTarget) / 100).toFixed(2) : "0.00"}
                </p>
              </div>
            </div>
            <label className="flex flex-col gap-1 text-xs text-zinc-400">
              Refund amount (USD)
              <input
                type="number"
                min="0"
                step="0.01"
                value={refundAmountDollars}
                onChange={(e) => setRefundAmountDollars(e.target.value)}
                className="bg-zinc-800 border border-white/10 rounded-md px-3 py-2 text-sm text-zinc-100"
              />
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setRefundTarget(null)}
                disabled={refundBusy}
                className="flex-1 py-2.5 rounded-lg bg-zinc-800 border border-white/10 text-zinc-300 text-sm font-medium hover:bg-zinc-700 transition-colors disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={submitRefund}
                disabled={refundBusy}
                className="flex-1 py-2.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-sm font-semibold hover:bg-red-500/25 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {refundBusy && <Loader2 size={14} className="animate-spin" />}
                Refund
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
