// src/components/party/PartyLedger.tsx
// Web equivalent of mobile PartyLedger — live payment progress with animated status pills.
import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Clock, Crown, AlertCircle, RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatCents,
  type PartyMember,
  type PartyPayment,
} from "@/lib/party-session";

const MEMBER_COLORS = [
  "bg-amber-500", "bg-green-500", "bg-blue-500", "bg-purple-500",
  "bg-pink-500", "bg-yellow-500", "bg-cyan-500", "bg-red-500",
];

export function memberInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
}

function StatusPill({ status }: { status: PartyPayment["status"] | "idle" }) {
  const config: Record<string, { label: string; klass: string; Icon: typeof Check }> = {
    idle: { label: "Waiting", klass: "bg-zinc-700 text-zinc-300", Icon: Clock },
    pending: { label: "Awaiting payment", klass: "bg-amber-500/15 text-amber-300 border border-amber-500/30", Icon: Clock },
    paid: { label: "Paid", klass: "bg-green-500/15 text-green-300 border border-green-500/30", Icon: Check },
    covered: { label: "Covered by host", klass: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30", Icon: Check },
    failed: { label: "Payment failed", klass: "bg-red-500/15 text-red-300 border border-red-500/30", Icon: AlertCircle },
    cancelled: { label: "Cancelled", klass: "bg-zinc-700 text-zinc-300", Icon: AlertCircle },
    refunded: { label: "Refunded", klass: "bg-zinc-700 text-zinc-300", Icon: RefreshCcw },
  };
  const cfg = config[status] || config.idle;
  const { Icon } = cfg;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", cfg.klass)}>
      <Icon className="h-3 w-3" strokeWidth={3} />
      {cfg.label}
    </span>
  );
}

export function PartyLedger(props: {
  members: PartyMember[];
  payments: PartyPayment[];
  selfMemberId?: string | null;
  isHost?: boolean;
  onCoverMember?: (memberId: string) => void;
  onRetry?: () => void;
  onMemberTap?: (memberId: string) => void;
}) {
  const { members, payments, selfMemberId, isHost = false, onCoverMember, onRetry, onMemberTap } = props;

  const paidCount = useMemo(
    () => payments.filter((p) => p.status === "paid" || p.status === "covered").length,
    [payments],
  );
  const totalCount = useMemo(
    () => payments.filter((p) => p.amount_cents > 0 || p.status === "paid" || p.status === "covered").length,
    [payments],
  );
  const progressPct = totalCount === 0 ? 0 : Math.round((paidCount / totalCount) * 100);

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/80 p-5 shadow-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-zinc-100">Who's paid</h3>
          <p className="text-[11px] text-zinc-500">Tap a name to see what they ordered</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-zinc-100">
            <span className="text-green-400">{paidCount}</span>
            <span className="text-zinc-500"> of {totalCount}</span>
          </div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">{progressPct}% there</div>
        </div>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
        <motion.div
          className="h-full bg-gradient-to-r from-green-400 to-emerald-500"
          initial={{ width: 0 }}
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>

      <ul className="mt-4 space-y-2">
        <AnimatePresence initial={false}>
          {members.map((m, idx) => {
            const payment = payments.find((p) => p.member_id === m.id);
            const status = payment?.status ?? "idle";
            const amount = payment?.amount_cents ?? 0;
            const isPaid = status === "paid" || status === "covered";
            const isFailed = status === "failed" || status === "cancelled";
            const isSelf = selfMemberId === m.id;
            const color = MEMBER_COLORS[idx % MEMBER_COLORS.length];
            const tappable = Boolean(onMemberTap);

            return (
              <motion.li
                key={m.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2, delay: idx * 0.03 }}
                className={cn(
                  "flex items-center gap-3 rounded-xl bg-zinc-900/40 p-3 transition",
                  tappable && "cursor-pointer hover:bg-zinc-800/60",
                )}
                onClick={tappable ? () => onMemberTap?.(m.id) : undefined}
              >
                <div className="relative">
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center overflow-hidden rounded-full text-sm font-bold text-zinc-900",
                    m.avatar_url ? "bg-zinc-800" : color,
                  )}>
                    {m.avatar_url ? (
                      <img
                        src={m.avatar_url}
                        alt={m.display_name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      memberInitials(m.display_name)
                    )}
                  </div>
                  {m.role === "host" ? (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-zinc-900 bg-amber-500">
                      <Crown className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                    </span>
                  ) : null}
                </div>

                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-zinc-100">{m.display_name}</span>
                    {isSelf ? (
                      <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">You</span>
                    ) : null}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <StatusPill status={status} />
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <span className={cn("text-sm font-bold", isPaid ? "text-green-400" : "text-zinc-100")}>
                    {formatCents(amount)}
                  </span>
                  {isHost && !isSelf && !isPaid && amount > 0 ? (
                    <button
                      type="button"
                      onClick={() => onCoverMember?.(m.id)}
                      className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[11px] font-semibold text-amber-400 transition hover:bg-amber-500/20"
                    >
                      Pay for them
                    </button>
                  ) : null}
                  {isFailed && isSelf && onRetry ? (
                    <button
                      type="button"
                      onClick={onRetry}
                      className="rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1 text-[11px] font-semibold text-red-400 transition hover:bg-red-500/20"
                    >
                      Retry
                    </button>
                  ) : null}
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    </div>
  );
}
