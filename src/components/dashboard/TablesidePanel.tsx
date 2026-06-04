import { useCallback, useEffect, useState, type ComponentType, type MouseEvent, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  QrCode,
  Users,
  Plus,
  Printer,
  RefreshCw,
  ListPlus,
  Hash,
  Pencil,
  Link2,
  X,
  Settings2,
  LayoutGrid,
  Trash2,
} from "lucide-react";
import { TablesideSessionDetailOverlay } from "@/components/dashboard/TablesideSessionDetailOverlay";
import { toast } from "sonner";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { formatCents, type PartySession } from "@/lib/party-session";
import { QRCode } from "@/lib/resolve-react-qr-code";
import { buildTableJoinUrl, downloadTablesideQrCodesPdf } from "@/lib/tableside-qr-pdf";
import {
  DEFAULT_TABLESIDE_QR_PDF_SETTINGS,
  loadTablesideQrPdfSettings,
  saveTablesideQrPdfSettings,
  type TablesideQrPdfCodesPerPage,
  type TablesideQrPdfPageFormat,
  type TablesideQrPdfSettings,
} from "@/lib/tableside-qr-pdf-settings";
import {
  createTablesideTable,
  createTablesideTablesBulk,
  deleteAllTablesideTables,
  deleteTablesideTable,
  listTablesideTables,
  updateTablesideTableName,
  type TablesideTable,
} from "@/lib/tableside-tables";
import { DASH_BTN_ADD, DASH_PRIMARY_CTA, DASH_QR_ICON_SURFACE } from "@/lib/dashboardUi";
import { cancelTablesideSessionAsStaff } from "@/lib/tableside-staff-creds";
import { TABLESIDE_STAFF_DISPLAY_NAME } from "@/lib/party-session";
import { cn } from "@/lib/utils";

const LABELS_KEY_PREFIX = "rasvia.tableside.labels.";
const IMPORT_DISMISS_PREFIX = "rasvia.tableside.import.dismissed.";
const LABEL_MAX = 32;
const MAX_TABLES = 200;
const LIST_POLL_MS = 8000;
const ACTIVE_STATUSES: PartySession["status"][] = ["open", "locked", "paying"];

type TabId = "tables" | "settings";

function labelsStorageKey(restaurantId: number): string {
  return `${LABELS_KEY_PREFIX}${restaurantId}`;
}

function importDismissKey(restaurantId: number): string {
  return `${IMPORT_DISMISS_PREFIX}${restaurantId}`;
}

function normalizeLabel(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, LABEL_MAX);
}

function loadLegacyLabels(restaurantId: number): string[] {
  try {
    const raw = window.localStorage.getItem(labelsStorageKey(restaurantId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const v of parsed) {
      const label = normalizeLabel(String(v));
      if (!label) continue;
      const key = label.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(label);
    }
    return out;
  } catch {
    return [];
  }
}

function clearLegacyLabels(restaurantId: number): void {
  try {
    window.localStorage.removeItem(labelsStorageKey(restaurantId));
  } catch {
    // ignore
  }
}

type ActiveTableItem = {
  key: string;
  name: string;
  quantity: number;
  lineCents: number;
  addedBy: string | null;
};

type ActiveTableMember = {
  name: string;
  role: string;
};

type ActiveTableSession = {
  id: string;
  table_label: string | null;
  tableside_code: string | null;
  status: PartySession["status"];
  total_cents: number;
  subtotal_cents: number;
  created_at: string;
  members: ActiveTableMember[];
  items: ActiveTableItem[];
  liveSubtotalCents: number;
};

function findActiveSessionForTable(
  table: TablesideTable,
  sessions: ActiveTableSession[],
): ActiveTableSession | null {
  const nameKey = table.display_name.trim().toLowerCase();
  return (
    sessions.find(
      (s) =>
        s.tableside_code === table.code ||
        (s.table_label?.trim().toLowerCase() ?? "") === nameKey,
    ) ?? null
  );
}

export default function TablesidePanel() {
  const { restaurantId, isRestaurantOwner, hasPermission, session: authSession } = useAuth();
  const canManageTablesideQr =
    isRestaurantOwner || hasPermission("manage_tableside_qr");

  const staffDisplayName = TABLESIDE_STAFF_DISPLAY_NAME;

  const [tab, setTab] = useState<TabId>("tables");
  const [restaurantName, setRestaurantName] = useState("");
  const [tables, setTables] = useState<TablesideTable[]>([]);
  const [tablesLoading, setTablesLoading] = useState(true);

  const [countInput, setCountInput] = useState("");
  const [labelInput, setLabelInput] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [pdfSettings, setPdfSettings] = useState<TablesideQrPdfSettings>(
    DEFAULT_TABLESIDE_QR_PDF_SETTINGS,
  );

  const [sessions, setSessions] = useState<ActiveTableSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  const [legacyLabels, setLegacyLabels] = useState<string[]>([]);
  const [importDismissed, setImportDismissed] = useState(true);
  const [importing, setImporting] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [adding, setAdding] = useState(false);

  const [editTable, setEditTable] = useState<TablesideTable | null>(null);
  const [editName, setEditName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [lightboxTable, setLightboxTable] = useState<TablesideTable | null>(null);
  const [detailSession, setDetailSession] = useState<ActiveTableSession | null>(null);
  const closeDetailSession = useCallback(() => setDetailSession(null), []);

  const refreshTables = useCallback(async () => {
    if (!restaurantId) {
      setTables([]);
      return;
    }
    const rows = await listTablesideTables(restaurantId);
    setTables(rows);
  }, [restaurantId]);

  useEffect(() => {
    if (!restaurantId) {
      setTables([]);
      setTablesLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setTablesLoading(true);
      try {
        await refreshTables();
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : "Could not load tables.");
        }
      } finally {
        if (!cancelled) setTablesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [restaurantId, refreshTables]);

  useEffect(() => {
    if (!restaurantId) return;
    setPdfSettings(loadTablesideQrPdfSettings(restaurantId));
    setLegacyLabels(loadLegacyLabels(restaurantId));
    try {
      setImportDismissed(window.localStorage.getItem(importDismissKey(restaurantId)) === "1");
    } catch {
      setImportDismissed(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    if (!canManageTablesideQr && tab === "settings") {
      setTab("tables");
    }
  }, [canManageTablesideQr, tab]);

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

  const refreshSessions = useCallback(async () => {
    if (!restaurantId) return;
    const { data, error } = await supabase
      .from("party_sessions")
      .select("id, table_label, tableside_code, status, total_cents, subtotal_cents, created_at")
      .eq("restaurant_id", restaurantId)
      .eq("self_serve", true)
      .in("status", ACTIVE_STATUSES)
      .order("created_at", { ascending: true });
    if (error) return;

    const rows = (data ?? []) as {
      id: string;
      table_label: string | null;
      tableside_code: string | null;
      status: PartySession["status"];
      total_cents: number;
      subtotal_cents: number;
      created_at: string;
    }[];
    const ids = rows.map((r) => r.id);

    const membersBySession = new Map<string, ActiveTableMember[]>();
    const memberNameById = new Map<string, string>();
    const itemsBySession = new Map<string, ActiveTableItem[]>();
    const subtotalBySession = new Map<string, number>();

    if (ids.length > 0) {
      const { data: memberRows } = await supabase
        .from("party_members")
        .select("id, session_id, display_name, role, joined_at, is_tableside_staff")
        .in("session_id", ids)
        .is("left_at", null)
        .order("joined_at", { ascending: true });
      for (const m of (memberRows ?? []) as Record<string, unknown>[]) {
        if (m.is_tableside_staff === true) continue;
        const sid = String(m.session_id);
        const name = ((m.display_name as string) ?? "").trim() || "Guest";
        memberNameById.set(String(m.id), name);
        const list = membersBySession.get(sid) ?? [];
        list.push({ name, role: (m.role as string) ?? "member" });
        membersBySession.set(sid, list);
      }

      const { data: itemRows } = await supabase
        .from("party_items")
        .select("id, session_id, menu_item_id, quantity, added_by_member_id")
        .in("session_id", ids);
      const rawItems = (itemRows ?? []) as Record<string, unknown>[];
      const menuItemIds = Array.from(
        new Set(rawItems.map((it) => it.menu_item_id).filter(Boolean) as (string | number)[]),
      );
      const priceById = new Map<string, { name: string; price: number }>();
      if (menuItemIds.length > 0) {
        const { data: menuRows } = await supabase
          .from("menu_items")
          .select("id, name, price")
          .in("id", menuItemIds);
        for (const mi of (menuRows ?? []) as Record<string, unknown>[]) {
          priceById.set(String(mi.id), {
            name: (mi.name as string) ?? "Item",
            price: Number(mi.price) || 0,
          });
        }
      }
      for (const it of rawItems) {
        const sid = String(it.session_id);
        const qty = Number(it.quantity) || 0;
        const menu = priceById.get(String(it.menu_item_id));
        const lineCents = Math.round((menu?.price ?? 0) * 100) * qty;
        const list = itemsBySession.get(sid) ?? [];
        list.push({
          key: String(it.id),
          name: menu?.name ?? "Item",
          quantity: qty,
          lineCents,
          addedBy: it.added_by_member_id
            ? (memberNameById.get(String(it.added_by_member_id)) ?? null)
            : null,
        });
        itemsBySession.set(sid, list);
        subtotalBySession.set(sid, (subtotalBySession.get(sid) ?? 0) + lineCents);
      }
    }

    setSessions(
      rows.map((r) => ({
        ...r,
        members: membersBySession.get(r.id) ?? [],
        items: itemsBySession.get(r.id) ?? [],
        liveSubtotalCents: subtotalBySession.get(r.id) ?? 0,
      })),
    );
  }, [restaurantId]);

  const handleOverlayTableRemoved = useCallback(async () => {
    await Promise.all([refreshTables(), refreshSessions()]);
  }, [refreshTables, refreshSessions]);

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
    let timer: number | undefined;
    const bump = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        void Promise.all([refreshSessions(), refreshTables()]);
      }, 250);
    };
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
        bump,
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "party_items" }, bump)
      .on("postgres_changes", { event: "*", schema: "public", table: "party_members" }, bump)
      .subscribe();
    return () => {
      if (timer) window.clearTimeout(timer);
      try {
        supabase.removeChannel(channel);
      } catch {
        // ignore
      }
    };
  }, [restaurantId, refreshSessions, refreshTables]);

  const showImportBanner =
    Boolean(restaurantId) &&
    !tablesLoading &&
    tables.length === 0 &&
    legacyLabels.length > 0 &&
    !importDismissed;

  const handleDismissImport = () => {
    if (!restaurantId) return;
    try {
      window.localStorage.setItem(importDismissKey(restaurantId), "1");
    } catch {
      // ignore
    }
    setImportDismissed(true);
  };

  const handleImportLegacy = async () => {
    if (!restaurantId) return;
    setImporting(true);
    try {
      const created = await createTablesideTablesBulk(restaurantId, legacyLabels);
      clearLegacyLabels(restaurantId);
      setLegacyLabels([]);
      setImportDismissed(true);
      await refreshTables();
      toast.success(`Imported ${created.length} table${created.length === 1 ? "" : "s"}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setImporting(false);
    }
  };

  const handleAddTable = async () => {
    if (!restaurantId) return;
    const name = normalizeLabel(addName);
    if (!name) {
      toast.error("Enter a table name.");
      return;
    }
    setAdding(true);
    try {
      await createTablesideTable(restaurantId, name);
      await refreshTables();
      setAddOpen(false);
      setAddName("");
      toast.success("Table added.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add table.");
    } finally {
      setAdding(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editTable) return;
    const name = normalizeLabel(editName);
    if (!name) {
      toast.error("Enter a table name.");
      return;
    }
    setSavingEdit(true);
    try {
      await updateTablesideTableName(editTable.id, name);
      await refreshTables();
      setEditTable(null);
      toast.success("Table renamed.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not rename table.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleGenerateCount = async () => {
    if (!restaurantId) return;
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
    try {
      const created = await createTablesideTablesBulk(restaurantId, generated);
      await refreshTables();
      setCountInput("");
      toast.success(`Added ${created.length} table${created.length === 1 ? "" : "s"}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add tables.");
    }
  };

  const handleAddLabels = async () => {
    if (!restaurantId) return;
    const parts = labelInput
      .split(/[\n,]+/)
      .map(normalizeLabel)
      .filter(Boolean);
    if (parts.length === 0) {
      toast.error("Enter a table name.");
      return;
    }
    try {
      const created = await createTablesideTablesBulk(restaurantId, parts);
      await refreshTables();
      setLabelInput("");
      toast.success(`Added ${created.length} table${created.length === 1 ? "" : "s"}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add tables.");
    }
  };

  const handleDeleteTable = async (table: TablesideTable) => {
    if (!canManageTablesideQr) return;
    const active = findActiveSessionForTable(table, sessions);
    if (
      !window.confirm(
        active
          ? `Delete table "${table.display_name}"? This ends the active order and removes the table from your QR list. Printed codes will stop working.`
          : `Delete table "${table.display_name}"? It will be removed from your QR list. Printed codes will stop working.`,
      )
    ) {
      return;
    }
    try {
      if (active) {
        await cancelTablesideSessionAsStaff(supabase, active.id, staffDisplayName);
      }
      await deleteTablesideTable(table.id);
      await Promise.all([refreshTables(), refreshSessions()]);
      if (detailSession?.id === active?.id) {
        closeDetailSession();
      }
      toast.success(active ? "Table deleted and order ended." : "Table deleted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete table.");
    }
  };

  const handleClearAll = async () => {
    if (!restaurantId || tables.length === 0) return;
    if (
      !window.confirm(
        "Remove all tables? Every printed QR code will stop working. This does not cancel active orders.",
      )
    ) {
      return;
    }
    try {
      await deleteAllTablesideTables(restaurantId);
      await refreshTables();
      toast.success("All tables removed.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not clear tables.");
    }
  };

  const handleDownload = async () => {
    if (!restaurantId) return;
    if (tables.length === 0) {
      toast.error("Add at least one table first.");
      return;
    }
    setDownloading(true);
    try {
      if (restaurantId) saveTablesideQrPdfSettings(restaurantId, pdfSettings);
      await downloadTablesideQrCodesPdf({
        restaurantName,
        tables,
        settings: pdfSettings,
      });
      toast.success("QR sheet downloaded.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not build the QR sheet.");
    } finally {
      setDownloading(false);
    }
  };

  const updatePdfSetting = <K extends keyof TablesideQrPdfSettings>(
    key: K,
    value: TablesideQrPdfSettings[K],
  ) => {
    setPdfSettings((prev) => {
      const next = { ...prev, [key]: value };
      if (restaurantId) saveTablesideQrPdfSettings(restaurantId, next);
      return next;
    });
  };

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
        <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", DASH_QR_ICON_SURFACE)}>
              <QrCode size={22} strokeWidth={1.6} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-zinc-100">Tableside QR</h1>
              <p className="max-w-xl text-sm text-zinc-500">
                Print one fixed QR per table. Guests scan to order and pay — your team runs the food.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {tab === "tables" ? (
              <>
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
                  onClick={() => setAddOpen(true)}
                  className={cn(
                    DASH_PRIMARY_CTA,
                    "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold",
                  )}
                >
                  <Plus size={14} />
                  Add table
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading || tables.length === 0}
                className={cn(
                  DASH_PRIMARY_CTA,
                  "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                {downloading ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
                Download QR sheet
              </button>
            )}
          </div>
        </header>

        {canManageTablesideQr ? (
          <div className="mb-5 inline-flex rounded-lg border border-white/10 bg-zinc-900/50 p-0.5">
            <TabButton active={tab === "tables"} onClick={() => setTab("tables")} icon={LayoutGrid}>
              Tables
            </TabButton>
            <TabButton active={tab === "settings"} onClick={() => setTab("settings")} icon={Settings2}>
              Settings
            </TabButton>
          </div>
        ) : null}

        {showImportBanner ? (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3">
            <p className="text-sm text-zinc-200">
              Import <span className="font-semibold">{legacyLabels.length}</span> table
              {legacyLabels.length === 1 ? "" : "s"} saved in this browser?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDismissImport}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:text-zinc-200"
              >
                Not now
              </button>
              <button
                type="button"
                onClick={handleImportLegacy}
                disabled={importing}
                className={cn(DASH_BTN_ADD, "rounded-lg px-3 py-1.5 text-xs font-semibold")}
              >
                {importing ? <Loader2 size={13} className="animate-spin" /> : null}
                Import
              </button>
            </div>
          </div>
        ) : null}

        {tab === "tables" ? (
          <div className="space-y-5">
            <ActiveSessions
              loading={sessionsLoading}
              sessions={sessions}
              tables={tables}
              onSelectSession={setDetailSession}
            />
            <section className="rounded-2xl border border-white/8 bg-zinc-950/60 p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
                  <QrCode size={15} className="text-zinc-400" />
                  Table QR codes ({tables.length})
                </h2>
              </div>

              {tablesLoading ? (
                <div className="flex h-24 items-center justify-center text-zinc-500">
                  <Loader2 size={18} className="animate-spin" />
                </div>
              ) : tables.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-white/10 bg-zinc-900/30 px-6 py-12 text-center">
                  <QrCode size={26} className="text-zinc-600" />
                  <p className="text-sm font-medium text-zinc-300">No tables yet</p>
                  <p className="max-w-xs text-xs text-zinc-500">
                    Add a table with the button above, or open Settings to add many at once.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  <AnimatePresence initial={false}>
                    {tables.map((t) => (
                      <QrTile
                        key={t.id}
                        table={t}
                        onOpen={() => setLightboxTable(t)}
                        onEdit={() => {
                          setEditTable(t);
                          setEditName(t.display_name);
                        }}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </section>
          </div>
        ) : (
          <div className="space-y-5">
            <TableBuilder
              countInput={countInput}
              onCountChange={setCountInput}
              onGenerateCount={handleGenerateCount}
              labelInput={labelInput}
              onLabelChange={setLabelInput}
              onAddLabels={handleAddLabels}
            />

            <TablesidePdfSettingsForm settings={pdfSettings} onChange={updatePdfSetting} />

            <section className="rounded-2xl border border-white/8 bg-zinc-950/60 p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-100">Manage tables</h2>
                {tables.length > 0 ? (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-[11px] font-semibold text-zinc-500 transition-colors hover:text-red-300"
                  >
                    Clear all
                  </button>
                ) : null}
              </div>
              {tables.length === 0 ? (
                <p className="text-xs text-zinc-500">No tables configured yet.</p>
              ) : (
                <ul className="divide-y divide-white/8 rounded-xl border border-white/8">
                  {tables.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm text-zinc-200"
                    >
                      <span className="min-w-0 truncate font-medium">{t.display_name}</span>
                      <span className="shrink-0 font-mono text-[10px] text-zinc-500">/t/{t.code}</span>
                      <button
                        type="button"
                        onClick={() => void handleDeleteTable(t)}
                        className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-zinc-500 hover:text-red-300"
                      >
                        <Trash2 size={11} />
                        Delete table
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>

      {addOpen ? (
        <Modal title="Add table" onClose={() => setAddOpen(false)}>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Table name
          </label>
          <input
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleAddTable();
              }
            }}
            autoFocus
            placeholder="e.g. Patio 3"
            className="mt-1.5 w-full rounded-lg border border-white/10 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500/40 focus:outline-none"
          />
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setAddOpen(false)}
              className="rounded-lg px-3 py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleAddTable()}
              disabled={adding}
              className={cn(DASH_PRIMARY_CTA, "rounded-lg px-4 py-2 text-xs font-semibold")}
            >
              {adding ? <Loader2 size={14} className="animate-spin" /> : "Add"}
            </button>
          </div>
        </Modal>
      ) : null}

      {editTable ? (
        <Modal title="Rename table" onClose={() => setEditTable(null)}>
          <p className="mb-2 text-xs text-zinc-500">
            The short link <span className="font-mono text-zinc-400">/t/{editTable.code}</span> stays the same.
          </p>
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleSaveEdit();
              }
            }}
            autoFocus
            className="w-full rounded-lg border border-white/10 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 focus:border-amber-500/40 focus:outline-none"
          />
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditTable(null)}
              className="rounded-lg px-3 py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSaveEdit()}
              disabled={savingEdit}
              className={cn(DASH_PRIMARY_CTA, "rounded-lg px-4 py-2 text-xs font-semibold")}
            >
              {savingEdit ? <Loader2 size={14} className="animate-spin" /> : "Save"}
            </button>
          </div>
        </Modal>
      ) : null}

      {lightboxTable ? (
        <QrLightbox table={lightboxTable} onClose={() => setLightboxTable(null)} />
      ) : null}

      {detailSession && restaurantId ? (
        <TablesideSessionDetailOverlay
          sessionId={detailSession.id}
          tableLabel={detailSession.table_label}
          tablesideCode={detailSession.tableside_code}
          restaurantId={restaurantId}
          restaurantName={restaurantName}
          tables={tables}
          onClose={closeDetailSession}
          canManageTables={canManageTablesideQr}
          onTableRemoved={handleOverlayTableRemoved}
        />
      ) : null}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: ComponentType<{ size?: number; className?: string }>;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
        active ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300",
      )}
    >
      <Icon size={13} />
      {children}
    </button>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-950 p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function QrTile({
  table,
  onOpen,
  onEdit,
}: {
  table: TablesideTable;
  onOpen: () => void;
  onEdit: () => void;
}) {
  const url = buildTableJoinUrl(table.code);

  const handleCopy = async (e: MouseEvent) => {
    e.stopPropagation();
    const ok = await copyText(url);
    if (ok) toast.success("Link copied.");
    else toast.error("Could not copy link.");
  };

  return (
    <motion.button
      type="button"
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      onClick={onOpen}
      className="group flex flex-col items-center gap-2 rounded-xl border border-white/8 bg-zinc-900/40 p-3 text-left transition-colors hover:border-amber-500/25"
    >
      <div className="rounded-lg bg-white p-2.5">
        <QRCode value={url} size={112} bgColor="#ffffff" fgColor="#0a0a0a" level="H" />
      </div>
      <div className="w-full min-w-0 text-center">
        <p className="line-clamp-2 break-words text-xs font-semibold text-zinc-200">
          {table.display_name}
        </p>
        <p
          className="mt-1 truncate font-mono text-[10px] leading-snug text-zinc-500"
          title={url}
        >
          {url}
        </p>
      </div>
      <div className="flex w-full gap-1">
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.stopPropagation();
              onEdit();
            }
          }}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-md border border-white/10 bg-zinc-900/60 py-1 text-[10px] font-semibold text-zinc-400 hover:text-zinc-200"
        >
          <Pencil size={10} /> Edit
        </span>
        <span
          role="button"
          tabIndex={0}
          onClick={handleCopy}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleCopy(e as unknown as MouseEvent);
          }}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-md border border-white/10 bg-zinc-900/60 py-1 text-[10px] font-semibold text-zinc-400 hover:text-zinc-200"
        >
          <Link2 size={10} /> Copy
        </span>
      </div>
    </motion.button>
  );
}

function QrLightbox({ table, onClose }: { table: TablesideTable; onClose: () => void }) {
  const url = buildTableJoinUrl(table.code);

  const handleCopy = async () => {
    const ok = await copyText(url);
    if (ok) toast.success("Link copied.");
    else toast.error("Could not copy link.");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative flex w-full max-w-[31rem] flex-col items-center gap-5 rounded-2xl border border-white/10 bg-zinc-950 p-8"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-zinc-500 hover:text-zinc-300"
          aria-label="Close"
        >
          <X size={20} />
        </button>
        <div className="rounded-xl bg-white p-5">
          <QRCode value={url} size={286} bgColor="#ffffff" fgColor="#0a0a0a" level="H" />
        </div>
        <div className="w-full min-w-0 px-1 text-center">
          <p className="text-xl font-semibold text-zinc-100">{table.display_name}</p>
          <p className="mt-1.5 break-all font-mono text-sm text-zinc-500">{url}</p>
        </div>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className={cn(DASH_BTN_ADD, "w-full justify-center rounded-lg py-2 text-xs font-semibold")}
        >
          <Link2 size={13} /> Copy link
        </button>
      </div>
    </div>
  );
}

function TablesidePdfSettingsForm({
  settings,
  onChange,
}: {
  settings: TablesideQrPdfSettings;
  onChange: <K extends keyof TablesideQrPdfSettings>(key: K, value: TablesideQrPdfSettings[K]) => void;
}) {
  return (
    <section className="rounded-2xl border border-white/8 bg-zinc-950/60 p-5">
      <h2 className="text-sm font-semibold text-zinc-100">Print layout</h2>
      <p className="mt-1 text-xs text-zinc-500">Customize the downloadable QR sheet.</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Sheet title
          </span>
          <input
            value={settings.sheetTitle}
            onChange={(e) => onChange("sheetTitle", e.target.value)}
            placeholder="Restaurant name"
            className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100"
          />
        </label>
        <label className="block">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Subtitle under QR
          </span>
          <input
            value={settings.subtitle}
            onChange={(e) => onChange("subtitle", e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100"
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap gap-4">
        <label className="text-xs text-zinc-400">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Per page
          </span>
          <select
            value={settings.codesPerPage}
            onChange={(e) =>
              onChange("codesPerPage", Number(e.target.value) as TablesideQrPdfCodesPerPage)
            }
            className="rounded-lg border border-white/10 bg-zinc-900/60 px-2 py-1.5 text-sm text-zinc-100"
          >
            <option value={4}>4</option>
            <option value={6}>6</option>
            <option value={9}>9</option>
          </select>
        </label>
        <label className="text-xs text-zinc-400">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Paper
          </span>
          <select
            value={settings.pageFormat}
            onChange={(e) => onChange("pageFormat", e.target.value as TablesideQrPdfPageFormat)}
            className="rounded-lg border border-white/10 bg-zinc-900/60 px-2 py-1.5 text-sm text-zinc-100"
          >
            <option value="a4">A4</option>
            <option value="letter">Letter</option>
          </select>
        </label>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        <label className="flex items-center gap-2 text-xs text-zinc-300">
          <input
            type="checkbox"
            checked={settings.showCenterLogo}
            onChange={(e) => onChange("showCenterLogo", e.target.checked)}
            className="rounded border-white/20"
          />
          Center Rasvia logo on QR
        </label>
        <label className="flex items-center gap-2 text-xs text-zinc-300">
          <input
            type="checkbox"
            checked={settings.showShortUrl}
            onChange={(e) => onChange("showShortUrl", e.target.checked)}
            className="rounded border-white/20"
          />
          Print short link under each QR
        </label>
      </div>
    </section>
  );
}

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
      <h2 className="text-sm font-semibold text-zinc-100">Add tables in bulk</h2>
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

function ActiveSessions({
  loading,
  sessions,
  tables,
  onSelectSession,
}: {
  loading: boolean;
  sessions: ActiveTableSession[];
  tables: TablesideTable[];
  onSelectSession: (session: ActiveTableSession) => void;
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
        <ul className="space-y-2.5">
          {sessions.map((s) => (
            <ActiveSessionCard
              key={s.id}
              session={s}
              tableCode={
                s.tableside_code ??
                tables.find(
                  (t) =>
                    t.display_name.trim().toLowerCase() === (s.table_label ?? "").trim().toLowerCase(),
                )?.code ??
                null
              }
              onSelect={() => onSelectSession(s)}
            />
          ))}
        </ul>
      )}
    </motion.div>
  );
}

function ActiveSessionCard({
  session: s,
  tableCode,
  onSelect,
}: {
  session: ActiveTableSession;
  tableCode: string | null;
  onSelect: () => void;
}) {
  const badge = statusBadge(s.status);
  const amountCents =
    s.status === "open"
      ? s.liveSubtotalCents
      : s.total_cents > 0
        ? s.total_cents
        : s.subtotal_cents > 0
          ? s.subtotal_cents
          : s.liveSubtotalCents;

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className="w-full rounded-xl border border-white/8 bg-zinc-900/40 p-3 text-left transition-colors hover:border-amber-500/30 hover:bg-zinc-900/70"
      >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-zinc-100">
            {s.table_label?.trim() || "Unlabeled table"}
          </p>
          <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-zinc-400">
            <Users size={11} /> {s.members.length} {s.members.length === 1 ? "guest" : "guests"}
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
          <span className="font-mono text-[11px] font-semibold text-zinc-200">{formatCents(amountCents)}</span>
        </div>
      </div>
      {tableCode ? (
        <p className="mt-1.5 font-mono text-[10px] text-zinc-500">/t/{tableCode} · tap for details</p>
      ) : (
        <p className="mt-1.5 text-[10px] text-zinc-500">Tap for table details</p>
      )}

      {s.members.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {s.members.map((m, i) => (
            <span
              key={`${m.name}-${i}`}
              className={cn(
                "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium",
                m.role === "host"
                  ? "border border-amber-500/30 bg-amber-500/[0.08] text-amber-300"
                  : "border border-white/8 bg-zinc-800/60 text-zinc-300",
              )}
            >
              {m.name}
              {m.role === "host" ? " · host" : ""}
            </span>
          ))}
        </div>
      )}

      <div className="mt-2 border-t border-white/8 pt-2">
        {s.items.length === 0 ? (
          <p className="text-[11px] italic text-zinc-500">No items yet</p>
        ) : (
          <ul className="space-y-1">
            {s.items.map((it) => (
              <li key={it.key} className="flex items-baseline justify-between gap-2 text-[11px]">
                <span className="min-w-0 truncate text-zinc-300">
                  <span className="tabular-nums text-zinc-500">{it.quantity}×</span> {it.name}
                  {it.addedBy ? <span className="text-zinc-600"> · {it.addedBy}</span> : null}
                </span>
                <span className="shrink-0 font-mono text-zinc-400">{formatCents(it.lineCents)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      </button>
    </li>
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
