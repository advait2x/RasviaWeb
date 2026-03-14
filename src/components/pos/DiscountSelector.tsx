import { useState } from "react";
import { motion } from "framer-motion";
import { Tag, Percent, DollarSign, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useDashboard } from "@/context/DashboardContext";
import type { Discount } from "@/types/dashboard";
import ManagerPinModal from "./ManagerPinModal";

interface DiscountSelectorProps {
  open: boolean;
  onClose: () => void;
  onApply: (discount: { name: string; type: "percentage" | "fixed"; value: number; discountId?: string }, approvedBy?: string) => void;
}

export default function DiscountSelector({ open, onClose, onApply }: DiscountSelectorProps) {
  const { discounts } = useDashboard();
  const [customMode, setCustomMode] = useState(false);
  const [customType, setCustomType] = useState<"percentage" | "fixed">("percentage");
  const [customValue, setCustomValue] = useState("");
  const [customName, setCustomName] = useState("");
  const [pinAction, setPinAction] = useState<{ discount: { name: string; type: "percentage" | "fixed"; value: number; discountId?: string } } | null>(null);

  const handleSelectPreset = (d: Discount) => {
    const discount = { name: d.name, type: d.type, value: d.value, discountId: d.id };
    if (d.requiresManagerPin) {
      setPinAction({ discount });
    } else {
      onApply(discount);
      onClose();
    }
  };

  const handleCustomApply = () => {
    const value = parseFloat(customValue);
    if (!value || value <= 0) return;
    const discount = { name: customName.trim() || "Custom Discount", type: customType, value };
    setPinAction({ discount });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="glass-modal max-w-sm border-white/10 bg-zinc-900/95 backdrop-blur-xl p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                <Tag size={16} strokeWidth={1.5} className="text-amber-400" />
                Apply Discount
              </h3>
              <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300"><X size={16} /></button>
            </div>

            {/* Preset Discounts */}
            {discounts.length > 0 && !customMode && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Presets</label>
                {discounts.map((d) => (
                  <motion.button
                    key={d.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSelectPreset(d)}
                    className="w-full flex items-center justify-between px-3 py-3 rounded-xl border border-white/5 bg-zinc-800/40 hover:border-amber-500/20 transition-all"
                  >
                    <div className="flex items-center gap-2">
                      {d.type === "percentage" ? <Percent size={14} className="text-amber-400" /> : <DollarSign size={14} className="text-amber-400" />}
                      <span className="text-sm font-medium text-zinc-100">{d.name}</span>
                    </div>
                    <span className="text-sm font-bold text-amber-400">
                      {d.type === "percentage" ? `${d.value}%` : `$${d.value.toFixed(2)}`}
                    </span>
                  </motion.button>
                ))}
              </div>
            )}

            {/* Toggle to custom */}
            {!customMode && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setCustomMode(true)}
                className="w-full py-2.5 rounded-xl border border-white/10 bg-zinc-800/40 text-zinc-400 text-sm font-medium hover:text-zinc-200 transition-colors"
              >
                Custom Discount
              </motion.button>
            )}

            {/* Custom Discount */}
            {customMode && (
              <div className="space-y-3">
                <Input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Discount name (optional)"
                  className="h-10 bg-zinc-800/60 border-white/10 text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500/50"
                />
                <div className="flex gap-2">
                  {(["percentage", "fixed"] as const).map((t) => (
                    <motion.button
                      key={t}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setCustomType(t)}
                      className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                        customType === t ? "bg-amber-500/10 border-amber-500/30 text-amber-400" : "bg-zinc-800/40 border-white/5 text-zinc-400"
                      }`}
                    >
                      {t === "percentage" ? "%" : "$"}
                    </motion.button>
                  ))}
                </div>
                <Input
                  type="number"
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  placeholder={customType === "percentage" ? "e.g. 10" : "e.g. 5.00"}
                  className="h-10 bg-zinc-800/60 border-white/10 text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500/50"
                />
                <div className="flex gap-2">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setCustomMode(false)}
                    className="flex-1 py-2.5 rounded-xl bg-zinc-800 border border-white/10 text-zinc-300 text-sm font-medium hover:bg-zinc-700 transition-colors"
                  >
                    Back
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleCustomApply}
                    disabled={!customValue || parseFloat(customValue) <= 0}
                    className="flex-1 py-2.5 rounded-xl bg-amber-500 text-black text-sm font-bold hover:bg-amber-400 transition-colors disabled:opacity-40"
                  >
                    Apply
                  </motion.button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ManagerPinModal
        open={!!pinAction}
        onClose={() => setPinAction(null)}
        actionDescription={`Apply discount: ${pinAction?.discount.name ?? ""}`}
        onVerified={(staffId) => {
          if (pinAction) {
            onApply(pinAction.discount, staffId);
            setPinAction(null);
            onClose();
          }
        }}
      />
    </>
  );
}
