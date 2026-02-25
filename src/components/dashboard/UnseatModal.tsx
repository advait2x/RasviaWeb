import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
    X, Check, Users, Clock, Receipt, DollarSign, StickyNote,
} from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

const TIP_PRESETS = [15, 18, 20, 25];

interface UnseatModalProps {
    open: boolean;
    onClose: () => void;
    tableId: string | null;
}

export default function UnseatModal({ open, onClose, tableId }: UnseatModalProps) {
    const { tables, orders, clearTableWithTip } = useDashboard();
    const [tipMode, setTipMode] = useState<"percent" | "dollar">("percent");
    const [tipPercent, setTipPercent] = useState<number>(18);
    const [tipDollar, setTipDollar] = useState("");
    const [notes, setNotes] = useState("");

    const table = tables.find((t) => t.id === tableId);
    const tableOrders = useMemo(
        () => tableId ? orders.filter((o) => o.tableId === tableId && o.status !== "completed" && o.status !== "cancelled") : [],
        [orders, tableId]
    );

    const orderTotal = tableOrders.reduce((sum, o) => sum + o.total, 0);
    const orderSubtotal = tableOrders.reduce((sum, o) => sum + o.subtotal, 0);
    const orderTax = tableOrders.reduce((sum, o) => sum + o.tax, 0);
    const totalItems = tableOrders.reduce((sum, o) => sum + o.items.length, 0);

    const effectiveTipAmount = tipMode === "percent"
        ? Math.round(orderSubtotal * tipPercent / 100 * 100) / 100
        : parseFloat(tipDollar) || 0;

    const effectiveTipPercent = tipMode === "percent"
        ? tipPercent
        : orderSubtotal > 0 ? Math.round((parseFloat(tipDollar) || 0) / orderSubtotal * 10000) / 100 : 0;

    const grandTotal = Math.round((orderTotal + effectiveTipAmount) * 100) / 100;

    const duration = table?.seatedAt
        ? Math.floor((Date.now() - table.seatedAt.getTime()) / 60000)
        : 0;

    const durationLabel = duration < 60
        ? `${duration}m`
        : `${Math.floor(duration / 60)}h ${duration % 60}m`;

    const handleConfirm = async () => {
        if (!tableId) return;
        await clearTableWithTip(tableId, effectiveTipAmount, effectiveTipPercent, notes || undefined);
        handleClose();
    };

    const handleClose = () => {
        setTipMode("percent");
        setTipPercent(18);
        setTipDollar("");
        setNotes("");
        onClose();
    };

    if (!table) return null;

    return (
        <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
            <DialogContent className="glass-modal max-w-md border-white/10 bg-zinc-900/95 backdrop-blur-xl p-0 gap-0">
                <DialogHeader className="px-6 pt-6 pb-4 border-b border-white/5">
                    <DialogTitle className="text-lg font-bold text-zinc-100 tracking-tight">
                        Unseat Table {table.tableNumber}
                    </DialogTitle>
                </DialogHeader>

                <div className="p-6 space-y-5">
                    {/* Session Info */}
                    <div className="p-4 rounded-xl bg-zinc-800/40 border border-white/5 space-y-2.5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-zinc-500">Guest</span>
                            <span className="text-sm font-semibold text-zinc-100">{table.guestName ?? "Guest"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-zinc-500">Party Size</span>
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20">
                                <Users size={11} strokeWidth={1.5} className="text-amber-500" />
                                <span className="text-xs font-semibold text-amber-500 tabular-nums">{table.partySize ?? 1}</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-zinc-500">Duration</span>
                            <div className="flex items-center gap-1">
                                <Clock size={11} strokeWidth={1.5} className="text-zinc-400" />
                                <span className="text-sm font-semibold text-zinc-300 tabular-nums">{durationLabel}</span>
                            </div>
                        </div>
                    </div>

                    {/* Bill Summary */}
                    {tableOrders.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-1.5">
                                <Receipt size={13} strokeWidth={1.5} className="text-zinc-500" />
                                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Bill Summary</p>
                                <span className="text-[10px] text-zinc-600">({totalItems} items across {tableOrders.length} order{tableOrders.length > 1 ? "s" : ""})</span>
                            </div>
                            <div className="rounded-xl bg-zinc-800/30 border border-white/5 divide-y divide-white/5">
                                {tableOrders.map((order) => (
                                    <div key={order.id} className="p-3 space-y-1">
                                        {order.items.map((item) => (
                                            <div key={item.id} className="flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-zinc-500 tabular-nums">{item.quantity}×</span>
                                                    <span className="text-zinc-300">{item.menuItemName}</span>
                                                </div>
                                                <span className="text-zinc-400 tabular-nums">${(item.unitPrice * item.quantity).toFixed(2)}</span>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>

                            {/* Totals */}
                            <div className="pt-1 space-y-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-zinc-500">Subtotal</span>
                                    <span className="text-sm text-zinc-300 tabular-nums">${orderSubtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-zinc-500">Tax</span>
                                    <span className="text-sm text-zinc-300 tabular-nums">${orderTax.toFixed(2)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-zinc-200">Order Total</span>
                                    <span className="text-sm font-bold text-zinc-100 tabular-nums">${orderTotal.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tip Section */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <DollarSign size={13} strokeWidth={1.5} className="text-emerald-500" />
                                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Tip</p>
                            </div>
                            <div className="flex gap-1 p-0.5 rounded-lg bg-zinc-800/60 border border-white/5">
                                <button
                                    onClick={() => setTipMode("percent")}
                                    className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${tipMode === "percent"
                                        ? "bg-zinc-700 text-zinc-100"
                                        : "text-zinc-500 hover:text-zinc-300"
                                        }`}
                                >
                                    %
                                </button>
                                <button
                                    onClick={() => setTipMode("dollar")}
                                    className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${tipMode === "dollar"
                                        ? "bg-zinc-700 text-zinc-100"
                                        : "text-zinc-500 hover:text-zinc-300"
                                        }`}
                                >
                                    $
                                </button>
                            </div>
                        </div>

                        {tipMode === "percent" ? (
                            <div className="grid grid-cols-4 gap-2">
                                {TIP_PRESETS.map((pct) => (
                                    <motion.button
                                        key={pct}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setTipPercent(pct)}
                                        className={`flex flex-col items-center gap-0.5 px-2 py-2.5 rounded-lg border text-sm font-semibold transition-all ${tipPercent === pct
                                            ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                                            : "bg-zinc-800/60 border-white/8 text-zinc-400 hover:bg-zinc-700/60 hover:text-zinc-200"
                                            }`}
                                    >
                                        {pct}%
                                        <span className="text-[10px] font-normal opacity-60 tabular-nums">
                                            ${(Math.round(orderSubtotal * pct / 100 * 100) / 100).toFixed(2)}
                                        </span>
                                    </motion.button>
                                ))}
                            </div>
                        ) : (
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">$</span>
                                <Input
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    value={tipDollar}
                                    onChange={(e) => setTipDollar(e.target.value)}
                                    placeholder="0.00"
                                    className="pl-7 h-10 bg-zinc-800/60 border-white/10 text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/50"
                                />
                                {effectiveTipPercent > 0 && (
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">
                                        ≈ {effectiveTipPercent.toFixed(1)}%
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Tip summary */}
                        <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
                            <span className="text-xs text-zinc-400">Tip Amount</span>
                            <span className="text-sm font-bold text-emerald-400 tabular-nums">${effectiveTipAmount.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Grand Total */}
                    {tableOrders.length > 0 && (
                        <div className="flex items-center justify-between p-4 rounded-xl bg-amber-500/5 border border-amber-500/15">
                            <span className="text-sm font-bold text-zinc-100">Grand Total</span>
                            <span className="text-xl font-bold text-amber-400 tabular-nums">${grandTotal.toFixed(2)}</span>
                        </div>
                    )}

                    {/* Notes */}
                    <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <StickyNote size={12} strokeWidth={1.5} className="text-zinc-500" />
                            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Notes</label>
                        </div>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Any notes about this table session..."
                            rows={2}
                            className="w-full rounded-lg bg-zinc-800/60 border border-white/10 text-zinc-100 placeholder:text-zinc-600 text-sm px-3 py-2 focus:outline-none focus:border-amber-500/50 resize-none"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-white/5 flex items-center gap-3 justify-end">
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={handleClose}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-800 border border-white/10 text-zinc-400 text-sm font-medium hover:bg-zinc-700 transition-colors"
                    >
                        <X size={14} strokeWidth={1.5} />
                        Cancel
                    </motion.button>
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={handleConfirm}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 transition-colors amber-glow-sm"
                    >
                        <Check size={14} strokeWidth={2} />
                        Confirm & Clear Table
                    </motion.button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
