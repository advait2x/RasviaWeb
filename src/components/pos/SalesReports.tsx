"use client";

import { useEffect, useState, useMemo, type ElementType } from "react";
import { motion } from "framer-motion";
import { DollarSign, ShoppingCart, Heart, Clock, AlertTriangle } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useDashboard } from "@/context/DashboardContext";
import { useTheme } from "@/context/ThemeContext";
import type { PastOrdersFilter, PastOrdersRange } from "@/context/DashboardContext";
import { formatMinutesHumanReadable } from "@/lib/formatWait";

type Range = "today" | "yesterday" | "week" | "month";

function getDateRange(range: Range): [Date, Date] {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  switch (range) {
    case "yesterday": {
      start.setDate(start.getDate() - 1);
      const endYesterday = new Date(start);
      endYesterday.setHours(23, 59, 59, 999);
      return [start, endYesterday];
    }
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

function toRangeKey(range: Range): PastOrdersRange {
  switch (range) {
    case "today":
      return "today";
    case "yesterday":
      return "yesterday";
    case "week":
      return "week";
    case "month":
      return "month";
  }
}

function getWaitMinutes(addedAt: Date): number {
  return Math.floor((Date.now() - addedAt.getTime()) / 60000);
}

export default function SalesReports() {
  const { resolvedTheme } = useTheme();
  const {
    fetchCompletedOrders,
    completedOrders,
    setActiveView,
    setPastOrdersFilter,
    pastOrdersFilter,
    waitlist,
  } = useDashboard();
  const [range, setRange] = useState<Range>("today");

  useEffect(() => {
    const [from, to] = getDateRange(range);
    fetchCompletedOrders(from, to);
  }, [range, fetchCompletedOrders]);

  const { totalSales, orderCount, tips } = useMemo(() => {
    const total = completedOrders.reduce((s, o) => s + o.total, 0);
    const count = completedOrders.length;
    const tipSum = completedOrders.reduce((s, o) => s + (o.tipAmount ?? 0), 0);
    return {
      totalSales: total,
      orderCount: count,
      tips: tipSum,
    };
  }, [completedOrders]);

  const { avgWait, longestWait } = useMemo(() => {
    const waitingOnly = waitlist.filter((w) => w.status === "waiting");
    const n = waitingOnly.length;
    if (n === 0) return { avgWait: 0, longestWait: 0 };
    const sum = waitingOnly.reduce((acc, w) => acc + getWaitMinutes(w.addedAt), 0);
    const longest = Math.max(...waitingOnly.map((w) => getWaitMinutes(w.addedAt)));
    return { avgWait: Math.round(sum / n), longestWait: longest };
  }, [waitlist]);

  type ChartMode = "hourly" | "daily" | "weekly";
  const chartMode: ChartMode =
    range === "today" || range === "yesterday"
      ? "hourly"
      : range === "week"
        ? "daily"
        : "weekly";

  const chart = useMemo(() => {
    if (chartMode === "hourly") {
      const buckets = Array.from({ length: 24 }, (_, i) => ({
        label: `${i}:00`,
        key: i,
        sales: 0,
        bucketStart: (() => {
          const d = new Date();
          d.setHours(i, 0, 0, 0);
          if (range === "yesterday") d.setDate(d.getDate() - 1);
          return d;
        })(),
        bucketEnd: (() => {
          const d = new Date();
          d.setHours(i, 59, 59, 999);
          if (range === "yesterday") d.setDate(d.getDate() - 1);
          return d;
        })(),
      }));
      completedOrders.forEach((o) => {
        const h = new Date(o.createdAt).getHours();
        if (buckets[h]) buckets[h].sales += o.total;
      });
      return buckets;
    }

    if (chartMode === "daily") {
      const now = new Date();
      const buckets: Array<{
        label: string;
        key: number;
        sales: number;
        bucketStart: Date;
        bucketEnd: Date;
      }> = [];
      for (let i = 6; i >= 0; i--) {
        const start = new Date(now);
        start.setDate(now.getDate() - i);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setHours(23, 59, 59, 999);
        buckets.push({
          label: start.toLocaleDateString(undefined, { weekday: "short" }),
          key: start.getTime(),
          sales: 0,
          bucketStart: start,
          bucketEnd: end,
        });
      }
      completedOrders.forEach((o) => {
        const t = new Date(o.createdAt).getTime();
        const bucket = buckets.find((b) => t >= b.bucketStart.getTime() && t <= b.bucketEnd.getTime());
        if (bucket) bucket.sales += o.total;
      });
      return buckets;
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const buckets: Array<{
      label: string;
      key: number;
      sales: number;
      bucketStart: Date;
      bucketEnd: Date;
    }> = [];
    const cursor = new Date(monthStart);
    let idx = 1;
    while (cursor <= monthEnd) {
      const weekStart = new Date(cursor);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      if (weekEnd > monthEnd) {
        weekEnd.setTime(monthEnd.getTime());
        weekEnd.setHours(23, 59, 59, 999);
      }
      buckets.push({
        label: `W${idx}`,
        key: weekStart.getTime(),
        sales: 0,
        bucketStart: weekStart,
        bucketEnd: weekEnd,
      });
      cursor.setDate(cursor.getDate() + 7);
      idx++;
    }
    completedOrders.forEach((o) => {
      const t = new Date(o.createdAt).getTime();
      const bucket = buckets.find((b) => t >= b.bucketStart.getTime() && t <= b.bucketEnd.getTime());
      if (bucket) bucket.sales += o.total;
    });
    return buckets;
  }, [chartMode, completedOrders, range]);

  const chartTitle =
    chartMode === "hourly" ? "Hourly sales" : chartMode === "daily" ? "Daily sales" : "Weekly sales";

  const topItems = useMemo(() => {
    const map = new Map<string, { qty: number; revenue: number }>();
    completedOrders.forEach((o) =>
      o.items.forEach((it) => {
        const prev = map.get(it.menuItemName) ?? { qty: 0, revenue: 0 };
        map.set(it.menuItemName, {
          qty: prev.qty + it.quantity,
          revenue: prev.revenue + it.unitPrice * it.quantity,
        });
      })
    );
    return [...map.entries()].sort((a, b) => b[1].qty - a[1].qty).slice(0, 10);
  }, [completedOrders]);

  const typeCounts = useMemo(() => {
    const c: { dine_in: number; takeout: number; pre_order: number } = {
      dine_in: 0,
      takeout: 0,
      pre_order: 0,
    };
    completedOrders.forEach((o) => {
      if (o.orderType === "dine_in" || o.orderType === "takeout" || o.orderType === "pre_order") {
        c[o.orderType] = (c[o.orderType] ?? 0) + 1;
      }
    });
    return c;
  }, [completedOrders]);

  const fmt = (n: number) => `$${n.toFixed(2)}`;
  const isLight = resolvedTheme === "light";
  const chartGridColor = isLight ? "rgba(15,23,42,0.14)" : "rgba(255,255,255,0.06)";
  const chartTickColor = isLight ? "#334155" : "#71717a";
  const chartTooltipBackground = isLight ? "rgba(255,255,255,0.98)" : "#121212";
  const chartTooltipBorder = isLight ? "1px solid rgba(15,23,42,0.16)" : "1px solid rgba(255,255,255,0.1)";
  const chartTooltipText = isLight ? "#0f172a" : "#e4e4e7";
  const chartBarFill = isLight ? "rgba(71, 85, 105, 0.7)" : "rgba(148, 163, 184, 0.55)";
  const ranges: { key: Range; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "yesterday", label: "Yesterday" },
    { key: "week", label: "This week" },
    { key: "month", label: "This month" },
  ];

  const cards: Array<{
    label: string;
    value: string | number;
    icon: typeof DollarSign;
    clickable: boolean;
  }> = [
    { label: "Total sales", value: fmt(totalSales), icon: DollarSign, clickable: true },
    { label: "Orders", value: orderCount, icon: ShoppingCart, clickable: true },
    { label: "Tips", value: fmt(tips), icon: Heart, clickable: false },
    {
      label: "Avg wait time",
      value: formatMinutesHumanReadable(avgWait),
      icon: Clock,
      clickable: false,
    },
    {
      label: "Longest wait",
      value: formatMinutesHumanReadable(longestWait),
      icon: AlertTriangle,
      clickable: false,
    },
  ];

  const gotoPastOrders = (overrides: Partial<PastOrdersFilter>) => {
    setPastOrdersFilter({
      ...pastOrdersFilter,
      range: toRangeKey(range),
      type: "all",
      status: "all",
      search: "",
      sort: "newest",
      ...overrides,
    });
    setActiveView("orders");
    const url = new URL(window.location.href);
    url.searchParams.set("tab", "orders");
    url.searchParams.set("ordersTab", "past");
    window.history.replaceState({}, "", url.toString());
  };

  const handleCardClick = (label: string) => {
    if (label !== "Total sales" && label !== "Orders") return;
    gotoPastOrders({});
  };

  const handleBarClick = (bucket: { bucketStart: Date; bucketEnd: Date }) => {
    gotoPastOrders({
      range: "custom",
      from: bucket.bucketStart.toISOString(),
      to: bucket.bucketEnd.toISOString(),
    });
  };

  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <div className="space-y-8 p-8 pb-16">
      <div className="flex flex-wrap gap-2">
        {ranges.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => setRange(r.key)}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
              range === r.key
                ? "border-white/[0.12] bg-white/[0.08] text-zinc-100"
                : "border-white/[0.08] bg-white/[0.02] text-zinc-500 hover:bg-white/[0.05] hover:text-zinc-300"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {cards.map((c, i) => {
          const Wrapper: ElementType = c.clickable ? "button" : "div";
          return (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Wrapper
                type={c.clickable ? "button" : undefined}
                onClick={c.clickable ? () => handleCardClick(c.label) : undefined}
                className={`card-premium w-full rounded-xl p-5 text-left ${
                  c.clickable
                    ? "cursor-pointer hover:border-white/[0.12]"
                    : ""
                }`}
                title={c.clickable ? "View matching past orders" : undefined}
              >
                <div className="mb-3 flex items-center gap-2 text-zinc-500">
                  <c.icon size={16} strokeWidth={1.5} />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">{c.label}</span>
                </div>
                <p className="text-xl font-semibold tabular-nums tracking-tight text-zinc-100">{c.value}</p>
              </Wrapper>
            </motion.div>
          );
        })}
      </div>

      <div className="card-premium rounded-xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{chartTitle}</h3>
          <span className="text-[10px] text-zinc-600">Click a bar to filter past orders</span>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chart}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
            <XAxis dataKey="label" tick={{ fill: chartTickColor, fontSize: 11 }} />
            <YAxis tick={{ fill: chartTickColor, fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
            <Tooltip
              contentStyle={{
                background: chartTooltipBackground,
                border: chartTooltipBorder,
                borderRadius: 8,
                color: chartTooltipText,
              }}
              labelStyle={{ color: chartTooltipText, fontWeight: 600 }}
              itemStyle={{ color: chartTooltipText }}
              formatter={(v: number) => [`$${v.toFixed(2)}`, "Sales"]}
            />
            <Bar
              dataKey="sales"
              fill={chartBarFill}
              radius={[4, 4, 0, 0]}
              cursor="pointer"
              onClick={(data: unknown) => {
                const payload = data as { bucketStart?: Date; bucketEnd?: Date } | undefined;
                if (payload?.bucketStart && payload?.bucketEnd) {
                  handleBarClick({ bucketStart: payload.bucketStart, bucketEnd: payload.bucketEnd });
                }
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card-premium rounded-xl p-6">
          <h3 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Top items</h3>
          <div className="space-y-2">
            {topItems.length === 0 && <p className="text-sm text-zinc-500">No data</p>}
            {topItems.map(([name, d], i) => (
              <div key={name} className="flex items-center justify-between text-sm">
                <span className="text-zinc-200">
                  <span className="mr-2 text-zinc-500">{i + 1}.</span>
                  {name}
                </span>
                <span className="text-zinc-500">
                  {d.qty} sold · {fmt(d.revenue)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card-premium rounded-xl p-6">
          <h3 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Order types</h3>
          {(
            [
              ["Dine-in", typeCounts.dine_in],
              ["Takeout", typeCounts.takeout],
              ["Pre-order", typeCounts.pre_order],
            ] as const
          ).map(([label, count]) => (
            <div key={label} className="mb-4 last:mb-0">
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-zinc-200">{label}</span>
                <span className="text-zinc-500">{count}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-zinc-500/50 transition-all"
                  style={{ width: `${orderCount ? (count / orderCount) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
    </div>
  );
}
