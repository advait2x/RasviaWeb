import { useState } from "react";
import { motion } from "framer-motion";
import { X, Users, Phone, ShoppingBag, Utensils, Package } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { TableInfo, OrderType } from "@/types/dashboard";

interface POSNewOrderModalProps {
  open: boolean;
  onClose: () => void;
  tables: TableInfo[];
  onConfirm: (config: {
    tableId: string;
    orderType: OrderType;
    guestName: string;
    partySize: number;
    customerPhone?: string;
  }) => void;
}

const ORDER_TYPES: { value: OrderType; label: string; icon: typeof Utensils }[] = [
  { value: "dine_in", label: "Dine In", icon: Utensils },
  { value: "takeout", label: "Takeout", icon: Package },
  { value: "pre_order", label: "Pre-Order", icon: ShoppingBag },
];

export default function POSNewOrderModal({ open, onClose, tables, onConfirm }: POSNewOrderModalProps) {
  const [orderType, setOrderType] = useState<OrderType>("dine_in");
  const [selectedTableId, setSelectedTableId] = useState<string>("");
  const [guestName, setGuestName] = useState("");
  const [partySize, setPartySize] = useState(1);
  const [customerPhone, setCustomerPhone] = useState("");

  const visibleTables = tables.filter((t) => !t.isCombinedChild);

  const handleConfirm = () => {
    const tableId = orderType === "dine_in" ? selectedTableId : `takeout-${Date.now()}`;
    if (orderType === "dine_in" && !selectedTableId) return;

    onConfirm({
      tableId,
      orderType,
      guestName: guestName.trim() || "Guest",
      partySize,
      customerPhone: customerPhone.trim() || undefined,
    });
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setOrderType("dine_in");
    setSelectedTableId("");
    setGuestName("");
    setPartySize(1);
    setCustomerPhone("");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { resetForm(); onClose(); } }}>
      <DialogContent className="glass-modal max-w-lg border-white/10 bg-zinc-900/95 backdrop-blur-xl p-0 overflow-hidden">
        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-zinc-100">New Order</h3>
            <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Order Type */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Order Type</label>
            <div className="grid grid-cols-3 gap-2">
              {ORDER_TYPES.map(({ value, label, icon: Icon }) => (
                <motion.button
                  key={value}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setOrderType(value)}
                  className={`flex flex-col items-center gap-2 py-4 rounded-xl border transition-all ${
                    orderType === value
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                      : "bg-zinc-800/40 border-white/5 text-zinc-400 hover:border-white/10"
                  }`}
                >
                  <Icon size={20} strokeWidth={1.5} />
                  <span className="text-xs font-semibold">{label}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Table Selection (dine-in only) */}
          {orderType === "dine_in" && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Select Table</label>
              <div className="grid grid-cols-6 gap-2 max-h-40 overflow-auto">
                {visibleTables.map((table) => {
                  const isOccupied = table.status === "occupied";
                  const isSelected = selectedTableId === table.id;
                  return (
                    <motion.button
                      key={table.id}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        setSelectedTableId(table.id);
                        if (isOccupied && table.guestName) setGuestName(table.guestName);
                        if (isOccupied && table.partySize) setPartySize(table.partySize);
                      }}
                      className={`h-12 rounded-xl border text-sm font-bold transition-all ${
                        isSelected
                          ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                          : isOccupied
                          ? "bg-amber-500/5 border-amber-500/15 text-amber-400/70"
                          : table.status === "available"
                          ? "bg-zinc-800/40 border-white/5 text-zinc-300 hover:border-white/15"
                          : "bg-zinc-800/20 border-white/5 text-zinc-600"
                      }`}
                    >
                      T{table.tableNumber}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Guest Details */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Guest Name</label>
              <Input
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Guest"
                className="h-10 bg-zinc-800/60 border-white/10 text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Party Size</label>
              <div className="flex items-center gap-2">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setPartySize(Math.max(1, partySize - 1))}
                  className="w-10 h-10 rounded-lg bg-zinc-800/60 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-zinc-200"
                >
                  -
                </motion.button>
                <div className="flex items-center gap-1 flex-1 justify-center">
                  <Users size={14} strokeWidth={1.5} className="text-zinc-500" />
                  <span className="text-lg font-bold text-zinc-100 tabular-nums">{partySize}</span>
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setPartySize(partySize + 1)}
                  className="w-10 h-10 rounded-lg bg-zinc-800/60 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-zinc-200"
                >
                  +
                </motion.button>
              </div>
            </div>
          </div>

          {/* Phone (for takeout/pre-order) */}
          {orderType !== "dine_in" && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Phone size={11} strokeWidth={1.5} />
                Phone Number
              </label>
              <Input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="(555) 123-4567"
                className="h-10 bg-zinc-800/60 border-white/10 text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500/50"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => { resetForm(); onClose(); }}
              className="flex-1 py-3 rounded-xl bg-zinc-800 border border-white/10 text-zinc-300 text-sm font-medium hover:bg-zinc-700 transition-colors"
            >
              Cancel
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleConfirm}
              disabled={orderType === "dine_in" && !selectedTableId}
              className="flex-1 py-3 rounded-xl bg-amber-500 text-black text-sm font-bold hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Start Order
            </motion.button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
