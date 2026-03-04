import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search, Plus, Clock, Users, ChefHat, CheckCircle2, XCircle,
    ShoppingBag, ArrowRight, ArrowLeft, Leaf, Drumstick, Vegan, Coffee, Sun, Moon, Star,
    Filter, X, Receipt, Bell, BellRing, Phone, AlertTriangle,
} from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import { Order, OrderStatus, DietType, MealTime } from "@/types/dashboard";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import TakeOrderModal from "./TakeOrderModal";
import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog";

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; icon: typeof Clock }> = {
    pending: { label: "Pending", color: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400", icon: Clock },
    preparing: { label: "Preparing", color: "bg-blue-500/10 border-blue-500/30 text-blue-400", icon: ChefHat },
    ready: { label: "Ready", color: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400", icon: CheckCircle2 },
    served: { label: "Served", color: "bg-violet-500/10 border-violet-500/30 text-violet-400", icon: CheckCircle2 },
    completed: { label: "Completed", color: "bg-zinc-700/30 border-zinc-600/30 text-zinc-400", icon: CheckCircle2 },
    cancelled: { label: "Cancelled", color: "bg-red-500/10 border-red-500/30 text-red-400", icon: XCircle },
};

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
    pending: "preparing",
    preparing: "ready",
    ready: "served",
    served: "completed",
};

const PREV_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
    preparing: "pending",
    ready: "preparing",
    served: "ready",
    completed: "served",
};

type TabKey = "active" | "preorders" | "completed";

const PARTY_SIZE_FILTERS = [
    { label: "1-2", min: 1, max: 2 },
    { label: "3-4", min: 3, max: 4 },
    { label: "5-6", min: 5, max: 6 },
    { label: "7+", min: 7, max: 99 },
];

const DIET_FILTERS: { value: DietType; label: string; icon: typeof Leaf }[] = [
    { value: "veg", label: "Veg", icon: Leaf },
    { value: "non_veg", label: "Non-Veg", icon: Drumstick },
    { value: "vegan", label: "Vegan", icon: Vegan },
];

const MEAL_FILTERS: { value: MealTime; label: string; icon: typeof Coffee }[] = [
    { value: "breakfast", label: "Breakfast", icon: Coffee },
    { value: "lunch", label: "Lunch", icon: Sun },
    { value: "dinner", label: "Dinner", icon: Moon },
    { value: "specials", label: "Specials", icon: Star },
];

function getTimeSince(date: Date): string {
    const mins = Math.floor((Date.now() - date.getTime()) / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
}

function getTimeColor(date: Date): string {
    const mins = Math.floor((Date.now() - date.getTime()) / 60000);
    if (mins < 10) return "text-emerald-400";
    if (mins < 20) return "text-blue-400";
    if (mins < 35) return "text-amber-400";
    return "text-red-400";
}

export default function OrdersPanel() {
    const { orders, tables, updateOrderStatus, notifyCustomer } = useDashboard();
    const [tab, setTab] = useState<TabKey>("active");
    const [search, setSearch] = useState("");
    const [showFilters, setShowFilters] = useState(false);
    const [partySizeFilter, setPartySizeFilter] = useState<string | null>(null);
    const [dietFilter, setDietFilter] = useState<DietType[]>([]);
    const [mealFilter, setMealFilter] = useState<MealTime[]>([]);
    const [statusFilter, setStatusFilter] = useState<OrderStatus[]>([]);
    const [tableFilter, setTableFilter] = useState<number | null>(null);
    const [showTakeOrder, setShowTakeOrder] = useState(false);
    const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);

    const occupiedTables = tables.filter((t) => t.status === "occupied" && !t.isCombinedChild);

    const activeStatuses: OrderStatus[] = ["pending", "preparing", "ready", "served"];
    const completedStatuses: OrderStatus[] = ["completed", "cancelled"];

    // Base filter by tab
    const tabOrders = useMemo(() => {
        switch (tab) {
            case "active":
                return orders.filter((o) => activeStatuses.includes(o.status) && o.orderType === "dine_in");
            case "preorders":
                return orders.filter((o) => activeStatuses.includes(o.status) && (o.orderType === "pre_order" || o.orderType === "takeout"));
            case "completed":
                return orders.filter((o) => completedStatuses.includes(o.status));
            default:
                return orders;
        }
    }, [orders, tab]);

    // Apply filters
    const filteredOrders = useMemo(() => {
        let result = tabOrders;

        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(
                (o) =>
                    o.guestName.toLowerCase().includes(q) ||
                    o.items.some((i) => i.menuItemName.toLowerCase().includes(q))
            );
        }

        if (partySizeFilter) {
            const pf = PARTY_SIZE_FILTERS.find((p) => p.label === partySizeFilter);
            if (pf) result = result.filter((o) => o.partySize >= pf.min && o.partySize <= pf.max);
        }

        if (dietFilter.length > 0) {
            result = result.filter((o) =>
                o.items.some((i) => i.dietType && dietFilter.includes(i.dietType))
            );
        }

        if (mealFilter.length > 0) {
            // We don't have meal time on orders directly, skip for now or placeholder
        }

        if (statusFilter.length > 0) {
            result = result.filter((o) => statusFilter.includes(o.status));
        }

        if (tableFilter !== null) {
            result = result.filter((o) => o.tableNumber === tableFilter);
        }

        return result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }, [tabOrders, search, partySizeFilter, dietFilter, mealFilter, statusFilter, tableFilter]);

    const activeCount = orders.filter((o) => activeStatuses.includes(o.status) && o.orderType === "dine_in").length;
    const preorderCount = orders.filter((o) => activeStatuses.includes(o.status) && (o.orderType === "pre_order" || o.orderType === "takeout")).length;
    const completedCount = orders.filter((o) => completedStatuses.includes(o.status)).length;

    const hasAnyFilter = partySizeFilter || dietFilter.length > 0 || mealFilter.length > 0 || statusFilter.length > 0 || tableFilter !== null;

    const clearFilters = () => {
        setPartySizeFilter(null);
        setDietFilter([]);
        setMealFilter([]);
        setStatusFilter([]);
        setTableFilter(null);
    };

    const handleAdvanceStatus = (orderId: string, currentStatus: OrderStatus) => {
        const next = NEXT_STATUS[currentStatus];
        if (next) updateOrderStatus(orderId, next);
    };

    const handleReverseStatus = (orderId: string, currentStatus: OrderStatus) => {
        const prev = PREV_STATUS[currentStatus];
        if (prev) updateOrderStatus(orderId, prev);
    };

    const handleCancelOrder = (orderId: string) => {
        updateOrderStatus(orderId, "cancelled");
        setCancelConfirmId(null);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4">
                <div>
                    <h2 className="text-xl font-bold text-zinc-100 tracking-tight">Orders</h2>
                    {activeCount > 0 && (
                        <p className="text-xs text-amber-400 mt-0.5">
                            {activeCount} active order{activeCount > 1 ? "s" : ""}
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowFilters((v) => !v)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${showFilters || hasAnyFilter
                            ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                            : "bg-zinc-800 border-white/10 text-zinc-400 hover:bg-zinc-700"
                            }`}
                    >
                        <Filter size={13} strokeWidth={1.5} />
                        Filters
                        {hasAnyFilter && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        )}
                    </motion.button>
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowTakeOrder(true)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-medium hover:bg-amber-500/20 transition-colors"
                    >
                        <Plus size={14} strokeWidth={2} />
                        New Order
                    </motion.button>
                </div>
            </div>

            {/* Tabs */}
            <div className="px-5 pb-3">
                <div className="flex gap-1 p-1 rounded-xl bg-zinc-800/60 border border-white/5 w-fit">
                    {([
                        { key: "active" as TabKey, label: "Active Orders", count: activeCount },
                        { key: "preorders" as TabKey, label: "Pre-Orders", count: preorderCount },
                        { key: "completed" as TabKey, label: "Completed", count: completedCount },
                    ]).map(({ key, label, count }) => (
                        <button
                            key={key}
                            onClick={() => setTab(key)}
                            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${tab === key
                                ? "bg-zinc-700 text-zinc-100"
                                : "text-zinc-500 hover:text-zinc-300"
                                }`}
                        >
                            {label}
                            {count > 0 && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                    tab === key
                                        ? "bg-amber-500/20 text-amber-400"
                                        : key === "preorders"
                                            ? "bg-red-500 text-white"
                                            : "bg-zinc-700/60 text-zinc-500"
                                    }`}>
                                    {count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Filter bar */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-5 pb-3 space-y-2 overflow-hidden"
                    >
                        {/* Party Size */}
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-zinc-600 uppercase tracking-wider font-semibold w-16 shrink-0">Party</span>
                            <div className="flex gap-1">
                                {PARTY_SIZE_FILTERS.map(({ label }) => (
                                    <button
                                        key={label}
                                        onClick={() => setPartySizeFilter(partySizeFilter === label ? null : label)}
                                        className={`px-2.5 py-1 rounded-md border text-[11px] font-semibold transition-all ${partySizeFilter === label
                                            ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                                            : "bg-zinc-800/40 border-white/8 text-zinc-500 hover:text-zinc-300"
                                            }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Diet */}
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-zinc-600 uppercase tracking-wider font-semibold w-16 shrink-0">Diet</span>
                            <div className="flex gap-1">
                                {DIET_FILTERS.map(({ value, label, icon: Icon }) => (
                                    <button
                                        key={value}
                                        onClick={() =>
                                            setDietFilter((prev) =>
                                                prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value]
                                            )
                                        }
                                        className={`flex items-center gap-1 px-2.5 py-1 rounded-md border text-[11px] font-semibold transition-all ${dietFilter.includes(value)
                                            ? value === "veg" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                                : value === "vegan" ? "bg-green-500/10 border-green-500/30 text-green-400"
                                                    : "bg-red-500/10 border-red-500/30 text-red-400"
                                            : "bg-zinc-800/40 border-white/8 text-zinc-500 hover:text-zinc-300"
                                            }`}
                                    >
                                        <Icon size={10} strokeWidth={1.5} />
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Status (for active tab) */}
                        {tab !== "completed" && (
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-zinc-600 uppercase tracking-wider font-semibold w-16 shrink-0">Status</span>
                                <div className="flex gap-1">
                                    {(["pending", "preparing", "ready", "served"] as OrderStatus[]).map((s) => {
                                        const cfg = STATUS_CONFIG[s];
                                        return (
                                            <button
                                                key={s}
                                                onClick={() =>
                                                    setStatusFilter((prev) =>
                                                        prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
                                                    )
                                                }
                                                className={`px-2.5 py-1 rounded-md border text-[11px] font-semibold transition-all ${statusFilter.includes(s) ? cfg.color : "bg-zinc-800/40 border-white/8 text-zinc-500 hover:text-zinc-300"
                                                    }`}
                                            >
                                                {cfg.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Table */}
                        {occupiedTables.length > 0 && (
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-zinc-600 uppercase tracking-wider font-semibold w-16 shrink-0">Table</span>
                                <div className="flex gap-1 flex-wrap">
                                    {occupiedTables.map((t) => (
                                        <button
                                            key={t.id}
                                            onClick={() => setTableFilter(tableFilter === t.tableNumber ? null : t.tableNumber)}
                                            className={`px-2.5 py-1 rounded-md border text-[11px] font-semibold transition-all ${tableFilter === t.tableNumber
                                                ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                                                : "bg-zinc-800/40 border-white/8 text-zinc-500 hover:text-zinc-300"
                                                }`}
                                        >
                                            T{t.tableNumber}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Meal Time */}
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-zinc-600 uppercase tracking-wider font-semibold w-16 shrink-0">Meal</span>
                            <div className="flex gap-1">
                                {MEAL_FILTERS.map(({ value, label, icon: Icon }) => (
                                    <button
                                        key={value}
                                        onClick={() =>
                                            setMealFilter((prev) =>
                                                prev.includes(value) ? prev.filter((m) => m !== value) : [...prev, value]
                                            )
                                        }
                                        className={`flex items-center gap-1 px-2.5 py-1 rounded-md border text-[11px] font-semibold transition-all ${mealFilter.includes(value)
                                            ? value === "breakfast" ? "bg-orange-500/10 border-orange-500/30 text-orange-400"
                                                : value === "lunch" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                                    : value === "dinner" ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
                                                        : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                                            : "bg-zinc-800/40 border-white/8 text-zinc-500 hover:text-zinc-300"
                                            }`}
                                    >
                                        <Icon size={10} strokeWidth={1.5} />
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {hasAnyFilter && (
                            <button
                                onClick={clearFilters}
                                className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors"
                            >
                                Clear all filters
                            </button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Search */}
            <div className="px-5 pb-3">
                <div className="relative">
                    <Search size={15} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search orders by guest name or item..."
                        className="pl-9 h-10 bg-zinc-800/60 border-white/10 text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500/50"
                    />
                </div>
            </div>

            {/* Order List */}
            <ScrollArea className="flex-1">
                <div className="px-5 pb-4 space-y-2">
                    {filteredOrders.length === 0 && (
                        <div className="text-center py-16">
                            <div className="w-16 h-16 rounded-2xl bg-zinc-800/60 border border-white/5 flex items-center justify-center mx-auto mb-4">
                                <Receipt size={28} strokeWidth={1} className="text-zinc-700" />
                            </div>
                            <p className="text-sm text-zinc-500 font-medium">
                                {orders.length === 0 ? "No orders yet" : "No orders match your filters"}
                            </p>
                            <p className="text-xs text-zinc-600 mt-1">
                                {orders.length === 0
                                    ? 'Click "New Order" to get started'
                                    : "Try adjusting your filters"
                                }
                            </p>
                        </div>
                    )}

                    <AnimatePresence initial={false}>
                        {filteredOrders.map((order, index) => {
                            const statusCfg = STATUS_CONFIG[order.status];
                            const StatusIcon = statusCfg.icon;
                            const nextStatus = NEXT_STATUS[order.status];

                            return (
                                <motion.div
                                    key={order.id}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.97 }}
                                    transition={{ duration: 0.15, delay: index * 0.02 }}
                                    className={`rounded-xl border bg-zinc-800/40 hover:border-white/10 transition-all duration-200 p-4 ${order.orderType !== "dine_in"
                                        ? "border-purple-500/20 border-l-2 border-l-purple-500/50"
                                        : "border-white/5"
                                        }`}
                                >
                                    {/* Header row */}
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-2.5">
                                            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-700/50 border border-white/5">
                                                <span className="text-xs font-bold text-zinc-200 tabular-nums">T{order.tableNumber}</span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-zinc-100">{order.guestName}</p>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <Users size={11} strokeWidth={1.5} className="text-zinc-500" />
                                                    <span className="text-xs text-zinc-500">{order.partySize}</span>
                                                    <span className="text-zinc-700">·</span>
                                                    <Clock size={11} strokeWidth={1.5} className={getTimeColor(order.createdAt)} />
                                                    <span className={`text-xs ${getTimeColor(order.createdAt)}`}>{getTimeSince(order.createdAt)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {order.orderType !== "dine_in" && (
                                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${order.orderType === "pre_order"
                                                    ? "bg-blue-500/10 border-blue-500/20 text-blue-400"
                                                    : "bg-purple-500/10 border-purple-500/20 text-purple-400"
                                                    }`}>
                                                    {order.orderType === "pre_order" ? "Pre-Order" : "Takeout"}
                                                </span>
                                            )}
                                            {/* Notify button — amber pulse when ready but not yet notified */}
                                            {order.orderType !== "dine_in" && order.customerPhone && order.status === "ready" && (
                                                <motion.button
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => notifyCustomer(order.id)}
                                                    title={order.customerNotifiedAt
                                                        ? `Notified at ${order.customerNotifiedAt.toLocaleTimeString()}`
                                                        : "Notify customer order is ready"}
                                                    className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-semibold transition-all ${order.customerNotifiedAt
                                                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                                            : "bg-amber-500/10 border-amber-500/40 text-amber-400 animate-pulse"
                                                        }`}
                                                >
                                                    {order.customerNotifiedAt
                                                        ? <BellRing size={10} strokeWidth={1.5} />
                                                        : <Bell size={10} strokeWidth={1.5} />}
                                                    <span className="ml-0.5">
                                                        {order.customerNotifiedAt ? "Notified" : "Notify"}
                                                    </span>
                                                </motion.button>
                                            )}
                                            <span className={`flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${statusCfg.color}`}>
                                                <StatusIcon size={10} strokeWidth={1.5} />
                                                {statusCfg.label}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Phone & notification info for takeout/pre-orders */}
                                    {order.orderType !== "dine_in" && order.customerPhone && (
                                        <div className="flex items-center justify-between mb-2 py-1.5 px-2 rounded-md bg-purple-500/5 border border-purple-500/15">
                                            <div className="flex items-center gap-1.5">
                                                <Phone size={10} strokeWidth={1.5} className="text-purple-400" />
                                                <span className="text-xs text-purple-300 font-medium tabular-nums">{order.customerPhone}</span>
                                            </div>
                                            {order.customerNotifiedAt && (
                                                <span className="text-[10px] text-emerald-400">
                                                    Notified {order.customerNotifiedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* Items */}
                                    {order.items.length > 0 && (
                                        <div className="mb-3 space-y-1">
                                            {order.items.slice(0, 3).map((item) => (
                                                <div key={item.id} className="flex items-center justify-between text-xs">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-zinc-500 tabular-nums">{item.quantity}×</span>
                                                        <span className="text-zinc-300">{item.menuItemName}</span>
                                                        {item.dietType && (
                                                            <span className={`w-1.5 h-1.5 rounded-full ${item.dietType === "veg" ? "bg-emerald-500" : item.dietType === "vegan" ? "bg-green-500" : "bg-red-500"
                                                                }`} />
                                                        )}
                                                    </div>
                                                    <span className="text-zinc-500 tabular-nums">${(item.unitPrice * item.quantity).toFixed(2)}</span>
                                                </div>
                                            ))}
                                            {order.items.length > 3 && (
                                                <p className="text-[10px] text-zinc-600">+{order.items.length - 3} more items</p>
                                            )}
                                        </div>
                                    )}

                                    {/* Footer */}
                                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-bold text-amber-400 tabular-nums">
                                                ${order.total.toFixed(2)}
                                            </span>
                                            {order.tipAmount != null && order.tipAmount > 0 && (
                                                <span className="text-xs text-emerald-400">
                                                    +${order.tipAmount.toFixed(2)} tip
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            {/* Back button */}
                                            {PREV_STATUS[order.status] && (
                                                <motion.button
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => handleReverseStatus(order.id, order.status)}
                                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-700/60 border border-white/10 text-zinc-400 text-xs font-medium hover:bg-zinc-700 hover:text-zinc-200 transition-colors"
                                                    title={`Revert to ${STATUS_CONFIG[PREV_STATUS[order.status]!].label}`}
                                                >
                                                    <ArrowLeft size={11} strokeWidth={2} />
                                                    {STATUS_CONFIG[PREV_STATUS[order.status]!].label}
                                                </motion.button>
                                            )}
                                            {/* Advance button */}
                                            {NEXT_STATUS[order.status] && (
                                                <motion.button
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => handleAdvanceStatus(order.id, order.status)}
                                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold hover:bg-amber-500/20 transition-colors"
                                                >
                                                    <ArrowRight size={11} strokeWidth={2} />
                                                    {STATUS_CONFIG[NEXT_STATUS[order.status]!].label}
                                                </motion.button>
                                            )}
                                            {/* Cancel button */}
                                            {order.status !== "cancelled" && order.status !== "completed" && (
                                                <motion.button
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => setCancelConfirmId(order.id)}
                                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors"
                                                    title="Cancel this order"
                                                >
                                                    <X size={11} strokeWidth={2} />
                                                    Cancel
                                                </motion.button>
                                            )}
                                            {order.status === "completed" && order.tipAmount != null && order.tipPercent != null && (
                                                <span className="text-xs text-zinc-500">
                                                    {order.tipPercent.toFixed(0)}% tip
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            </ScrollArea>

            {/* Take Order Modal */}
            <TakeOrderModal
                open={showTakeOrder}
                onClose={() => setShowTakeOrder(false)}
            />

            {/* Cancel Order Confirmation Dialog */}
            <Dialog open={cancelConfirmId !== null} onOpenChange={(o) => !o && setCancelConfirmId(null)}>
                <DialogContent className="glass-modal max-w-sm border-white/10 bg-zinc-900/95 backdrop-blur-xl p-6">
                    <div className="flex flex-col items-center text-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                            <AlertTriangle size={22} strokeWidth={1.5} className="text-red-400" />
                        </div>
                        <div className="space-y-1.5">
                            <h3 className="text-base font-semibold text-zinc-100">Cancel this order?</h3>
                            <p className="text-sm text-zinc-400">
                                This will mark the order as cancelled. This cannot be undone.
                            </p>
                        </div>
                        <div className="flex gap-3 w-full pt-1">
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setCancelConfirmId(null)}
                                className="flex-1 py-2.5 rounded-lg bg-zinc-800 border border-white/10 text-zinc-300 text-sm font-medium hover:bg-zinc-700 transition-colors"
                            >
                                Keep Order
                            </motion.button>
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => cancelConfirmId && handleCancelOrder(cancelConfirmId)}
                                className="flex-1 py-2.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-sm font-semibold hover:bg-red-500/25 transition-colors"
                            >
                                Cancel Order
                            </motion.button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
