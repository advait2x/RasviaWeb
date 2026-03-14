import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Settings2, X, Check, Plus } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useDashboard } from "@/context/DashboardContext";
import type { ItemModifier, MenuItem } from "@/types/dashboard";

interface ItemModifierSelectorProps {
  open: boolean;
  onClose: () => void;
  menuItem: MenuItem | null;
  onConfirm: (modifiers: { id: string; name: string; priceAdjustment: number }[]) => void;
}

export default function ItemModifierSelector({ open, onClose, menuItem, onConfirm }: ItemModifierSelectorProps) {
  const { itemModifiers } = useDashboard();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const categories = useMemo(() => {
    const cats = new Map<string, ItemModifier[]>();
    for (const mod of itemModifiers) {
      const list = cats.get(mod.category) ?? [];
      list.push(mod);
      cats.set(mod.category, list);
    }
    return cats;
  }, [itemModifiers]);

  const toggleMod = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    const mods = itemModifiers
      .filter((m) => selected.has(m.id))
      .map((m) => ({ id: m.id, name: m.name, priceAdjustment: m.priceAdjustment }));
    onConfirm(mods);
    setSelected(new Set());
    onClose();
  };

  const totalAdjustment = useMemo(
    () => itemModifiers.filter((m) => selected.has(m.id)).reduce((s, m) => s + m.priceAdjustment, 0),
    [itemModifiers, selected]
  );

  if (!menuItem) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setSelected(new Set()); onClose(); } }}>
      <DialogContent className="glass-modal max-w-sm border-white/10 bg-zinc-900/95 backdrop-blur-xl p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                <Settings2 size={16} strokeWidth={1.5} className="text-amber-400" />
                Modifiers
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">{menuItem.name}</p>
            </div>
            <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300"><X size={16} /></button>
          </div>

          {categories.size === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              <p className="text-sm">No modifiers available</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-64 overflow-auto">
              {Array.from(categories.entries()).map(([category, mods]) => (
                <div key={category} className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">{category}</label>
                  {mods.map((mod) => {
                    const isSelected = selected.has(mod.id);
                    return (
                      <motion.button
                        key={mod.id}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => toggleMod(mod.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left ${
                          isSelected
                            ? "bg-amber-500/10 border-amber-500/30"
                            : "bg-zinc-800/40 border-white/5 hover:border-white/10"
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 ${
                          isSelected ? "bg-amber-500 border-amber-500" : "border-zinc-600"
                        }`}>
                          {isSelected && <Check size={12} strokeWidth={2.5} className="text-black" />}
                        </div>
                        <span className="flex-1 text-sm text-zinc-100">{mod.name}</span>
                        {mod.priceAdjustment !== 0 && (
                          <span className={`text-xs font-semibold ${mod.priceAdjustment > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                            {mod.priceAdjustment > 0 ? "+" : ""}${mod.priceAdjustment.toFixed(2)}
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {totalAdjustment !== 0 && (
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-800/60 border border-white/5">
              <span className="text-xs text-zinc-400">{selected.size} modifier(s)</span>
              <span className={`text-sm font-bold ${totalAdjustment > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                {totalAdjustment > 0 ? "+" : ""}${totalAdjustment.toFixed(2)}
              </span>
            </div>
          )}

          <div className="flex gap-3">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => { onConfirm([]); onClose(); }}
              className="flex-1 py-2.5 rounded-xl bg-zinc-800 border border-white/10 text-zinc-300 text-sm font-medium hover:bg-zinc-700 transition-colors"
            >
              No Modifiers
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleConfirm}
              className="flex-1 py-2.5 rounded-xl bg-amber-500 text-black text-sm font-bold hover:bg-amber-400 transition-colors"
            >
              <Plus size={14} className="inline mr-1" />
              Add to Order
            </motion.button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
