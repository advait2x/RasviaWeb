"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { DollarSign, ShoppingCart, TrendingUp, Heart } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useDashboard } from "@/context/DashboardContext";
import { Order } from "@/types/dashboard";

type Range = "today" | "yesterday" | "week" | "month";

function getDateRange(range: Range): [Date, Date] {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  switch (range) {
    case "yesterday":
      start.setDate(start.getDate() - 1);
      const endYesterday = new Date(start);
      endYesterday.setHours(23, 59, 59, 999);
      return [start, endYesterday];
    case "week": {
      const day = start.getDay();
      start.setDate(start.getDate() - day);
      return [start, now];
    }
    case "month":
      start.setDate(1);
      return [start, now];
    default:
      return [start, now];
  }
}

export default function SalesReports() {
  const { fetchCompletedOrders, completedOrders } = useDashboard();
  const [range, setRange] = useState<Range>("today");

  useEffect(() => {
    const [from, to] = getDateRange(range);
    fetchCompletedOrders(from, to);
  }, [range, fetchCompletedOrders]);

  const { totalSales, orderCount, avgOrder, tips } = useMemo(() => {
    const total = completedOrders.reduce((s, o) => s + o.total, 0);
    const count = completedOrders.length;
    const tipSum = completedOrders.reduce((s, o) => s + (o.tipAmount ?? 0), 0);
    return {
      totalSales: total,
      orderCount: count,
      avgOrder: count ? total / count : 0,
      tips: tipSum,
    };
  }, [completedOrders]);

  const hourlyData = useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, i) => ({ hour: i, sales: 0 }));
    completedOrders.forEach((o) => {
      const h = new Date(o.createdAt).getHours();
      buckets[h].sales += o.total;
    });
    return buckets;
  }, [completedOrders]);

  const topItems = useMemo(() => {
    const map = new Map<string, { qty: number; revenue: number }>();
    completedOrders.forEach((o) =>
      o.items.forEach((it) => {
        if (it.voided) return;
        const prev = map.get(it.menuItemName) ?? { qty: 0, revenue: 0 };
        map.set(it.menuItemName, {
          qty: prev.qty + it.quantity,
          revenue: prev.revenue + it.unitPrice * it.quantity,
        });
      })
    );
    return [...map.entries()]
      .sort((a, b) => b[1].qty - a[1].qty)
      .slice(0, 10);
  }, [completedOrders]);

  const typeCounts = useMemo(() => {
    const c = { dine_in: 0, takeout: 0, pre_order: 0 };
    completedOrders.forEach((o) => { c[o.orderType] = (c[o.orderType] ?? 0) + 1; });
    return c;
  }, [completedOrders]);

  const fmt = (n: number) => `$${n.toFixed(2)}`;
  const ranges: { key: Range; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "yesterday", label: "Yesterday" },
    { key: "week", label: "This Week" },
    { key: "month", label: "This Month" },
  ];

  const cards = [
    { label: "Total Sales", value: fmt(totalSales), icon: DollarSign },
    { label: "Orders", value: orderCount, icon: ShoppingCart },
    { label: "Avg Order", value: fmt(avgOrder), icon: TrendingUp },
    { label: "Tips", value: fmt(tips), icon: Heart },
  ];

  return (
    <div className="space-y-6 p-4">
      {/* Date range */}
      <div className="flex gap-2">
        {ranges.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              range === r.key
                ? "bg-amber-500 text-black"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-white/5 bg-zinc-900 p-5"
          >
            <div className="mb-2 flex items-center gap-2 text-zinc-400">
              <c.icon size={16} />
              <span className="text-xs uppercase tracking-wider">{c.label}</span>
            </div>
            <p className="text-2xl font-bold text-white">{c.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Hourly chart */}
      <div className="rounded-xl border border-white/5 bg-zinc-900 p-5">
        <h3 className="mb-4 text-sm font-medium text-zinc-400">Hourly Sales</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={hourlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="hour"
              tick={{ fill: "#71717a", fontSize: 11 }}
              tickFormatter={(h) => `${h}:00`}
            />
            <YAxis tick={{ fill: "#71717a", fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
            <Tooltip
              contentStyle={{ background: "#18181b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
              labelFormatter={(h) => `${h}:00`}
              formatter={(v: number) => [`$${v.toFixed(2)}`, "Sales"]}
            />
            <Bar dataKey="sales" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top items */}
        <div className="rounded-xl border border-white/5 bg-zinc-900 p-5">
          <h3 className="mb-3 text-sm font-medium text-zinc-400">Top Items</h3>
          <div className="space-y-2">
            {topItems.length === 0 && <p className="text-sm text-zinc-500">No data</p>}
            {topItems.map(([name, d], i) => (
              <div key={name} className="flex items-center justify-between text-sm">
                <span className="text-white">
                  <span className="mr-2 text-zinc-500">{i + 1}.</span>
                  {name}
                </span>
                <span className="text-zinc-400">
                  {d.qty} sold &middot; {fmt(d.revenue)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Order type breakdown */}
        <div className="rounded-xl border border-white/5 bg-zinc-900 p-5">
          <h3 className="mb-3 text-sm font-medium text-zinc-400">Order Types</h3>
          {(
            [
              ["Dine-In", typeCounts.dine_in],
              ["Takeout", typeCounts.takeout],
              ["Pre-Order", typeCounts.pre_order],
            ] as const
          ).map(([label, count]) => (
            <div key={label} className="mb-3 last:mb-0">
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-white">{label}</span>
                <span className="text-zinc-400">{count}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all"
                  style={{ width: `${orderCount ? (count / orderCount) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
