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
    <div className="min-h-screen bg-zinc-950 text-white p-4 flex flex-col gap-4">
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
      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3 flex-1">
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

            return (
              <motion.div
                key={order.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className={`bg-zinc-900/80 border border-white/5 border-l-4 ${borderColor} rounded-xl p-4 flex flex-col gap-3`}
              >
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

                <p className="text-sm text-zinc-400">{order.guestName}</p>

                <div className="flex flex-col gap-1.5 flex-1">
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
                            <p className="text-xs text-zinc-500 truncate">
                              {item.specialInstructions}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>

                <button
                  onClick={() => bump(order)}
                  className="h-12 w-full rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold text-sm uppercase tracking-wider hover:bg-amber-500/25 transition-colors flex items-center justify-center gap-2"
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
