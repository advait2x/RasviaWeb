import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Ban, Bell, Gift, Minus, Plus, Search, Split, StickyNote, Tag, Trash2,
  Users, MapPin, CreditCard, X, Merge, ShoppingBag, Clock, ChefHat,
  CheckCircle2, XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDashboard } from "@/context/DashboardContext";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import {
  DASH_MONEY_EMPHASIS, DASH_PRIMARY_CTA, DASH_BTN_ADD, ORDER_STATUS_PILL,
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

  useEffect(() => {
    if (!order || !open) return;
    setGuestName(order.guestName);
    setCustomerPhone(order.customerPhone ?? "");
    setPartySize(String(order.partySize || 1));
    setTableId(order.tableId || "");
    setTableLabel(order.tableLabel ?? (order.tableNumber > 0 ? String(order.tableNumber) : ""));
    setOrderType(order.orderType);
    setPaymentMethod(order.paymentMethod);
    setStatus(order.status);
    setNotes(order.notes ?? "");
    setTipAmount(order.tipAmount != null ? String(order.tipAmount) : "");
    setTipPercent(order.tipPercent != null ? String(order.tipPercent) : "");
    setTab("details");
    setMenuSearch("");
    setEditingNoteItemId(null);
    setMergeTargetId("");
  }, [order, open]);

  const filteredMenu = useMemo(() => {
    const q = menuSearch.trim().toLowerCase();
    return menuItems
      .filter((m) => m.inStock && m.price != null)
      .filter((m) => !q || m.name.toLowerCase().includes(q))
      .slice(0, 12);
  }, [menuItems, menuSearch]);

  const isTerminal = order?.status === "completed" || order?.status === "cancelled";
  const canEditItems = !isTerminal;

  const handleSaveDetails = async () => {
    if (!order) return;
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
      toast.success("Order updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save order");
    } finally {
      setSaving(false);
    }
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

  const handleVoid = async (itemId: string, itemName: string) => {
    if (!order) return;
    const reason = window.prompt(`Reason for voiding "${itemName}"?`, "Kitchen error")?.trim();
    if (!reason) return;
    await voidOrderItem(order.id, itemId, reason, staffId);
  };

  const handleComp = async (itemId: string, itemName: string) => {
    if (!order) return;
    const reason = window.prompt(`Reason for comping "${itemName}"?`, "Guest recovery")?.trim();
    if (!reason) return;
    await compOrderItem(order.id, itemId, reason);
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
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent
          hideClose
          className="glass-modal max-w-2xl max-h-[90vh] overflow-hidden border-white/10 bg-zinc-900/95 backdrop-blur-xl p-0 flex flex-col gap-0"
        >
          <Tabs value={tab} onValueChange={setTab} className="flex flex-col flex-1 min-h-0">
            {/* Header */}
            <div className="relative shrink-0 border-b border-white/10 bg-gradient-to-b from-amber-500/[0.08] via-zinc-900/40 to-zinc-900/80">
              <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />

              <div className="px-5 pt-4 pb-3">
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
                  onClick={onClose}
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
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-800/70 border border-white/5 text-zinc-300"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="px-5 pb-3">
                <TabsList className="h-10 w-full grid grid-cols-3 rounded-xl bg-zinc-950/60 border border-white/10 p-1 text-zinc-500">
                  <TabsTrigger
                    value="details"
                    className="rounded-lg text-xs font-semibold data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 data-[state=active]:shadow-sm data-[state=inactive]:hover:text-zinc-300"
                  >
                    Details
                  </TabsTrigger>
                  <TabsTrigger
                    value="items"
                    className="group rounded-lg text-xs font-semibold data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 data-[state=active]:shadow-sm data-[state=inactive]:hover:text-zinc-300"
                  >
                    Items
                    <span className="ml-1.5 tabular-nums text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-700/80 group-data-[state=active]:bg-amber-500/20 group-data-[state=active]:text-amber-400">
                      {order.items.length}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="actions"
                    className="rounded-lg text-xs font-semibold data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 data-[state=active]:shadow-sm data-[state=inactive]:hover:text-zinc-300"
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
              <div className="px-5 py-3 border-t border-white/5 flex gap-2">
                <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-white/10 text-sm text-zinc-400 hover:bg-zinc-800">
                  Close
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleSaveDetails()}
                  className={cn("flex-[2] py-2.5 rounded-lg text-sm font-bold", DASH_PRIMARY_CTA, saving && "opacity-60")}
                >
                  {saving ? "Saving…" : "Save details"}
                </button>
              </div>
            </TabsContent>

            <TabsContent value="items" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden flex flex-col">
              <ScrollArea className="flex-1 px-5 py-3 max-h-[min(44vh,400px)]">
                <div className="space-y-2">
                  {order.items.length === 0 ? (
                    <p className="text-sm text-zinc-500 text-center py-6">No items on this order yet.</p>
                  ) : order.items.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        "rounded-xl border px-3 py-2.5",
                        item.voided ? "border-red-500/20 bg-red-500/5 opacity-70"
                          : item.comped ? "border-emerald-500/20 bg-emerald-500/5"
                            : "border-white/5 bg-zinc-800/40",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className={cn("text-sm font-medium text-zinc-100", (item.voided || item.comped) && "line-through")}>
                            {item.menuItemName}
                          </p>
                          {item.voided && <span className="text-[10px] font-semibold text-red-400">VOIDED</span>}
                          {item.comped && <span className="text-[10px] font-semibold text-emerald-400">COMP</span>}
                          {item.specialInstructions && editingNoteItemId !== item.id && (
                            <p className="text-[10px] text-zinc-500 italic mt-0.5">{item.specialInstructions}</p>
                          )}
                        </div>
                        <span className="text-sm font-semibold text-amber-400 tabular-nums">
                          ${(item.unitPrice * item.quantity).toFixed(2)}
                        </span>
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
                            <QtyBtn onClick={() => updateItemQuantity(order.id, item.id, item.quantity - 1)}><Minus size={12} /></QtyBtn>
                            <span className="w-6 text-center text-xs font-bold tabular-nums">{item.quantity}</span>
                            <QtyBtn onClick={() => updateItemQuantity(order.id, item.id, item.quantity + 1)}><Plus size={12} /></QtyBtn>
                          </div>
                          <div className="flex items-center gap-1">
                            <IconBtn title="Edit note" onClick={() => { setEditingNoteItemId(item.id); setNoteDraft(item.specialInstructions ?? ""); }}>
                              <StickyNote size={12} />
                            </IconBtn>
                            <IconBtn title="Void item" onClick={() => void handleVoid(item.id, item.menuItemName)}>
                              <Ban size={12} className="text-red-400" />
                            </IconBtn>
                            <IconBtn title="Comp item" onClick={() => void handleComp(item.id, item.menuItemName)}>
                              <Gift size={12} className="text-emerald-400" />
                            </IconBtn>
                            <IconBtn title="Remove" onClick={() => removeItemFromOrder(order.id, item.id)}>
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
            </TabsContent>

            <TabsContent value="actions" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
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
                  <div className="mt-4 rounded-xl border border-white/5 bg-zinc-800/30 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1.5">
                      <Merge size={12} /> Merge into another order
                    </p>
                    <p className="text-[11px] text-zinc-600 mb-2">Items from this order move into the selected order; this order is cancelled.</p>
                    <select
                      value={mergeTargetId}
                      onChange={(e) => setMergeTargetId(e.target.value)}
                      className="w-full h-9 rounded-md border border-white/10 bg-zinc-950 px-2 text-sm text-zinc-100 mb-2"
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
                      className={cn("w-full py-2 rounded-lg text-xs font-semibold", DASH_BTN_ADD, !mergeTargetId && "opacity-50")}
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
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

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
