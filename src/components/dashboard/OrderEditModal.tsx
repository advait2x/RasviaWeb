import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Ban, Bell, Gift, Minus, Plus, Search, Split, StickyNote, Tag, Trash2,
  Users, MapPin, CreditCard, X, Merge, ShoppingBag, Clock, ChefHat,
  CheckCircle2, XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDashboard } from "@/context/DashboardContext";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import {
  DASH_MONEY_EMPHASIS, DASH_PRIMARY_CTA, DASH_BTN_ADD, DASH_ORDER_MEMBER_PILL, ORDER_STATUS_PILL,
  ORDER_PILL_TYPE_PRE, ORDER_PILL_TYPE_TAKEOUT, ORDER_PILL_GROUP,
} from "@/lib/dashboardUi";
import type { Order, OrderStatus, OrderType } from "@/types/dashboard";
import DiscountSelector from "@/components/pos/DiscountSelector";
import SplitBillModal from "@/components/pos/SplitBillModal";

const ORDER_TYPES: { value: OrderType; label: string }[] = [
  { value: "dine_in", label: "Dine-in" },
  { value: "pre_order", label: "Pre-order" },
  { value: "takeout", label: "Takeout" },
];

const PAYMENT_METHODS: { value: Order["paymentMethod"]; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

const ALL_STATUSES: OrderStatus[] = ["pending", "preparing", "ready", "served", "completed", "cancelled"];

const STATUS_META: Record<OrderStatus, { label: string; icon: typeof Clock }> = {
  pending: { label: "Pending", icon: Clock },
  preparing: { label: "Preparing", icon: ChefHat },
  ready: { label: "Ready", icon: CheckCircle2 },
  served: { label: "Served", icon: CheckCircle2 },
  completed: { label: "Completed", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", icon: XCircle },
};

function formatTimeAgo(date: Date): string {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function orderTypePill(order: Order): string {
  if (order.partySessionId) return ORDER_PILL_GROUP;
  if (order.orderType === "pre_order") return ORDER_PILL_TYPE_PRE;
  if (order.orderType === "takeout") return ORDER_PILL_TYPE_TAKEOUT;
  return "bg-zinc-200/80 border border-zinc-400/30 text-zinc-800 dark:bg-zinc-700/40 dark:border-white/10 dark:text-zinc-300";
}

function orderTypeLabel(order: Order): string {
  if (order.partySessionId) return "Tableside";
  return ORDER_TYPES.find((t) => t.value === order.orderType)?.label ?? "Dine-in";
}

function tableDisplay(order: Order): string | null {
  if (order.tableLabel?.trim()) return order.tableLabel.trim();
  if (order.tableNumber > 0) return `Table ${order.tableNumber}`;
  return null;
}

type DetailsSnapshot = {
  guestName: string;
  customerPhone: string;
  partySize: string;
  tableId: string;
  tableLabel: string;
  orderType: OrderType;
  paymentMethod: Order["paymentMethod"];
  status: OrderStatus;
  notes: string;
  tipAmount: string;
  tipPercent: string;
};

function snapshotFromOrder(order: Order): DetailsSnapshot {
  return {
    guestName: order.guestName,
    customerPhone: order.customerPhone ?? "",
    partySize: String(order.partySize || 1),
    tableId: order.tableId || "",
    tableLabel: order.tableLabel ?? (order.tableNumber > 0 ? String(order.tableNumber) : ""),
    orderType: order.orderType,
    paymentMethod: order.paymentMethod,
    status: order.status,
    notes: order.notes ?? "",
    tipAmount: order.tipAmount != null ? String(order.tipAmount) : "",
    tipPercent: order.tipPercent != null ? String(order.tipPercent) : "",
  };
}

function snapshotFromForm(
  guestName: string,
  customerPhone: string,
  partySize: string,
  tableId: string,
  tableLabel: string,
  orderType: OrderType,
  paymentMethod: Order["paymentMethod"],
  status: OrderStatus,
  notes: string,
  tipAmount: string,
  tipPercent: string,
): DetailsSnapshot {
  return {
    guestName,
    customerPhone,
    partySize,
    tableId,
    tableLabel,
    orderType,
    paymentMethod,
    status,
    notes,
    tipAmount,
    tipPercent,
  };
}

function snapshotsEqual(a: DetailsSnapshot, b: DetailsSnapshot): boolean {
  return (
    a.guestName === b.guestName &&
    a.customerPhone === b.customerPhone &&
    a.partySize === b.partySize &&
    a.tableId === b.tableId &&
    a.tableLabel === b.tableLabel &&
    a.orderType === b.orderType &&
    a.paymentMethod === b.paymentMethod &&
    a.status === b.status &&
    a.notes === b.notes &&
    a.tipAmount === b.tipAmount &&
    a.tipPercent === b.tipPercent
  );
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits.length ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

type OrderEditModalProps = {
  order: Order | null;
  open: boolean;
  onClose: () => void;
  /** Other live orders eligible for merge (excludes current). */
  mergeCandidates?: Order[];
  onRequestCancel?: (order: Order) => void;
};

export default function OrderEditModal({
  order,
  open,
  onClose,
  mergeCandidates = [],
  onRequestCancel,
}: OrderEditModalProps) {
  const { session } = useAuth();
  const staffId = session?.user?.id ?? "staff";
  const {
    tables, menuItems,
    updateOrderDetails, updateOrderItemInstructions,
    addItemToOrder, removeItemFromOrder, updateItemQuantity,
    voidOrderItem, compOrderItem,
    applyOrderDiscount, removeOrderDiscount,
    transferOrder, splitOrder, mergeOrders, notifyCustomer,
    updateOrderStatus,
  } = useDashboard();

  const [tab, setTab] = useState("details");
  const [saving, setSaving] = useState(false);

  // Details form
  const [guestName, setGuestName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [partySize, setPartySize] = useState("1");
  const [tableId, setTableId] = useState("");
  const [tableLabel, setTableLabel] = useState("");
  const [orderType, setOrderType] = useState<OrderType>("dine_in");
  const [paymentMethod, setPaymentMethod] = useState<Order["paymentMethod"]>("cash");
  const [status, setStatus] = useState<OrderStatus>("pending");
  const [notes, setNotes] = useState("");
  const [tipAmount, setTipAmount] = useState("");
  const [tipPercent, setTipPercent] = useState("");

  // Items tab
  const [menuSearch, setMenuSearch] = useState("");
  const [editingNoteItemId, setEditingNoteItemId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  // Sub-modals
  const [showDiscount, setShowDiscount] = useState(false);
  const [showSplit, setShowSplit] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [mergeTargetId, setMergeTargetId] = useState("");
  const [showUnsavedPrompt, setShowUnsavedPrompt] = useState(false);
  const [removeConfirmItem, setRemoveConfirmItem] = useState<{ id: string; name: string } | null>(null);
  const [voidTarget, setVoidTarget] = useState<{ id: string; name: string } | null>(null);
  const [voidReasonDraft, setVoidReasonDraft] = useState("Kitchen error");
  const [voidBusy, setVoidBusy] = useState(false);
  const [compTarget, setCompTarget] = useState<{ id: string; name: string } | null>(null);
  const [compReasonDraft, setCompReasonDraft] = useState("Guest recovery");
  const [compBusy, setCompBusy] = useState(false);
  /** Voided line ids hidden from this session's items list (view only, not deleted). */
  const [hiddenVoidIds, setHiddenVoidIds] = useState<string[]>([]);

  const prevOpenRef = useRef(false);
  const prevOrderIdRef = useRef<string | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<DetailsSnapshot | null>(null);

  const loadFormFromOrder = useCallback((o: Order) => {
    const snap = snapshotFromOrder(o);
    setSavedSnapshot(snap);
    setGuestName(snap.guestName);
    setCustomerPhone(snap.customerPhone);
    setPartySize(snap.partySize);
    setTableId(snap.tableId);
    setTableLabel(snap.tableLabel);
    setOrderType(snap.orderType);
    setPaymentMethod(snap.paymentMethod);
    setStatus(snap.status);
    setNotes(snap.notes);
    setTipAmount(snap.tipAmount);
    setTipPercent(snap.tipPercent);
  }, []);

  useEffect(() => {
    if (!order || !open) {
      prevOpenRef.current = false;
      return;
    }

    const justOpened = open && !prevOpenRef.current;
    const orderChanged = prevOrderIdRef.current !== order.id;
    if (justOpened || orderChanged) {
      setTab("details");
      setMenuSearch("");
      setEditingNoteItemId(null);
      setMergeTargetId("");
      setShowUnsavedPrompt(false);
      setRemoveConfirmItem(null);
      setHiddenVoidIds([]);
      loadFormFromOrder(order);
      prevOrderIdRef.current = order.id;
    }

    prevOpenRef.current = true;
  }, [order, open, loadFormFromOrder]);

  const detailsDirty = useMemo(() => {
    if (!savedSnapshot) return false;
    const current = snapshotFromForm(
      guestName,
      customerPhone,
      partySize,
      tableId,
      tableLabel,
      orderType,
      paymentMethod,
      status,
      notes,
      tipAmount,
      tipPercent,
    );
    return !snapshotsEqual(savedSnapshot, current);
  }, [
    savedSnapshot,
    guestName,
    customerPhone,
    partySize,
    tableId,
    tableLabel,
    orderType,
    paymentMethod,
    status,
    notes,
    tipAmount,
    tipPercent,
  ]);

  const filteredMenu = useMemo(() => {
    const q = menuSearch.trim().toLowerCase();
    return menuItems
      .filter((m) => m.inStock && m.price != null)
      .filter((m) => !q || m.name.toLowerCase().includes(q))
      .slice(0, 12);
  }, [menuItems, menuSearch]);

  const isTerminal = order?.status === "completed" || order?.status === "cancelled";
  const canEditItems = !isTerminal;

  const sortedItems = useMemo(
    () =>
      order
        ? [...order.items].sort((a, b) =>
            a.menuItemName.localeCompare(b.menuItemName, undefined, { sensitivity: "base" }),
          )
        : [],
    [order],
  );

  const hiddenVoidSet = useMemo(() => new Set(hiddenVoidIds), [hiddenVoidIds]);

  const voidedItems = useMemo(
    () => sortedItems.filter((i) => i.voided),
    [sortedItems],
  );

  const visibleItems = useMemo(
    () => sortedItems.filter((i) => !i.voided || !hiddenVoidSet.has(i.id)),
    [sortedItems, hiddenVoidSet],
  );

  const hiddenVoidCount = voidedItems.filter((i) => hiddenVoidSet.has(i.id)).length;
  const visibleVoidCount = voidedItems.length - hiddenVoidCount;

  const hideVoidFromView = (itemId: string) => {
    setHiddenVoidIds((prev) => (prev.includes(itemId) ? prev : [...prev, itemId]));
  };

  const hideAllVoidedFromView = () => {
    setHiddenVoidIds(voidedItems.map((i) => i.id));
  };

  const handleSaveDetails = async (): Promise<boolean> => {
    if (!order) return false;
    setSaving(true);
    try {
      const selectedTable = tables.find((t) => t.id === tableId);
      const parsedTip = tipAmount.trim() ? parseFloat(tipAmount) : undefined;
      const parsedTipPct = tipPercent.trim() ? parseFloat(tipPercent) : undefined;
      await updateOrderDetails(order.id, {
        guestName: guestName.trim() || "Guest",
        customerPhone,
        partySize: Math.max(1, parseInt(partySize, 10) || 1),
        tableId: tableId || undefined,
        tableNumber: selectedTable?.tableNumber,
        tableLabel: tableLabel.trim() || undefined,
        orderType,
        paymentMethod,
        status,
        notes: notes.trim(),
        tipAmount: parsedTip != null && Number.isFinite(parsedTip) ? parsedTip : undefined,
        tipPercent: parsedTipPct != null && Number.isFinite(parsedTipPct) ? parsedTipPct : undefined,
      });
      setSavedSnapshot(
        snapshotFromForm(
          guestName.trim() || "Guest",
          customerPhone,
          partySize,
          tableId,
          tableLabel,
          orderType,
          paymentMethod,
          status,
          notes,
          tipAmount,
          tipPercent,
        ),
      );
      toast.success("Order updated");
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save order");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const requestClose = useCallback(() => {
    if (detailsDirty) {
      setShowUnsavedPrompt(true);
      return;
    }
    onClose();
  }, [detailsDirty, onClose]);

  const handleDiscardAndClose = () => {
    setShowUnsavedPrompt(false);
    onClose();
  };

  const handleSaveAndClose = async () => {
    const ok = await handleSaveDetails();
    if (ok) {
      setShowUnsavedPrompt(false);
      onClose();
    }
  };

  const promptRemoveItem = (item: { id: string; menuItemName: string }) => {
    setRemoveConfirmItem({ id: item.id, name: item.menuItemName });
  };

  const handleConfirmRemoveItem = async () => {
    if (!order || !removeConfirmItem) return;
    try {
      await removeItemFromOrder(order.id, removeConfirmItem.id);
      toast.success(`Removed ${removeConfirmItem.name}`);
      setRemoveConfirmItem(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove item");
    }
  };

  const handleDecreaseQuantity = (item: Order["items"][number]) => {
    if (!order) return;
    if (item.quantity <= 1) {
      promptRemoveItem(item);
      return;
    }
    void updateItemQuantity(order.id, item.id, item.quantity - 1).catch((err) => {
      toast.error(err instanceof Error ? err.message : "Could not update quantity");
    });
  };

  const handleSaveItemNote = async (itemId: string) => {
    if (!order) return;
    try {
      await updateOrderItemInstructions(order.id, itemId, noteDraft);
      setEditingNoteItemId(null);
      toast.success("Item note saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save note");
    }
  };

  const handleConfirmVoid = async () => {
    if (!order || !voidTarget) return;
    setVoidBusy(true);
    try {
      await voidOrderItem(order.id, voidTarget.id, voidReasonDraft, staffId);
      setVoidTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not void item");
    } finally {
      setVoidBusy(false);
    }
  };

  const handleConfirmComp = async () => {
    if (!order || !compTarget) return;
    setCompBusy(true);
    try {
      await compOrderItem(order.id, compTarget.id, compReasonDraft);
      setCompTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not comp item");
    } finally {
      setCompBusy(false);
    }
  };

  const handleMerge = async () => {
    if (!order || !mergeTargetId) return;
    await mergeOrders([mergeTargetId, order.id]);
    toast.success("Orders merged");
    onClose();
  };

  if (!order) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { if (!o) requestClose(); }}>
        <DialogContent
          hideClose
          className="glass-modal max-w-2xl max-h-[90vh] overflow-hidden border-zinc-200/90 bg-white/95 dark:border-white/10 dark:bg-zinc-900/95 backdrop-blur-xl p-0 flex flex-col gap-0"
          onEscapeKeyDown={(e) => {
            if (detailsDirty) {
              e.preventDefault();
              setShowUnsavedPrompt(true);
            }
          }}
          onPointerDownOutside={(e) => {
            if (detailsDirty) {
              e.preventDefault();
              setShowUnsavedPrompt(true);
            }
          }}
        >
          <Tabs value={tab} onValueChange={setTab} className="flex flex-col flex-1 min-h-0">
            {/* Header — light: gradient ends at zinc-100 to match tab strip below */}
            <div className="relative shrink-0 border-b border-zinc-200/90 dark:border-white/10">
              <div className="absolute inset-x-0 top-0 z-10 h-0.5 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent dark:via-amber-500/60" />

              <div className="bg-gradient-to-b from-amber-50/90 via-white to-[#f1f5f9] px-5 pt-4 pb-3 dark:from-amber-500/[0.08] dark:via-zinc-900/40 dark:to-zinc-800/90">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-bold text-zinc-100 truncate">
                        {guestName.trim() || order.guestName}
                      </h2>
                    <span className="text-xs font-mono font-semibold text-zinc-500 tabular-nums">
                      #{order.id}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {(() => {
                      const cfg = STATUS_META[order.status];
                      const Icon = cfg.icon;
                      return (
                        <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full", ORDER_STATUS_PILL[order.status])}>
                          <Icon size={11} strokeWidth={2} />
                          {cfg.label}
                        </span>
                      );
                    })()}
                    <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", orderTypePill(order))}>
                      {orderTypeLabel(order)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-zinc-800/80 border border-white/10 text-zinc-400 capitalize">
                      <CreditCard size={10} strokeWidth={1.5} />
                      {order.paymentMethod}
                    </span>
                    {(order.refundedAmountCents ?? 0) > 0 && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400">
                        ${((order.refundedAmountCents ?? 0) / 100).toFixed(2)} refunded
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={requestClose}
                  aria-label="Close"
                  className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100 transition-colors"
                >
                  <X size={16} strokeWidth={2} />
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-zinc-400">
                {tableDisplay(order) && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin size={12} className="text-amber-500/80" strokeWidth={1.5} />
                    <span className="font-medium text-zinc-300">{tableDisplay(order)}</span>
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <Clock size={12} className="text-zinc-500" strokeWidth={1.5} />
                  {formatTimeAgo(order.createdAt)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Users size={12} className="text-zinc-500" strokeWidth={1.5} />
                  {order.partyMembers?.length
                    ? `${order.partyMembers.length} guests`
                    : `${order.partySize} guest${order.partySize === 1 ? "" : "s"}`}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ShoppingBag size={12} className="text-zinc-500" strokeWidth={1.5} />
                  {order.items.length} item{order.items.length === 1 ? "" : "s"}
                </span>
                <span className={cn("inline-flex items-center gap-1 text-sm font-bold tabular-nums ml-auto", DASH_MONEY_EMPHASIS)}>
                  ${order.total.toFixed(2)}
                </span>
              </div>

                {order.partyMembers && order.partyMembers.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-1">
                    {order.partyMembers.map((name, i) => (
                      <span
                        key={`${name}-${i}`}
                        className={DASH_ORDER_MEMBER_PILL}
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-[#f1f5f9] px-5 pb-3 pt-0 dark:bg-zinc-800/90">
                <TabsList className="h-10 w-full grid grid-cols-3 rounded-xl bg-[#e2e8f0]/70 border border-zinc-300/40 p-1 text-zinc-500 dark:bg-zinc-950/60 dark:border-white/10">
                  <TabsTrigger
                    value="details"
                    className="rounded-lg text-xs font-semibold justify-center data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm data-[state=inactive]:hover:text-zinc-700 dark:data-[state=active]:bg-zinc-800 dark:data-[state=active]:text-zinc-100 dark:data-[state=inactive]:hover:text-zinc-300"
                  >
                    Details
                  </TabsTrigger>
                  <TabsTrigger
                    value="items"
                    className="rounded-lg text-xs font-semibold justify-center gap-1 data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm data-[state=inactive]:hover:text-zinc-700 dark:data-[state=active]:bg-zinc-800 dark:data-[state=active]:text-zinc-100 dark:data-[state=inactive]:hover:text-zinc-300"
                  >
                    <span>Items</span>
                    <span className="tabular-nums text-[10px] font-bold opacity-70">{order.items.length}</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="actions"
                    className="rounded-lg text-xs font-semibold justify-center data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm data-[state=inactive]:hover:text-zinc-700 dark:data-[state=active]:bg-zinc-800 dark:data-[state=active]:text-zinc-100 dark:data-[state=inactive]:hover:text-zinc-300"
                  >
                    Actions
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>

            <TabsContent value="details" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
              <ScrollArea className="h-[min(52vh,480px)] px-5 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Guest name">
                    <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} className="bg-zinc-950 border-white/10 text-zinc-100" />
                  </Field>
                  <Field label="Party size">
                    <Input type="number" min={1} value={partySize} onChange={(e) => setPartySize(e.target.value)} className="bg-zinc-950 border-white/10 text-zinc-100" />
                  </Field>
                  <Field label="Phone">
                    <Input
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(formatPhone(e.target.value))}
                      placeholder="(555) 555-5555"
                      className="bg-zinc-950 border-white/10 text-zinc-100"
                    />
                  </Field>
                  <Field label="Payment">
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as Order["paymentMethod"])}
                      className="w-full h-10 rounded-md border border-white/10 bg-zinc-950 px-3 text-sm text-zinc-100"
                    >
                      {PAYMENT_METHODS.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Order type">
                    <select
                      value={orderType}
                      onChange={(e) => setOrderType(e.target.value as OrderType)}
                      className="w-full h-10 rounded-md border border-white/10 bg-zinc-950 px-3 text-sm text-zinc-100"
                    >
                      {ORDER_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Status">
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as OrderStatus)}
                      className="w-full h-10 rounded-md border border-white/10 bg-zinc-950 px-3 text-sm text-zinc-100"
                    >
                      {ALL_STATUSES.map((s) => (
                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Floor table">
                    <select
                      value={tableId}
                      onChange={(e) => {
                        setTableId(e.target.value);
                        const t = tables.find((x) => x.id === e.target.value);
                        if (t) setTableLabel(String(t.tableNumber));
                      }}
                      className="w-full h-10 rounded-md border border-white/10 bg-zinc-950 px-3 text-sm text-zinc-100"
                    >
                      <option value="">— Not linked —</option>
                      {tables.filter((t) => !t.isCombinedChild).map((t) => (
                        <option key={t.id} value={t.id}>
                          Table {t.tableNumber} ({t.status})
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Table label">
                    <Input
                      value={tableLabel}
                      onChange={(e) => setTableLabel(e.target.value)}
                      placeholder="e.g. Patio 7"
                      className="bg-zinc-950 border-white/10 text-zinc-100"
                    />
                  </Field>
                  <Field label="Tip ($)">
                    <Input type="number" min={0} step="0.01" value={tipAmount} onChange={(e) => setTipAmount(e.target.value)} className="bg-zinc-950 border-white/10 text-zinc-100" />
                  </Field>
                  <Field label="Tip (%)">
                    <Input type="number" min={0} max={100} step="1" value={tipPercent} onChange={(e) => setTipPercent(e.target.value)} className="bg-zinc-950 border-white/10 text-zinc-100" />
                  </Field>
                </div>
                <Field label="Order notes" className="mt-3">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 resize-none"
                    placeholder="Allergies, celebration, etc."
                  />
                </Field>
                <div className="mt-4 flex items-center justify-between rounded-lg border border-white/5 bg-zinc-800/40 px-3 py-2">
                  <span className="text-xs text-zinc-500">Order total</span>
                  <span className={cn("text-sm font-bold tabular-nums", DASH_MONEY_EMPHASIS)}>
                    ${order.total.toFixed(2)}
                  </span>
                </div>
              </ScrollArea>
              <EditModalFooter saving={saving} onClose={requestClose} onSave={() => void handleSaveDetails()} />
            </TabsContent>

            <TabsContent value="items" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden flex flex-col">
              <ScrollArea className="h-[min(52vh,480px)] px-5 py-3">
                {voidedItems.length > 0 && (
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-500/15 bg-red-500/5 px-3 py-2">
                    <span className="text-[10px] font-medium text-zinc-500">
                      {visibleVoidCount > 0
                        ? `${visibleVoidCount} voided item${visibleVoidCount === 1 ? "" : "s"} shown`
                        : "All voided items hidden from view"}
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {hiddenVoidCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setHiddenVoidIds([])}
                          className="text-[10px] font-semibold px-2 py-1 rounded-md border border-zinc-300/60 text-zinc-600 hover:bg-zinc-100 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-zinc-800"
                        >
                          Show voided ({hiddenVoidCount})
                        </button>
                      )}
                      {visibleVoidCount > 0 && (
                        <button
                          type="button"
                          onClick={hideAllVoidedFromView}
                          className="text-[10px] font-semibold px-2 py-1 rounded-md border border-red-500/25 text-red-700 hover:bg-red-500/10 dark:text-red-400"
                        >
                          Hide all voided
                        </button>
                      )}
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  {sortedItems.length === 0 ? (
                    <p className="text-sm text-zinc-500 text-center py-6">No items on this order yet.</p>
                  ) : visibleItems.length === 0 ? (
                    <p className="text-sm text-zinc-500 text-center py-6">
                      No items to show. Use &ldquo;Show voided&rdquo; to bring hidden lines back.
                    </p>
                  ) : visibleItems.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        "rounded-xl border px-3 py-2.5",
                        item.voided ? "border-red-500/30 bg-red-500/8 dark:bg-red-500/5"
                          : item.comped ? "border-emerald-500/20 bg-emerald-500/5"
                            : "border-white/5 bg-zinc-800/40",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className={cn("text-sm font-medium text-zinc-100", (item.voided || item.comped) && "line-through")}>
                            {item.menuItemName}
                            {item.quantity > 1 && (
                              <span className="ml-1.5 text-zinc-500 font-normal tabular-nums">×{item.quantity}</span>
                            )}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            {item.voided && (
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-red-500 dark:text-red-400">
                                Voided
                              </span>
                            )}
                            {item.comped && (
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                                Comped
                              </span>
                            )}
                          </div>
                          {item.voided && item.voidReason && (
                            <p className="text-[10px] text-red-600/90 dark:text-red-300/90 mt-1">
                              Reason: {item.voidReason}
                            </p>
                          )}
                          {item.comped && item.compReason && (
                            <p className="text-[10px] text-emerald-700/90 dark:text-emerald-300/90 mt-1">
                              Reason: {item.compReason}
                            </p>
                          )}
                          {item.specialInstructions && editingNoteItemId !== item.id && (
                            <p className="text-[10px] text-zinc-500 italic mt-0.5">{item.specialInstructions}</p>
                          )}
                        </div>
                        <div className="flex items-start gap-1 shrink-0">
                          <span className={cn(
                            "text-sm font-semibold tabular-nums",
                            item.voided || item.comped ? "text-zinc-500 line-through" : "text-amber-400",
                          )}>
                            ${(item.unitPrice * item.quantity).toFixed(2)}
                          </span>
                          {item.voided && (
                            <button
                              type="button"
                              title="Hide from list"
                              aria-label={`Hide voided ${item.menuItemName} from list`}
                              onClick={() => hideVoidFromView(item.id)}
                              className="flex h-6 w-6 items-center justify-center rounded-md border border-zinc-300/50 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:border-white/10 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                            >
                              <X size={12} strokeWidth={2} />
                            </button>
                          )}
                        </div>
                      </div>
                      {editingNoteItemId === item.id ? (
                        <div className="mt-2 flex gap-2">
                          <Input value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} className="input-dark h-8 text-xs flex-1" />
                          <button type="button" onClick={() => void handleSaveItemNote(item.id)} className="text-xs px-2 rounded bg-amber-500/20 text-amber-300">Save</button>
                        </div>
                      ) : null}
                      {canEditItems && !item.voided && !item.comped && (
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                          <div className="flex items-center gap-1">
                            <QtyBtn onClick={() => handleDecreaseQuantity(item)}><Minus size={12} /></QtyBtn>
                            <span className="w-6 text-center text-xs font-bold tabular-nums">{item.quantity}</span>
                            <QtyBtn onClick={() => updateItemQuantity(order.id, item.id, item.quantity + 1)}><Plus size={12} /></QtyBtn>
                          </div>
                          <div className="flex items-center gap-1">
                            <IconBtn title="Edit note" onClick={() => { setEditingNoteItemId(item.id); setNoteDraft(item.specialInstructions ?? ""); }}>
                              <StickyNote size={12} />
                            </IconBtn>
                            <IconBtn
                              title="Void item"
                              onClick={() => {
                                setVoidReasonDraft("Kitchen error");
                                setVoidTarget({ id: item.id, name: item.menuItemName });
                              }}
                            >
                              <Ban size={12} className="text-red-400" />
                            </IconBtn>
                            <IconBtn
                              title="Comp item"
                              onClick={() => {
                                setCompReasonDraft("Guest recovery");
                                setCompTarget({ id: item.id, name: item.menuItemName });
                              }}
                            >
                              <Gift size={12} className="text-emerald-400" />
                            </IconBtn>
                            <IconBtn title="Remove" onClick={() => promptRemoveItem(item)}>
                              <Trash2 size={12} className="text-red-400" />
                            </IconBtn>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {canEditItems && (
                  <div className="mt-4 pt-3 border-t border-white/5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Add menu item</p>
                    <div className="relative mb-2">
                      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <Input value={menuSearch} onChange={(e) => setMenuSearch(e.target.value)} placeholder="Search menu…" className="input-dark pl-8 h-9 text-sm" />
                    </div>
                    <div className="space-y-1">
                      {filteredMenu.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            addItemToOrder(order.id, m.id, 1);
                            toast.success(`Added ${m.name}`);
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-white/5 bg-zinc-800/30 hover:border-amber-500/20 text-left text-sm"
                        >
                          <span className="text-zinc-200 truncate">{m.name}</span>
                          <span className="text-amber-400 font-semibold tabular-nums shrink-0 ml-2">${m.price!.toFixed(2)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </ScrollArea>
              <EditModalFooter saving={saving} onClose={requestClose} onSave={() => void handleSaveDetails()} />
            </TabsContent>

            <TabsContent value="actions" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden flex flex-col">
              <ScrollArea className="h-[min(52vh,480px)] px-5 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <ActionBtn icon={MapPin} label="Transfer table" onClick={() => setShowTransfer(true)} disabled={isTerminal} />
                  <ActionBtn icon={Split} label="Split bill" onClick={() => setShowSplit(true)} disabled={isTerminal || order.items.length < 2} />
                  <ActionBtn icon={Tag} label="Apply discount" onClick={() => setShowDiscount(true)} disabled={isTerminal} />
                  <ActionBtn
                    icon={Bell}
                    label="Notify guest"
                    onClick={() => notifyCustomer(order.id)}
                    disabled={!order.customerPhone || order.status !== "ready"}
                  />
                  <ActionBtn
                    icon={ShoppingBag}
                    label="Mark completed"
                    onClick={() => { updateOrderStatus(order.id, "completed"); toast.success("Marked completed"); }}
                    disabled={order.status === "completed" || order.status === "cancelled"}
                  />
                  {onRequestCancel && (
                    <ActionBtn
                      icon={X}
                      label="Cancel & refund"
                      onClick={() => { onClose(); onRequestCancel(order); }}
                      disabled={order.status === "cancelled" || order.status === "completed"}
                      danger
                    />
                  )}
                </div>

                {(order.discounts?.length ?? 0) > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Applied discounts</p>
                    {order.discounts!.map((d) => (
                      <div key={d.id} className="flex items-center justify-between py-2 border-b border-white/5 text-sm">
                        <span className="text-zinc-300">{d.name} (−${d.appliedAmount.toFixed(2)})</span>
                        {!isTerminal && (
                          <button type="button" onClick={() => removeOrderDiscount(order.id, d.id)} className="text-xs text-red-400 hover:underline">
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {mergeCandidates.length > 0 && !isTerminal && (
                  <div className="mt-4 rounded-xl border border-white/5 bg-zinc-800/30 p-3 text-center">
                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2 flex items-center justify-center gap-1.5">
                      <Merge size={12} /> Merge into another order
                    </p>
                    <p className="text-[11px] text-zinc-600 mb-2">Items from this order move into the selected order; this order is cancelled.</p>
                    <select
                      value={mergeTargetId}
                      onChange={(e) => setMergeTargetId(e.target.value)}
                      className="w-full h-9 rounded-md border border-white/10 bg-zinc-950 px-2 text-sm text-zinc-100 mb-2 text-left"
                    >
                      <option value="">Select order…</option>
                      {mergeCandidates.map((o) => (
                        <option key={o.id} value={o.id}>
                          #{o.id} · {o.guestName} · ${o.total.toFixed(2)}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={!mergeTargetId}
                      onClick={() => void handleMerge()}
                      className={cn("w-full py-2 rounded-lg text-xs font-semibold justify-center", DASH_BTN_ADD, !mergeTargetId && "opacity-50")}
                    >
                      Merge orders
                    </button>
                  </div>
                )}

                <div className="mt-4 rounded-xl border border-white/5 bg-zinc-800/20 p-3 text-xs text-zinc-500 space-y-1">
                  <p><span className="text-zinc-400">Status:</span>{" "}
                    <span className={ORDER_STATUS_PILL[order.status]}>{order.status}</span>
                  </p>
                  {order.stripePaymentIntentId && (
                    <p className="truncate"><span className="text-zinc-400">Stripe PI:</span> {order.stripePaymentIntentId}</p>
                  )}
                  {order.refundedAmountCents != null && order.refundedAmountCents > 0 && (
                    <p><span className="text-zinc-400">Refunded:</span> ${(order.refundedAmountCents / 100).toFixed(2)}</p>
                  )}
                </div>
              </ScrollArea>
              <EditModalFooter saving={saving} onClose={requestClose} onSave={() => void handleSaveDetails()} />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showUnsavedPrompt} onOpenChange={setShowUnsavedPrompt}>
        <AlertDialogContent className="glass-modal z-[60] max-w-sm border-zinc-200/90 bg-white/95 dark:border-white/10 dark:bg-zinc-900/95">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-900 dark:text-zinc-100">Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-600 dark:text-zinc-400">
              Changes unsaved. Would you like to save them?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2 sm:gap-2">
            <button
              type="button"
              onClick={handleDiscardAndClose}
              className="flex-1 py-2.5 rounded-lg border border-zinc-300/90 bg-zinc-100 text-sm font-medium text-zinc-600 hover:bg-zinc-200 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            >
              No
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSaveAndClose()}
              className={cn(
                "flex-1 py-2.5 rounded-lg text-sm font-semibold border border-emerald-500/45 bg-emerald-500/15 text-emerald-800",
                "shadow-[0_0_16px_rgba(52,211,153,0.35)] hover:bg-emerald-500/25 hover:shadow-[0_0_20px_rgba(52,211,153,0.45)]",
                "dark:text-emerald-300 dark:bg-emerald-500/20 dark:border-emerald-500/35",
                saving && "opacity-60",
              )}
            >
              {saving ? "Saving…" : "Yes"}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={removeConfirmItem !== null} onOpenChange={(o) => !o && setRemoveConfirmItem(null)}>
        <AlertDialogContent className="glass-modal z-[60] max-w-sm border-zinc-200/90 bg-white/95 dark:border-white/10 dark:bg-zinc-900/95">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-900 dark:text-zinc-100">Remove item?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-600 dark:text-zinc-400">
              {removeConfirmItem
                ? `Remove "${removeConfirmItem.name}" from this order?`
                : "Remove this item from the order?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2 sm:gap-2">
            <button
              type="button"
              onClick={() => setRemoveConfirmItem(null)}
              className="flex-1 py-2.5 rounded-lg border border-zinc-300/90 bg-zinc-100 text-sm font-medium text-zinc-600 hover:bg-zinc-200 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleConfirmRemoveItem()}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold border border-red-500/30 bg-red-500/10 text-red-700 hover:bg-red-500/15 dark:text-red-400"
            >
              Remove
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={voidTarget !== null}
        onOpenChange={(o) => {
          if (!o && !voidBusy) setVoidTarget(null);
        }}
      >
        <AlertDialogContent className="glass-modal z-[60] max-w-sm border-zinc-200/90 bg-white/95 dark:border-white/10 dark:bg-zinc-900/95">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-900 dark:text-zinc-100">Void item?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-600 dark:text-zinc-400">
              {voidTarget ? `"${voidTarget.name}" will be voided and removed from the order total.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <label className="block text-left">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1 block">
              Reason
            </span>
            <Input
              value={voidReasonDraft}
              onChange={(e) => setVoidReasonDraft(e.target.value)}
              placeholder="e.g. Kitchen error, wrong item"
              className="bg-zinc-50 border-zinc-300/80 text-zinc-900 dark:bg-zinc-950 dark:border-white/10 dark:text-zinc-100"
            />
          </label>
          <AlertDialogFooter className="flex-row gap-2 sm:gap-2">
            <button
              type="button"
              disabled={voidBusy}
              onClick={() => setVoidTarget(null)}
              className="flex-1 py-2.5 rounded-lg border border-zinc-300/90 bg-zinc-100 text-sm font-medium text-zinc-600 hover:bg-zinc-200 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={voidBusy || !voidReasonDraft.trim()}
              onClick={() => void handleConfirmVoid()}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold border border-red-500/35 bg-red-500/12 text-red-700 hover:bg-red-500/18 dark:text-red-400 disabled:opacity-50"
            >
              {voidBusy ? "Voiding…" : "Void item"}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={compTarget !== null}
        onOpenChange={(o) => {
          if (!o && !compBusy) setCompTarget(null);
        }}
      >
        <AlertDialogContent className="glass-modal z-[60] max-w-sm border-zinc-200/90 bg-white/95 dark:border-white/10 dark:bg-zinc-900/95">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-900 dark:text-zinc-100">Comp item?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-600 dark:text-zinc-400">
              {compTarget ? `"${compTarget.name}" will be comped at no charge.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <label className="block text-left">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1 block">
              Reason
            </span>
            <Input
              value={compReasonDraft}
              onChange={(e) => setCompReasonDraft(e.target.value)}
              placeholder="e.g. Guest recovery"
              className="bg-zinc-50 border-zinc-300/80 text-zinc-900 dark:bg-zinc-950 dark:border-white/10 dark:text-zinc-100"
            />
          </label>
          <AlertDialogFooter className="flex-row gap-2 sm:gap-2">
            <button
              type="button"
              disabled={compBusy}
              onClick={() => setCompTarget(null)}
              className="flex-1 py-2.5 rounded-lg border border-zinc-300/90 bg-zinc-100 text-sm font-medium text-zinc-600 hover:bg-zinc-200 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={compBusy || !compReasonDraft.trim()}
              onClick={() => void handleConfirmComp()}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold border border-emerald-500/35 bg-emerald-500/12 text-emerald-800 hover:bg-emerald-500/18 dark:text-emerald-300 disabled:opacity-50"
            >
              {compBusy ? "Saving…" : "Comp item"}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DiscountSelector
        open={showDiscount}
        onClose={() => setShowDiscount(false)}
        onApply={(d, approvedBy) => {
          applyOrderDiscount(order.id, d, approvedBy);
          setShowDiscount(false);
        }}
      />
      <SplitBillModal
        open={showSplit}
        onClose={() => setShowSplit(false)}
        order={order}
        onSplit={(ids) => { void splitOrder(order.id, ids); }}
      />

      <Dialog open={showTransfer} onOpenChange={(o) => !o && setShowTransfer(false)}>
        <DialogContent className="glass-modal max-w-sm border-white/10 bg-zinc-900/95 p-5">
          <h3 className="text-sm font-bold text-zinc-100 mb-3 flex items-center gap-2">
            <MapPin size={14} className="text-amber-400" /> Transfer to table
          </h3>
          <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
            {tables.filter((t) => !t.isCombinedChild).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  void transferOrder(order.id, t.id);
                  setShowTransfer(false);
                }}
                className="py-2 rounded-lg border border-white/10 bg-zinc-800/60 text-xs font-bold text-zinc-200 hover:border-amber-500/30"
              >
                T{t.tableNumber}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function EditModalFooter({
  saving,
  onClose,
  onSave,
}: {
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="shrink-0 px-5 py-3 border-t border-zinc-200/80 dark:border-white/5 flex gap-2">
      <button
        type="button"
        onClick={onClose}
        className="flex-1 py-2.5 rounded-lg border border-zinc-300/80 text-sm text-zinc-600 hover:bg-zinc-100 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-zinc-800"
      >
        Close
      </button>
      <button
        type="button"
        disabled={saving}
        onClick={onSave}
        className={cn("flex-[2] py-2.5 rounded-lg text-sm font-bold", DASH_PRIMARY_CTA, saving && "opacity-60")}
      >
        {saving ? "Saving…" : "Save details"}
      </button>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function QtyBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="w-7 h-7 rounded-lg bg-zinc-700/60 border border-white/5 flex items-center justify-center text-zinc-300 hover:bg-zinc-700">
      {children}
    </button>
  );
}

function IconBtn({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title: string }) {
  return (
    <button type="button" title={title} onClick={onClick} className="w-7 h-7 rounded-lg bg-zinc-800/60 border border-white/5 flex items-center justify-center text-zinc-400 hover:text-zinc-200">
      {children}
    </button>
  );
}

function ActionBtn({
  icon: Icon, label, onClick, disabled, danger,
}: {
  icon: typeof MapPin; label: string; onClick: () => void; disabled?: boolean; danger?: boolean;
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-3 rounded-xl border text-sm font-medium text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
        danger
          ? "border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10"
          : "border-white/5 bg-zinc-800/40 text-zinc-200 hover:border-amber-500/20 hover:bg-zinc-800/70",
      )}
    >
      <Icon size={15} strokeWidth={1.5} className={danger ? "text-red-400" : "text-amber-400 shrink-0"} />
      {label}
    </motion.button>
  );
}
