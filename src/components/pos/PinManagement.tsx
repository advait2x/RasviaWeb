import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { KeyRound, Check, X, Loader2, Trash2, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { StaffMember, RestaurantRole } from "@/types/dashboard";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface PinManagementProps {
  staff: StaffMember[];
  roles: RestaurantRole[];
}

interface PinStatus {
  staffId: string | number;
  hasPin: boolean;
}

export default function PinManagement({ staff, roles }: PinManagementProps) {
  const { restaurantId } = useAuth();
  const [pinStatuses, setPinStatuses] = useState<PinStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [settingPin, setSettingPin] = useState<StaffMember | null>(null);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchPinStatuses = useCallback(async () => {
    if (!restaurantId) return;
    const { data } = await supabase
      .from("manager_pins")
      .select("staff_id")
      .eq("restaurant_id", restaurantId);

    setPinStatuses(
      staff.map((s) => ({
        staffId: s.id,
        hasPin: (data ?? []).some((p) => p.staff_id === s.id),
      }))
    );
    setLoading(false);
  }, [restaurantId, staff]);

  useEffect(() => {
    fetchPinStatuses();
  }, [fetchPinStatuses]);

  const handleSetPin = async () => {
    if (!restaurantId || !settingPin) return;
    if (newPin.length < 4 || newPin.length > 6) {
      setError("PIN must be 4-6 digits");
      return;
    }
    if (newPin !== confirmPin) {
      setError("PINs do not match");
      return;
    }
    if (!/^\d+$/.test(newPin)) {
      setError("PIN must be digits only");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { error: rpcError } = await supabase.rpc("set_manager_pin", {
        p_staff_id: settingPin.id,
        p_restaurant_id: restaurantId,
        p_pin: newPin,
      });

      if (rpcError) throw rpcError;

      await fetchPinStatuses();
      setSettingPin(null);
      setNewPin("");
      setConfirmPin("");
      setSuccess("PIN set successfully");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to set PIN");
    } finally {
      setSaving(false);
    }
  };

  const handleRemovePin = async (staffId: string | number) => {
    if (!restaurantId) return;
    await supabase
      .from("manager_pins")
      .delete()
      .eq("staff_id", staffId)
      .eq("restaurant_id", restaurantId);
    await fetchPinStatuses();
    setSuccess("PIN removed");
    setTimeout(() => setSuccess(null), 3000);
  };

  const getRoleName = (roleId: number | null) => {
    if (!roleId) return "No Role";
    return roles.find((r) => r.id === roleId)?.name ?? "Unknown";
  };

  if (loading) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
          <KeyRound size={11} strokeWidth={1.5} />
          Manager PINs
        </h4>
      </div>
      <p className="text-[11px] text-zinc-600">
        Assign 4-6 digit PINs to managers for authorizing voids, discounts, and other protected actions
      </p>

      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400"
          >
            <Check size={12} strokeWidth={2} />
            {success}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-1.5">
        {staff.map((s) => {
          const status = pinStatuses.find((p) => p.staffId === s.id);
          const hasPin = status?.hasPin ?? false;

          return (
            <div
              key={s.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-white/5 bg-zinc-800/30"
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                hasPin ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-zinc-700/40 border border-white/5"
              }`}>
                {hasPin ? (
                  <ShieldCheck size={13} strokeWidth={1.5} className="text-emerald-400" />
                ) : (
                  <KeyRound size={13} strokeWidth={1.5} className="text-zinc-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-zinc-200 truncate">{s.user_id.slice(0, 8)}...</p>
                <p className="text-[10px] text-zinc-500">{getRoleName(s.role_id)}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    setSettingPin(s);
                    setNewPin("");
                    setConfirmPin("");
                    setError(null);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-400 text-[10px] font-semibold hover:bg-amber-500/15 transition-colors"
                >
                  {hasPin ? "Reset" : "Set PIN"}
                </motion.button>
                {hasPin && (
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleRemovePin(s.id)}
                    className="w-6 h-6 rounded-lg bg-red-500/8 border border-red-500/15 flex items-center justify-center text-red-400/60 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={10} strokeWidth={1.5} />
                  </motion.button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Set/Reset PIN Dialog */}
      <Dialog open={!!settingPin} onOpenChange={(o) => !o && setSettingPin(null)}>
        <DialogContent className="glass-modal max-w-xs border-white/10 bg-zinc-900/95 backdrop-blur-xl p-6">
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-base font-semibold text-zinc-100">
                {pinStatuses.find((p) => p.staffId === settingPin?.id)?.hasPin ? "Reset" : "Set"} PIN
              </h3>
              <p className="text-xs text-zinc-500 mt-1">
                Enter a 4-6 digit numeric PIN
              </p>
            </div>

            <div className="space-y-3">
              <Input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={newPin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setNewPin(val);
                  setError(null);
                }}
                placeholder="Enter PIN"
                className="h-10 bg-zinc-800/60 border-white/10 text-zinc-100 text-center text-lg tracking-[0.5em] placeholder:text-zinc-600 placeholder:tracking-normal placeholder:text-sm focus:border-amber-500/50"
              />
              <Input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={confirmPin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setConfirmPin(val);
                  setError(null);
                }}
                placeholder="Confirm PIN"
                className="h-10 bg-zinc-800/60 border-white/10 text-zinc-100 text-center text-lg tracking-[0.5em] placeholder:text-zinc-600 placeholder:tracking-normal placeholder:text-sm focus:border-amber-500/50"
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 text-center">{error}</p>
            )}

            <div className="flex gap-3">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setSettingPin(null)}
                className="flex-1 py-2.5 rounded-lg bg-zinc-800 border border-white/10 text-zinc-300 text-sm font-medium hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleSetPin}
                disabled={saving || newPin.length < 4}
                className="flex-1 py-2.5 rounded-lg bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 transition-colors disabled:opacity-40"
              >
                {saving ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Save PIN"}
              </motion.button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
