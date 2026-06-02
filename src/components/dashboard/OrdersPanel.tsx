import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search, Plus, Clock, Users, ChefHat, CheckCircle2, XCircle,
    ShoppingBag, ArrowRight, ArrowLeft, Leaf, Drumstick, Shield, Coffee, Sun, Moon, Star,
    Filter, X, Receipt, Bell, BellRing, Phone, AlertTriangle,
} from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import { Order, OrderStatus, DietType, MealTime } from "@/types/dashboard";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import TakeOrderModal from "./TakeOrderModal";
import PastOrdersView from "./PastOrdersView";
import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  remainingRefundable,
  shouldAutoRefundOnCancel,
  refundOrderRemaining,
} from "@/lib/order-refund";
import {
    DASH_BTN_ADD,
    DASH_MONEY_EMPHASIS,
    ORDER_DIET_PILL,
    ORDER_FILTER_CHIP_OFF,
    ORDER_MEAL_PILLS,
    ORDER_PILL_NOTIFY_DONE,
    ORDER_PILL_NOTIFY_PENDING,
    ORDER_PILL_TYPE_PRE,
    ORDER_PILL_TYPE_TAKEOUT,
    ORDER_STATUS_PILL,
} from "@/lib/dashboardUi";

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<OrderStatus, { label: string; icon: typeof Clock }> = {
    pending: { label: "Pending", icon: Clock },
    preparing: { label: "Preparing", icon: ChefHat },
    ready: { label: "Ready", icon: CheckCircle2 },
    served: { label: "Served", icon: CheckCircle2 },
    completed: { label: "Completed", icon: CheckCircle2 },
    cancelled: { label: "Cancelled", icon: XCircle },
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

type TabKey = "active" | "preorders" | "completed" | "past";

const DIET_FILTERS: { value: DietType; label: string; icon: typeof Leaf }[] = [
    { value: "veg", label: "Veg", icon: Leaf },
    { value: "non_veg", label: "Non-Veg", icon: Drumstick },
    { value: "halal", label: "Halal", icon: Shield },
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
    if (mins < 10) return "text-emerald-800 dark:text-emerald-400";
    if (mins < 20) return "text-sky-800 dark:text-blue-400";
    if (mins < 35) return "text-amber-800 dark:text-amber-400";
    return "text-red-800 dark:text-red-400";
}

export default function OrdersPanel() {
    const { orders, updateOrderStatus, notifyCustomer } = useDashboard();
    const [tab, setTab] = useState<TabKey>(() => {
        if (typeof window === "undefined") return "active";
        const url = new URL(window.location.href);
        const t = url.searchParams.get("ordersTab");
        return t === "past" || t === "preorders" || t === "completed" ? (t as TabKey) : "active";
    });

    useEffect(() => {
        if (typeof window === "undefined") return;
        const url = new URL(window.location.href);
        const t = url.searchParams.get("ordersTab");
        if (t === "past" || t === "preorders" || t === "completed" || t === "active") {
            setTab(t as TabKey);
            url.searchParams.delete("ordersTab");
            window.history.replaceState({}, "", url.toString());
        }
    }, []);

    const [search, setSearch] = useState("");
    const [showFilters, setShowFilters] = useState(false);
    const [dietFilter, setDietFilter] = useState<DietType[]>([]);
    const [mealFilter, setMealFilter] = useState<MealTime[]>([]);
    const [statusFilter, setStatusFilter] = useState<OrderStatus[]>([]);
    const [showTakeOrder, setShowTakeOrder] = useState(false);
    const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
    const [cancelBusy, setCancelBusy] = useState(false);

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

        return result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }, [tabOrders, search, dietFilter, mealFilter, statusFilter]);

    const activeCount = orders.filter((o) => activeStatuses.includes(o.status) && o.orderType === "dine_in").length;
    const preorderCount = orders.filter((o) => activeStatuses.includes(o.status) && (o.orderType === "pre_order" || o.orderType === "takeout")).length;
    const completedCount = orders.filter((o) => completedStatuses.includes(o.status)).length;

    const hasAnyFilter = dietFilter.length > 0 || mealFilter.length > 0 || statusFilter.length > 0;

    const clearFilters = () => {
        setDietFilter([]);
        setMealFilter([]);
        setStatusFilter([]);
    };

    const handleAdvanceStatus = (orderId: string, currentStatus: OrderStatus) => {
        const next = NEXT_STATUS[currentStatus];
        if (next) updateOrderStatus(orderId, next);
    };

    const handleReverseStatus = (orderId: string, currentStatus: OrderStatus) => {
        const prev = PREV_STATUS[currentStatus];
        if (prev) updateOrderStatus(orderId, prev);
    };

    const handleCancelOrder = async (order: Order) => {
        setCancelBusy(true);
        try {
            let refundedCents = 0;
            if (shouldAutoRefundOnCancel(order)) {
                refundedCents = await refundOrderRemaining(order);
            }
            await updateOrderStatus(order.id, "cancelled");
            if (refundedCents > 0) {
                toast.success(`Order #${order.id} cancelled — $${(refundedCents / 100).toFixed(2)} refunded.`);
            } else {
                toast.success(`Order #${order.id} cancelled.`);
            }
            setCancelTarget(null);
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Could not cancel order.";
            toast.error(msg);
        } finally {
            setCancelBusy(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4">
                <div>
                    <h2 className="text-xl font-bold text-zinc-100 tracking-tight">Orders</h2>
                    {activeCount > 0 && (
                        <p className="text-xs text-amber-800 dark:text-amber-400 mt-0.5">
                            {activeCount} active order{activeCount > 1 ? "s" : ""}
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {/* The top Filters button controls diet/meal/status filters which only
                        apply to Active / Pre-Orders / Completed. Past Orders has its own
                        "More" button with the filters it actually supports, so hide this one. */}
                    {tab !== "past" && (
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setShowFilters((v) => !v)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                                showFilters || hasAnyFilter
                                    ? DASH_BTN_ADD
                                    : "border border-zinc-300/40 bg-zinc-200/50 text-zinc-600 hover:bg-zinc-200 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700",
                            )}
                        >
                            <Filter size={13} strokeWidth={1.5} />
                            Filters
                            {hasAnyFilter && (
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-700 dark:bg-amber-500" />
                            )}
                        </motion.button>
                    )}
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowTakeOrder(true)}
                        className={cn(DASH_BTN_ADD, "px-3 py-2")}
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
                        { key: "past" as TabKey, label: "Past Orders", count: 0 },
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
                                        ? "bg-amber-200/90 text-amber-950 dark:bg-amber-500/20 dark:text-amber-400"
                                        : key === "preorders"
                                            ? "bg-red-500 text-white"
                                            : "bg-zinc-300/60 text-zinc-600 dark:bg-zinc-700/60 dark:text-zinc-500"
                                    }`}>
                                    {count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {tab === "past" ? (
                // min-h-0 is required so the inner ScrollArea can shrink and scroll
                // instead of pushing the rest of the dashboard content off-screen.
                <div className="flex-1 min-h-0 flex flex-col">
                    <PastOrdersView />
                </div>
            ) : (
            <>
            {/* Filter bar */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-5 pb-3 space-y-2 overflow-hidden"
                    >
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
                                            ? ORDER_DIET_PILL[value]
                                            : ORDER_FILTER_CHIP_OFF
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
                                                className={`px-2.5 py-1 rounded-md border text-[11px] font-semibold transition-all ${statusFilter.includes(s) ? ORDER_STATUS_PILL[s] : ORDER_FILTER_CHIP_OFF
                                                    }`}
                                            >
                                                {cfg.label}
                                            </button>
                                        );
                                    })}
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
                                            ? ORDER_MEAL_PILLS[value as keyof typeof ORDER_MEAL_PILLS]
                                            : ORDER_FILTER_CHIP_OFF
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
                                    className={`rounded-xl border bg-zinc-800/40 hover:border-white/10 transition-all duration-200 p-3 ${order.orderType !== "dine_in"
                                        ? "border-violet-200/40 border-l-2 border-l-violet-600/45 dark:border-purple-500/20 dark:border-l-purple-500/50"
                                        : "border-white/5"
                                        }`}
                                >
                                    {/* Header row */}
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2.5">
                                            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-700/50 border border-white/5">
                                                <span className="text-xs font-bold text-zinc-200 tabular-nums">
                                                    {order.tableLabel
                                                        ? order.tableLabel
                                                        : order.tableNumber > 0
                                                            ? `T${order.tableNumber}`
                                                            : "—"}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-zinc-100">{order.guestName}</p>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <Users size={11} strokeWidth={1.5} className="text-zinc-500" />
                                                    <span className="text-xs text-zinc-500">
                                                        {order.partyMembers && order.partyMembers.length > 0
                                                            ? order.partyMembers.length
                                                            : order.partySize}
                                                    </span>
                                                    <span className="text-zinc-700">·</span>
                                                    <Clock size={11} strokeWidth={1.5} className={getTimeColor(order.createdAt)} />
                                                    <span className={`text-xs ${getTimeColor(order.createdAt)}`}>{getTimeSince(order.createdAt)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {order.orderType !== "dine_in" && (
                                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                                    order.orderType === "pre_order" ? ORDER_PILL_TYPE_PRE : ORDER_PILL_TYPE_TAKEOUT
                                                }`}>
                                                    {order.orderType === "pre_order" ? "Pre-Order" : "Takeout"}
                                                </span>
                                            )}
                                            {/* Notify button - amber pulse when ready but not yet notified */}
                                            {order.orderType !== "dine_in" && order.customerPhone && order.status === "ready" && (
                                                <motion.button
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => notifyCustomer(order.id)}
                                                    title={order.customerNotifiedAt
                                                        ? `Notified at ${order.customerNotifiedAt.toLocaleTimeString()}`
                                                        : "Notify customer order is ready"}
                                                    className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-semibold transition-all ${order.customerNotifiedAt
                                                            ? ORDER_PILL_NOTIFY_DONE
                                                            : ORDER_PILL_NOTIFY_PENDING
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
                                            <span className={`flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded ${ORDER_STATUS_PILL[order.status]}`}>
                                                <StatusIcon size={10} strokeWidth={1.5} />
                                                {statusCfg.label}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Party roster - everyone who joined the table's self-serve order */}
                                    {order.partyMembers && order.partyMembers.length > 0 && (
                                        <div className="flex flex-wrap items-center gap-1 mb-2">
                                            <Users size={11} strokeWidth={1.5} className="text-zinc-500 shrink-0" />
                                            {order.partyMembers.map((name, i) => (
                                                <span
                                                    key={`${name}-${i}`}
                                                    className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-zinc-700/50 border border-white/5 text-zinc-300"
                                                >
                                                    {name}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Phone & notification info for takeout/pre-orders */}
                                    {order.orderType !== "dine_in" && order.customerPhone && (
                                        <div className="flex items-center justify-between mb-1.5 py-1 px-2 rounded-md bg-violet-100/35 border border-violet-200/50 dark:bg-purple-500/5 dark:border-purple-500/15">
                                            <div className="flex items-center gap-1.5">
                                                <Phone size={10} strokeWidth={1.5} className="text-violet-800 dark:text-purple-400" />
                                                <span className="text-xs text-violet-900 font-medium tabular-nums dark:text-purple-300">{order.customerPhone}</span>
                                            </div>
                                            {order.customerNotifiedAt && (
                                                <span className="text-[10px] text-emerald-800 dark:text-emerald-400">
                                                    Notified {order.customerNotifiedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* Items */}
                                    {order.items.length > 0 && (
                                        <div className="mb-2 space-y-2">
                                            {order.items.map((item) => (
                                                <div key={item.id} className="text-xs">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                            <span className="text-zinc-500 tabular-nums">{item.quantity}×</span>
                                                            <span className="text-zinc-300 truncate">{item.menuItemName}</span>
                                                            {item.dietType && (
                                                                <span className={`w-1.5 h-1.5 shrink-0 rounded-full ${item.dietType === "veg" ? "bg-emerald-500" : item.dietType === "halal" ? "bg-blue-400" : "bg-red-500"
                                                                    }`} />
                                                            )}
                                                        </div>
                                                        <span className="text-zinc-500 shrink-0 tabular-nums">${(item.unitPrice * item.quantity).toFixed(2)}</span>
                                                    </div>
                                                    {item.specialInstructions && (
                                                        <p className="text-[10px] text-violet-800 mt-0.5 pl-5 break-words max-h-8 overflow-y-auto pr-1 dark:text-violet-300">
                                                            Note: {item.specialInstructions}
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {order.notes && (
                                        <div className="mb-2 rounded-md border border-violet-200/50 bg-violet-50/60 dark:border-violet-500/20 dark:bg-violet-500/5 px-2.5 py-2">
                                            <p className="text-[10px] uppercase tracking-wide text-violet-800 font-semibold mb-0.5 dark:text-violet-300/90">
                                                Special Instructions
                                            </p>
                                            <p className="text-[11px] text-violet-950 break-words max-h-14 overflow-y-auto pr-1 dark:text-violet-100">
                                                {order.notes}
                                            </p>
                                        </div>
                                    )}

                                    {/* Footer */}
                                    <div className="flex items-center justify-between pt-1.5 border-t border-white/5">
                                        <div className="flex items-center gap-3">
                                            <span className={cn("text-sm font-bold tabular-nums", DASH_MONEY_EMPHASIS)}>
                                                ${order.total.toFixed(2)}
                                            </span>
                                            {order.tipAmount != null && order.tipAmount > 0 && (
                                                <span className="text-xs text-emerald-800 dark:text-emerald-400">
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
                                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-700/60 border border-white/10 text-zinc-400 text-[11px] font-medium hover:bg-zinc-700 hover:text-zinc-200 transition-colors"
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
                                                    className={cn(DASH_BTN_ADD, "flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold")}
                                                >
                                                    <ArrowRight size={11} strokeWidth={2} />
                                                    {STATUS_CONFIG[NEXT_STATUS[order.status]!].label}
                                                </motion.button>
                                            )}
                                            {/* Cancel button */}
                                            {order.status !== "cancelled" && order.status !== "completed" && (
                                                <motion.button
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => setCancelTarget(order)}
                                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-medium hover:bg-red-500/20 transition-colors"
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
            </>
            )}

            {/* Take Order Modal */}
            <TakeOrderModal
                open={showTakeOrder}
                onClose={() => setShowTakeOrder(false)}
            />

            {/* Cancel Order Confirmation Dialog */}
            <Dialog open={cancelTarget !== null} onOpenChange={(o) => !o && !cancelBusy && setCancelTarget(null)}>
                <DialogContent className="glass-modal max-w-sm max-h-[80vh] overflow-y-auto border-white/10 bg-zinc-900/95 backdrop-blur-xl p-5">
                    <div className="flex flex-col items-center text-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                            <AlertTriangle size={22} strokeWidth={1.5} className="text-red-400" />
                        </div>
                        <div className="space-y-1.5">
                            <h3 className="text-base font-semibold text-zinc-100">Cancel this order?</h3>
                            <p className="text-sm text-zinc-400">
                                {cancelTarget && shouldAutoRefundOnCancel(cancelTarget) ? (
                                    <>
                                        This will cancel order #{cancelTarget.id} and refund{" "}
                                        <span className="font-semibold text-zinc-200">
                                            ${(remainingRefundable(cancelTarget) / 100).toFixed(2)}
                                        </span>{" "}
                                        to the customer via Stripe. This cannot be undone.
                                    </>
                                ) : (
                                    <>This will mark the order as cancelled. This cannot be undone.</>
                                )}
                            </p>
                        </div>
                        <div className="flex gap-3 w-full pt-1">
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                disabled={cancelBusy}
                                onClick={() => setCancelTarget(null)}
                                className="flex-1 py-2.5 rounded-lg bg-zinc-800 border border-white/10 text-zinc-300 text-sm font-medium hover:bg-zinc-700 transition-colors disabled:opacity-50"
                            >
                                Keep Order
                            </motion.button>
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                disabled={cancelBusy}
                                onClick={() => cancelTarget && void handleCancelOrder(cancelTarget)}
                                className="flex-1 py-2.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-sm font-semibold hover:bg-red-500/25 transition-colors disabled:opacity-50"
                            >
                                {cancelBusy
                                    ? "Cancelling…"
                                    : cancelTarget && shouldAutoRefundOnCancel(cancelTarget)
                                        ? "Cancel & refund"
                                        : "Cancel Order"}
                            </motion.button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
