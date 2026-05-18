import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, X, Users, MessageSquare } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import { WaitlistEntry } from "@/types/dashboard";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface SeatPartyModalProps {
  open: boolean;
  onClose: () => void;
  entry: WaitlistEntry | null;
}

export default function SeatPartyModal({ open, onClose, entry }: SeatPartyModalProps) {
  const { seatParty } = useDashboard();
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!entry) return;
    setLoading(true);
    try {
      // Seat without a specific table - the call marks the entry as seated
      await seatParty(entry.id, "");
    } finally {
      setLoading(false);
      onClose();
    }
  };

  if (!entry) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-modal max-w-sm border-white/10 bg-zinc-900/95 backdrop-blur-xl p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
              <CheckCircle2 size={15} className="text-emerald-400" strokeWidth={1.5} />
            </div>
            <h2 className="text-base font-semibold text-zinc-100">Seat Party?</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-zinc-800/60 border border-white/5 flex items-center justify-center text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Party info chip */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/40 border border-white/5">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
              <Users size={15} className="text-amber-400" strokeWidth={1.5} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-100 truncate">{entry.guestName}</p>
              <p className="text-xs text-zinc-500 mt-0.5">Party of {entry.partySize}</p>
            </div>
          </div>

          {/* SMS notice */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-sky-500/5 border border-sky-500/15">
            <MessageSquare size={13} className="text-sky-400 mt-0.5 flex-shrink-0" strokeWidth={1.5} />
            <p className="text-xs text-sky-300/80 leading-relaxed">
              Confirmation SMS will be sent to party
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-zinc-800 border border-white/8 text-zinc-300 text-sm font-medium hover:bg-zinc-700 transition-colors"
            >
              Cancel
            </button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 size={14} strokeWidth={2} />
                  Confirm
                </>
              )}
            </motion.button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
