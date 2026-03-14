import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Minus, Plus, Trash2, Ban, Gift, StickyNote, ChevronDown, X } from "lucide-react";
import type { POSCartItem, Order, OrderItem } from "@/types/dashboard";

interface POSOrderPanelProps {
  mode: "cart" | "order";
  cartItems?: POSCartItem[];
  order?: Order | null;
  onUpdateCartQty?: (menuItemId: string, delta: number) => void;
  onRemoveCartItem?: (menuItemId: string) => void;
  onUpdateCartInstructions?: (menuItemId: string, instructions: string) => void;
  onVoidItem?: (itemId: string) => void;
  onCompItem?: (itemId: string) => void;
  selectedItemId?: string | null;
  onSelectItem?: (itemId: string | null) => void;
}

export default function POSOrderPanel({
  mode,
  cartItems = [],
  order,
  onUpdateCartQty,
  onRemoveCartItem,
  onUpdateCartInstructions,
  onVoidItem,
  onCompItem,
  selectedItemId,
  onSelectItem,
}: POSOrderPanelProps) {
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  const items = mode === "cart" ? cartItems : (order?.items ?? []);

  const renderCartItem = (item: POSCartItem, index: number) => {
    const lineTotal = (item.unitPrice + item.modifiers.reduce((s, m) => s + m.priceAdjustment, 0)) * item.quantity;

    return (
      <motion.div
        key={item.menuItemId + index}
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
        className="flex flex-col gap-1 px-3 py-2.5 rounded-lg border border-white/5 bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-100 truncate">{item.name}</p>
            {item.modifiers.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {item.modifiers.map((m) => (
                  <span key={m.id} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400">
                    {m.name} {m.priceAdjustment > 0 && `+$${m.priceAdjustment.toFixed(2)}`}
                  </span>
                ))}
              </div>
            )}
            {item.specialInstructions && (
              <p className="text-[10px] text-zinc-500 mt-0.5 italic truncate">{item.specialInstructions}</p>
            )}
          </div>
          <span className="text-sm font-semibold text-amber-400 tabular-nums whitespace-nowrap">
            ${lineTotal.toFixed(2)}
          </span>
        </div>

        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-1">
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={() => onUpdateCartQty?.(item.menuItemId, -1)}
              className="w-7 h-7 rounded-lg bg-zinc-700/60 border border-white/5 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <Minus size={12} strokeWidth={2} />
            </motion.button>
            <span className="text-sm font-bold text-zinc-200 w-8 text-center tabular-nums">{item.quantity}</span>
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={() => onUpdateCartQty?.(item.menuItemId, 1)}
              className="w-7 h-7 rounded-lg bg-zinc-700/60 border border-white/5 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <Plus size={12} strokeWidth={2} />
            </motion.button>
          </div>
          <div className="flex items-center gap-1">
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={() => {
                setEditingNote(item.menuItemId);
                setNoteText(item.specialInstructions);
              }}
              className="w-7 h-7 rounded-lg bg-zinc-700/40 border border-white/5 flex items-center justify-center text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <StickyNote size={11} strokeWidth={1.5} />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={() => onRemoveCartItem?.(item.menuItemId)}
              className="w-7 h-7 rounded-lg bg-red-500/8 border border-red-500/15 flex items-center justify-center text-red-400/60 hover:text-red-400 transition-colors"
            >
              <Trash2 size={11} strokeWidth={1.5} />
            </motion.button>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderOrderItem = (item: OrderItem) => {
    const isSelected = selectedItemId === item.id;
    const isVoided = item.voided;
    const isComped = item.comped;

    return (
      <motion.div
        key={item.id}
        layout
        onClick={() => onSelectItem?.(isSelected ? null : item.id)}
        className={`flex flex-col gap-1 px-3 py-2.5 rounded-lg border cursor-pointer transition-all ${
          isVoided
            ? "border-red-500/20 bg-red-500/5 opacity-50"
            : isComped
            ? "border-emerald-500/20 bg-emerald-500/5"
            : isSelected
            ? "border-amber-500/30 bg-amber-500/5"
            : "border-white/5 bg-zinc-800/30 hover:bg-zinc-800/50"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-zinc-500 tabular-nums">{item.quantity}x</span>
              <p className={`text-sm font-medium truncate ${isVoided ? "line-through text-red-400" : isComped ? "line-through text-emerald-400" : "text-zinc-100"}`}>
                {item.menuItemName}
              </p>
            </div>
            {isVoided && <span className="text-[10px] text-red-400 font-semibold">VOIDED</span>}
            {isComped && <span className="text-[10px] text-emerald-400 font-semibold">COMP{item.compReason ? ` — ${item.compReason}` : ""}</span>}
            {item.specialInstructions && (
              <p className="text-[10px] text-zinc-500 mt-0.5 italic">{item.specialInstructions}</p>
            )}
          </div>
          <span className={`text-sm font-semibold tabular-nums whitespace-nowrap ${isVoided || isComped ? "text-zinc-600 line-through" : "text-amber-400"}`}>
            ${(item.unitPrice * item.quantity).toFixed(2)}
          </span>
        </div>

        <AnimatePresence>
          {isSelected && !isVoided && !isComped && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-1.5 pt-1.5 border-t border-white/5 mt-1"
            >
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={(e) => { e.stopPropagation(); onVoidItem?.(item.id); }}
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-semibold hover:bg-red-500/15 transition-colors"
              >
                <Ban size={10} strokeWidth={1.5} />
                Void
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={(e) => { e.stopPropagation(); onCompItem?.(item.id); }}
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold hover:bg-emerald-500/15 transition-colors"
              >
                <Gift size={10} strokeWidth={1.5} />
                Comp
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto space-y-1.5 pr-1">
        <AnimatePresence initial={false}>
          {mode === "cart"
            ? cartItems.map((item, i) => renderCartItem(item, i))
            : order?.items.map((item) => renderOrderItem(item))
          }
        </AnimatePresence>

        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-600">
            <p className="text-sm font-medium">No items yet</p>
            <p className="text-xs mt-0.5">Tap items from the menu to add</p>
          </div>
        )}
      </div>

      {/* Note editing popover */}
      <AnimatePresence>
        {editingNote && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mt-2 p-3 rounded-xl border border-white/10 bg-zinc-800/80 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-zinc-300">Special Instructions</span>
              <button onClick={() => setEditingNote(null)} className="text-zinc-500 hover:text-zinc-300">
                <X size={12} />
              </button>
            </div>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="e.g. No onions, extra sauce..."
              className="w-full h-16 px-3 py-2 rounded-lg bg-zinc-900/60 border border-white/5 text-zinc-100 text-xs placeholder:text-zinc-600 resize-none focus:outline-none focus:border-amber-500/30"
            />
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                onUpdateCartInstructions?.(editingNote, noteText);
                setEditingNote(null);
              }}
              className="mt-2 w-full py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold hover:bg-amber-500/15 transition-colors"
            >
              Save Note
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
