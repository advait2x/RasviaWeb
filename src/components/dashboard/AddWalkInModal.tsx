import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Users, Phone, User, UserPlus } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface AddWalkInModalProps {
  open: boolean;
  onClose: () => void;
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits.length ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function AddWalkInModal({ open, onClose }: AddWalkInModalProps) {
  const { addWalkIn } = useDashboard();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [partySize, setPartySize] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    // Only allow digits (and the phone format characters for backspace UX)
    const digitsOnly = input.replace(/\D/g, "");
    setPhone(formatPhone(digitsOnly));
  };

  const handlePhoneKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow backspace to work naturally by stripping trailing format chars
    if (e.key === "Backspace") {
      const digits = phone.replace(/\D/g, "");
      if (digits.length > 0) {
        e.preventDefault();
        setPhone(formatPhone(digits.slice(0, -1)));
      }
    }
  };

  const handlePartySizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "");
    setPartySize(val);
  };

  const handleSubmit = async () => {
    setError(null);
    const trimmedName = name.trim();
    if (!trimmedName) { setError("Please enter the guest's name."); return; }
    const size = parseInt(partySize, 10);
    if (!partySize || isNaN(size) || size < 1) { setError("Please enter a valid party size."); return; }
    const digits = phone.replace(/\D/g, "");
    if (digits.length !== 10) { setError("Please enter a valid 10-digit phone number."); return; }

    setLoading(true);
    try {
      await addWalkIn(trimmedName, size, digits);
      setName("");
      setPhone("");
      setPartySize("");
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add walk-in.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName("");
    setPhone("");
    setPartySize("");
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="glass-modal max-w-md border-white/10 bg-zinc-900/95 backdrop-blur-xl p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
              <UserPlus size={15} className="text-amber-400" strokeWidth={1.5} />
            </div>
            <h2 className="text-base font-semibold text-zinc-100">Add Walk-In</h2>
          </div>
          <button
            onClick={handleClose}
            className="w-7 h-7 rounded-lg bg-zinc-800/60 border border-white/5 flex items-center justify-center text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>

        {/* Form Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Guest Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <User size={10} strokeWidth={1.5} />
              Guest Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="First name or party name"
              className="w-full h-10 px-3 rounded-xl bg-zinc-800/60 border border-white/8 text-zinc-100 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 transition-colors"
            />
          </div>

          {/* Phone + Party Size — side by side */}
          <div className="flex gap-3">
            {/* Phone */}
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Phone size={10} strokeWidth={1.5} />
                Phone
              </label>
              <input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={handlePhoneChange}
                onKeyDown={handlePhoneKeyDown}
                placeholder="(555) 000-0000"
                maxLength={14}
                className="w-full h-10 px-3 rounded-xl bg-zinc-800/60 border border-white/8 text-zinc-100 text-sm font-mono placeholder:text-zinc-600 placeholder:font-sans focus:outline-none focus:border-amber-500/50 transition-colors"
              />
            </div>

            {/* Party Size */}
            <div className="w-28 space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Users size={10} strokeWidth={1.5} />
                Party Size
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={partySize}
                onChange={handlePartySizeChange}
                placeholder="e.g. 4"
                maxLength={3}
                className="w-full h-10 px-3 rounded-xl bg-zinc-800/60 border border-white/8 text-zinc-100 text-sm text-center font-semibold placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 transition-colors"
              />
            </div>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-xs text-red-400 text-center"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={handleClose}
              className="flex-1 py-2.5 rounded-xl bg-zinc-800 border border-white/8 text-zinc-300 text-sm font-medium hover:bg-zinc-700 transition-colors"
            >
              Cancel
            </button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus size={14} strokeWidth={2} />
                  Add to Waitlist
                </>
              )}
            </motion.button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
