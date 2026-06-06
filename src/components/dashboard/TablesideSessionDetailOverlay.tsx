import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Copy,
  ExternalLink,
  Link2,
  Loader2,
  Lock,
  Minus,
  Plus,
  Split,
  Trash2,
  Unlock,
  ChevronDown,
  Crown,
  UserMinus,
  UtensilsCrossed,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/lib/supabase";
import { buildTableJoinUrl } from "@/lib/tableside-qr-pdf";
import { subscribeToParty } from "@/lib/party-realtime";
import {
  fetchSnapshot,
  formatCents,
  assignItemPayer,
  cancelSession,
  hostAddItemFor,
  hostRemoveMember,
  hostReassignItemMember,
  hostTransferHost,
  lockSession,
  removeItem,
  setItemSplit,
  setPaymentMode,
  unlockSession,
  updateItemQuantity,
  type PartyCreds,
  type PartyItem,
  type PartyMember,
  type PartySession,
  isTablesideStaffMember,
  partyGuestMembers,
  TABLESIDE_STAFF_DISPLAY_NAME,
  type PartySnapshot,
  type PaymentMode,
} from "@/lib/party-session";
import { ensureTablesideStaffCreds } from "@/lib/tableside-staff-creds";
import { deleteTablesideTable, type TablesideTable } from "@/lib/tableside-tables";
import { DASH_BTN_ADD, DASH_PRIMARY_CTA } from "@/lib/dashboardUi";
import { cn } from "@/lib/utils";

type MenuRow = {
  id: number;
  name: string;
  price: number;
  category: string | null;
};

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
    case "submitted":
      return {
        label: "Submitted",
        className:
          "border-zinc-400/40 bg-zinc-100 text-zinc-700 dark:border-white/15 dark:bg-zinc-800/60 dark:text-zinc-400",
      };
    default:
      return {
        label: status,
        className:
          "border-zinc-300 bg-zinc-100 text-zinc-800 dark:border-white/10 dark:bg-zinc-800/50 dark:text-zinc-300",
      };
  }
}

function lineCents(item: PartyItem): number {
  const price = Number(item.menu_item?.price ?? 0);
  return Math.round(price * 100) * (item.quantity ?? 1);
}

/** Match Postgres ledger: equal split with remainder cents on first payers. */
function splitShareCents(totalCents: number, payerCount: number, payerIndex: number): number {
  if (payerCount <= 0 || totalCents <= 0) return 0;
  const base = Math.floor(totalCents / payerCount);
  const remainder = totalCents - base * payerCount;
  return base + (payerIndex < remainder ? 1 : 0);
}

type CartLineEntry = {
  item: PartyItem;
  shareCents: number;
  isSplitShare: boolean;
  splitCount: number;
};

function activeMembers(members: PartyMember[]): PartyMember[] {
  return members.filter((m) => !m.left_at);
}

function payerMemberIds(item: PartyItem, members: PartyMember[]): string[] {
  const active = activeMembers(members);
  const activeIds = new Set(active.map((m) => m.id));
  const splitIds = (item.split_member_ids ?? []).filter((id) => activeIds.has(id));
  if (splitIds.length >= 1) return splitIds;
  if (item.added_by_member_id && activeIds.has(item.added_by_member_id)) {
    return [item.added_by_member_id];
  }
  return active.length > 0 ? [active[0].id] : [];
}

function buildCartByGuest(members: PartyMember[], items: PartyItem[]) {
  const active = activeMembers(members);
  const linesByMember = new Map<string, CartLineEntry[]>();
  for (const m of active) {
    linesByMember.set(m.id, []);
  }

  for (const it of items) {
    const payers = payerMemberIds(it, members);
    if (payers.length === 0) continue;
    const total = lineCents(it);
    const isSplit = payers.length >= 2;
    payers.forEach((memberId, index) => {
      const list = linesByMember.get(memberId);
      if (!list) return;
      list.push({
        item: it,
        shareCents: splitShareCents(total, payers.length, index),
        isSplitShare: isSplit,
        splitCount: payers.length,
      });
    });
  }

  return active
    .map((m) => {
      const lines = linesByMember.get(m.id) ?? [];
      return {
        memberId: m.id,
        member: m,
        label: m.display_name,
        lines,
        cents: lines.reduce((sum, line) => sum + line.shareCents, 0),
        ownedItems: items.filter((it) => it.added_by_member_id === m.id),
      };
    })
    .filter((g) => g.lines.length > 0);
}

function memberLedgerCents(members: PartyMember[], items: PartyItem[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const m of activeMembers(members)) {
    totals.set(m.id, 0);
  }
  for (const it of items) {
    const payers = payerMemberIds(it, members);
    const total = lineCents(it);
    payers.forEach((memberId, index) => {
      totals.set(memberId, (totals.get(memberId) ?? 0) + splitShareCents(total, payers.length, index));
    });
  }
  return totals;
}

function memberById(members: PartyMember[], id: string | null | undefined): PartyMember | undefined {
  if (!id) return undefined;
  return members.find((m) => m.id === id);
}

const MENU_DROPDOWN_LIMIT = 20;

const GUEST_CART_GROUP_STYLES = [
  "border-l-[5px] border-l-emerald-400/80 bg-emerald-500/[0.12]",
  "border-l-[5px] border-l-sky-400/80 bg-sky-500/[0.12]",
  "border-l-[5px] border-l-violet-400/80 bg-violet-500/[0.12]",
  "border-l-[5px] border-l-amber-400/80 bg-amber-500/[0.12]",
  "border-l-[5px] border-l-rose-400/80 bg-rose-500/[0.12]",
  "border-l-[5px] border-l-cyan-400/80 bg-cyan-500/[0.12]",
] as const;

function MenuItemSearchDropdown({
  menu,
  disabled,
  onPick,
}: {
  menu: MenuRow[];
  disabled?: boolean;
  onPick: (menuItemId: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return menu
      .filter((m) => m.name.toLowerCase().includes(q))
      .slice(0, MENU_DROPDOWN_LIMIT);
  }, [menu, query]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const handlePick = (id: number) => {
    onPick(id);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1">
      <div
        className={cn(
          "flex items-center rounded-lg border border-white/10 bg-zinc-950",
          open && "ring-1 ring-amber-500/30",
          disabled && "opacity-50",
        )}
      >
        <input
          type="text"
          value={query}
          disabled={disabled}
          placeholder="Search menu item…"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="min-w-0 flex-1 bg-transparent px-2.5 py-2 text-xs text-zinc-100 outline-none placeholder:text-zinc-500"
        />
        <button
          type="button"
          disabled={disabled}
          aria-expanded={open}
          aria-label="Toggle menu search"
          onClick={() => setOpen((v) => !v)}
          className="shrink-0 border-l border-white/10 px-2 py-2 text-zinc-500 hover:text-zinc-300"
        >
          <ChevronDown
            size={14}
            className={cn("transition-transform", open && "rotate-180")}
          />
        </button>
      </div>

      {open ? (
        <ul
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-[60] max-h-48 overflow-y-auto rounded-lg border border-white/10 bg-zinc-950 py-1 shadow-xl"
          role="listbox"
        >
          {query.trim() === "" ? (
            <li className="px-3 py-2 text-xs text-zinc-500">Type to search the menu</li>
          ) : results.length === 0 ? (
            <li className="px-3 py-2 text-xs italic text-zinc-500">No items found</li>
          ) : (
            results.map((m) => (
              <li key={m.id} role="option">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => handlePick(m.id)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs text-zinc-200 hover:bg-white/5 disabled:opacity-50"
                >
                  <span className="min-w-0 truncate">{m.name}</span>
                  <span className="shrink-0 font-mono text-zinc-500">
                    ${Number(m.price).toFixed(2)}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}

export function TablesideSessionDetailOverlay({
  sessionId,
  tableLabel,
  tablesideCode,
  restaurantId,
  restaurantName,
  tables,
  onClose,
  canManageTables = false,
  onTableRemoved,
}: {
  sessionId: string;
  tableLabel: string | null;
  tablesideCode: string | null;
  restaurantId: number;
  restaurantName: string;
  tables: TablesideTable[];
  onClose: () => void;
  canManageTables?: boolean;
  onTableRemoved?: () => void | Promise<void>;
}) {
  const [snapshot, setSnapshot] = useState<PartySnapshot | null>(null);
  const [creds, setCreds] = useState<PartyCreds | null>(null);
  const [menu, setMenu] = useState<MenuRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [addForMemberId, setAddForMemberId] = useState<string>("");
  const [splitItemId, setSplitItemId] = useState<string | null>(null);
  const [splitMemberIds, setSplitMemberIds] = useState<string[]>([]);
  const [assignGroupId, setAssignGroupId] = useState<string | null>(null);
  const [endOrderOpen, setEndOrderOpen] = useState(false);
  const [endOrderReason, setEndOrderReason] = useState("");

  const tableRecord = useMemo(() => {
    if (tablesideCode) {
      const byCode = tables.find((t) => t.code === tablesideCode);
      if (byCode) return byCode;
    }
    const label = (tableLabel ?? "").trim().toLowerCase();
    if (!label) return null;
    return (
      tables.find((t) => t.display_name.trim().toLowerCase() === label) ?? null
    );
  }, [tables, tablesideCode, tableLabel]);

  const tableCode = tablesideCode ?? tableRecord?.code ?? null;
  const joinUrl = tableCode ? buildTableJoinUrl(tableCode) : null;
  const guestJoinUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/join?id=${encodeURIComponent(sessionId)}`
      : `/join?id=${sessionId}`;

  const session = snapshot?.session;
  const members = snapshot?.members ?? [];
  const items = snapshot?.items ?? [];
  const editable = session?.status === "open" || session?.status === "locked";
  const orderFinished =
    session?.status === "submitted" ||
    session?.status === "completed" ||
    session?.status === "cancelled";
  const controlsDisabled = busy || orderFinished;
  const canChangePaymentMode =
    !orderFinished &&
    (session?.status === "locked" || session?.status === "paying");
  const paymentMode: PaymentMode = (() => {
    const m = session?.payment_mode;
    if (m === "split") return "equal_split";
    if (m === "assign") return "assigned";
    return (m as PaymentMode) ?? "per_person";
  })();

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setCreds(null);
    setSnapshot(null);

    (async () => {
      try {
        const snap = await fetchSnapshot(supabase, sessionId);
        if (cancelled) return;
        setSnapshot(snap);
        setAddForMemberId((prev) => {
          if (prev) return prev;
          const guests = partyGuestMembers(snap.members);
          const firstGuest =
            guests.find((m) => m.role === "member") ?? guests[0];
          return firstGuest?.id ?? "";
        });
        const { data: menuRows } = await supabase
          .from("menu_items")
          .select("id, name, price, category, in_stock, is_available")
          .eq("restaurant_id", restaurantId)
          .order("category", { ascending: true })
          .order("name", { ascending: true });
        if (cancelled) return;
        const available = (menuRows ?? []).filter(
          (r: { in_stock?: boolean; is_available?: boolean }) =>
            (r.is_available ?? true) && (r.in_stock ?? true),
        ) as MenuRow[];
        setMenu(available);

        try {
          const c = await ensureTablesideStaffCreds(
            supabase,
            sessionId,
            TABLESIDE_STAFF_DISPLAY_NAME,
          );
          if (!cancelled) setCreds(c);
        } catch (err) {
          if (!cancelled) {
            toast.error(
              err instanceof Error
                ? err.message
                : "Could not connect staff controls for this table.",
            );
          }
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(
            err instanceof Error ? err.message : "Could not load table order.",
          );
          onCloseRef.current();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId, restaurantId]);

  useEffect(() => {
    if (!sessionId || loading) return;
    const handle = subscribeToParty(
      supabase,
      sessionId,
      (snap) => setSnapshot(snap),
      (err) => toast.error(err.message),
    );
    return () => handle.unsubscribe();
  }, [sessionId, loading]);

  const ledgerByMember = useMemo(
    () => memberLedgerCents(members, items),
    [members, items],
  );

  const perGuest = useMemo(() => {
    return partyGuestMembers(members).map((m) => ({
      member: m,
      cents: ledgerByMember.get(m.id) ?? 0,
    }));
  }, [members, ledgerByMember]);

  const cartByGuest = useMemo(
    () => buildCartByGuest(partyGuestMembers(members), items),
    [members, items],
  );

  const guestCount = useMemo(() => partyGuestMembers(members).length, [members]);

  const guestsForList = useMemo(() => {
    const active = partyGuestMembers(members);
    const byJoined = (a: PartyMember, b: PartyMember) =>
      new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
    const hosts = active.filter((m) => m.role === "host").sort(byJoined);
    const rest = active.filter((m) => m.role !== "host").sort(byJoined);
    return [...hosts, ...rest];
  }, [members]);

  const liveSubtotal = useMemo(
    () => items.reduce((sum, it) => sum + lineCents(it), 0),
    [items],
  );

  const resolveStaffCreds = useCallback(async (): Promise<PartyCreds | null> => {
    if (creds) return creds;
    try {
      const c = await ensureTablesideStaffCreds(
        supabase,
        sessionId,
        TABLESIDE_STAFF_DISPLAY_NAME,
      );
      setCreds(c);
      return c;
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not connect staff controls.",
      );
      return null;
    }
  }, [creds, sessionId]);

  const runHost = useCallback(
    async (fn: (activeCreds: PartyCreds) => Promise<void>) => {
      const activeCreds = await resolveStaffCreds();
      if (!activeCreds) return;
      setBusy(true);
      try {
        await fn(activeCreds);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Action failed.");
      } finally {
        setBusy(false);
      }
    },
    [resolveStaffCreds],
  );

  const handleAddMenuItem = (menuItemId: number) => {
    if (!addForMemberId) return;
    void runHost(async (activeCreds) => {
      await hostAddItemFor(supabase, activeCreds, addForMemberId, menuItemId, 1);
      toast.success("Item added.");
    });
  };

  const handleMakeHost = (target: PartyMember) => {
    if (target.role === "host") return;
    if (
      !window.confirm(
        `Make ${target.display_name} the host? They can lock the cart and pay.`,
      )
    ) {
      return;
    }
    void runHost(async (activeCreds) => {
      await hostTransferHost(supabase, activeCreds, target.id);
      toast.success(`${target.display_name} is now the host.`);
    });
  };

  const handleRemoveGuest = (target: PartyMember) => {
    if (isTablesideStaffMember(target)) return;
    if (creds && target.id === creds.memberId) {
      toast.error("You cannot remove yourself from the guest list.");
      return;
    }
    if (
      !window.confirm(
        `Remove ${target.display_name} from this table order? Their unpaid items will be cleared while the cart is open.`,
      )
    ) {
      return;
    }
    void runHost(async (activeCreds) => {
      await hostRemoveMember(supabase, activeCreds, target.id);
      toast.success(`${target.display_name} removed from the group.`);
    });
  };

  const hasActiveOrder =
    Boolean(session) &&
    session!.status !== "cancelled" &&
    session!.status !== "completed" &&
    session!.status !== "submitted";

  const confirmEndOrder = useCallback(async () => {
    if (!hasActiveOrder) {
      toast.error("No active order to end.");
      return;
    }
    setBusy(true);
    try {
      const activeCreds = await resolveStaffCreds();
      if (!activeCreds) return;
      const reason = endOrderReason.trim();
      await cancelSession(supabase, activeCreds, reason ? { reason } : undefined);
      toast.success("Order ended. Guests were notified.");
      setEndOrderOpen(false);
      setEndOrderReason("");
      await onTableRemoved?.();
      onCloseRef.current();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not end order.");
    } finally {
      setBusy(false);
    }
  }, [hasActiveOrder, resolveStaffCreds, endOrderReason, onTableRemoved]);

  const handleDeleteTable = useCallback(async () => {
    if (!canManageTables || !tableRecord) return;
    const name = tableRecord.display_name;
    if (
      !window.confirm(
        `Delete table "${name}"? This removes it from your QR list and ends any active order. Printed codes for this table will stop working.`,
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      if (hasActiveOrder) {
        const activeCreds = await resolveStaffCreds();
        if (!activeCreds) return;
        await cancelSession(supabase, activeCreds);
      }
      await deleteTablesideTable(tableRecord.id);
      toast.success(
        hasActiveOrder ? "Table deleted and order ended." : "Table deleted.",
      );
      await onTableRemoved?.();
      onCloseRef.current();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete table.");
    } finally {
      setBusy(false);
    }
  }, [
    canManageTables,
    tableRecord,
    hasActiveOrder,
    resolveStaffCreds,
    onTableRemoved,
  ]);

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied.`);
    } catch {
      toast.error("Could not copy.");
    }
  };

  const badge = session ? statusBadge(session.status) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 px-4 pb-8 pt-28 sm:pt-[9.5rem]"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative flex max-h-[min(90vh,calc(100vh-10rem))] w-[75vw] min-w-[320px] max-w-[1100px] shrink-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/8 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/90">
              Table order
            </p>
            <h3 className="truncate text-lg font-semibold text-zinc-100">
              {(tableLabel?.trim() || "Table") + " · " + (restaurantName || "Restaurant")}
            </h3>
            {session && badge ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
                    badge.className,
                  )}
                >
                  {badge.label}
                </span>
                <span className="font-mono text-sm font-semibold text-zinc-200">
                  {formatCents(
                    session.status === "open" ? liveSubtotal : session.total_cents || liveSubtotal,
                  )}
                </span>
                <span className="text-xs text-zinc-500">
                  {guestCount} guest{guestCount === 1 ? "" : "s"} · {items.length} item
                  {items.length === 1 ? "" : "s"}
                </span>
                <span className="text-[10px] text-emerald-400/90">Live</span>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-zinc-500 hover:text-zinc-300"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center py-20 text-zinc-500">
            <Loader2 size={24} className="animate-spin" />
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <section className="border-b border-white/8 px-5 py-4">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Quick actions
              </h4>
              {orderFinished ? (
                <p className="mb-2 text-xs text-zinc-500">
                  Order {session?.status === "cancelled" ? "ended" : "submitted"} — actions are
                  read-only.
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-2">
                {joinUrl ? (
                  <button
                    type="button"
                    disabled={controlsDisabled}
                    onClick={() => void copy(joinUrl, "Table link")}
                    className={cn(
                      DASH_BTN_ADD,
                      "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40",
                    )}
                  >
                    <Copy size={12} /> Copy table link
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={controlsDisabled}
                  onClick={() => void copy(guestJoinUrl, "Join link")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-zinc-900/60 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Link2 size={12} /> Copy join link
                </button>
                {orderFinished ? (
                  <span className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-white/10 bg-zinc-900/60 px-3 py-1.5 text-xs font-semibold text-zinc-500 opacity-40">
                    <ExternalLink size={12} /> Open live order
                  </span>
                ) : (
                  <a
                    href={guestJoinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-zinc-900/60 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:text-zinc-100"
                  >
                    <ExternalLink size={12} /> Open live order
                  </a>
                )}
                {hasActiveOrder ? (
                  <button
                    type="button"
                    disabled={controlsDisabled}
                    onClick={() => setEndOrderOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 size={12} />
                    End order
                  </button>
                ) : null}
                {canManageTables && tableRecord ? (
                  <button
                    type="button"
                    disabled={controlsDisabled}
                    onClick={() => void handleDeleteTable()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 size={12} />
                    Delete table
                  </button>
                ) : null}
              </div>
            </section>

            {creds ? (
              <p className="border-b border-white/8 px-5 py-3 text-xs text-zinc-400">
                You&apos;re managing this table as{" "}
                <span className="font-semibold text-zinc-200">Staff</span> (not
                listed as a guest).
              </p>
            ) : null}
            {guestsForList.length > 0 ? (
              <section className="border-b border-white/8 px-5 py-4">
                <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  <Users size={12} /> Guests in group
                </h4>
                <p className="mb-2 text-xs text-zinc-500">
                  One host per order. Transfer host to hand off checkout.
                </p>
                <ul className="space-y-2">
                  {guestsForList.map((m) => {
                    const isHost = m.role === "host";
                    return (
                    <li
                      key={m.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-zinc-900/40 px-3 py-2"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        {isHost ? (
                          <Crown size={14} className="shrink-0 text-amber-400" />
                        ) : null}
                        <span className="truncate text-sm font-semibold text-zinc-100">
                          {m.display_name}
                        </span>
                        {isHost ? (
                          <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200">
                            Host
                          </span>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                        {editable && !isHost ? (
                            <button
                              type="button"
                              disabled={controlsDisabled}
                              onClick={() => handleMakeHost(m)}
                              className="rounded-lg border border-white/15 px-2 py-1 text-[10px] font-semibold text-zinc-300 hover:text-zinc-100 disabled:opacity-50"
                            >
                              Make host
                            </button>
                        ) : null}
                        {editable ? (
                          <button
                            type="button"
                            disabled={controlsDisabled}
                            onClick={() => handleRemoveGuest(m)}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-500/35 bg-red-500/10 px-2 py-1 text-[10px] font-semibold text-red-300 hover:bg-red-500/15 disabled:opacity-50"
                          >
                            <UserMinus size={11} /> Remove
                          </button>
                        ) : null}
                      </div>
                    </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}

            {editable ? (
              <section className="border-b border-white/8 px-5 py-4">
                <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  <UtensilsCrossed size={12} /> Add item for guest
                </h4>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                  <select
                    value={addForMemberId}
                    onChange={(e) => setAddForMemberId(e.target.value)}
                    className="shrink-0 rounded-lg border border-white/10 bg-zinc-950 px-2 py-2 text-xs text-zinc-100 sm:w-36"
                  >
                    {partyGuestMembers(members).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.display_name}
                      </option>
                    ))}
                  </select>
                  <MenuItemSearchDropdown
                    menu={menu}
                    disabled={controlsDisabled || !addForMemberId}
                    onPick={handleAddMenuItem}
                  />
                </div>
              </section>
            ) : null}

            <section className="border-b border-white/8">
              <div className="flex items-center justify-between px-5 py-3">
                <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  <Users size={12} /> Live cart
                </h4>
                <div className="flex gap-2">
                  {session?.status === "open" ? (
                    <button
                      type="button"
                      disabled={controlsDisabled || items.length === 0}
                      onClick={() =>
                        void runHost(async (activeCreds) => {
                          await lockSession(supabase, activeCreds);
                          toast.success("Cart locked — guests can pay.");
                        })
                      }
                      className={cn(
                        DASH_PRIMARY_CTA,
                        "inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50",
                      )}
                    >
                      <Lock size={12} /> Lock cart
                    </button>
                  ) : null}
                  {session?.status === "locked" ? (
                    <button
                      type="button"
                      disabled={controlsDisabled}
                      onClick={() =>
                        void runHost(async (activeCreds) => {
                          await unlockSession(supabase, activeCreds);
                          toast.success("Cart unlocked.");
                        })
                      }
                      className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-zinc-900/60 px-3 py-1.5 text-xs font-semibold text-zinc-300 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Unlock size={12} /> Unlock
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="max-h-[min(40vh,320px)] overflow-y-auto px-5 pb-4">
                {items.length === 0 ? (
                  <p className="text-xs italic text-zinc-500">No items yet.</p>
                ) : (
                  <ul className="space-y-4">
                    {cartByGuest.map((group, groupIndex) => {
                      const groupStyle =
                        GUEST_CART_GROUP_STYLES[groupIndex % GUEST_CART_GROUP_STYLES.length];
                      return (
                        <li
                          key={group.memberId}
                          className={cn(
                            "rounded-xl border border-white/10 py-3 pl-3 pr-3 shadow-sm",
                            groupStyle,
                          )}
                        >
                          <div className="mb-2 flex items-center justify-between gap-2 border-b border-white/10 pb-2">
                            <span className="text-sm font-bold tracking-tight text-zinc-50">
                              {group.label}
                              {group.member?.role === "host" ? (
                                <span className="ml-1.5 text-[10px] font-semibold uppercase text-zinc-500">
                                  host
                                </span>
                              ) : null}
                            </span>
                            <div className="flex shrink-0 items-center gap-2">
                              {editable ? (
                                <button
                                  type="button"
                                  disabled={controlsDisabled}
                                  onClick={() => {
                                    const next =
                                      assignGroupId === group.memberId
                                        ? null
                                        : group.memberId;
                                    setAssignGroupId(next);
                                    if (next) setSplitItemId(null);
                                  }}
                                  className={cn(
                                    "rounded-lg border px-2 py-1 text-[10px] font-semibold",
                                    assignGroupId === group.memberId
                                      ? "border-amber-500/50 bg-amber-500/20 text-amber-100"
                                      : "border-white/15 bg-zinc-900/80 text-zinc-400 hover:text-zinc-200",
                                  )}
                                >
                                  Assign?
                                </button>
                              ) : null}
                              <span className="font-mono text-base font-bold text-zinc-100">
                                {formatCents(group.cents)}
                              </span>
                            </div>
                          </div>

                          {assignGroupId === group.memberId ? (
                            <div className="mb-2 rounded-lg border border-dashed border-amber-500/25 bg-amber-500/[0.06] p-2.5">
                              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                                Assign items to guests
                              </p>
                              <ul className="space-y-2">
                                {group.ownedItems.map((it) => (
                                  <li
                                    key={it.id}
                                    className="rounded-md border border-white/10 bg-zinc-950/60 px-2 py-1.5"
                                  >
                                    <p className="mb-1 text-sm font-semibold text-zinc-100">
                                      {it.quantity}× {it.menu_item?.name ?? "Item"}
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                      {members.map((m) => {
                                        const active = it.added_by_member_id === m.id;
                                        return (
                                          <button
                                            key={m.id}
                                            type="button"
                                            disabled={controlsDisabled || active}
                                            onClick={() =>
                                              void runHost(async (activeCreds) => {
                                                await hostReassignItemMember(
                                                  supabase,
                                                  activeCreds,
                                                  it.id,
                                                  m.id,
                                                );
                                                toast.success(
                                                  `Assigned to ${m.display_name}.`,
                                                );
                                              })
                                            }
                                            className={cn(
                                              "rounded-md border px-2 py-0.5 text-[10px] font-semibold",
                                              active
                                                ? "border-amber-500/40 bg-amber-500/15 text-amber-200"
                                                : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-200",
                                            )}
                                          >
                                            {m.display_name}
                                          </button>
                                        );
                                      })}
                                    </div>
                                    {canChangePaymentMode && paymentMode === "assigned" ? (
                                      <select
                                        value={it.assigned_payer_id ?? ""}
                                        disabled={controlsDisabled}
                                        onChange={(e) =>
                                          void runHost(async (activeCreds) => {
                                            await assignItemPayer(
                                              supabase,
                                              activeCreds,
                                              it.id,
                                              e.target.value || null,
                                            );
                                          })
                                        }
                                        className="mt-1.5 w-full rounded-lg border border-white/10 bg-zinc-950 px-2 py-1 text-[10px] text-zinc-100"
                                      >
                                        <option value="">Who pays…</option>
                                        {members.map((m) => (
                                          <option key={m.id} value={m.id}>
                                            {m.display_name}
                                          </option>
                                        ))}
                                      </select>
                                    ) : null}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}

                          <ul className="space-y-1.5">
                            {group.lines.map((line) => {
                              const it = line.item;
                              const isSplitOpen = splitItemId === it.id;
                              const splitIds = it.split_member_ids ?? [];
                              const cartCtrl =
                                "rounded-lg border px-2 py-1 text-[10px] font-semibold border-white/15";
                              return (
                                <li
                                  key={`${it.id}-${group.memberId}`}
                                  className="rounded-md border border-white/8 bg-zinc-950/55 px-2 py-1.5"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                      <p className="text-base font-semibold leading-snug text-zinc-50">
                                        {it.quantity}× {it.menu_item?.name ?? "Item"}
                                      </p>
                                      {line.isSplitShare ? (
                                        <p className="text-[10px] text-amber-300/90">
                                          Split {line.splitCount} ways · your share
                                        </p>
                                      ) : null}
                                    </div>
                                    <span className="shrink-0 font-mono text-base font-bold text-zinc-100">
                                      {formatCents(line.shareCents)}
                                    </span>
                                  </div>

                                  {editable ? (
                                    <div className="mt-1.5 flex items-center justify-end gap-1.5">
                                      <div
                                        className={cn(
                                          cartCtrl,
                                          "inline-flex items-center bg-zinc-900/80",
                                        )}
                                      >
                                        <button
                                          type="button"
                                          disabled={controlsDisabled}
                                          onClick={() =>
                                            void runHost(async (activeCreds) => {
                                              const q = (it.quantity ?? 1) - 1;
                                              if (q <= 0)
                                                await removeItem(supabase, activeCreds, it.id);
                                              else
                                                await updateItemQuantity(
                                                  supabase,
                                                  activeCreds,
                                                  it.id,
                                                  q,
                                                );
                                            })
                                          }
                                          className="px-1.5 py-1 text-zinc-400 hover:text-zinc-200"
                                          aria-label="Decrease quantity"
                                        >
                                          <Minus size={12} />
                                        </button>
                                        <span className="min-w-[1.1rem] px-0.5 text-center text-[10px] font-semibold tabular-nums text-zinc-200">
                                          {it.quantity}
                                        </span>
                                        <button
                                          type="button"
                                          disabled={controlsDisabled}
                                          onClick={() =>
                                            void runHost(async (activeCreds) => {
                                              await updateItemQuantity(
                                                supabase,
                                                activeCreds,
                                                it.id,
                                                (it.quantity ?? 1) + 1,
                                              );
                                            })
                                          }
                                          className="px-1.5 py-1 text-zinc-400 hover:text-zinc-200"
                                          aria-label="Increase quantity"
                                        >
                                          <Plus size={12} />
                                        </button>
                                      </div>
                                      <button
                                        type="button"
                                        disabled={controlsDisabled}
                                        onClick={() => {
                                          const next = isSplitOpen ? null : it.id;
                                          setSplitItemId(next);
                                          if (next) {
                                            setAssignGroupId(null);
                                            setSplitMemberIds(
                                              splitIds.length
                                                ? [...splitIds]
                                                : members.map((m) => m.id),
                                            );
                                          }
                                        }}
                                        className={cn(
                                          cartCtrl,
                                          isSplitOpen
                                            ? "border-amber-500/50 bg-amber-500/15 text-amber-200"
                                            : "text-zinc-400 hover:text-zinc-200",
                                        )}
                                      >
                                        Split
                                      </button>
                                    </div>
                                  ) : null}

                                  {isSplitOpen ? (
                                    <div className="mt-2 rounded-lg border border-dashed border-violet-500/30 bg-violet-500/[0.06] p-2.5">
                                      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-violet-300/90">
                                        Split item
                                      </p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {members.map((m) => {
                                          const on = splitMemberIds.includes(m.id);
                                          return (
                                            <button
                                              key={m.id}
                                              type="button"
                                              onClick={() =>
                                                setSplitMemberIds((prev) =>
                                                  on
                                                    ? prev.filter((id) => id !== m.id)
                                                    : [...prev, m.id],
                                                )
                                              }
                                              className={cn(
                                                "rounded-md border px-2 py-0.5 text-[10px] font-semibold",
                                                on
                                                  ? "border-violet-400/50 bg-violet-500/20 text-violet-100"
                                                  : "border-white/10 text-zinc-500 hover:border-white/20",
                                              )}
                                            >
                                              {m.display_name}
                                            </button>
                                          );
                                        })}
                                      </div>
                                      <button
                                        type="button"
                                        disabled={controlsDisabled || splitMemberIds.length < 2}
                                        onClick={() =>
                                          void runHost(async (activeCreds) => {
                                            await setItemSplit(
                                              supabase,
                                              activeCreds,
                                              it.id,
                                              splitMemberIds,
                                            );
                                            setSplitItemId(null);
                                            toast.success("Split updated.");
                                          })
                                        }
                                        className="mt-2 w-full rounded-lg border border-emerald-400/45 bg-emerald-400/25 px-3 py-1.5 text-[11px] font-semibold text-emerald-50 hover:bg-emerald-400/35 disabled:opacity-50"
                                      >
                                        Apply split
                                      </button>
                                    </div>
                                  ) : null}
                                </li>
                              );
                            })}
                          </ul>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>

            <section className="px-5 py-4">
              <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                <Split size={12} /> Split & payment
              </h4>
              <p className="mb-2 text-xs text-zinc-500">
                Lock the cart before changing how guests pay. Per-guest totals update live while
                ordering.
              </p>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  Payment mode
                </label>
                <select
                  value={paymentMode}
                  disabled={controlsDisabled || !canChangePaymentMode}
                  onChange={(e) =>
                    void runHost(async (activeCreds) => {
                      await setPaymentMode(
                        supabase,
                        activeCreds,
                        e.target.value as PaymentMode,
                      );
                    })
                  }
                  className="rounded-lg border border-white/10 bg-zinc-900/60 px-2 py-1.5 text-xs text-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="per_person">Each pays their own</option>
                  <option value="equal_split">Split evenly</option>
                  <option value="assigned">Assign items to payers</option>
                </select>
                {orderFinished ? (
                  <span className="text-[10px] text-zinc-500">Order submitted</span>
                ) : !canChangePaymentMode ? (
                  <span className="text-[10px] text-zinc-500">Lock cart to change</span>
                ) : null}
              </div>
              <ul className="space-y-1.5">
                {perGuest.map(({ member: m, cents }) => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between rounded-lg border border-white/8 bg-zinc-900/40 px-3 py-2 text-xs"
                  >
                    <span className="text-zinc-200">
                      {m.display_name}
                      {m.role === "host" ? " · host" : ""}
                    </span>
                    <span className="font-mono font-semibold text-zinc-300">
                      {formatCents(cents)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </div>

      {endOrderOpen ? (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="end-order-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-5 shadow-2xl">
            <h3 id="end-order-title" className="text-base font-bold text-zinc-100">
              End order at {tableRecord?.display_name ?? tableLabel?.trim() ?? "this table"}?
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-zinc-400">
              Guests can no longer order or pay. They receive a notification (and push on the app).
              The table keeps a new QR link — reprint signage if needed.
            </p>
            <label className="mt-4 block">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Reason for guests (optional)
              </span>
              <textarea
                value={endOrderReason}
                onChange={(e) => setEndOrderReason(e.target.value)}
                rows={3}
                maxLength={280}
                placeholder="e.g. Kitchen closed early, table reassigned…"
                className="mt-1.5 w-full resize-none rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600"
              />
            </label>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setEndOrderOpen(false);
                  setEndOrderReason("");
                }}
                className="rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
              >
                Never mind
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void confirmEndOrder()}
                className="rounded-lg border border-red-500/40 bg-red-500/15 px-4 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20 disabled:opacity-50"
              >
                {busy ? "Ending…" : "End order & notify guests"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
