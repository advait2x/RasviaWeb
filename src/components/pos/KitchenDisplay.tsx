"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, ChefHat, Flame, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import { useDashboard } from "@/context/DashboardContext";
import type { Order, OrderStatus } from "@/types/dashboard";

const DIET_COLORS: Record<string, string> = {
  veg: "bg-emerald-500",
  non_veg: "bg-red-500",
  halal: "bg-blue-500",
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
  if (min < 10) return "text-emerald-400";
  if (min < 20) return "text-amber-400";
  return "text-red-400";
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
    <div className="h-full min-h-0 bg-zinc-950 text-white p-3 flex flex-col gap-3 overflow-hidden">
      {/* Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-400" />
            <span className="text-sm text-zinc-400">Active</span>
            <span className="font-semibold text-lg">{active.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-zinc-400" />
            <span className="text-sm text-zinc-400">Avg Wait</span>
            <span className="font-semibold text-lg">{avgWait}m</span>
          </div>
        </div>
        <div className="flex gap-2">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                filter === f.key
                  ? "bg-white/10 text-white"
                  : "text-zinc-500 hover:text-zinc-300"
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
              order.status === "pending"
                ? "border-l-amber-500"
                : "border-l-blue-500";
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
                    dot: "bg-amber-400",
                    text: "text-amber-300",
                    bg: "bg-amber-500/10",
                    border: "border-amber-500/30",
                  }
                : {
                    label: "IN PROGRESS — Cooking",
                    dot: "bg-blue-400 animate-pulse",
                    text: "text-blue-300",
                    bg: "bg-blue-500/10",
                    border: "border-blue-500/30",
                  };

            return (
              <motion.div
                key={order.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className={`bg-zinc-900/80 border border-white/5 border-l-4 ${borderColor} rounded-xl p-3 flex flex-col gap-2.5 max-h-[72vh]`}
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
                    <span className="font-mono font-bold text-lg">
                      #{order.id.slice(-4)}
                    </span>
                    <span className="ml-2 text-xs text-zinc-500 uppercase">
                      {label}
                    </span>
                  </div>
                  <span className={`text-sm font-medium ${timeColor(min)}`}>
                    {min}m
                  </span>
                </div>

                <p className="text-sm text-zinc-400 truncate">{order.guestName}</p>

                {order.notes && (
                  <div className="rounded-md border border-violet-500/25 bg-violet-500/10 px-2 py-1.5">
                    <p className="text-[10px] uppercase tracking-wide text-violet-300/90 font-semibold mb-0.5">
                      Special Instructions
                    </p>
                    <p className="text-[11px] text-violet-100 break-words max-h-10 overflow-hidden">
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
                          <span className="text-sm">
                            {item.quantity}× {item.menuItemName}
                          </span>
                          {item.specialInstructions && (
                            <p className="text-xs text-zinc-500 break-words max-h-10 overflow-hidden">
                              {item.specialInstructions}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>

                <button
                  onClick={() => bump(order)}
                  className="h-10 w-full rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold text-xs uppercase tracking-wider hover:bg-amber-500/25 transition-colors flex items-center justify-center gap-2 shrink-0"
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
