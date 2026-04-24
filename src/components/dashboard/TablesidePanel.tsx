import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  QrCode,
  Users,
  Copy,
  XCircle,
  Smartphone,
  Crown,
  Check,
  Plus,
  Minus,
  Lock,
  Unlock,
  UserRound,
  RefreshCw,
  Search,
  Trash2,
  UtensilsCrossed,
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
  joinSession,
  setPaymentMode,
  assignItemPayer,
  setItemSplit,
  lockSession,
  unlockSession,
  hostAddItemFor,
  updateItemQuantity,
  removeItem,
  completeJoinCredentials,
  isPartyUnauthorizedMessage,
  type PartySession,
  type PartySnapshot,
  type PartyItem,
  type PartyMember,
  type PaymentMode,
  type PartyCreds,
} from "@/lib/party-session";
import { subscribeToParty } from "@/lib/party-realtime";
import {
  loadPartyCreds,
  savePartyCreds,
  clearPartyCreds,
} from "@/lib/party-credentials";
import { QRCode } from "@/lib/resolve-react-qr-code";
import { DASH_BTN_ADD, DASH_QR_ICON_SURFACE } from "@/lib/dashboardUi";
import { cn } from "@/lib/utils";

/**
 * Tableside QR (multi-session, staff-as-host)
 *
 * A waiter/operator can spin up an unlimited number of tableside sessions —
 * one per table — and manage each independently in a single panel:
 *   - Generate a QR that opens `https://rasvia.com/join?id=<uuid>`
 *     (works as universal link → Rasvia app, falls back to `JoinBridge`
 *     on the website, no install required).
 *   - Watch guests join live (members + items + totals).
 *   - Assign each item to a specific guest OR split across any subset.
 *   - Pick a payment mode (host pays / equal / per-person / assigned).
 *   - Lock the cart and hand guests their own pay-share QR.
 *   - End the session (cancels + refunds any pending Stripe charges).
 *
 * The waiter is auto-joined into `party_members` with `role = 'host'` on
 * session creation so every host-only RPC (assign / split / lock / mode)
 * authenticates via the cached member_token. Creds are stored in
 * `localStorage` under `rasvia_party_creds_<session>`.
 */

const APP_DEEP_LINK_PREFIX = "rasvia://join/";
const LABEL_KEY_PREFIX = "rasvia.tableside.label.";
const LIST_POLL_MS = 6000;

function guestJoinOrigin(): string {
  const raw = import.meta.env.VITE_PUBLIC_JOIN_ORIGIN?.trim();
  if (raw) return raw.replace(/\/$/, "");
  return "https://rasvia.com";
}

function loadLabel(sessionId: string): string {
  try {
    return window.localStorage.getItem(LABEL_KEY_PREFIX + sessionId) ?? "";
  } catch {
    return "";
  }
}

function saveLabel(sessionId: string, label: string) {
  try {
    const trimmed = label.trim();
    if (trimmed) window.localStorage.setItem(LABEL_KEY_PREFIX + sessionId, trimmed);
    else window.localStorage.removeItem(LABEL_KEY_PREFIX + sessionId);
  } catch {
    // ignore
  }
}

function clearLabel(sessionId: string) {
  try {
    window.localStorage.removeItem(LABEL_KEY_PREFIX + sessionId);
  } catch {
    // ignore
  }
}

/**
 * `navigator.clipboard.writeText` rejects in some embedded / non-HTTPS contexts.
 * Fall back to `execCommand('copy')` so the dashboard "Copy link" control works reliably.
 */
async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to legacy path
  }
  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.left = "-9999px";
    el.style.top = "0";
    el.setAttribute("aria-hidden", "true");
    document.body.appendChild(el);
    el.focus();
    el.select();
    el.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

type SessionEntry = {
  session: PartySession;
  snapshot: PartySnapshot | null;
};

type MenuItemRow = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string | null;
  is_vegetarian: boolean | null;
  is_available?: boolean | null;
  in_stock?: boolean | null;
};

const ACTIVE_STATUSES: PartySession["status"][] = ["open", "locked", "paying"];

// ─────────────────────────────────────────────────────────────────────────────
// Top-level panel
// ─────────────────────────────────────────────────────────────────────────────

export default function TablesidePanel() {
  const { restaurantId, session: authSession } = useAuth();
  const userId = authSession?.user?.id ?? null;

  const [entries, setEntries] = useState<SessionEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showStart, setShowStart] = useState(false);
  const [newTableLabel, setNewTableLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [endError, setEndError] = useState<string | null>(null);

  // Menu cache for the current restaurant — shared across sessions so the
  // "add item" browser renders instantly when the waiter switches tables.
  const [menu, setMenu] = useState<MenuItemRow[]>([]);
  useEffect(() => {
    if (!restaurantId) {
      setMenu([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error: menuError } = await supabase
        .from("menu_items")
        .select("id, name, description, price, image_url, category, is_vegetarian, in_stock, is_available")
        .eq("restaurant_id", restaurantId)
        .order("category", { ascending: true })
        .order("name", { ascending: true });
      if (cancelled) return;
      if (menuError) {
        console.warn("Tableside menu fetch failed:", menuError.message);
        return;
      }
      const available = (data ?? []).filter(
        (m: MenuItemRow) => (m.is_available ?? true) && (m.in_stock ?? true),
      );
      setMenu(available as MenuItemRow[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [restaurantId]);

  // Resolve the waiter's preferred display name once (profile.full_name, else email local, else "Server").
  const [waiterName, setWaiterName] = useState<string>("Server");
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", userId)
          .maybeSingle();
        if (cancelled) return;
        const row = data as { full_name?: string | null; email?: string | null } | null;
        const name = row?.full_name?.trim();
        const email = row?.email?.trim();
        if (name) setWaiterName(name);
        else if (email) setWaiterName(email.split("@")[0]);
      } catch {
        // fall back to default "Server"
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // ── Load active sessions for this restaurant/waiter ────────────────────
  const refreshList = useCallback(async () => {
    if (!restaurantId || !userId) return;
    const { data, error: listError } = await supabase
      .from("party_sessions")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("host_user_id", userId)
      .in("status", ACTIVE_STATUSES)
      .order("created_at", { ascending: true });
    if (listError) {
      console.warn("Tableside list fetch failed:", listError.message);
      return;
    }
    const rows = (data ?? []) as PartySession[];
    // Fetch snapshots in parallel so the card previews reflect live state.
    const snaps = await Promise.all(
      rows.map(async (s) => {
        try {
          return await fetchSnapshot(supabase, s.id);
        } catch {
          return null;
        }
      }),
    );
    const next: SessionEntry[] = rows.map((s, i) => ({ session: s, snapshot: snaps[i] ?? null }));
    setEntries(next);
    // Default selection on first load.
    setSelectedId((prev) => {
      if (prev && next.some((e) => e.session.id === prev)) return prev;
      return next[0]?.session.id ?? null;
    });
  }, [restaurantId, userId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await refreshList();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshList]);

  // Polling backup for non-selected sessions (selected session gets realtime below).
  useEffect(() => {
    if (!restaurantId) return;
    const id = window.setInterval(() => {
      refreshList();
    }, LIST_POLL_MS);
    return () => window.clearInterval(id);
  }, [restaurantId, refreshList]);

  // Realtime on the restaurant's party_sessions so new rows or status
  // changes push immediately, not just on the poll cadence.
  useEffect(() => {
    if (!restaurantId) return;
    const channel = supabase
      .channel(`tableside:restaurant:${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "party_sessions",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          refreshList();
        },
      )
      .subscribe();
    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {
        // ignore
      }
    };
  }, [restaurantId, refreshList]);

  // Realtime on the currently selected session (members/items/payments/state).
  useEffect(() => {
    if (!selectedId) return;
    const handle = subscribeToParty(
      supabase,
      selectedId,
      (snap) => {
        setEntries((prev) =>
          prev.map((e) =>
            e.session.id === selectedId ? { session: snap.session, snapshot: snap } : e,
          ),
        );
        // If the selected session ended, drop it from the list.
        if (!ACTIVE_STATUSES.includes(snap.session.status)) {
          refreshList();
        }
      },
      (err) => console.warn("Tableside realtime error:", err.message),
    );
    return () => handle.unsubscribe();
  }, [selectedId, refreshList]);

  // ── Host creds for the selected session (for host-only RPCs) ──────────
  const selectedEntry = useMemo(
    () => entries.find((e) => e.session.id === selectedId) ?? null,
    [entries, selectedId],
  );

  const hostCreds = useMemo(() => {
    if (!selectedId) return null;
    return loadPartyCreds(selectedId);
  }, [selectedId, entries]);

  // If the waiter opens an existing session they created on another device
  // (or after a hard reload that lost localStorage), auto-rejoin to recover
  // the member_token. `party_join_session` is idempotent for the signed-in
  // user so this returns the same member row.
  useEffect(() => {
    if (!selectedId || !userId || !selectedEntry) return;
    if (hostCreds?.memberToken) return;
    // Only auto-rejoin when we're actually the session's host.
    if (selectedEntry.session.host_user_id !== userId) return;
    let cancelled = false;
    (async () => {
      try {
        const result = await joinSession(supabase, selectedId, waiterName);
        if (cancelled) return;
        const merged = await completeJoinCredentials(supabase, selectedId, result, loadPartyCreds(selectedId));
        savePartyCreds(merged);
        // Force the creds memo above to re-read by nudging entries.
        setEntries((prev) => [...prev]);
      } catch (err) {
        console.warn("Tableside rejoin failed:", (err as Error)?.message ?? err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId, selectedEntry, userId, waiterName, hostCreds?.memberToken]);

  // ── Actions ────────────────────────────────────────────────────────────

  const handleStart = useCallback(async () => {
    if (!restaurantId) {
      setError("Pick a restaurant first.");
      return;
    }
    if (!userId) {
      setError("You must be signed in to start a tableside session.");
      return;
    }
    setBusy(true);
    setError(null);
    setEndError(null);
    try {
      const created = await createSession(supabase, restaurantId, userId, {
        staffManaged: true,
      });
      // Auto-join as host so we have member_token for host-only RPCs.
      const joined = await joinSession(supabase, created.id, waiterName);
      const hostParty = await completeJoinCredentials(supabase, created.id, joined, null);
      savePartyCreds(hostParty);
      // Default staff-run sessions to per-person (guests pay their own items)
      // since the waiter almost never eats from the check. Guest hosts
      // continue to default to "host_pays" in the mobile flow.
      try {
        await setPaymentMode(supabase, hostParty, "per_person");
      } catch {
        // Non-fatal — waiter can still pick a mode in the UI.
      }
      if (newTableLabel.trim()) {
        saveLabel(created.id, newTableLabel.trim());
      }
      setNewTableLabel("");
      setShowStart(false);
      await refreshList();
      setSelectedId(created.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not start a session.";
      setError(msg);
    } finally {
      setBusy(false);
    }
  }, [restaurantId, userId, waiterName, newTableLabel, refreshList]);

  const patchEntry = useCallback((sessionId: string, map: (e: SessionEntry) => SessionEntry) => {
    setEntries((prev) => prev.map((e) => (e.session.id === sessionId ? map(e) : e)));
  }, []);

  const handleEnd = useCallback(
    async (sessionId: string) => {
      setEndError(null);
      const entry = entries.find((e) => e.session.id === sessionId);
      if (!entry) return;
      if (
        !window.confirm(
          "End this tableside session? Any unpaid shares will be cancelled and refunded.",
        )
      )
        return;
      setBusy(true);
      try {
        // Always flip `status -> cancelled` first. That single update is what
        // realtime broadcasts to every guest device, which trips the
        // "session cancelled" branch on both web (JoinBridge) and app
        // (app/join/[id].tsx) and boots them out of the group order. If we
        // only hard-delete the row, guests don't get a reliable realtime
        // signal and can get stranded on a stale snapshot.
        const creds = loadPartyCreds(sessionId);
        let cancelledViaEdge = false;
        if (creds?.memberToken) {
          try {
            await cancelSession(supabase, creds);
            cancelledViaEdge = true;
          } catch (err) {
            console.warn("cancel-party-session fallback:", (err as Error)?.message);
          }
        }
        if (!cancelledViaEdge) {
          const { error: upErr } = await supabase
            .from("party_sessions")
            .update({
              status: "cancelled",
              cancelled_at: new Date().toISOString(),
            })
            .eq("id", sessionId);
          if (upErr) throw new Error(upErr.message);
        }
        clearLabel(sessionId);
        clearPartyCreds(sessionId);
        await refreshList();
        setSelectedId((prev) => (prev === sessionId ? null : prev));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Could not end the session.";
        setEndError(msg);
      } finally {
        setBusy(false);
      }
    },
    [entries, refreshList],
  );

  // ── Render ─────────────────────────────────────────────────────────────

  if (!restaurantId) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-zinc-500">
        Select a restaurant before starting a tableside session.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto px-5 py-6">
      <div className="mx-auto w-full max-w-6xl">
        {endError ? (
          <div
            className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/[0.07] px-4 py-3 text-sm text-red-200"
            role="status"
          >
            <span>{endError}</span>
            <button
              type="button"
              onClick={() => setEndError(null)}
              className="shrink-0 text-xs text-red-300/80 hover:text-red-200"
            >
              Dismiss
            </button>
          </div>
        ) : null}
        <header className="mb-6 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", DASH_QR_ICON_SURFACE)}>
              <QrCode size={22} strokeWidth={1.6} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-zinc-100">Tableside QR</h1>
              <p className="text-sm text-zinc-500">
                Run one session per table. Guests scan to join, you assign items and take payment.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={refreshList}
              title="Refresh"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-zinc-900/60 text-zinc-400 transition-colors hover:text-zinc-200"
            >
              <RefreshCw size={14} />
            </button>
            <button
              type="button"
              onClick={() => setShowStart(true)}
              className={cn(DASH_BTN_ADD, "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold")}
            >
              <Plus size={14} /> New table
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex h-40 items-center justify-center text-zinc-500">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <EmptyState onStart={() => setShowStart(true)} />
        ) : (
          <div className="grid gap-5 lg:grid-cols-[320px,1fr]">
            <aside className="space-y-2.5">
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                Active tables ({entries.length})
              </h2>
              <div className="space-y-2">
                {entries.map((entry) => (
                  <SessionCard
                    key={entry.session.id}
                    entry={entry}
                    active={entry.session.id === selectedId}
                    onSelect={() => setSelectedId(entry.session.id)}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => setShowStart(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 bg-zinc-900/30 px-3 py-3 text-xs font-semibold text-zinc-400 transition-colors hover:border-amber-500/30 hover:text-amber-300"
                >
                  <Plus size={14} /> New table
                </button>
              </div>
            </aside>

            {selectedEntry ? (
              <SessionDetail
                entry={selectedEntry}
                hostCreds={hostCreds}
                waiterName={waiterName}
                menu={menu}
                busy={busy}
                onEnd={() => handleEnd(selectedEntry.session.id)}
                onPatchEntry={patchEntry}
                onHostCredsSaved={() => setEntries((prev) => [...prev])}
              />
            ) : (
              <div className="flex h-full min-h-[400px] items-center justify-center rounded-2xl border border-white/8 bg-zinc-950/60 text-zinc-500">
                Pick a table on the left to manage it.
              </div>
            )}
          </div>
        )}

        <AnimatePresence>
          {showStart && (
            <StartDialog
              label={newTableLabel}
              onLabelChange={setNewTableLabel}
              onConfirm={handleStart}
              onCancel={() => {
                setShowStart(false);
                setNewTableLabel("");
              }}
              busy={busy}
              error={error}
              waiterName={waiterName}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────────────────────────────────────

function EmptyState({ onStart }: { onStart: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/8 bg-zinc-950/60 p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
    >
      <div className={cn("mx-auto flex h-12 w-12 items-center justify-center rounded-2xl", DASH_QR_ICON_SURFACE)}>
        <QrCode size={22} />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-zinc-100">No tableside sessions yet</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-zinc-500">
        Start a session per table. Each guest scans the QR on their phone to join — no download
        required, the same link opens in the Rasvia app if installed.
      </p>
      <button
        type="button"
        onClick={onStart}
        className={cn(DASH_BTN_ADD, "mt-5 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold")}
      >
        <Plus size={14} /> Start first table
      </button>
      <div className="mt-6 grid gap-2.5 text-left sm:grid-cols-3">
        <HowItWorksStep n={1} title="Open a table" body="Tap New table, note the label, and show the QR." />
        <HowItWorksStep n={2} title="Guests join" body="Each guest scans and picks their name — no sign-up needed." />
        <HowItWorksStep n={3} title="Assign & pay" body="You set who pays for what, lock the cart, and hand each guest their own pay QR." />
      </div>
    </motion.div>
  );
}

function HowItWorksStep({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-white/6 bg-zinc-900/40 p-3.5">
      <div className={cn("mb-2 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold", DASH_QR_ICON_SURFACE)}>
        {n}
      </div>
      <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-zinc-500">{body}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Start dialog
// ─────────────────────────────────────────────────────────────────────────────

function StartDialog({
  label,
  onLabelChange,
  onConfirm,
  onCancel,
  busy,
  error,
  waiterName,
}: {
  label: string;
  onLabelChange: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  busy: boolean;
  error: string | null;
  waiterName: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900/95 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.6)] backdrop-blur-xl"
      >
        <h3 className="text-base font-semibold text-zinc-100">New tableside session</h3>
        <p className="mt-1 text-xs text-zinc-500">
          You'll be joined as host ({waiterName}) so you can assign items and collect payment.
        </p>

        <label className="mt-5 block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Table label (optional)
        </label>
        <input
          value={label}
          onChange={(e) => onLabelChange(e.target.value)}
          placeholder="e.g. Table 12"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && !busy) {
              e.preventDefault();
              onConfirm();
            }
          }}
          className="mt-1.5 w-full rounded-lg border border-white/10 bg-zinc-800/60 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500/40 focus:outline-none"
        />

        {error ? (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/[0.07] px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        ) : null}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-white/10 bg-zinc-800 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={cn(
              DASH_BTN_ADD,
              "flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-colors disabled:opacity-50",
            )}
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : "Start session"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Session card (sidebar)
// ─────────────────────────────────────────────────────────────────────────────

function SessionCard({
  entry,
  active,
  onSelect,
}: {
  entry: SessionEntry;
  active: boolean;
  onSelect: () => void;
}) {
  const { session, snapshot } = entry;
  const members = snapshot?.members ?? [];
  const cart = totalCartCents(snapshot?.items ?? []);
  const label = loadLabel(session.id);
  const badge = statusBadge(session.status);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-xl border px-3.5 py-3 text-left transition-colors ${
        active
          ? "border-amber-500/40 bg-amber-500/[0.08]"
          : "border-white/8 bg-zinc-900/40 hover:border-white/15 hover:bg-zinc-900/60"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-zinc-100">
            {label || `Session ${session.id.slice(0, 6)}`}
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-zinc-500">{session.id.slice(0, 8)}…</p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${badge.className}`}
        >
          {badge.label}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-400">
        <span className="inline-flex items-center gap-1">
          <Users size={11} /> {members.filter((m) => m.role !== "host").length}
        </span>
        <span className="font-mono text-zinc-300">{formatCents(cart)}</span>
      </div>
    </button>
  );
}

function statusBadge(status: PartySession["status"]) {
  switch (status) {
    case "open":
      return {
        label: "Open",
        className:
          "border-emerald-600/45 bg-emerald-100 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/[0.08] dark:text-emerald-300",
      };
    case "locked":
      return {
        label: "Locked",
        className:
          "border-amber-600/40 bg-amber-100 text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/[0.08] dark:text-amber-300",
      };
    case "paying":
      return {
        label: "Paying",
        className:
          "border-blue-600/40 bg-blue-100 text-blue-950 dark:border-blue-500/30 dark:bg-blue-500/[0.08] dark:text-blue-300",
      };
    case "submitted":
      return {
        label: "Sent",
        className:
          "border-emerald-600/45 bg-emerald-100 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/[0.08] dark:text-emerald-300",
      };
    default:
      return {
        label: status,
        className: "border-zinc-300 bg-zinc-100 text-zinc-800 dark:border-white/10 dark:bg-zinc-800/50 dark:text-zinc-300",
      };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Session detail (right pane)
// ─────────────────────────────────────────────────────────────────────────────

function SessionDetail({
  entry,
  hostCreds,
  waiterName,
  menu,
  busy,
  onEnd,
  onPatchEntry,
  onHostCredsSaved,
}: {
  entry: SessionEntry;
  hostCreds: PartyCreds | null;
  waiterName: string;
  menu: MenuItemRow[];
  busy: boolean;
  onEnd: () => void;
  onPatchEntry: (sessionId: string, map: (e: SessionEntry) => SessionEntry) => void;
  onHostCredsSaved: () => void;
}) {
  const { session, snapshot } = entry;
  const members = snapshot?.members ?? [];
  const items = snapshot?.items ?? [];
  const payments = snapshot?.payments ?? [];
  const cartCents = totalCartCents(items);

  const [label, setLabelState] = useState<string>(() => loadLabel(session.id));
  useEffect(() => setLabelState(loadLabel(session.id)), [session.id]);

  const [actionError, setActionError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "err">("idle");
  const [modeBusy, setModeBusy] = useState(false);
  const [lockBusy, setLockBusy] = useState(false);

  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  const joinUrl = `${guestJoinOrigin()}/join?id=${session.id}`;
  const deepLink = `${APP_DEEP_LINK_PREFIX}${session.id}`;

  const statusBadgeInfo = statusBadge(session.status);
  const fullyPaid = isFullyPaid(payments);
  const paid = paidCount(payments);

  const canHost = !!hostCreds?.memberToken;
  const guestMembers = members.filter((m) => m.role !== "host");
  const payMode: PaymentMode = normalizeMode(session.payment_mode);

  const handleCopy = async () => {
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = null;
    }
    const ok = await copyTextToClipboard(joinUrl);
    if (ok) {
      setCopyState("copied");
      copyTimeoutRef.current = setTimeout(() => {
        setCopyState("idle");
        copyTimeoutRef.current = null;
      }, 2000);
    } else {
      setCopyState("err");
      copyTimeoutRef.current = setTimeout(() => {
        setCopyState("idle");
        copyTimeoutRef.current = null;
      }, 3000);
    }
  };

  const handleSetMode = async (mode: PaymentMode) => {
    if (!hostCreds) {
      setActionError("Host controls unavailable — try refreshing the page.");
      return;
    }
    if (modeBusy || normalizeMode(session.payment_mode) === mode) return;
    setActionError(null);
    const prev = session.payment_mode;
    onPatchEntry(session.id, (e) => ({
      ...e,
      session: { ...e.session, payment_mode: mode },
    }));
    setModeBusy(true);
    try {
      await setPaymentMode(supabase, hostCreds, mode);
    } catch (err) {
      onPatchEntry(session.id, (e) => ({
        ...e,
        session: { ...e.session, payment_mode: prev },
      }));
      setActionError((err as Error)?.message ?? "Could not change who pays.");
    } finally {
      setModeBusy(false);
    }
  };

  const handleAssign = async (itemId: string, payerId: string | null) => {
    if (!hostCreds) {
      setActionError("Host controls unavailable — try refreshing the page.");
      return;
    }
    setActionError(null);
    try {
      await assignItemPayer(supabase, hostCreds, itemId, payerId);
      if (!payerId) {
        await setItemSplit(supabase, hostCreds, itemId, []);
      }
    } catch (err) {
      setActionError((err as Error)?.message ?? "Could not update item.");
    }
  };

  const handleSplit = async (itemId: string, memberIds: string[]) => {
    if (!hostCreds) {
      setActionError("Host controls unavailable — try refreshing the page.");
      return;
    }
    setActionError(null);
    try {
      await setItemSplit(supabase, hostCreds, itemId, memberIds);
      await assignItemPayer(supabase, hostCreds, itemId, null);
    } catch (err) {
      setActionError((err as Error)?.message ?? "Could not split item.");
    }
  };

  const handleLock = async () => {
    if (!hostCreds) return;
    setActionError(null);
    setLockBusy(true);
    try {
      await lockSession(supabase, hostCreds);
    } catch (err) {
      const msg = (err as Error)?.message ?? "";
      if (isPartyUnauthorizedMessage(msg) && waiterName.trim()) {
        try {
          const j = await joinSession(supabase, session.id, waiterName.trim());
          const merged = await completeJoinCredentials(supabase, session.id, j, hostCreds);
          savePartyCreds(merged);
          onHostCredsSaved();
          await lockSession(supabase, merged);
        } catch (e2) {
          setActionError((e2 as Error)?.message ?? "Could not lock cart.");
        }
      } else {
        setActionError(msg || "Could not lock cart.");
      }
    } finally {
      setLockBusy(false);
    }
  };

  const handleUnlock = async () => {
    if (!hostCreds) return;
    setActionError(null);
    setLockBusy(true);
    try {
      await unlockSession(supabase, hostCreds);
    } catch (err) {
      const msg = (err as Error)?.message ?? "";
      if (isPartyUnauthorizedMessage(msg) && waiterName.trim()) {
        try {
          const j = await joinSession(supabase, session.id, waiterName.trim());
          const merged = await completeJoinCredentials(supabase, session.id, j, hostCreds);
          savePartyCreds(merged);
          onHostCredsSaved();
          await unlockSession(supabase, merged);
        } catch (e2) {
          setActionError((e2 as Error)?.message ?? "Could not unlock cart.");
        }
      } else {
        setActionError(msg || "Could not unlock cart.");
      }
    } finally {
      setLockBusy(false);
    }
  };

  const handleLabelBlur = () => {
    saveLabel(session.id, label);
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(280px,360px),1fr]">
      {/* QR + session status */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 rounded-2xl border border-white/8 bg-zinc-950/60 p-5"
      >
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Active session</p>
          <div className="mt-1 flex items-center gap-2">
            <input
              value={label}
              onChange={(e) => setLabelState(e.target.value)}
              onBlur={handleLabelBlur}
              placeholder="Table label"
              className="min-w-0 flex-1 rounded-md border border-white/5 bg-transparent px-1 py-0.5 text-lg font-semibold text-zinc-100 focus:border-white/15 focus:bg-zinc-900/50 focus:outline-none"
            />
            <span
              className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${statusBadgeInfo.className}`}
            >
              {statusBadgeInfo.label}
            </span>
          </div>
          <p className="mt-1 font-mono text-[10px] text-zinc-600">{session.id}</p>
        </div>

        <div className="mx-auto flex w-full max-w-[260px] flex-col items-center gap-3 rounded-2xl border border-white/8 bg-white p-4">
          <QRCode value={joinUrl} size={212} bgColor="#ffffff" fgColor="#0a0a0a" />
          <p className="select-all break-all text-center font-mono text-[11px] text-zinc-700">{joinUrl}</p>
        </div>

        <div className="grid gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-zinc-900/60 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-800/80"
          >
            <Copy size={13} />
            {copyState === "copied" ? "Copied" : copyState === "err" ? "Could not copy — select URL above" : "Copy link"}
          </button>
        </div>
        <p className="text-[10px] leading-relaxed text-zinc-500">
          You can run this table entirely here — the same link is what guests use on their phones.
        </p>

        <a
          href={deepLink}
          className="inline-flex items-center justify-center gap-1.5 text-[11px] text-zinc-500 hover:text-zinc-300"
        >
          <Smartphone size={12} /> Opens the Rasvia app if installed
        </a>

        {/* Lock / unlock + End */}
        <div className="mt-auto flex flex-col gap-2 border-t border-white/5 pt-4">
          {session.status === "open" ? (
            <button
              type="button"
              disabled={!canHost || items.length === 0 || lockBusy}
              onClick={handleLock}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-600/45 bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-950 hover:bg-amber-200/90 disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-500/30 dark:bg-amber-500/[0.08] dark:text-amber-300 dark:hover:bg-amber-500/[0.16]"
            >
              {lockBusy ? <Loader2 size={13} className="animate-spin" /> : <Lock size={13} />}
              Lock cart for payment
            </button>
          ) : session.status === "locked" ? (
            <button
              type="button"
              disabled={!canHost || lockBusy}
              onClick={handleUnlock}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-900 hover:bg-zinc-200/90 disabled:opacity-50 dark:border-white/10 dark:bg-zinc-900/60 dark:text-zinc-200 dark:hover:bg-zinc-800/80"
            >
              {lockBusy ? <Loader2 size={13} className="animate-spin" /> : <Unlock size={13} />}
              Unlock cart
            </button>
          ) : null}

          <button
            type="button"
            onClick={onEnd}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-600/35 bg-red-100 px-3 py-2 text-xs font-semibold text-red-900 hover:bg-red-200/90 disabled:opacity-50 dark:border-red-500/25 dark:bg-red-500/[0.06] dark:text-red-300 dark:hover:bg-red-500/[0.14]"
          >
            {busy ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
            End session
          </button>
        </div>
      </motion.div>

      {/* Members + payment mode + cart + payments */}
      <div className="flex flex-col gap-5">
        {actionError ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/[0.07] px-3 py-2 text-xs text-red-200">
            {actionError}
          </div>
        ) : null}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/8 bg-zinc-950/60 p-5"
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
              <Users size={15} className="text-zinc-400" />
              Guests ({guestMembers.length})
            </h3>
            <span className="text-[11px] text-zinc-500">Updates live</span>
          </div>
          {guestMembers.length === 0 ? (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/8 bg-zinc-900/30 px-4 py-6 text-center text-xs text-zinc-500">
              <Loader2 size={14} className="animate-spin text-zinc-600" />
              Waiting for the first guest to scan…
            </div>
          ) : (
            <ul className="space-y-1.5">
              <AnimatePresence initial={false}>
                {guestMembers.map((m) => (
                  <motion.li
                    key={m.id}
                    layout
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-between rounded-lg border border-white/6 bg-zinc-900/40 px-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-700/60 text-[11px] font-bold text-zinc-200">
                        {m.display_name?.charAt(0)?.toUpperCase() ?? "?"}
                      </div>
                      <span className="truncate text-sm text-zinc-100">{m.display_name}</span>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                      {new Date(m.joined_at).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </motion.div>

        {/* Payment mode */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/8 bg-zinc-950/60 p-5"
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-100">Who pays</h3>
            {!canHost ? (
              <span className="text-[10px] text-amber-400">
                Reopen the session to restore host controls.
              </span>
            ) : null}
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {(
              [
                { mode: "per_person", label: "Per person", hint: "Each guest pays for what they added" },
                { mode: "equal_split", label: "Equal split", hint: "Total divided evenly between guests" },
                { mode: "assigned", label: "Custom per item", hint: "Pick a payer per item below" },
              ] as { mode: PaymentMode; label: string; hint: string }[]
            ).map(({ mode, label: modeLabel, hint }) => {
              const active = normalizeMode(session.payment_mode) === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  disabled={!canHost || !editable(session.status) || modeBusy}
                  onClick={() => handleSetMode(mode)}
                  className={`flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                    active
                      ? "border-amber-600/50 bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/[0.08]"
                      : "border-zinc-300 bg-zinc-50 hover:border-zinc-400 dark:border-white/8 dark:bg-zinc-900/40 dark:hover:border-white/15"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <span
                    className={`text-xs font-semibold ${
                      active ? "text-amber-950 dark:text-amber-200" : "text-zinc-900 dark:text-zinc-200"
                    }`}
                  >
                    {modeLabel}
                  </span>
                  <span className="text-[10px] leading-tight text-zinc-600 dark:text-zinc-500">{hint}</span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Waiter menu browser — add items on behalf of a guest */}
        {canHost && editable(session.status) ? (
          <AddItemsCard
            menu={menu}
            members={members}
            items={items}
            hostCreds={hostCreds!}
            onError={(msg) => setActionError(msg)}
          />
        ) : null}

        {/* Cart with per-item assignment */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/8 bg-zinc-950/60 p-5"
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-100">Cart</h3>
            <span className="text-sm font-semibold text-zinc-200">{formatCents(cartCents)}</span>
          </div>
          {items.length === 0 ? (
            <p className="text-xs text-zinc-500">
              No items yet — use Add to order above to build the table's check.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {items.map((it) => (
                <CartItemRow
                  key={it.id}
                  item={it}
                  members={guestMembers}
                  paymentMode={payMode}
                  canEdit={canHost && editable(session.status)}
                  hostCreds={hostCreds}
                  onAssign={(payerId) => handleAssign(it.id, payerId)}
                  onSplit={(memberIds) => handleSplit(it.id, memberIds)}
                  onError={(msg) => setActionError(msg)}
                />
              ))}
            </ul>
          )}
        </motion.div>

        {/* Per-guest payment QRs */}
        {payments.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/8 bg-zinc-950/60 p-5"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-100">Per-guest payment QR codes</h3>
              <span className="text-[11px] text-zinc-500">
                {paid}/{payments.length} paid{" "}
                {fullyPaid ? <Check size={11} className="-mt-0.5 inline text-emerald-400" /> : null}
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

// ─────────────────────────────────────────────────────────────────────────────
// Cart item row with assign / split controls
// ─────────────────────────────────────────────────────────────────────────────

function AddItemsCard({
  menu,
  members,
  items,
  hostCreds,
  onError,
}: {
  menu: MenuItemRow[];
  members: PartyMember[];
  items: PartyItem[];
  hostCreds: PartyCreds;
  onError: (msg: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  // Tableside: the waiter is _only_ a host, never a diner — items can only be
  // attributed to a dining guest. If no guest has scanned in yet, targetId is
  // null and the Add buttons are disabled.
  const guestOnly = useMemo(() => members.filter((m) => m.role !== "host"), [members]);
  const defaultTarget = useMemo(() => guestOnly[0]?.id ?? null, [guestOnly]);
  const [targetId, setTargetId] = useState<string | null>(defaultTarget);
  useEffect(() => {
    if (!targetId || !guestOnly.some((m) => m.id === targetId)) {
      setTargetId(defaultTarget);
    }
  }, [defaultTarget, targetId, guestOnly]);

  const [pendingAdds, setPendingAdds] = useState<Record<number, number>>({});

  const categories = useMemo(() => {
    const set = new Set<string>();
    menu.forEach((m) => {
      const c = (m.category ?? "").trim();
      if (c) set.add(c);
    });
    return Array.from(set).sort();
  }, [menu]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return menu.filter((m) => {
      if (category && (m.category ?? "").trim() !== category) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        (m.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [menu, search, category]);

  const canAdd = !!targetId;

  const inCartForTarget = useCallback(
    (menuItemId: number) => {
      if (!targetId) return 0;
      return items
        .filter((it) => it.menu_item_id === menuItemId && it.added_by_member_id === targetId)
        .reduce((sum, it) => sum + (it.quantity ?? 1), 0);
    },
    [items, targetId],
  );

  const handleAdd = useCallback(
    async (menuItemId: number) => {
      if (!targetId) {
        onError("Pick a guest to add this item to.");
        return;
      }
      setPendingAdds((prev) => ({ ...prev, [menuItemId]: (prev[menuItemId] ?? 0) + 1 }));
      try {
        await hostAddItemFor(supabase, hostCreds, targetId, menuItemId, 1);
      } catch (err) {
        setPendingAdds((prev) => {
          const next = { ...prev };
          const current = next[menuItemId] ?? 0;
          if (current <= 1) delete next[menuItemId];
          else next[menuItemId] = current - 1;
          return next;
        });
        onError((err as Error)?.message ?? "Could not add item.");
      }
    },
    [targetId, hostCreds, onError],
  );

  // Clear pending adds whenever the items list refreshes (realtime push).
  const itemsKey = items.length + ":" + items.map((i) => i.id + ":" + i.quantity).join(",");
  useEffect(() => {
    setPendingAdds({});
  }, [itemsKey]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/8 bg-zinc-950/60 p-5"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <UtensilsCrossed size={15} className="text-zinc-400" />
          Add to order
        </h3>
        <span className="text-[10px] uppercase tracking-wider text-zinc-500">
          {menu.length} item{menu.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="mb-3 flex flex-col gap-2">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Add to
        </label>
        <div className="flex flex-wrap gap-1.5">
          {guestOnly.length === 0 ? (
            <span className="text-[11px] text-zinc-500">
              Waiting for a guest to scan in — you can start adding items once someone joins.
            </span>
          ) : (
            guestOnly.map((m) => {
              const active = targetId === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setTargetId(m.id)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    active
                      ? "border-amber-500/40 bg-amber-500/[0.1] text-amber-200"
                      : "border-white/10 bg-zinc-900/60 text-zinc-300 hover:border-white/20"
                  }`}
                >
                  {m.display_name}
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="mb-3 flex items-center gap-2 rounded-lg border border-white/10 bg-zinc-900/60 px-2.5 py-1.5">
        <Search size={13} className="text-zinc-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search menu"
          className="flex-1 bg-transparent text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
        />
      </div>

      {categories.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setCategory(null)}
            className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${
              category === null
                ? "border-amber-500/40 bg-amber-500/[0.1] text-amber-200"
                : "border-white/10 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            All
          </button>
          {categories.map((c) => {
            const active = category === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(active ? null : c)}
                className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${
                  active
                    ? "border-amber-500/40 bg-amber-500/[0.1] text-amber-200"
                    : "border-white/10 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>
      ) : null}

      <ul className="max-h-[360px] space-y-1.5 overflow-y-auto pr-1">
        {menu.length === 0 ? (
          <li className="rounded-lg border border-dashed border-white/10 bg-zinc-900/30 px-3 py-4 text-center text-[11px] text-zinc-500">
            No menu items available for this restaurant yet.
          </li>
        ) : filtered.length === 0 ? (
          <li className="rounded-lg border border-dashed border-white/10 bg-zinc-900/30 px-3 py-4 text-center text-[11px] text-zinc-500">
            No items match — try a different search.
          </li>
        ) : (
          filtered.map((m) => {
            const inCart = inCartForTarget(m.id) + (pendingAdds[m.id] ?? 0);
            const priceCents = Math.round(Number(m.price ?? 0) * 100);
            return (
              <li
                key={m.id}
                className="flex items-center gap-2 rounded-lg border border-white/6 bg-zinc-900/30 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-zinc-100">{m.name}</p>
                  {m.description ? (
                    <p className="truncate text-[11px] text-zinc-500">{m.description}</p>
                  ) : null}
                </div>
                <span className="whitespace-nowrap font-mono text-xs text-zinc-400">
                  {formatCents(priceCents)}
                </span>
                <button
                  type="button"
                  disabled={!canAdd}
                  title={!canAdd ? "Wait for a guest to scan the QR before adding items" : undefined}
                  onClick={() => void handleAdd(m.id)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors",
                    canAdd
                      ? "border-amber-500/30 bg-amber-500/[0.08] text-amber-200 hover:bg-amber-500/[0.18]"
                      : "cursor-not-allowed border-white/10 bg-zinc-800/50 text-zinc-500 opacity-60",
                  )}
                >
                  <Plus size={11} />
                  {inCart > 0 ? inCart : "Add"}
                </button>
              </li>
            );
          })
        )}
      </ul>
    </motion.div>
  );
}

function CartItemRow({
  item,
  members,
  paymentMode,
  canEdit,
  hostCreds,
  onAssign,
  onSplit,
  onError,
}: {
  item: PartyItem;
  members: PartyMember[];
  paymentMode: PaymentMode;
  canEdit: boolean;
  hostCreds: PartyCreds | null;
  onAssign: (payerId: string | null) => void;
  onSplit: (memberIds: string[]) => void;
  onError: (msg: string) => void;
}) {
  const unitPrice = Math.round(Number(item.menu_item?.price ?? 0) * 100);
  const total = unitPrice * Math.max(1, item.quantity);
  const [splitOpen, setSplitOpen] = useState(false);
  const [qtyBusy, setQtyBusy] = useState(false);
  const wrapperRef = useRef<HTMLLIElement>(null);

  const handleBump = async (delta: number) => {
    if (!hostCreds) return;
    const next = Math.max(0, item.quantity + delta);
    if (next === item.quantity) return;
    setQtyBusy(true);
    try {
      await updateItemQuantity(supabase, hostCreds, item.id, next);
    } catch (err) {
      onError((err as Error)?.message ?? "Could not update quantity.");
    } finally {
      setQtyBusy(false);
    }
  };

  const handleRemove = async () => {
    if (!hostCreds) return;
    setQtyBusy(true);
    try {
      await removeItem(supabase, hostCreds, item.id);
    } catch (err) {
      onError((err as Error)?.message ?? "Could not remove item.");
    } finally {
      setQtyBusy(false);
    }
  };

  useEffect(() => {
    if (!splitOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setSplitOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [splitOpen]);

  const assignee = members.find((m) => m.id === item.assigned_payer_id) ?? null;
  const splitMembers = members.filter((m) => item.split_member_ids.includes(m.id));
  const payMode = paymentMode;

  let assignmentLabel: string;
  if (payMode === "host_pays") {
    assignmentLabel = "On host's check";
  } else if (payMode === "equal_split") {
    assignmentLabel = "Split in group subtotal (equal)";
  } else if (payMode === "per_person") {
    if (splitMembers.length > 0) {
      assignmentLabel =
        splitMembers.length <= 2
          ? `Split: ${splitMembers.map((m) => m.display_name).join(", ")}`
          : `Split: ${splitMembers.length} people`;
    } else {
      assignmentLabel = item.added_by_name ? `Who ordered: ${item.added_by_name}` : "Who ordered it";
    }
  } else if (assignee) {
    assignmentLabel = `Paid by ${assignee.display_name}`;
  } else if (item.added_by_name) {
    assignmentLabel = `Who ordered: ${item.added_by_name}`;
  } else {
    assignmentLabel = "Payer: default (who ordered)";
  }

  const selectValue =
    payMode === "per_person"
      ? splitMembers.length > 0
        ? "split"
        : "default"
      : payMode === "assigned"
        ? assignee
          ? `m:${assignee.id}`
          : "default"
        : "—";

  const allocationControl = (() => {
    if (payMode === "host_pays" || payMode === "equal_split") {
      return (
        <span className="max-w-[200px] truncate text-[11px] text-zinc-400" title={assignmentLabel}>
          {payMode === "host_pays" ? "On host's check" : "In equal group split"}
        </span>
      );
    }
    if (payMode === "per_person" && canEdit) {
      return (
        <div className="flex items-center gap-1.5">
          <select
            value={selectValue}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "default") {
                onAssign(null);
              } else if (v === "split") {
                setSplitOpen(true);
              }
            }}
            className="max-w-[200px] truncate rounded-md border border-white/10 bg-zinc-800/80 px-2 py-1.5 text-[11px] text-zinc-200 focus:border-amber-500/40 focus:outline-none"
          >
            <option value="default">Who ordered it</option>
            <option value="split">Split between people…</option>
          </select>
        </div>
      );
    }
    if (payMode === "assigned" && canEdit) {
      return (
        <div className="flex items-center gap-1.5">
          <select
            value={selectValue}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "default") onAssign(null);
              else if (v.startsWith("m:")) onAssign(v.slice(2));
            }}
            className="max-w-[200px] truncate rounded-md border border-white/10 bg-zinc-800/80 px-2 py-1.5 text-[11px] text-zinc-200 focus:border-amber-500/40 focus:outline-none"
          >
            <option value="default">Who ordered (default)</option>
            {members.map((m) => (
              <option key={m.id} value={`m:${m.id}`}>
                {m.display_name}
                {m.role === "host" ? " (host)" : ""}
              </option>
            ))}
          </select>
        </div>
      );
    }
    return <span className="truncate text-[11px] text-zinc-500">{assignmentLabel}</span>;
  })();

  return (
    <li
      ref={wrapperRef}
      className="relative flex flex-col gap-2 rounded-lg border border-white/6 bg-zinc-900/30 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-zinc-100">
          {item.menu_item?.name ?? "Item"}
          {item.quantity > 1 ? <span className="text-zinc-500"> ×{item.quantity}</span> : null}
        </p>
        {item.added_by_name ? (
          <p className="truncate text-[11px] text-zinc-500">added by {item.added_by_name}</p>
        ) : null}
        {item.special_requests ? (
          <p className="truncate text-[11px] italic text-zinc-500">“{item.special_requests}”</p>
        ) : null}
      </div>

      <div className="flex items-center gap-2 self-stretch sm:self-center">
        {allocationControl}
        {canEdit ? (
          <div className="inline-flex items-center overflow-hidden rounded-md border border-white/10 bg-zinc-900/60">
            <button
              type="button"
              disabled={qtyBusy}
              onClick={() => handleBump(-1)}
              className="inline-flex h-6 w-6 items-center justify-center text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-50"
              aria-label="Decrease quantity"
            >
              <Minus size={11} />
            </button>
            <span className="min-w-[1.25rem] text-center text-[11px] font-semibold text-zinc-200">
              {item.quantity}
            </span>
            <button
              type="button"
              disabled={qtyBusy}
              onClick={() => handleBump(1)}
              className="inline-flex h-6 w-6 items-center justify-center text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-50"
              aria-label="Increase quantity"
            >
              <Plus size={11} />
            </button>
          </div>
        ) : null}
        <span className="whitespace-nowrap font-mono text-sm text-zinc-300">{formatCents(total)}</span>
        {canEdit ? (
          <button
            type="button"
            disabled={qtyBusy}
            onClick={handleRemove}
            className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-white/10 bg-zinc-900/60 text-zinc-500 hover:border-red-500/30 hover:text-red-300 disabled:opacity-50"
            aria-label="Remove item"
          >
            <Trash2 size={11} />
          </button>
        ) : null}
      </div>

      {splitOpen && payMode === "per_person" ? (
        <SplitPopover
          members={members}
          initial={item.split_member_ids}
          onClose={() => setSplitOpen(false)}
          onApply={(ids) => {
            setSplitOpen(false);
            if (ids.length === 0) onAssign(null);
            else onSplit(ids);
          }}
        />
      ) : null}
    </li>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Split popover
// ─────────────────────────────────────────────────────────────────────────────

function SplitPopover({
  members,
  initial,
  onClose,
  onApply,
}: {
  members: PartyMember[];
  initial: string[];
  onClose: () => void;
  onApply: (ids: string[]) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initial));
  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div
      className="absolute right-3 top-full z-10 mt-2 w-64 rounded-xl border border-white/10 bg-zinc-900/95 p-3 shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-xl"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        Split this item between
      </p>
      <ul className="max-h-52 space-y-1 overflow-y-auto">
        {members.map((m) => {
          const checked = selected.has(m.id);
          return (
            <li key={m.id}>
              <label
                className={`flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 text-xs ${
                  checked
                    ? "border-amber-500/40 bg-amber-500/[0.08] text-amber-200"
                    : "border-white/6 bg-zinc-900/40 text-zinc-200 hover:border-white/15"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(m.id)}
                  className="h-3.5 w-3.5 accent-amber-500"
                />
                <UserRound size={12} className="text-zinc-400" />
                <span className="truncate">
                  {m.display_name}
                  {m.role === "host" ? " (host)" : ""}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-white/10 bg-zinc-800 px-3 py-1.5 text-[11px] font-medium text-zinc-200 hover:bg-zinc-700"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onApply(Array.from(selected))}
          className={cn("rounded-md px-3 py-1.5 text-[11px] font-semibold", DASH_BTN_ADD)}
        >
          Apply
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function editable(status: PartySession["status"]): boolean {
  return status === "open";
}

function normalizeMode(mode: PartySession["payment_mode"]): PaymentMode {
  // The DB column tolerates legacy aliases "split" / "assign" — coerce them
  // back to the canonical v2 values used everywhere in the UI.
  if (mode === "split") return "equal_split";
  if (mode === "assign") return "assigned";
  return mode;
}

