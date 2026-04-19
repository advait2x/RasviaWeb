import { useCallback, useEffect, useMemo, useState } from "react";
import QRCode from "react-qr-code";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Loader2,
  QrCode,
  Users,
  Copy,
  ExternalLink,
  XCircle,
  Smartphone,
  Crown,
  Check,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import {
  createSession,
  cancelSession,
  fetchSnapshot,
  formatCents,
  isFullyPaid,
  paidCount,
  totalCartCents,
  type PartySession,
  type PartySnapshot,
} from "@/lib/party-session";
import { subscribeToParty } from "@/lib/party-realtime";
import { loadPartyCreds } from "@/lib/party-credentials";

/**
 * Tableside QR
 *
 * Lets a waiter / restaurant staff member spin up a party session for a
 * specific table, show a single big QR for guests to scan, and watch
 * customers join + add items in real-time. Once the cart is set, the
 * waiter clicks "Open host view" to land in the existing JoinBridge
 * with the host UI (split per person, lock, take payment, etc.) — and
 * each member's individual share / pay-link QR is rendered here so the
 * waiter can show it back to the guest.
 *
 * The QR encodes `${origin}/join?id=<session>` which:
 *   - Universal-links into the Rasvia mobile app when installed
 *     (handled in app/+native-intent or rasvia://join/<session>)
 *   - Falls back to RasviaWeb's `/join` route in any browser.
 *
 * No new tables / RPCs are required — this is a thin host UI on top of
 * the existing `party_sessions` schema (schema_version = 2).
 */

const APP_DEEP_LINK_PREFIX = "rasvia://join/";

const STORAGE_PREFIX = "rasvia.tableside.session.";

type StoredHostSession = {
  sessionId: string;
  startedAt: number;
  tableLabel: string | null;
};

function loadActiveSession(restaurantId: number): StoredHostSession | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + restaurantId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredHostSession;
    if (!parsed?.sessionId) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveActiveSession(restaurantId: number, value: StoredHostSession | null) {
  try {
    if (!value) {
      window.localStorage.removeItem(STORAGE_PREFIX + restaurantId);
    } else {
      window.localStorage.setItem(STORAGE_PREFIX + restaurantId, JSON.stringify(value));
    }
  } catch {
    // ignore — storage isn't required, the QR still works
  }
}

export default function TablesidePanel() {
  const { restaurantId, session: authSession } = useAuth();
  const userId = authSession?.user?.id ?? null;

  const [activeSession, setActiveSession] = useState<PartySession | null>(null);
  const [snapshot, setSnapshot] = useState<PartySnapshot | null>(null);
  const [tableLabel, setTableLabel] = useState<string>("");
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore any in-flight session for this restaurant on mount.
  useEffect(() => {
    if (!restaurantId) {
      setLoadingExisting(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const stored = loadActiveSession(restaurantId);
      if (!stored) {
        setLoadingExisting(false);
        return;
      }
      try {
        const snap = await fetchSnapshot(supabase, stored.sessionId);
        if (cancelled) return;
        // Don't restore sessions that have ended.
        if (
          snap?.session?.status === "cancelled" ||
          snap?.session?.status === "completed" ||
          snap?.session?.status === "submitted"
        ) {
          saveActiveSession(restaurantId, null);
        } else {
          setActiveSession(snap.session);
          setSnapshot(snap);
          setTableLabel(stored.tableLabel ?? "");
        }
      } catch {
        // Stale id — drop it.
        if (!cancelled) saveActiveSession(restaurantId, null);
      } finally {
        if (!cancelled) setLoadingExisting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [restaurantId]);

  // Live snapshot updates while a session is active.
  useEffect(() => {
    if (!activeSession?.id) return;
    const handle = subscribeToParty(
      supabase,
      activeSession.id,
      (snap) => {
        setSnapshot(snap);
        setActiveSession(snap.session);
        // Auto-clear once the session has truly ended so the panel goes back
        // to the "start session" state without manual intervention.
        if (
          snap.session.status === "cancelled" ||
          snap.session.status === "completed" ||
          snap.session.status === "submitted"
        ) {
          if (restaurantId) saveActiveSession(restaurantId, null);
        }
      },
      (err) => console.warn("Tableside realtime error:", err.message),
    );
    return () => handle.unsubscribe();
  }, [activeSession?.id, restaurantId]);

  const handleStart = useCallback(async () => {
    if (!restaurantId) {
      toast.error("Pick a restaurant first.");
      return;
    }
    if (!userId) {
      toast.error("You must be signed in to start a tableside session.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await createSession(supabase, restaurantId, userId);
      const initial = await fetchSnapshot(supabase, created.id);
      setActiveSession(initial.session);
      setSnapshot(initial);
      saveActiveSession(restaurantId, {
        sessionId: created.id,
        startedAt: Date.now(),
        tableLabel: tableLabel.trim() || null,
      });
      toast.success("Tableside session started");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not start a session.";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }, [restaurantId, userId, tableLabel]);

  const handleEnd = useCallback(async () => {
    if (!activeSession || !restaurantId) return;
    if (!window.confirm("End this tableside session? Any unpaid shares will be cancelled and refunded.")) return;
    setBusy(true);
    try {
      // Use the host's own server-side authority via the cancel edge function
      // when the session has at least one member, otherwise just delete the
      // empty session row directly. Without a member_token we mint a "virtual"
      // host creds payload using the host_user_id check on the edge function
      // — fall back to a plain DELETE on the row when no members exist.
      if ((snapshot?.members?.length ?? 0) === 0) {
        // No one has joined yet — safe to delete the empty row outright.
        // RLS allows the host to delete their own session.
        await supabase.from("party_sessions").delete().eq("id", activeSession.id);
      } else {
        // Prefer routing through the cancel edge function so any pending
        // Stripe charges get refunded properly. We need the host member
        // token for that — it's only present if the waiter previously
        // opened the host view in this browser.
        const hostMember = snapshot?.members.find((m) => m.role === "host");
        const stored = loadPartyCreds(activeSession.id);
        if (stored?.memberToken && hostMember?.id === stored.memberId) {
          await cancelSession(supabase, stored);
        } else {
          // Fallback: just flip the status to cancelled. RLS allows the
          // host_user_id owner of the session to update their own row.
          await supabase
            .from("party_sessions")
            .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
            .eq("id", activeSession.id);
        }
      }
      saveActiveSession(restaurantId, null);
      setActiveSession(null);
      setSnapshot(null);
      setTableLabel("");
      toast.success("Tableside session ended");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not end the session.";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }, [activeSession, restaurantId, snapshot]);

  const joinUrl = useMemo(() => {
    if (!activeSession) return "";
    return `${window.location.origin}/join?id=${activeSession.id}`;
  }, [activeSession]);

  const deepLink = useMemo(() => {
    if (!activeSession) return "";
    return `${APP_DEEP_LINK_PREFIX}${activeSession.id}`;
  }, [activeSession]);

  const handleCopy = async () => {
    if (!joinUrl) return;
    try {
      await navigator.clipboard.writeText(joinUrl);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy link");
    }
  };

  const handleOpenHostView = () => {
    if (!joinUrl) return;
    window.open(joinUrl, "_blank", "noopener");
  };

  // ── Rendering ──────────────────────────────────────────────────────────
  if (!restaurantId) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-zinc-500">
        Select a restaurant before starting a tableside session.
      </div>
    );
  }

  if (loadingExisting) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-500">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto px-5 py-6">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/[0.06] text-amber-400">
              <QrCode size={22} strokeWidth={1.6} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-zinc-100">Tableside QR</h1>
              <p className="text-sm text-zinc-500">
                Spin up a group order at the table. Customers scan the QR to add items, split the
                bill, and pay from their own phone.
              </p>
            </div>
          </div>
        </header>

        {!activeSession ? (
          <StartCard
            tableLabel={tableLabel}
            onTableLabelChange={setTableLabel}
            busy={busy}
            error={error}
            onStart={handleStart}
          />
        ) : (
          <ActiveSessionView
            session={activeSession}
            snapshot={snapshot}
            tableLabel={tableLabel}
            joinUrl={joinUrl}
            deepLink={deepLink}
            busy={busy}
            onCopy={handleCopy}
            onOpenHostView={handleOpenHostView}
            onEnd={handleEnd}
          />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Start screen
// ─────────────────────────────────────────────────────────────────────────

function StartCard({
  tableLabel,
  onTableLabelChange,
  busy,
  error,
  onStart,
}: {
  tableLabel: string;
  onTableLabelChange: (v: string) => void;
  busy: boolean;
  error: string | null;
  onStart: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/8 bg-zinc-950/60 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <label htmlFor="tablesideLabel" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Table or note (optional)
          </label>
          <input
            id="tablesideLabel"
            value={tableLabel}
            onChange={(e) => onTableLabelChange(e.target.value)}
            placeholder="e.g. Table 12 — Jamie's birthday"
            className="w-full rounded-lg border border-white/8 bg-zinc-900/80 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500/40 focus:outline-none"
          />
          <p className="text-[11px] text-zinc-600">Saved locally so you can recognise the table on this screen.</p>
        </div>
        <button
          type="button"
          onClick={onStart}
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-black shadow-[0_8px_28px_rgba(245,158,11,0.35)] transition-colors hover:bg-amber-400 disabled:opacity-60"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <QrCode size={16} />}
          Start tableside session
        </button>
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/[0.07] px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      ) : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <HowItWorksStep
          n={1}
          title="Show the QR"
          body="Tap start, then place the screen on the table or read the join URL out loud."
        />
        <HowItWorksStep
          n={2}
          title="Guests add items"
          body="Each guest scans, joins under their name and adds dishes from the live menu."
        />
        <HowItWorksStep
          n={3}
          title="Split & pay"
          body="Open the host view to set the split (per person, equal, host pays, or assigned) and lock the cart so each guest pays their own share from their phone."
        />
      </div>
    </motion.div>
  );
}

function HowItWorksStep({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-white/6 bg-zinc-900/40 p-3.5">
      <div className="mb-2 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/15 text-[11px] font-bold text-amber-300">
        {n}
      </div>
      <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-zinc-500">{body}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Active session view
// ─────────────────────────────────────────────────────────────────────────

function ActiveSessionView({
  session,
  snapshot,
  tableLabel,
  joinUrl,
  deepLink,
  busy,
  onCopy,
  onOpenHostView,
  onEnd,
}: {
  session: PartySession;
  snapshot: PartySnapshot | null;
  tableLabel: string;
  joinUrl: string;
  deepLink: string;
  busy: boolean;
  onCopy: () => void;
  onOpenHostView: () => void;
  onEnd: () => void;
}) {
  const members = snapshot?.members ?? [];
  const items = snapshot?.items ?? [];
  const payments = snapshot?.payments ?? [];
  const cartCents = totalCartCents(items);

  const status = session.status;
  const statusBadge = (() => {
    switch (status) {
      case "open":
        return { label: "Cart open", className: "border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-300" };
      case "locked":
        return { label: "Cart locked", className: "border-amber-500/30 bg-amber-500/[0.08] text-amber-300" };
      case "paying":
        return { label: "Collecting payment", className: "border-blue-500/30 bg-blue-500/[0.08] text-blue-300" };
      case "submitted":
        return { label: "Sent to kitchen", className: "border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-300" };
      default:
        return { label: status, className: "border-white/10 bg-zinc-800/50 text-zinc-300" };
    }
  })();

  const fullyPaid = isFullyPaid(payments);
  const paid = paidCount(payments);

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr,1.1fr]">
      {/* QR card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 rounded-2xl border border-white/8 bg-zinc-950/60 p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Active session</p>
            <h2 className="mt-1 text-lg font-semibold text-zinc-100">
              {tableLabel || "Tableside group order"}
            </h2>
            <p className="mt-1 font-mono text-[11px] text-zinc-600">{session.id.slice(0, 8)}…</p>
          </div>
          <span
            className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${statusBadge.className}`}
          >
            {statusBadge.label}
          </span>
        </div>

        <div className="mx-auto flex w-full max-w-[280px] flex-col items-center gap-3 rounded-2xl border border-white/8 bg-white p-4">
          <QRCode value={joinUrl} size={232} bgColor="#ffffff" fgColor="#0a0a0a" />
          <p className="select-all text-center text-[11px] font-mono text-zinc-700">{joinUrl}</p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-zinc-900/60 px-3 py-2 text-xs font-semibold text-zinc-200 transition-colors hover:bg-zinc-800/80"
          >
            <Copy size={14} /> Copy link
          </button>
          <button
            type="button"
            onClick={onOpenHostView}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/[0.08] px-3 py-2 text-xs font-semibold text-amber-300 transition-colors hover:bg-amber-500/[0.16]"
          >
            <ExternalLink size={14} /> Open host view
          </button>
        </div>

        <a
          href={deepLink}
          className="inline-flex items-center justify-center gap-1.5 text-[11px] text-zinc-500 hover:text-zinc-300"
        >
          <Smartphone size={12} /> Opens in the Rasvia app if installed
        </a>

        <button
          type="button"
          onClick={onEnd}
          disabled={busy}
          className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/25 bg-red-500/[0.06] px-3 py-2 text-xs font-semibold text-red-300 transition-colors hover:bg-red-500/[0.14] disabled:opacity-60"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
          End session
        </button>
      </motion.div>

      {/* Live members + cart + per-share QR */}
      <div className="flex flex-col gap-5">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/8 bg-zinc-950/60 p-5"
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
              <Users size={16} className="text-zinc-400" />
              Guests joined ({members.length})
            </h3>
            <span className="text-[11px] text-zinc-500">Updates live</span>
          </div>
          {members.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/8 bg-zinc-900/30 px-4 py-8 text-center text-xs text-zinc-500">
              <Loader2 size={16} className="animate-spin text-zinc-600" />
              Waiting for the first guest to scan…
            </div>
          ) : (
            <ul className="space-y-1.5">
              <AnimatePresence initial={false}>
                {members.map((m) => (
                  <motion.li
                    key={m.id}
                    layout
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-between rounded-lg border border-white/6 bg-zinc-900/40 px-3 py-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-[11px] font-bold text-amber-300">
                        {m.display_name?.charAt(0)?.toUpperCase() ?? "?"}
                      </div>
                      <span className="truncate text-sm text-zinc-100">{m.display_name}</span>
                      {m.role === "host" ? (
                        <Crown size={12} className="shrink-0 text-amber-400" />
                      ) : null}
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                      {new Date(m.joined_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                    </span>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/8 bg-zinc-950/60 p-5"
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-100">Cart</h3>
            <span className="text-sm font-semibold text-zinc-200">{formatCents(cartCents)}</span>
          </div>
          {items.length === 0 ? (
            <p className="text-xs text-zinc-500">No items added yet — guests can browse the menu after they join.</p>
          ) : (
            <ul className="space-y-1.5 text-xs">
              {items.map((it) => (
                <li
                  key={it.id}
                  className="flex items-center justify-between rounded-lg border border-white/6 bg-zinc-900/30 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-zinc-100">
                      {it.menu_item?.name ?? "Item"}
                      {it.quantity > 1 ? <span className="text-zinc-500"> ×{it.quantity}</span> : null}
                    </p>
                    {it.added_by_name ? (
                      <p className="truncate text-[11px] text-zinc-500">added by {it.added_by_name}</p>
                    ) : null}
                  </div>
                  <span className="font-mono text-zinc-300">
                    {formatCents(Math.round(Number(it.menu_item?.price ?? 0) * 100) * Math.max(1, it.quantity))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </motion.div>

        {payments.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/8 bg-zinc-950/60 p-5"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-100">Per-guest payment QR codes</h3>
              <span className="text-[11px] text-zinc-500">
                {paid}/{payments.length} paid {fullyPaid ? <Check size={11} className="-mt-0.5 inline text-emerald-400" /> : null}
              </span>
            </div>
            <p className="mb-4 text-[11px] text-zinc-500">
              Hand the table back any phone — each guest can scan their own QR to pay just their share.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {payments.map((p) => {
                const member = members.find((m) => m.id === p.member_id);
                const memberLabel = member?.display_name ?? "Guest";
                const payUrl = `${joinUrl}#pay=${p.id}`;
                const paidStatus = p.status === "paid" || p.status === "covered";
                return (
                  <div
                    key={p.id}
                    className={`flex items-center gap-3 rounded-xl border p-3 ${
                      paidStatus
                        ? "border-emerald-500/25 bg-emerald-500/[0.05]"
                        : "border-white/8 bg-zinc-900/40"
                    }`}
                  >
                    <div className="rounded-md bg-white p-1.5">
                      <QRCode value={payUrl} size={68} bgColor="#ffffff" fgColor="#0a0a0a" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-zinc-100">{memberLabel}</p>
                      <p className="text-[11px] text-zinc-500">{formatCents(p.amount_cents)}</p>
                      <p
                        className={`mt-1 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                          paidStatus
                            ? "bg-emerald-500/15 text-emerald-300"
                            : p.status === "failed"
                              ? "bg-red-500/15 text-red-300"
                              : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {paidStatus ? <Check size={10} /> : null}
                        {p.status}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
