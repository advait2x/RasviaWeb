"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, ChefHat, Flame, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import { useDashboard } from "@/context/DashboardContext";
import type { Order, OrderStatus } from "@/types/dashboard";

const DIET_COLORS: Record<string, string> = {
  veg: "bg-emerald-600/90",
  non_veg: "bg-red-600/90",
  halal: "bg-blue-600/90",
};

function playChime() {
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain).connect(ctx.destination);
  osc.frequency.value = 880;
  osc.type = "sine";
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
  osc.start();
  osc.stop(ctx.currentTime + 0.3);
}

function elapsedMin(date: Date) {
  return Math.floor((Date.now() - new Date(date).getTime()) / 60000);
}

function timeColor(min: number) {
  if (min < 10) return "text-emerald-700 dark:text-emerald-500/90";
  if (min < 20) return "text-amber-800 dark:text-amber-600/90";
  return "text-red-600 dark:text-red-500/90";
}

type Filter = "all" | "pending" | "preparing";

export default function KitchenDisplay() {
  const { orders, updateOrderStatus } = useDashboard();
  const [filter, setFilter] = useState<Filter>("all");
  const [, tick] = useState(0);
  const prevIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const id = setInterval(() => tick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const active = orders.filter(
    (o) => o.status === "pending" || o.status === "preparing"
  );

  useEffect(() => {
    const currentIds = new Set(active.map((o) => o.id));
    if (prevIds.current.size > 0) {
      for (const id of currentIds) {
        if (!prevIds.current.has(id)) {
          playChime();
          toast.info("New order received");
          break;
        }
      }
    }
    prevIds.current = currentIds;
  }, [active]);

  const filtered =
    filter === "all" ? active : active.filter((o) => o.status === filter);

  const avgWait =
    active.length > 0
      ? Math.round(
          active.reduce((s, o) => s + elapsedMin(o.createdAt), 0) /
            active.length
        )
      : 0;

  const bump = useCallback(
    (order: Order) => {
      const next: OrderStatus =
        order.status === "pending" ? "preparing" : "ready";
      updateOrderStatus(order.id, next);
      toast.success(
        `Order #${order.id.slice(-4)} → ${next.charAt(0).toUpperCase() + next.slice(1)}`
      );
    },
    [updateOrderStatus]
  );

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: "All Orders" },
    { key: "pending", label: "Pending" },
    { key: "preparing", label: "Preparing" },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden bg-zinc-100 p-3 text-zinc-900 dark:bg-stone-950 dark:text-stone-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-amber-700 dark:text-amber-600/85" />
            <span className="text-sm text-zinc-600 dark:text-stone-500">Active</span>
            <span className="text-lg font-semibold tabular-nums text-zinc-900 dark:text-stone-200">{active.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-zinc-500 dark:text-stone-500" />
            <span className="text-sm text-zinc-600 dark:text-stone-500">Avg Wait</span>
            <span className="text-lg font-semibold tabular-nums text-zinc-900 dark:text-stone-200">{avgWait}m</span>
          </div>
        </div>
        <div className="flex gap-2">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                filter === f.key
                  ? "bg-zinc-200 text-zinc-900 ring-1 ring-zinc-400/50 dark:bg-stone-800 dark:text-stone-100 dark:ring-stone-600/50"
                  : "text-zinc-600 hover:bg-zinc-200/80 hover:text-zinc-900 dark:text-stone-500 dark:hover:bg-stone-800/50 dark:hover:text-stone-300"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(270px,1fr))] gap-2.5 flex-1 overflow-y-auto pr-1 pb-2">
        <AnimatePresence mode="popLayout">
          {filtered.map((order) => {
            const min = elapsedMin(order.createdAt);
            const borderColor =
              order.status === "pending" ? "border-l-amber-600/80" : "border-l-blue-600/80";
            const label =
              order.orderType === "takeout"
                ? "Takeout"
                : order.orderType === "pre_order"
                  ? "Pre-Order"
                  : `Table ${order.tableNumber}`;
            // Phase pill that headlines every card so the line cook can
            // tell at a glance whether the ticket is still waiting to be
            // picked up or actively on a station. Colors mirror the
            // left-border accent + BUMP button styling for consistency.
            const phase =
              order.status === "pending"
                ? {
                    label: "NEW — Not Started",
                    dot: "bg-amber-600/90",
                    text: "text-amber-900 dark:text-amber-500/90",
                    bg: "bg-amber-100 dark:bg-amber-950/50",
                    border: "border-amber-300 dark:border-amber-800/50",
                  }
                : {
                    label: "IN PROGRESS — Cooking",
                    dot: "animate-pulse bg-blue-600 dark:bg-blue-500/80",
                    text: "text-blue-800 dark:text-blue-400/90",
                    bg: "bg-blue-100 dark:bg-blue-950/40",
                    border: "border-blue-300 dark:border-blue-800/40",
                  };

            return (
              <motion.div
                key={order.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className={`flex max-h-[72vh] flex-col gap-2.5 rounded-xl border border-l-4 border-zinc-200 bg-white p-3 shadow-sm dark:border-stone-800/90 dark:bg-stone-900/90 dark:shadow-none ${borderColor}`}
              >
                <div
                  className={`flex items-center gap-2 rounded-md border px-2 py-1 ${phase.bg} ${phase.border}`}
                >
                  <span className={`w-2 h-2 rounded-full ${phase.dot}`} />
                  <span
                    className={`text-[10px] font-bold uppercase tracking-[0.12em] ${phase.text}`}
                  >
                    {phase.label}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono text-lg font-bold text-zinc-900 dark:text-stone-100">
                      #{order.id.slice(-4)}
                    </span>
                    <span className="ml-2 text-xs uppercase text-zinc-500 dark:text-stone-500">
                      {label}
                    </span>
                  </div>
                  <span className={`text-sm font-medium ${timeColor(min)}`}>
                    {min}m
                  </span>
                </div>

                <p className="truncate text-sm text-zinc-600 dark:text-stone-500">{order.guestName}</p>

                {order.notes && (
                  <div className="rounded-md border border-violet-200 bg-violet-50 px-2 py-1.5 dark:border-violet-800/40 dark:bg-violet-950/30">
                    <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-800 dark:text-violet-400/90">
                      Special Instructions
                    </p>
                    <p className="max-h-10 overflow-hidden break-words text-[11px] text-violet-900 dark:text-violet-200/80">
                      {order.notes}
                    </p>
                  </div>
                )}

                <div className="flex flex-col gap-1.5 flex-1 min-h-0 overflow-y-auto pr-1">
                  {order.items
                    .filter((i) => !i.voided)
                    .map((item) => (
                      <div key={item.id} className="flex items-start gap-2">
                        {item.dietType && (
                          <span
                            className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${DIET_COLORS[item.dietType]}`}
                          />
                        )}
                        <div className="min-w-0">
                          <span className="text-sm text-zinc-900 dark:text-stone-100">
                            {item.quantity}× {item.menuItemName}
                          </span>
                          {item.specialInstructions && (
                            <p className="max-h-10 overflow-hidden break-words text-xs text-zinc-600 dark:text-stone-500">
                              {item.specialInstructions}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>

                <button
                  type="button"
                  onClick={() => bump(order)}
                  className="flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-lg border border-amber-800/50 bg-amber-100 text-xs font-bold uppercase tracking-wider text-amber-900 transition-colors hover:bg-amber-200/90 dark:bg-amber-950/40 dark:text-amber-500/90 dark:hover:bg-amber-950/60"
                >
                  {order.status === "pending" ? (
                    <ChefHat className="w-4 h-4" />
                  ) : (
                    <UtensilsCrossed className="w-4 h-4" />
                  )}
                  BUMP
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
