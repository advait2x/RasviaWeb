import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { Switch } from "@/components/ui/switch";
import { WaitTimeWidget } from "@/components/WaitTimeWidget";
import { useTheme } from "@/context/ThemeContext";
import { cn } from "@/lib/utils";

import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

export default function StatusBar({ embedded = false }: { embedded?: boolean }) {
  const { waitlistOpen, setWaitlistOpen, waitlist, restaurantOpen } = useDashboard();
  const { restaurantId } = useAuth();
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";

  const waitingCount = waitlist.filter((w) => w.status === "waiting").length;

  // Pending toggle state — when set, shows confirmation dialog
  const [pendingToggle, setPendingToggle] = useState<boolean | null>(null);

  // Fetch initial waitlist_open state from Supabase
  useEffect(() => {
    if (!restaurantId) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("restaurants")
        .select("waitlist_open")
        .eq("id", restaurantId)
        .maybeSingle();
      if (data && typeof data.waitlist_open === "boolean") {
        setWaitlistOpen(data.waitlist_open);
      }
    };
    fetch();
  }, [restaurantId, setWaitlistOpen]);

  const handleToggleWaitlist = async (open: boolean) => {
    setWaitlistOpen(open);
    if (!restaurantId) return;
    const { error } = await supabase
      .from("restaurants")
      .update({ waitlist_open: open })
      .eq("id", restaurantId);
    if (error) {
      console.error("Failed to update waitlist_open:", error.message);
      setWaitlistOpen(!open);
    }
  };

  // Instead of toggling immediately, show a confirmation dialog
  const handleSwitchChange = (open: boolean) => {
    setPendingToggle(open);
  };

  const handleConfirmToggle = () => {
    if (pendingToggle !== null) {
      handleToggleWaitlist(pendingToggle);
      setPendingToggle(null);
    }
  };

  const handleCancelToggle = () => {
    setPendingToggle(null);
  };

  // Disable the toggle when the restaurant is known to be closed
  const isToggleDisabled = restaurantOpen === false;

  return (
    <header className="relative">
      {/* Main bar */}
      <div
        className={`flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2 sm:px-6 sm:py-2.5 ${
          embedded ? "bg-transparent shadow-none" : ""
        }`}
        style={
          embedded
            ? undefined
            : {
                background: "hsl(var(--background))",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 1px 0 rgba(0,0,0,0.4)",
              }
        }
      >
        {/* Left: Waitlist Toggle */}
        <div className="flex shrink-0 items-center gap-4">
          <div className="flex items-center gap-4">
            <Switch
              checked={waitlistOpen}
              onCheckedChange={handleSwitchChange}
              disabled={isToggleDisabled}
              className={cn(
                "disabled:cursor-not-allowed disabled:opacity-40",
                waitlistOpen && !isToggleDisabled
                  ? "data-[state=checked]:border-emerald-500/30 data-[state=checked]:bg-emerald-600"
                  : !isToggleDisabled
                    ? isLight
                      ? "data-[state=unchecked]:border-zinc-400/40 data-[state=unchecked]:bg-zinc-300"
                      : "data-[state=unchecked]:border-zinc-600/50 data-[state=unchecked]:bg-zinc-800"
                    : "data-[state=unchecked]:bg-zinc-800",
              )}
              thumbClassName={
                !isToggleDisabled && !waitlistOpen
                  ? isLight
                    ? "data-[state=unchecked]:!bg-zinc-800 data-[state=unchecked]:!ring-zinc-900/20"
                    : "data-[state=unchecked]:!bg-zinc-500 data-[state=unchecked]:!ring-zinc-950/50"
                  : !isToggleDisabled && waitlistOpen
                    ? "data-[state=checked]:!bg-white data-[state=checked]:!shadow-sm dark:data-[state=checked]:!bg-zinc-50"
                    : undefined
              }
            />
            <motion.span
              animate={{ opacity: 1 }}
              className={`text-sm font-medium tracking-tight ${
                isToggleDisabled
                  ? "text-zinc-600"
                  : waitlistOpen
                    ? isLight
                      ? "text-emerald-800"
                      : "text-emerald-200/90"
                    : "text-zinc-500"
              }`}
            >
              {waitlistOpen && !isToggleDisabled ? "Waitlist open" : "Waitlist closed"}
            </motion.span>
            {isToggleDisabled && (
              <span className="flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-800 border border-zinc-700 text-zinc-500 select-none">
                Restaurant Closed
              </span>
            )}
          </div>

        </div>

        {/* Center: quoted wait — flex-1 keeps control centered between toggle and count */}
        <div className="flex flex-1 justify-center px-4">
          <WaitTimeWidget />
        </div>

        {/* Right: Waiting count */}
        <div className="flex shrink-0 items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.03] px-4 py-2">
          <Users size={16} strokeWidth={1.5} className="text-zinc-500" />
          <span className="text-sm font-medium text-zinc-400">
            <span className="font-semibold tabular-nums text-zinc-200">{waitingCount}</span>{" "}
            waiting
          </span>
        </div>
      </div>
      {/* Subtle gradient accent line */}
      <div className="gradient-accent-bar" />

      {/* Waitlist toggle confirmation dialog */}
      <Dialog open={pendingToggle !== null} onOpenChange={(o) => !o && handleCancelToggle()}>
        <DialogContent className="glass-modal max-w-sm border-white/10 bg-zinc-900/95 backdrop-blur-xl p-6">
          <div className="flex flex-col items-center text-center gap-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-full ${
              pendingToggle
                ? "border border-emerald-400/20 bg-emerald-500/[0.08]"
                : "border border-zinc-600/30 bg-zinc-800/50"
            }`}>
              <Users
                size={22}
                strokeWidth={1.5}
                className={pendingToggle ? (isLight ? "text-emerald-800" : "text-emerald-200/90") : "text-zinc-400"}
              />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-semibold text-zinc-100">
                {pendingToggle ? "Open the waitlist?" : "Close the waitlist?"}
              </h3>
              <p className={`text-sm ${pendingToggle ? (isLight ? "text-emerald-800/90" : "text-zinc-400") : "text-zinc-400"}`}>
                {pendingToggle
                  ? "Guests will be able to join the waitlist."
                  : "No new guests will be able to join the waitlist."}
              </p>
            </div>
            <div className="flex gap-3 w-full pt-1">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleCancelToggle}
                className="flex-1 py-2.5 rounded-lg bg-zinc-800 border border-white/10 text-zinc-300 text-sm font-medium hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleConfirmToggle}
                className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
                  pendingToggle
                    ? isLight
                      ? "border border-emerald-700/30 bg-emerald-500/[0.15] text-emerald-800 hover:bg-emerald-500/[0.2]"
                      : "border border-emerald-400/20 bg-emerald-500/[0.1] text-emerald-200/95 hover:bg-emerald-500/[0.14]"
                    : "border border-zinc-600/40 bg-zinc-800/60 text-zinc-300 hover:bg-zinc-800"
                }`}
              >
                {pendingToggle ? "Open Waitlist" : "Close Waitlist"}
              </motion.button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
