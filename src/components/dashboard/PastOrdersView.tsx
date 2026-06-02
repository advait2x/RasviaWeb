import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Filter, CheckCircle2, XCircle, Clock, Users, Receipt,
  RefreshCw, DollarSign, AlertTriangle, Loader2, Minus, Plus, RotateCcw,
} from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import type {
  PastOrdersFilter, PastOrdersRange, PastOrdersSort, PastOrdersStatus, PastOrdersType,
} from "@/context/DashboardContext";
import { Order, OrderItem, OrderStatus } from "@/types/dashboard";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DASH_BTN_ADD,
  DASH_MONEY_EMPHASIS,
  DASH_PAST_FILTER_SELECTED,
  ORDER_PILL_GROUP,
  ORDER_PILL_REFUND_FULL,
  ORDER_PILL_REFUND_PARTIAL,
  ORDER_STATUS_PILL,
} from "@/lib/dashboardUi";

const STATUS_CONFIG: Record<OrderStatus, { label: string; icon: typeof Clock }> = {
  pending: { label: "Pending", icon: Clock },
  preparing: { label: "Preparing", icon: Clock },
  ready: { label: "Ready", icon: CheckCircle2 },
  served: { label: "Served", icon: CheckCircle2 },
  completed: { label: "Completed", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", icon: XCircle },
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

import {
  orderTotalCents,
  remainingRefundable,
  orderHasStripeRefundPath,
  extractFunctionError,
} from "@/lib/order-refund";

function computeItemsCents(order: Order, quantities: Record<string, number>): number {
  let sum = 0;
  for (const it of order.items) {
    const qty = quantities[it.id] ?? 0;
    if (qty <= 0) continue;
    sum += Math.round(it.unitPrice * 100) * qty;
  }
  return sum;
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

  // Default the advanced filter panel open when landing on a Custom range -
  // e.g. a deep-link from Sales Reports - so the From/To inputs are visible.
  const [showFilters, setShowFilters] = useState(() => pastOrdersFilter.range === "custom");
  const [refundTarget, setRefundTarget] = useState<Order | null>(null);
  const [refundBusy, setRefundBusy] = useState(false);
  // Itemized refund quantities keyed by order item id.
  const [refundQuantities, setRefundQuantities] = useState<Record<string, number>>({});
  // When the manager types in the amount box directly we detach from item
  // selections so their typed value isn't overwritten.
  const [manualAmountDollars, setManualAmountDollars] = useState<string | null>(null);
  const [refundReason, setRefundReason] = useState("");

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
    setRefundQuantities({});
    setManualAmountDollars(null);
    setRefundReason("");
    setRefundTarget(order);
  };

  const closeRefund = () => {
    if (refundBusy) return;
    setRefundTarget(null);
  };

  // Supabase Edge Functions errors: see extractFunctionError in lib/order-refund.ts.

  const submitRefund = async () => {
    if (!refundTarget) return;
    const selectedItems = Object.entries(refundQuantities)
      .map(([orderItemId, qty]) => ({ order_item_id: Number(orderItemId), quantity: qty }))
      .filter((r) => Number.isFinite(r.order_item_id) && r.quantity > 0);

    // Default amount: manual entry overrides, otherwise derive from items,
    // otherwise fall back to remaining balance.
    const remaining = remainingRefundable(refundTarget);
    const itemsCents = computeItemsCents(refundTarget, refundQuantities);
    let cents: number;
    if (manualAmountDollars != null) {
      const parsed = Number(manualAmountDollars);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        toast.error("Enter a valid refund amount.");
        return;
      }
      cents = Math.round(parsed * 100);
    } else if (itemsCents > 0) {
      cents = itemsCents;
    } else {
      cents = remaining;
    }
    if (cents <= 0) { toast.error("Nothing to refund."); return; }
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
          reason: refundReason.trim() || undefined,
          items: selectedItems.length > 0 ? selectedItems : undefined,
        },
      });
      if (error) {
        const msg = await extractFunctionError(error);
        throw new Error(msg);
      }
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

  const adjustItemQty = (itemId: string, maxQty: number, delta: number) => {
    setRefundQuantities((prev) => {
      const current = prev[itemId] ?? 0;
      const next = Math.max(0, Math.min(maxQty, current + delta));
      const copy = { ...prev };
      if (next <= 0) delete copy[itemId]; else copy[itemId] = next;
      return copy;
    });
    // User is picking items - drop any manual override so the amount stays in
    // sync with the selection.
    setManualAmountDollars(null);
  };

  const selectAllItems = () => {
    if (!refundTarget) return;
    const next: Record<string, number> = {};
    for (const it of refundTarget.items) next[it.id] = it.quantity;
    setRefundQuantities(next);
    setManualAmountDollars(null);
  };

  const clearItemSelection = () => {
    setRefundQuantities({});
    setManualAmountDollars(null);
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
                  ? DASH_PAST_FILTER_SELECTED
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowFilters((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors",
            showFilters
              ? DASH_BTN_ADD
              : "bg-zinc-200/50 border border-zinc-300/40 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-zinc-700",
          )}
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
            const hasStripeHandle = orderHasStripeRefundPath(order);
            const canRefund = refundable > 0 && hasStripeHandle;
            // Keep the Refund control visible for partially-refunded orders so
            // managers can keep chipping away; only hard-disable when the
            // entire balance is gone or the order has no Stripe handle at all.

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
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${ORDER_PILL_GROUP}`}>
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
                    <span className={`flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded ${ORDER_STATUS_PILL[order.status]}`}>
                      <StatusIcon size={10} strokeWidth={1.5} />
                      {cfg.label}
                    </span>
                  </div>
                </div>

                {order.items.length > 0 && (
                  <div className="mb-2 space-y-1.5">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-zinc-400 truncate">
                          <span className="text-zinc-500 tabular-nums">{item.quantity}× </span>
                          {item.menuItemName}
                        </span>
                        <span className="text-zinc-500 shrink-0 tabular-nums">${(item.unitPrice * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-1.5 border-t border-white/5 gap-2 flex-wrap">
                  <div className="flex items-center gap-3">
                    <span className={cn("text-sm font-bold tabular-nums", DASH_MONEY_EMPHASIS)}>
                      ${order.total.toFixed(2)}
                    </span>
                    {order.tipAmount != null && order.tipAmount > 0 && (
                      <span className="text-xs text-emerald-800 dark:text-emerald-400">+${order.tipAmount.toFixed(2)} tip</span>
                    )}
                    {fullyRefunded && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${ORDER_PILL_REFUND_FULL}`}>
                        Fully refunded
                      </span>
                    )}
                    {partiallyRefunded && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${ORDER_PILL_REFUND_PARTIAL}`}>
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
                    ) : hasStripeHandle ? (
                      <button
                        type="button"
                        disabled
                        title="This order has already been fully refunded."
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800/40 border border-white/5 text-zinc-600 text-[11px] font-medium cursor-not-allowed"
                      >
                        <DollarSign size={11} strokeWidth={2} />
                        Refunded
                      </button>
                    ) : (
                      <span className="text-[10px] text-zinc-600">Refund unavailable</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <RefundDialog
        order={refundTarget}
        busy={refundBusy}
        quantities={refundQuantities}
        manualAmountDollars={manualAmountDollars}
        reason={refundReason}
        onAdjustItemQty={adjustItemQty}
        onSelectAllItems={selectAllItems}
        onClearItemSelection={clearItemSelection}
        onManualAmountChange={setManualAmountDollars}
        onReasonChange={setRefundReason}
        onClose={closeRefund}
        onSubmit={submitRefund}
      />
    </div>
  );
}

// ─── Refund dialog ────────────────────────────────────────────────────────────

type RefundDialogProps = {
  order: Order | null;
  busy: boolean;
  quantities: Record<string, number>;
  manualAmountDollars: string | null;
  reason: string;
  onAdjustItemQty: (itemId: string, maxQty: number, delta: number) => void;
  onSelectAllItems: () => void;
  onClearItemSelection: () => void;
  onManualAmountChange: (next: string | null) => void;
  onReasonChange: (next: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

function RefundDialog({
  order, busy, quantities, manualAmountDollars, reason,
  onAdjustItemQty, onSelectAllItems, onClearItemSelection,
  onManualAmountChange, onReasonChange, onClose, onSubmit,
}: RefundDialogProps) {
  const totalCents = order ? orderTotalCents(order) : 0;
  const refundedCents = order?.refundedAmountCents ?? 0;
  const remainingCents = order ? remainingRefundable(order) : 0;
  const itemsCents = order ? computeItemsCents(order, quantities) : 0;

  // Effective refund amount (what we'll actually submit).
  const manualCents = (() => {
    if (manualAmountDollars == null) return null;
    const n = Number(manualAmountDollars);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.round(n * 100);
  })();
  const effectiveCents = manualCents != null
    ? manualCents
    : itemsCents > 0
      ? itemsCents
      : remainingCents;
  const overLimit = effectiveCents > remainingCents;
  const canSubmit = !busy && effectiveCents > 0 && !overLimit && order != null;

  const displayAmount = manualAmountDollars != null
    ? manualAmountDollars
    : (itemsCents > 0 ? (itemsCents / 100).toFixed(2) : (remainingCents / 100).toFixed(2));

  return (
    <Dialog open={order !== null} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="glass-modal border-white/10 bg-zinc-900/95 backdrop-blur-xl p-0 max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
        {order && (
          <>
            {/* Header */}
            <div className="p-5 border-b border-white/5 flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle size={18} strokeWidth={1.5} className="text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-zinc-100">Refund order #{order.id}</h3>
                <p className="text-xs text-zinc-500 truncate mt-0.5">
                  {order.guestName} · {order.orderType.replace("_", "-")} · {order.createdAt.toLocaleString()}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] tabular-nums">
                  <span className="text-zinc-400">Order total <span className="text-zinc-200 font-semibold">${(totalCents / 100).toFixed(2)}</span></span>
                  <span className="text-zinc-400">Refunded <span className={refundedCents > 0 ? "text-amber-300 font-semibold" : "text-zinc-200 font-semibold"}>${(refundedCents / 100).toFixed(2)}</span></span>
                  <span className="text-zinc-400">Available <span className="text-emerald-300 font-semibold">${(remainingCents / 100).toFixed(2)}</span></span>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-5">
              {/* Items */}
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Refund items</h4>
                    <p className="text-[11px] text-zinc-600">Pick the items (and quantities) you're refunding. Leave blank to refund a custom amount.</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={onSelectAllItems}
                      disabled={busy || order.items.length === 0}
                      className="text-[10px] px-2 py-1 rounded-md border border-white/10 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 disabled:opacity-50"
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      onClick={onClearItemSelection}
                      disabled={busy}
                      className="text-[10px] px-2 py-1 rounded-md border border-white/10 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 disabled:opacity-50 flex items-center gap-1"
                    >
                      <RotateCcw size={10} strokeWidth={2} /> Reset
                    </button>
                  </div>
                </div>
                <div className="rounded-lg border border-white/5 bg-zinc-800/40 divide-y divide-white/5">
                  {order.items.length === 0 ? (
                    <div className="px-3 py-4 text-xs text-zinc-500 text-center">No items on this order.</div>
                  ) : (
                    order.items.map((it) => (
                      <RefundItemRow
                        key={it.id}
                        item={it}
                        selectedQty={quantities[it.id] ?? 0}
                        disabled={busy}
                        onDec={() => onAdjustItemQty(it.id, it.quantity, -1)}
                        onInc={() => onAdjustItemQty(it.id, it.quantity, +1)}
                      />
                    ))
                  )}
                </div>
                {itemsCents > 0 && manualAmountDollars == null && (
                  <div className="flex justify-end text-[11px] text-zinc-400 tabular-nums">
                    Items subtotal <span className="ml-2 text-amber-300 font-semibold">${(itemsCents / 100).toFixed(2)}</span>
                  </div>
                )}
              </section>

              {/* Custom amount */}
              <section className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Refund amount (USD)</label>
                  {manualAmountDollars != null && (
                    <button
                      type="button"
                      onClick={() => onManualAmountChange(null)}
                      disabled={busy}
                      className="text-[10px] text-amber-400 hover:text-amber-300"
                    >
                      Use items subtotal
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    disabled={busy}
                    value={displayAmount}
                    onChange={(e) => onManualAmountChange(e.target.value)}
                    className="w-full bg-zinc-800 border border-white/10 rounded-lg pl-7 pr-3 py-2.5 text-sm text-zinc-100 tabular-nums focus:outline-none focus:border-amber-500/40"
                  />
                </div>
                {overLimit && (
                  <p className="text-[11px] text-red-400">
                    Amount exceeds the available balance of ${(remainingCents / 100).toFixed(2)}.
                  </p>
                )}
              </section>

              {/* Reason */}
              <section className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Reason <span className="text-zinc-600 font-normal normal-case">(optional - logged with the refund & sent to Stripe)</span>
                </label>
                <textarea
                  disabled={busy}
                  value={reason}
                  onChange={(e) => onReasonChange(e.target.value)}
                  placeholder="e.g. Customer received the wrong dish"
                  rows={2}
                  maxLength={500}
                  className="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/40 resize-none"
                />
                <div className="text-[10px] text-zinc-600 text-right tabular-nums">{reason.length}/500</div>
              </section>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-white/5 flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="py-2.5 px-4 rounded-lg bg-zinc-800 border border-white/10 text-zinc-300 text-sm font-medium hover:bg-zinc-700 transition-colors disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSubmit}
                disabled={!canSubmit}
                className="flex-1 py-2.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-sm font-semibold hover:bg-red-500/25 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {busy && <Loader2 size={14} className="animate-spin" />}
                Refund ${(effectiveCents / 100).toFixed(2)}
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RefundItemRow({
  item, selectedQty, disabled, onDec, onInc,
}: {
  item: OrderItem;
  selectedQty: number;
  disabled: boolean;
  onDec: () => void;
  onInc: () => void;
}) {
  const lineCents = Math.round(item.unitPrice * 100) * selectedQty;
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-zinc-100 truncate">{item.menuItemName}</p>
        <p className="text-[11px] text-zinc-500 tabular-nums">
          ${item.unitPrice.toFixed(2)} · ordered {item.quantity}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          disabled={disabled || selectedQty <= 0}
          onClick={onDec}
          className="w-7 h-7 rounded-md bg-zinc-900 border border-white/10 text-zinc-300 hover:bg-zinc-700 disabled:opacity-40 flex items-center justify-center"
          aria-label="Decrease"
        >
          <Minus size={12} strokeWidth={2.5} />
        </button>
        <span className="w-7 text-center text-sm tabular-nums text-zinc-100">{selectedQty}</span>
        <button
          type="button"
          disabled={disabled || selectedQty >= item.quantity}
          onClick={onInc}
          className="w-7 h-7 rounded-md bg-zinc-900 border border-white/10 text-zinc-300 hover:bg-zinc-700 disabled:opacity-40 flex items-center justify-center"
          aria-label="Increase"
        >
          <Plus size={12} strokeWidth={2.5} />
        </button>
        <span className="min-w-[60px] text-right text-xs tabular-nums text-zinc-400">
          ${(lineCents / 100).toFixed(2)}
        </span>
      </div>
    </div>
  );
}
