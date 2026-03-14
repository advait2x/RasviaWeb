import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, X, Delete, Lock } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

interface ManagerPinModalProps {
  open: boolean;
  onClose: () => void;
  onVerified: (staffId: string) => void;
  actionDescription: string;
}

export default function ManagerPinModal({ open, onClose, onVerified, actionDescription }: ManagerPinModalProps) {
  const { restaurantId } = useAuth();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (open) {
      setPin("");
      setError(false);
    }
  }, [open]);

  const handleDigit = useCallback((digit: string) => {
    if (pin.length >= 6) return;
    setError(false);
    setPin((p) => p + digit);
  }, [pin]);

  const handleDelete = useCallback(() => {
    setPin((p) => p.slice(0, -1));
    setError(false);
  }, []);

  const handleClear = useCallback(() => {
    setPin("");
    setError(false);
  }, []);

  const handleVerify = useCallback(async () => {
    if (!restaurantId || pin.length < 4) return;
    setVerifying(true);
    setError(false);

    try {
      const { data, error: rpcError } = await supabase.rpc("verify_manager_pin", {
        p_restaurant_id: restaurantId,
        p_pin: pin,
      });

      if (rpcError || !data || data.length === 0) {
        setError(true);
        setShake(true);
        setTimeout(() => setShake(false), 500);
        setPin("");
        return;
      }

      onVerified(String(data[0].staff_id));
      setPin("");
    } catch {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setPin("");
    } finally {
      setVerifying(false);
    }
  }, [restaurantId, pin, onVerified]);

  useEffect(() => {
    if (pin.length === 4) {
      handleVerify();
    }
  }, [pin, handleVerify]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") handleDigit(e.key);
      else if (e.key === "Backspace") handleDelete();
      else if (e.key === "Escape") onClose();
      else if (e.key === "Enter" && pin.length >= 4) handleVerify();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, handleDigit, handleDelete, handleVerify, onClose, pin]);

  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", ""];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-modal max-w-xs border-white/10 bg-zinc-900/95 backdrop-blur-xl p-0 overflow-hidden">
        <div className="flex flex-col items-center">
          {/* Header */}
          <div className="w-full px-6 pt-6 pb-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-3">
              <Lock size={22} strokeWidth={1.5} className="text-amber-400" />
            </div>
            <h3 className="text-base font-semibold text-zinc-100">Manager Authorization</h3>
            <p className="text-xs text-zinc-500 mt-1">{actionDescription}</p>
          </div>

          {/* PIN Display */}
          <motion.div
            animate={shake ? { x: [-8, 8, -6, 6, -3, 3, 0] } : {}}
            transition={{ duration: 0.4 }}
            className="flex gap-2.5 mb-4"
          >
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all duration-150 ${
                  pin.length > i
                    ? error
                      ? "border-red-500/60 bg-red-500/10"
                      : "border-amber-500/60 bg-amber-500/10"
                    : "border-zinc-700 bg-zinc-800/60"
                }`}
              >
                {pin.length > i && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`w-3 h-3 rounded-full ${error ? "bg-red-400" : "bg-amber-400"}`}
                  />
                )}
              </div>
            ))}
          </motion.div>

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-xs text-red-400 mb-3"
              >
                Invalid PIN. Try again.
              </motion.p>
            )}
          </AnimatePresence>

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-2 px-6 pb-6 w-full">
            {digits.map((d, i) => {
              if (d === "" && i === 9) {
                return (
                  <motion.button
                    key="clear"
                    whileTap={{ scale: 0.9 }}
                    onClick={handleClear}
                    className="h-14 rounded-xl bg-zinc-800/60 border border-white/5 text-zinc-500 text-xs font-medium hover:bg-zinc-800 transition-colors"
                  >
                    Clear
                  </motion.button>
                );
              }
              if (d === "" && i === 11) {
                return (
                  <motion.button
                    key="delete"
                    whileTap={{ scale: 0.9 }}
                    onClick={handleDelete}
                    className="h-14 rounded-xl bg-zinc-800/60 border border-white/5 flex items-center justify-center text-zinc-400 hover:bg-zinc-800 transition-colors"
                  >
                    <Delete size={18} strokeWidth={1.5} />
                  </motion.button>
                );
              }
              return (
                <motion.button
                  key={d}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleDigit(d)}
                  disabled={verifying}
                  className="h-14 rounded-xl bg-zinc-800/60 border border-white/8 text-zinc-100 text-lg font-semibold hover:bg-zinc-700/80 active:bg-zinc-700 transition-colors disabled:opacity-50"
                >
                  {d}
                </motion.button>
              );
            })}
          </div>

          {/* Cancel */}
          <div className="w-full px-6 pb-6">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-zinc-800 border border-white/10 text-zinc-400 text-sm font-medium hover:bg-zinc-700 transition-colors"
            >
              Cancel
            </motion.button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
