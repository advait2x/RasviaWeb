import { useState } from "react";
import { motion } from "framer-motion";
import { UserPlus, X } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface AddWalkInModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AddWalkInModal({ open, onClose }: AddWalkInModalProps) {
  const { addWalkIn } = useDashboard();
  const [leaderName, setLeaderName] = useState("");
  const [partySize, setPartySize] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {};
    if (!leaderName.trim()) newErrors.name = "Party leader name is required";
    if (!partySize || parseInt(partySize) < 1) newErrors.partySize = "Party size must be at least 1";
    if (!phone.trim()) newErrors.phone = "Phone number is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    addWalkIn(leaderName.trim(), parseInt(partySize), phone.trim());
    handleClose();
  };

  const handleClose = () => {
    setLeaderName("");
    setPartySize("");
    setPhone("");
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="glass-modal max-w-md border-white/10 bg-zinc-900/95 backdrop-blur-xl p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-white/5">
          <DialogTitle className="text-xl font-bold text-zinc-100 tracking-tight flex items-center gap-2">
            <UserPlus size={20} strokeWidth={1.5} className="text-amber-500" />
            Add Walk-In
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-5">
          {/* Party Leader Name */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Party Leader Name
            </label>
            <div className="relative">
              <Input
                value={leaderName}
                onChange={(e) => {
                  setLeaderName(e.target.value);
                  setErrors((prev) => ({ ...prev, name: "" }));
                }}
                placeholder="e.g., Johnson"
                className="h-12 bg-zinc-800/60 border-white/10 text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500/50 focus:ring-amber-500/20 pr-28"
              />
              {leaderName.trim() && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 pointer-events-none">
                  → {leaderName.trim()}'s Party
                </span>
              )}
            </div>
            {errors.name && (
              <p className="text-xs text-red-400 mt-1">{errors.name}</p>
            )}
          </div>

          {/* Party Size */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Party Size
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((size) => (
                <motion.button
                  key={size}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    setPartySize(String(size));
                    setErrors((prev) => ({ ...prev, partySize: "" }));
                  }}
                  className={`w-10 h-10 rounded-lg font-semibold text-sm transition-all duration-150 ${
                    partySize === String(size)
                      ? "bg-amber-500 text-black border border-amber-400 amber-glow-sm"
                      : "bg-zinc-800/60 text-zinc-400 border border-white/10 hover:border-white/20 hover:text-zinc-200"
                  }`}
                >
                  {size}
                </motion.button>
              ))}
            </div>
            {errors.partySize && (
              <p className="text-xs text-red-400 mt-1">{errors.partySize}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Phone Number
            </label>
            <Input
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setErrors((prev) => ({ ...prev, phone: "" }));
              }}
              placeholder="(555) 555-0123"
              className="h-12 bg-zinc-800/60 border-white/10 text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500/50 focus:ring-amber-500/20 font-mono"
            />
            {errors.phone && (
              <p className="text-xs text-red-400 mt-1">{errors.phone}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 justify-end pt-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleClose}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-800 border border-white/10 text-zinc-300 font-medium text-sm hover:bg-zinc-700 transition-colors"
            >
              <X size={16} strokeWidth={1.5} />
              Cancel
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleSubmit}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400 transition-colors amber-glow-sm"
            >
              <UserPlus size={16} strokeWidth={1.5} />
              Add to Waitlist
            </motion.button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
