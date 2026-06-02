import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  QrCode,
  Users,
  Plus,
  X,
  Printer,
  RefreshCw,
  ListPlus,
  Hash,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import {
  formatCents,
  type PartySession,
} from "@/lib/party-session";
import { QRCode } from "@/lib/resolve-react-qr-code";
import { buildTableJoinUrl, downloadTablesideQrCodesPdf } from "@/lib/tableside-qr-pdf";
import { DASH_BTN_ADD, DASH_PRIMARY_CTA, DASH_QR_ICON_SURFACE } from "@/lib/dashboardUi";
import { cn } from "@/lib/utils";

/**
 * Tableside QR management (self-order)
 *
 * Each table gets a fixed QR sticker encoding
 *   https://rasvia.com/t?r=<restaurantId>&table=<label>
 * When a guest scans it, the `tableside-session` edge function find-or-creates
 * the table's shared self-serve group order and drops them into the standard
 * /join flow. Guests add their own items and pay their share - no waiter takes
 * the order; runners just deliver the food once the ticket fires.
 *
 * This panel only:
 *   - lets the owner define their table labels (count or custom list),
 *   - renders + prints the per-table QR codes, and
 *   - shows a read-only live list of active self-serve table sessions.
 */

const LABELS_KEY_PREFIX = "rasvia.tableside.labels.";
const LABEL_MAX = 32;
const MAX_TABLES = 200;
const LIST_POLL_MS = 8000;
const ACTIVE_STATUSES: PartySession["status"][] = ["open", "locked", "paying"];

function labelsStorageKey(restaurantId: number): string {
  return `${LABELS_KEY_PREFIX}${restaurantId}`;
}

function normalizeLabel(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, LABEL_MAX);
}

function loadLabels(restaurantId: number): string[] {
  try {
    const raw = window.localStorage.getItem(labelsStorageKey(restaurantId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return dedupeLabels(parsed.map((v) => normalizeLabel(String(v))).filter(Boolean));
  } catch {
    return [];
  }
}

function saveLabels(restaurantId: number, labels: string[]): void {
  try {
    window.localStorage.setItem(labelsStorageKey(restaurantId), JSON.stringify(labels));
  } catch {
    // ignore quota / private-mode failures - labels are convenience state only
  }
}

/** Case-insensitive de-dupe that keeps the first spelling entered. */
function dedupeLabels(labels: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const label of labels) {
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out;
}

type ActiveTableSession = {
  id: string;
  table_label: string | null;
  status: PartySession["status"];
  total_cents: number;
  subtotal_cents: number;
  created_at: string;
  memberCount: number;
};

export default function TablesidePanel() {
  const { restaurantId } = useAuth();

  const [restaurantName, setRestaurantName] = useState<string>("");
  const [labels, setLabels] = useState<string[]>([]);
  const [countInput, setCountInput] = useState("");
  const [labelInput, setLabelInput] = useState("");
  const [downloading, setDownloading] = useState(false);

  const [sessions, setSessions] = useState<ActiveTableSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  // ── Load persisted labels + restaurant name ───────────────────────────
  useEffect(() => {
    if (!restaurantId) {
      setLabels([]);
      return;
    }
    setLabels(loadLabels(restaurantId));
  }, [restaurantId]);

  useEffect(() => {
    if (!restaurantId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("restaurants")
        .select("name")
        .eq("id", restaurantId)
        .maybeSingle();
      if (cancelled) return;
      const name = (data as { name?: string | null } | null)?.name?.trim();
      if (name) setRestaurantName(name);
    })();
    return () => {
      cancelled = true;
    };
  }, [restaurantId]);

  const persist = useCallback(
    (next: string[]) => {
      const deduped = dedupeLabels(next);
      setLabels(deduped);
      if (restaurantId) saveLabels(restaurantId, deduped);
    },
    [restaurantId],
  );

  // ── Active self-serve session monitor (read-only) ─────────────────────
  const refreshSessions = useCallback(async () => {
    if (!restaurantId) return;
    const { data, error } = await supabase
      .from("party_sessions")
      .select("id, table_label, status, total_cents, subtotal_cents, created_at")
      .eq("restaurant_id", restaurantId)
      .eq("self_serve", true)
      .in("status", ACTIVE_STATUSES)
      .order("created_at", { ascending: true });
    if (error) {
      // Read-only monitor: don't surface a toast on a transient list fetch.
      return;
    }
    const rows = (data ?? []) as Omit<ActiveTableSession, "memberCount">[];
    const ids = rows.map((r) => r.id);
    const memberCounts = new Map<string, number>();
    if (ids.length > 0) {
      const { data: memberRows } = await supabase
        .from("party_members")
        .select("session_id")
        .in("session_id", ids)
        .is("left_at", null);
      for (const m of (memberRows ?? []) as { session_id: string }[]) {
        memberCounts.set(m.session_id, (memberCounts.get(m.session_id) ?? 0) + 1);
      }
    }
    setSessions(
      rows.map((r) => ({
        ...r,
        memberCount: memberCounts.get(r.id) ?? 0,
      })),
    );
  }, [restaurantId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setSessionsLoading(true);
      await refreshSessions();
      if (!cancelled) setSessionsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshSessions]);

  useEffect(() => {
    if (!restaurantId) return;
    const id = window.setInterval(() => refreshSessions(), LIST_POLL_MS);
    return () => window.clearInterval(id);
  }, [restaurantId, refreshSessions]);

  useEffect(() => {
    if (!restaurantId) return;
    const channel = supabase
      .channel(`tableside-qr:restaurant:${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "party_sessions",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => refreshSessions(),
      )
      .subscribe();
    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {
        // ignore
      }
    };
  }, [restaurantId, refreshSessions]);

  // ── Label editing actions ─────────────────────────────────────────────
  const handleGenerateCount = useCallback(() => {
    const n = Number(countInput);
    if (!Number.isInteger(n) || n <= 0) {
      toast.error("Enter a whole number of tables.");
      return;
    }
    if (n > MAX_TABLES) {
      toast.error(`You can generate up to ${MAX_TABLES} tables at once.`);
      return;
    }
    const generated = Array.from({ length: n }, (_, i) => `Table ${i + 1}`);
    persist([...labels, ...generated]);
    setCountInput("");
    toast.success(`Added ${n} table${n === 1 ? "" : "s"}.`);
  }, [countInput, labels, persist]);

  const handleAddLabels = useCallback(() => {
    const parts = labelInput
      .split(/[\n,]+/)
      .map(normalizeLabel)
      .filter(Boolean);
    if (parts.length === 0) {
      toast.error("Enter a table name.");
      return;
    }
    const next = dedupeLabels([...labels, ...parts]);
    if (next.length > MAX_TABLES) {
      toast.error(`You can manage up to ${MAX_TABLES} tables.`);
      return;
    }
    persist(next);
    setLabelInput("");
  }, [labelInput, labels, persist]);

  const handleRemoveLabel = useCallback(
    (label: string) => {
      persist(labels.filter((l) => l !== label));
    },
    [labels, persist],
  );

  const handleClearAll = useCallback(() => {
    if (labels.length === 0) return;
    if (!window.confirm("Remove all tables? This only clears your QR list, not any active orders.")) {
      return;
    }
    persist([]);
  }, [labels, persist]);

  const handleDownload = useCallback(async () => {
    if (!restaurantId) return;
    if (labels.length === 0) {
      toast.error("Add at least one table first.");
      return;
    }
    setDownloading(true);
    try {
      await downloadTablesideQrCodesPdf({
        restaurantId,
        restaurantName,
        labels,
      });
      toast.success("QR sheet downloaded.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not build the QR sheet.");
    } finally {
      setDownloading(false);
    }
  }, [restaurantId, restaurantName, labels]);

  if (!restaurantId) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-zinc-500">
        Select a restaurant to manage tableside QR codes.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto px-5 py-6">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", DASH_QR_ICON_SURFACE)}>
              <QrCode size={22} strokeWidth={1.6} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-zinc-100">Tableside QR</h1>
              <p className="max-w-xl text-sm text-zinc-500">
                Print one fixed QR per table. Guests scan to order and pay for themselves - your team
                just runs the food.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => refreshSessions()}
              title="Refresh active tables"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-zinc-900/60 text-zinc-400 transition-colors hover:text-zinc-200"
            >
              <RefreshCw size={14} />
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading || labels.length === 0}
              className={cn(
                DASH_PRIMARY_CTA,
                "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
              )}
            >
              {downloading ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
              Download QR sheet
            </button>
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-[340px,1fr]">
          {/* Left: table builder + active sessions */}
          <div className="space-y-5">
            <TableBuilder
              countInput={countInput}
              onCountChange={setCountInput}
              onGenerateCount={handleGenerateCount}
              labelInput={labelInput}
              onLabelChange={setLabelInput}
              onAddLabels={handleAddLabels}
            />
            <ActiveSessions loading={sessionsLoading} sessions={sessions} />
          </div>

          {/* Right: QR grid */}
          <section className="rounded-2xl border border-white/8 bg-zinc-950/60 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
                <QrCode size={15} className="text-zinc-400" />
                Table QR codes ({labels.length})
              </h2>
              {labels.length > 0 ? (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-[11px] font-semibold text-zinc-500 transition-colors hover:text-red-300"
                >
                  Clear all
                </button>
              ) : null}
            </div>

            {labels.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-white/10 bg-zinc-900/30 px-6 py-12 text-center">
                <QrCode size={26} className="text-zinc-600" />
                <p className="text-sm font-medium text-zinc-300">No tables yet</p>
                <p className="max-w-xs text-xs text-zinc-500">
                  Add a number of tables or type custom names on the left. Each table gets its own
                  permanent QR code to print and place on the table.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <AnimatePresence initial={false}>
                  {labels.map((label) => (
                    <QrTile
                      key={label}
                      label={label}
                      url={buildTableJoinUrl(restaurantId, label)}
                      onRemove={() => handleRemoveLabel(label)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Table builder
// ─────────────────────────────────────────────────────────────────────────────

function TableBuilder({
  countInput,
  onCountChange,
  onGenerateCount,
  labelInput,
  onLabelChange,
  onAddLabels,
}: {
  countInput: string;
  onCountChange: (v: string) => void;
  onGenerateCount: () => void;
  labelInput: string;
  onLabelChange: (v: string) => void;
  onAddLabels: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/8 bg-zinc-950/60 p-5"
    >
      <h2 className="text-sm font-semibold text-zinc-100">Add tables</h2>
      <p className="mt-1 text-xs text-zinc-500">
        Generate numbered tables in one go, or add custom names (e.g. Patio 3, Bar 1).
      </p>

      <label className="mt-4 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        <Hash size={11} /> Number of tables
      </label>
      <div className="mt-1.5 flex gap-2">
        <input
          type="number"
          min={1}
          max={MAX_TABLES}
          inputMode="numeric"
          value={countInput}
          onChange={(e) => onCountChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onGenerateCount();
            }
          }}
          placeholder="e.g. 12"
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500/40 focus:outline-none"
        />
        <button
          type="button"
          onClick={onGenerateCount}
          className={cn(DASH_BTN_ADD, "shrink-0 rounded-lg px-3 py-2 text-xs font-semibold")}
        >
          <Plus size={13} /> Generate
        </button>
      </div>

      <label className="mt-4 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        <ListPlus size={11} /> Custom names
      </label>
      <textarea
        value={labelInput}
        onChange={(e) => onLabelChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            onAddLabels();
          }
        }}
        rows={2}
        placeholder="One per line or comma-separated"
        className="mt-1.5 w-full resize-none rounded-lg border border-white/10 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500/40 focus:outline-none"
      />
      <button
        type="button"
        onClick={onAddLabels}
        className={cn(DASH_BTN_ADD, "mt-2 w-full justify-center rounded-lg px-3 py-2 text-xs font-semibold")}
      >
        <Plus size={13} /> Add tables
      </button>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// QR tile
// ─────────────────────────────────────────────────────────────────────────────

function QrTile({ label, url, onRemove }: { label: string; url: string; onRemove: () => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="group relative flex flex-col items-center gap-2 rounded-xl border border-white/8 bg-zinc-900/40 p-3"
    >
      <button
        type="button"
        onClick={onRemove}
        title="Remove table"
        className="absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-zinc-900/80 text-zinc-500 opacity-0 transition-opacity hover:border-red-500/30 hover:text-red-300 group-hover:opacity-100"
      >
        <X size={12} />
      </button>
      <div className="rounded-lg bg-white p-2.5">
        <QRCode value={url} size={112} bgColor="#ffffff" fgColor="#0a0a0a" level="H" />
      </div>
      <p className="line-clamp-2 w-full break-words text-center text-xs font-semibold text-zinc-200">
        {label}
      </p>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Active sessions (read-only monitor)
// ─────────────────────────────────────────────────────────────────────────────

function ActiveSessions({
  loading,
  sessions,
}: {
  loading: boolean;
  sessions: ActiveTableSession[];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/8 bg-zinc-950/60 p-5"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <Users size={15} className="text-zinc-400" />
          Active tables ({sessions.length})
        </h2>
        <span className="text-[11px] text-zinc-500">Updates live</span>
      </div>

      {loading ? (
        <div className="flex h-20 items-center justify-center text-zinc-500">
          <Loader2 size={16} className="animate-spin" />
        </div>
      ) : sessions.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/8 bg-zinc-900/30 px-4 py-5 text-center text-xs text-zinc-500">
          No tables are ordering right now. Sessions appear here when guests scan a table QR.
        </p>
      ) : (
        <ul className="space-y-2">
          {sessions.map((s) => {
            const badge = statusBadge(s.status);
            const amount = s.total_cents > 0 ? s.total_cents : s.subtotal_cents;
            return (
              <li
                key={s.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-white/8 bg-zinc-900/40 px-3.5 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-100">
                    {s.table_label?.trim() || "Unlabeled table"}
                  </p>
                  <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-zinc-400">
                    <Users size={11} /> {s.memberCount} {s.memberCount === 1 ? "guest" : "guests"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
                      badge.className,
                    )}
                  >
                    {badge.label}
                  </span>
                  <span className="font-mono text-[11px] text-zinc-300">{formatCents(amount)}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </motion.div>
  );
}

function statusBadge(status: PartySession["status"]) {
  switch (status) {
    case "open":
      return {
        label: "Ordering",
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
    default:
      return {
        label: status,
        className:
          "border-zinc-300 bg-zinc-100 text-zinc-800 dark:border-white/10 dark:bg-zinc-800/50 dark:text-zinc-300",
      };
  }
}
