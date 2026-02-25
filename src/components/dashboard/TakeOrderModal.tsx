import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search, Plus, Minus, X, Check, ArrowRight, Users, ShoppingBag,
    Coffee, Sun, Moon, Star, Clock, Leaf, Drumstick, Vegan, StickyNote,
} from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import { MenuItem, MealTime, OrderType, DietType } from "@/types/dashboard";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CartItem {
    menuItemId: string;
    name: string;
    unitPrice: number;
    quantity: number;
    specialInstructions: string;
    dietType?: DietType;
}

type Step = "table" | "items" | "review";

const ORDER_TYPES: { value: OrderType; label: string; description: string }[] = [
    { value: "dine_in", label: "Dine-In", description: "Guest is seated at a table" },
    { value: "pre_order", label: "Pre-Order", description: "Order placed before arrival" },
    { value: "takeout", label: "Takeout", description: "Order for pickup" },
];

const MEAL_FILTERS: { value: MealTime; label: string; icon: typeof Coffee; color: string }[] = [
    { value: "breakfast", label: "Breakfast", icon: Coffee, color: "bg-orange-500/10 border-orange-500/30 text-orange-400" },
    { value: "lunch", label: "Lunch", icon: Sun, color: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" },
    { value: "dinner", label: "Dinner", icon: Moon, color: "bg-indigo-500/10 border-indigo-500/30 text-indigo-400" },
    { value: "specials", label: "Specials", icon: Star, color: "bg-amber-500/10 border-amber-500/30 text-amber-400" },
];

const TAX_RATE = 0.0825;

interface TakeOrderModalProps {
    open: boolean;
    onClose: () => void;
    preselectedTableId?: string;
}

export default function TakeOrderModal({ open, onClose, preselectedTableId }: TakeOrderModalProps) {
    const { tables, menuItems, createOrder, addItemToOrder } = useDashboard();
    const [step, setStep] = useState<Step>(preselectedTableId ? "items" : "table");
    const [selectedTableId, setSelectedTableId] = useState<string | null>(preselectedTableId ?? null);
    const [orderType, setOrderType] = useState<OrderType>("dine_in");
    const [guestName, setGuestName] = useState("");
    const [partySize, setPartySize] = useState("1");
    const [search, setSearch] = useState("");
    const [mealFilter, setMealFilter] = useState<MealTime | null>(null);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [notes, setNotes] = useState("");
    const [editingInstructions, setEditingInstructions] = useState<string | null>(null);
    const [customerPhone, setCustomerPhone] = useState("");

    const occupiedTables = tables.filter((t) => t.status === "occupied" && !t.isCombinedChild);
    const allTables = tables.filter((t) => !t.isCombinedChild);
    const selectedTable = tables.find((t) => t.id === selectedTableId);

    // Available menu items (in-stock only)
    const availableItems = useMemo(() => {
        let items = menuItems.filter((m) => m.inStock && m.price != null);
        if (mealFilter) {
            items = items.filter((m) => m.mealTimes.includes(mealFilter) || m.mealTimes.includes("all_day"));
        }
        if (search.trim()) {
            const q = search.toLowerCase();
            items = items.filter(
                (m) => m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q)
            );
        }
        return items.sort((a, b) => a.name.localeCompare(b.name));
    }, [menuItems, mealFilter, search]);

    const cartSubtotal = cart.reduce((sum, c) => sum + c.unitPrice * c.quantity, 0);
    const cartTax = Math.round(cartSubtotal * TAX_RATE * 100) / 100;
    const cartTotal = Math.round((cartSubtotal + cartTax) * 100) / 100;
    const cartItemCount = cart.reduce((sum, c) => sum + c.quantity, 0);

    const addToCart = (item: MenuItem) => {
        if (item.price == null) return;
        setCart((prev) => {
            const existing = prev.find((c) => c.menuItemId === item.id);
            if (existing) {
                return prev.map((c) =>
                    c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c
                );
            }
            return [
                ...prev,
                {
                    menuItemId: item.id,
                    name: item.name,
                    unitPrice: item.price!,
                    quantity: 1,
                    specialInstructions: "",
                    dietType: item.dietType,
                },
            ];
        });
    };

    const updateCartQty = (menuItemId: string, delta: number) => {
        setCart((prev) => {
            return prev
                .map((c) =>
                    c.menuItemId === menuItemId ? { ...c, quantity: c.quantity + delta } : c
                )
                .filter((c) => c.quantity > 0);
        });
    };

    const updateCartInstructions = (menuItemId: string, instructions: string) => {
        setCart((prev) =>
            prev.map((c) =>
                c.menuItemId === menuItemId ? { ...c, specialInstructions: instructions } : c
            )
        );
    };

    const handleConfirm = async () => {
        if (!selectedTableId || cart.length === 0) return;

        const effectiveGuestName = orderType === "dine_in"
            ? selectedTable?.guestName ?? "Guest"
            : guestName.trim() || "Guest";
        const effectivePartySize = orderType === "dine_in"
            ? selectedTable?.partySize ?? 1
            : parseInt(partySize) || 1;

        const order = await createOrder(selectedTableId, orderType, effectiveGuestName, effectivePartySize,
            orderType !== "dine_in" ? customerPhone : undefined
        );

        for (const item of cart) {
            await addItemToOrder(
                order.id,
                item.menuItemId,
                item.quantity,
                item.specialInstructions || undefined,
                item.dietType
            );
        }

        handleClose();
    };

    const handleClose = () => {
        setStep(preselectedTableId ? "items" : "table");
        setSelectedTableId(preselectedTableId ?? null);
        setOrderType("dine_in");
        setGuestName("");
        setPartySize("1");
        setSearch("");
        setMealFilter(null);
        setCart([]);
        setNotes("");
        setEditingInstructions(null);
        setCustomerPhone("");
        onClose();
    };

    const handleSelectTable = (tableId: string) => {
        setSelectedTableId(tableId);
        const table = tables.find((t) => t.id === tableId);
        if (table?.guestName) setGuestName(table.guestName);
        if (table?.partySize) setPartySize(String(table.partySize));
    };

    const canProceedFromTable = selectedTableId && (
        orderType === "dine_in" || (guestName.trim() && customerPhone.trim())
    );

    return (
        <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
            <DialogContent className="glass-modal max-w-2xl border-white/10 bg-zinc-900/95 backdrop-blur-xl p-0 gap-0 max-h-[85vh] flex flex-col">
                <DialogHeader className="px-6 pt-6 pb-4 border-b border-white/5 shrink-0">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-lg font-bold text-zinc-100 tracking-tight">
                            {step === "table" ? "New Order" : step === "items" ? "Add Items" : "Review Order"}
                        </DialogTitle>
                        {/* Step indicator */}
                        <div className="flex items-center gap-2">
                            {(["table", "items", "review"] as Step[]).map((s, i) => (
                                <div key={s} className="flex items-center gap-2">
                                    {i > 0 && <div className="w-6 h-px bg-zinc-700" />}
                                    <div
                                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border ${s === step
                                            ? "bg-amber-500/20 border-amber-500/50 text-amber-400"
                                            : (["table", "items", "review"].indexOf(step) > i)
                                                ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                                                : "bg-zinc-800 border-white/10 text-zinc-600"
                                            }`}
                                    >
                                        {i + 1}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </DialogHeader>

                <AnimatePresence mode="wait">
                    {/* ── STEP 1: Table & Type ─────────────────────────────────────────── */}
                    {step === "table" && (
                        <motion.div
                            key="table"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className="flex-1 overflow-y-auto p-6 space-y-5"
                        >
                            {/* Order Type */}
                            <div>
                                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Order Type</p>
                                <div className="grid grid-cols-3 gap-2">
                                    {ORDER_TYPES.map(({ value, label, description }) => (
                                        <motion.button
                                            key={value}
                                            whileTap={{ scale: 0.97 }}
                                            onClick={() => setOrderType(value)}
                                            className={`p-3 rounded-xl border text-left transition-all ${orderType === value
                                                ? "bg-amber-500/10 border-amber-500/30"
                                                : "bg-zinc-800/60 border-white/8 hover:border-white/15"
                                                }`}
                                        >
                                            <p className={`text-sm font-semibold ${orderType === value ? "text-amber-400" : "text-zinc-300"}`}>
                                                {label}
                                            </p>
                                            <p className="text-[10px] text-zinc-500 mt-0.5">{description}</p>
                                        </motion.button>
                                    ))}
                                </div>
                            </div>

                            {/* Table Selection */}
                            <div>
                                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                                    {orderType === "dine_in" ? "Select Table" : "Assign to Table (optional)"}
                                </p>
                                <div className="grid grid-cols-4 gap-2">
                                    {(orderType === "dine_in" ? occupiedTables : allTables).map((table) => (
                                        <motion.button
                                            key={table.id}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => handleSelectTable(table.id)}
                                            className={`p-3 rounded-xl border text-left transition-all ${selectedTableId === table.id
                                                ? "bg-amber-500/10 border-amber-500/40"
                                                : "bg-zinc-800/60 border-white/8 hover:border-white/15"
                                                }`}
                                        >
                                            <span className="text-lg font-bold text-zinc-200 tabular-nums">T{table.tableNumber}</span>
                                            <div className="text-[10px] text-zinc-500 mt-0.5">
                                                {table.guestName ? table.guestName : `Seats ${table.capacity}`}
                                            </div>
                                            {table.partySize && (
                                                <div className="flex items-center gap-0.5 mt-1">
                                                    <Users size={9} strokeWidth={1.5} className="text-amber-500/60" />
                                                    <span className="text-[10px] text-amber-500/60">{table.partySize}</span>
                                                </div>
                                            )}
                                        </motion.button>
                                    ))}
                                </div>
                            </div>

                            {/* Guest info for non-dine-in */}
                            {orderType !== "dine_in" && (
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Guest Name</label>
                                        <Input
                                            value={guestName}
                                            onChange={(e) => setGuestName(e.target.value)}
                                            placeholder="Enter guest name"
                                            className="mt-1.5 h-10 bg-zinc-800/60 border-white/10 text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500/50"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                            Phone Number <span className="text-amber-400">*</span>
                                        </label>
                                        <Input
                                            type="tel"
                                            value={customerPhone}
                                            onChange={(e) => setCustomerPhone(e.target.value)}
                                            placeholder="e.g. (555) 123-4567"
                                            className="mt-1.5 h-10 bg-zinc-800/60 border-white/10 text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500/50"
                                        />
                                        <p className="text-[10px] text-zinc-600 mt-1">Used to notify customer when order is ready</p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Party Size</label>
                                        <Input
                                            type="number"
                                            min={1}
                                            value={partySize}
                                            onChange={(e) => setPartySize(e.target.value)}
                                            className="mt-1.5 h-10 bg-zinc-800/60 border-white/10 text-zinc-100 focus:border-amber-500/50 w-24"
                                        />
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* ── STEP 2: Menu Items ───────────────────────────────────────────── */}
                    {step === "items" && (
                        <motion.div
                            key="items"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className="flex-1 flex flex-col overflow-hidden"
                        >
                            {/* Search + Filters */}
                            <div className="px-6 pt-4 pb-2 space-y-2 shrink-0">
                                <div className="relative">
                                    <Search size={15} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                                    <Input
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Search menu items..."
                                        className="pl-9 h-9 bg-zinc-800/60 border-white/10 text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500/50"
                                    />
                                </div>
                                <div className="flex gap-1 flex-wrap">
                                    {MEAL_FILTERS.map(({ value, label, icon: Icon, color }) => (
                                        <button
                                            key={value}
                                            onClick={() => setMealFilter(mealFilter === value ? null : value)}
                                            className={`flex items-center gap-1 px-2 py-1 rounded-md border text-[10px] font-semibold transition-all ${mealFilter === value ? color : "bg-zinc-800/40 border-white/8 text-zinc-500 hover:text-zinc-300"
                                                }`}
                                        >
                                            <Icon size={10} strokeWidth={1.5} />
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Menu Items */}
                            <ScrollArea className="flex-1 px-6 pb-2">
                                <div className="space-y-1">
                                    {availableItems.map((item) => {
                                        const inCart = cart.find((c) => c.menuItemId === item.id);
                                        return (
                                            <div
                                                key={item.id}
                                                className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all ${inCart
                                                    ? "bg-amber-500/5 border-amber-500/20"
                                                    : "bg-zinc-800/30 border-white/5 hover:border-white/10"
                                                    }`}
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-sm font-medium text-zinc-200">{item.name}</span>
                                                        {item.dietType && (
                                                            <span className={`w-2 h-2 rounded-full ${item.dietType === "veg" ? "bg-emerald-500" : item.dietType === "vegan" ? "bg-green-500" : "bg-red-500"
                                                                }`} />
                                                        )}
                                                    </div>
                                                    <span className="text-xs text-amber-400 font-medium">${item.price?.toFixed(2)}</span>
                                                </div>

                                                {inCart ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <motion.button
                                                            whileTap={{ scale: 0.9 }}
                                                            onClick={() => updateCartQty(item.id, -1)}
                                                            className="w-7 h-7 rounded-md bg-zinc-700 border border-white/10 flex items-center justify-center text-zinc-300 hover:bg-zinc-600 transition-colors"
                                                        >
                                                            <Minus size={12} strokeWidth={2} />
                                                        </motion.button>
                                                        <span className="text-sm font-bold text-zinc-100 tabular-nums w-6 text-center">
                                                            {inCart.quantity}
                                                        </span>
                                                        <motion.button
                                                            whileTap={{ scale: 0.9 }}
                                                            onClick={() => updateCartQty(item.id, 1)}
                                                            className="w-7 h-7 rounded-md bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 hover:bg-amber-500/30 transition-colors"
                                                        >
                                                            <Plus size={12} strokeWidth={2} />
                                                        </motion.button>
                                                        <motion.button
                                                            whileTap={{ scale: 0.9 }}
                                                            onClick={() => setEditingInstructions(editingInstructions === item.id ? null : item.id)}
                                                            className={`w-7 h-7 rounded-md border flex items-center justify-center transition-colors ${inCart.specialInstructions
                                                                ? "bg-violet-500/10 border-violet-500/30 text-violet-400"
                                                                : "bg-zinc-700 border-white/10 text-zinc-500 hover:text-zinc-300"
                                                                }`}
                                                        >
                                                            <StickyNote size={11} strokeWidth={1.5} />
                                                        </motion.button>
                                                    </div>
                                                ) : (
                                                    <motion.button
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={() => addToCart(item)}
                                                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-700 border border-white/10 text-zinc-300 text-xs font-medium hover:bg-zinc-600 transition-colors"
                                                    >
                                                        <Plus size={12} strokeWidth={2} />
                                                        Add
                                                    </motion.button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Special instructions inline */}
                                <AnimatePresence>
                                    {editingInstructions && cart.find((c) => c.menuItemId === editingInstructions) && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="mt-2 p-3 rounded-lg bg-zinc-800/60 border border-white/10"
                                        >
                                            <p className="text-xs font-semibold text-zinc-400 mb-1.5">
                                                Special instructions for {cart.find((c) => c.menuItemId === editingInstructions)?.name}
                                            </p>
                                            <textarea
                                                value={cart.find((c) => c.menuItemId === editingInstructions)?.specialInstructions ?? ""}
                                                onChange={(e) => updateCartInstructions(editingInstructions, e.target.value)}
                                                placeholder="e.g. No onions, extra sauce..."
                                                rows={2}
                                                className="w-full rounded-md bg-zinc-700/60 border border-white/10 text-zinc-100 placeholder:text-zinc-600 text-xs px-2.5 py-1.5 focus:outline-none focus:border-amber-500/50 resize-none"
                                            />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </ScrollArea>

                            {/* Cart strip */}
                            {cart.length > 0 && (
                                <div className="shrink-0 px-6 py-3 border-t border-white/5 bg-zinc-900/80">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <ShoppingBag size={14} strokeWidth={1.5} className="text-amber-400" />
                                            <span className="text-xs font-medium text-zinc-300">
                                                {cartItemCount} item{cartItemCount > 1 ? "s" : ""}
                                            </span>
                                            <span className="text-sm font-bold text-amber-400 tabular-nums">
                                                ${cartSubtotal.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* ── STEP 3: Review ───────────────────────────────────────────────── */}
                    {step === "review" && (
                        <motion.div
                            key="review"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className="flex-1 overflow-y-auto p-6 space-y-5"
                        >
                            {/* Order summary */}
                            <div className="p-4 rounded-xl bg-zinc-800/40 border border-white/5 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-zinc-500">Table</span>
                                    <span className="text-sm font-semibold text-zinc-100">
                                        T{selectedTable?.tableNumber ?? "?"}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-zinc-500">Guest</span>
                                    <span className="text-sm font-semibold text-zinc-100">
                                        {orderType === "dine_in" ? selectedTable?.guestName ?? "Guest" : guestName || "Guest"}
                                    </span>
                                </div>
                                {orderType !== "dine_in" && customerPhone && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-zinc-500">Phone</span>
                                        <span className="text-sm font-semibold text-zinc-100 tabular-nums">{customerPhone}</span>
                                    </div>
                                )}
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-zinc-500">Type</span>
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${orderType === "dine_in"
                                        ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                                        : orderType === "pre_order"
                                            ? "bg-blue-500/10 border-blue-500/20 text-blue-400"
                                            : "bg-purple-500/10 border-purple-500/20 text-purple-400"
                                        }`}>
                                        {ORDER_TYPES.find((o) => o.value === orderType)?.label}
                                    </span>
                                </div>
                            </div>

                            {/* Line items */}
                            <div className="space-y-1.5">
                                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Items</p>
                                {cart.map((item) => (
                                    <div key={item.menuItemId} className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-800/30 border border-white/5">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-xs text-zinc-500 tabular-nums">{item.quantity}×</span>
                                                <span className="text-sm text-zinc-200">{item.name}</span>
                                                {item.dietType && (
                                                    <span className={`w-1.5 h-1.5 rounded-full ${item.dietType === "veg" ? "bg-emerald-500" : item.dietType === "vegan" ? "bg-green-500" : "bg-red-500"
                                                        }`} />
                                                )}
                                            </div>
                                            {item.specialInstructions && (
                                                <p className="text-[10px] text-violet-400 mt-0.5 pl-5">📝 {item.specialInstructions}</p>
                                            )}
                                        </div>
                                        <span className="text-sm font-medium text-zinc-300 tabular-nums">
                                            ${(item.unitPrice * item.quantity).toFixed(2)}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Totals */}
                            <div className="pt-3 border-t border-white/5 space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-zinc-500">Subtotal</span>
                                    <span className="text-sm text-zinc-300 tabular-nums">${cartSubtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-zinc-500">Tax (8.25%)</span>
                                    <span className="text-sm text-zinc-300 tabular-nums">${cartTax.toFixed(2)}</span>
                                </div>
                                <div className="flex items-center justify-between pt-1">
                                    <span className="text-sm font-bold text-zinc-100">Total</span>
                                    <span className="text-lg font-bold text-amber-400 tabular-nums">${cartTotal.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Order Notes</label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Any special requests for the entire order..."
                                    rows={2}
                                    className="mt-1.5 w-full rounded-lg bg-zinc-800/60 border border-white/10 text-zinc-100 placeholder:text-zinc-600 text-sm px-3 py-2 focus:outline-none focus:border-amber-500/50 resize-none"
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Footer */}
                <div className="shrink-0 px-6 py-4 border-t border-white/5 flex items-center gap-3 justify-between">
                    <div>
                        {step !== "table" && (
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setStep(step === "review" ? "items" : "table")}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 border border-white/10 text-zinc-400 text-sm font-medium hover:bg-zinc-700 transition-colors"
                            >
                                Back
                            </motion.button>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={handleClose}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 border border-white/10 text-zinc-400 text-sm font-medium hover:bg-zinc-700 transition-colors"
                        >
                            <X size={14} strokeWidth={1.5} />
                            Cancel
                        </motion.button>
                        {step === "table" && (
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => canProceedFromTable && setStep("items")}
                                disabled={!canProceedFromTable}
                                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Next
                                <ArrowRight size={14} strokeWidth={2} />
                            </motion.button>
                        )}
                        {step === "items" && (
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => cart.length > 0 && setStep("review")}
                                disabled={cart.length === 0}
                                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Review ({cartItemCount})
                                <ArrowRight size={14} strokeWidth={2} />
                            </motion.button>
                        )}
                        {step === "review" && (
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={handleConfirm}
                                className="flex items-center gap-2 px-6 py-2 rounded-lg bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 transition-colors amber-glow-sm"
                            >
                                <Check size={14} strokeWidth={2} />
                                Confirm — Cash
                            </motion.button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
