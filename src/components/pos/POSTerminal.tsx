import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, ClipboardList, PauseCircle, Map, Printer, Send, Pause, Tag } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import { useAuth } from "@/context/AuthContext";
import type { POSCartItem, Order, OrderType, MenuItem } from "@/types/dashboard";
import POSMenuGrid from "./POSMenuGrid";
import POSOrderPanel from "./POSOrderPanel";
import POSNewOrderModal from "./POSNewOrderModal";
import ManagerPinModal from "./ManagerPinModal";
import DiscountSelector from "./DiscountSelector";
import OpenOrdersList from "./OpenOrdersList";
import HeldOrdersList from "./HeldOrdersList";
import TableQuickSelect from "./TableQuickSelect";
import Receipt from "./Receipt";

const TAX_RATE = 0.0825;

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

export default function POSTerminal() {
  const {
    menuItems, orders, tables, createOrder, addItemToOrder, updateOrderStatus,
    heldOrders, holdOrder, resumeHeldOrder, discounts, activeShift, itemModifiers,
    voidOrderItem, compOrderItem, applyOrderDiscount, removeOrderDiscount,
    transferOrder, splitOrder,
  } = useDashboard();
  const { hasPermission } = useAuth();

  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [cart, setCart] = useState<POSCartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [showOpenOrders, setShowOpenOrders] = useState(false);
  const [showHeldOrders, setShowHeldOrders] = useState(false);
  const [showTableSelect, setShowTableSelect] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  const [showReceipt, setShowReceipt] = useState<Order | null>(null);
  const [pinAction, setPinAction] = useState<{ type: string; callback: (staffId: string) => void } | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const currentOrder = useMemo(
    () => (currentOrderId ? orders.find((o) => o.id === currentOrderId) ?? null : null),
    [currentOrderId, orders],
  );

  const { subtotal, tax, total } = useMemo(() => {
    if (currentOrder) {
      return { subtotal: currentOrder.subtotal, tax: currentOrder.tax, total: currentOrder.total };
    }
    const sub = cart.reduce(
      (s, i) => s + (i.unitPrice + i.modifiers.reduce((a, m) => a + m.priceAdjustment, 0)) * i.quantity,
      0,
    );
    const t = sub * TAX_RATE;
    return { subtotal: sub, tax: t, total: sub + t };
  }, [cart, currentOrder]);

  // ── Cart helpers ──────────────────────────────────────────────────────────

  const addToCart = useCallback((item: MenuItem) => {
    if (item.price == null) return;
    setCart((prev) => {
      const idx = prev.findIndex((c) => c.menuItemId === item.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [...prev, {
        menuItemId: item.id, name: item.name, unitPrice: item.price!,
        quantity: 1, specialInstructions: "", dietType: item.dietType, modifiers: [],
      }];
    });
  }, []);

  const updateCartQty = useCallback((menuItemId: string, delta: number) => {
    setCart((prev) =>
      prev.flatMap((c) => {
        if (c.menuItemId !== menuItemId) return [c];
        const q = c.quantity + delta;
        return q > 0 ? [{ ...c, quantity: q }] : [];
      }),
    );
  }, []);

  const removeCartItem = useCallback((menuItemId: string) => {
    setCart((prev) => prev.filter((c) => c.menuItemId !== menuItemId));
  }, []);

  const updateCartInstructions = useCallback((menuItemId: string, instructions: string) => {
    setCart((prev) => prev.map((c) => (c.menuItemId === menuItemId ? { ...c, specialInstructions: instructions } : c)));
  }, []);

  // ── Order actions ─────────────────────────────────────────────────────────

  const clearState = () => {
    setCurrentOrderId(null);
    setCart([]);
    setSelectedItemId(null);
  };

  const handleNewOrder = useCallback(
    async (config: { tableId: string; orderType: OrderType; guestName: string; partySize: number; customerPhone?: string }) => {
      const order = await createOrder(config.tableId, config.orderType, config.guestName, config.partySize, config.customerPhone);
      for (const item of cart) {
        addItemToOrder(order.id, item.menuItemId, item.quantity, item.specialInstructions, item.dietType);
      }
      setCurrentOrderId(order.id);
      setCart([]);
    },
    [cart, createOrder, addItemToOrder],
  );

  const handleSendToKitchen = useCallback(() => {
    if (!currentOrderId) return;
    updateOrderStatus(currentOrderId, "preparing");
    clearState();
  }, [currentOrderId, updateOrderStatus]);

  const handleHoldOrder = useCallback(async () => {
    if (cart.length === 0 && !currentOrderId) return;
    await holdOrder(
      currentOrderId
        ? { orderId: currentOrderId }
        : { cart, timestamp: Date.now() },
      "Held from POS",
    );
    clearState();
  }, [cart, currentOrderId, holdOrder]);

  const handleVoidItem = useCallback((itemId: string) => {
    if (!currentOrderId) return;
    setPinAction({
      type: "Void Item",
      callback: (staffId) => {
        voidOrderItem(currentOrderId, itemId, "Voided via POS", staffId);
        setPinAction(null);
      },
    });
  }, [currentOrderId, voidOrderItem]);

  const handleCompItem = useCallback((itemId: string) => {
    if (!currentOrderId) return;
    setPinAction({
      type: "Comp Item",
      callback: (staffId) => {
        compOrderItem(currentOrderId, itemId, "Comped via POS");
        setPinAction(null);
      },
    });
  }, [currentOrderId, compOrderItem]);

  const handleOpenOrder = useCallback((order: Order) => {
    setCurrentOrderId(order.id);
    setCart([]);
    setShowOpenOrders(false);
  }, []);

  const handleResumeHeld = useCallback(async (heldId: string) => {
    const held = await resumeHeldOrder(heldId);
    if (!held) return;
    const data = held.orderData as Record<string, unknown>;
    if (data.orderId) {
      setCurrentOrderId(data.orderId as string);
    } else if (data.cart) {
      setCart(data.cart as POSCartItem[]);
    }
    setShowHeldOrders(false);
  }, [resumeHeldOrder]);

  const handleTransferTable = useCallback(async (tableId: string) => {
    if (!currentOrderId) return;
    await transferOrder(currentOrderId, tableId);
    setShowTableSelect(false);
  }, [currentOrderId, transferOrder]);

  // ── Derived state ─────────────────────────────────────────────────────────

  const isCartMode = !currentOrderId;
  const hasItems = isCartMode ? cart.length > 0 : (currentOrder?.items.length ?? 0) > 0;
  const openOrders = orders.filter((o) => ["pending", "preparing"].includes(o.status));

  // ── Bottom bar buttons ────────────────────────────────────────────────────

  const bottomActions = [
    { label: "New Order", icon: Plus, onClick: () => setShowNewOrder(true) },
    { label: "Open Orders", icon: ClipboardList, onClick: () => setShowOpenOrders(true), badge: openOrders.length || undefined },
    { label: "Held", icon: PauseCircle, onClick: () => setShowHeldOrders(true), badge: heldOrders.length || undefined },
    { label: "Tables", icon: Map, onClick: () => setShowTableSelect(true) },
    { label: "Print", icon: Printer, onClick: () => currentOrder && setShowReceipt(currentOrder), disabled: !currentOrder },
  ];

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950 text-zinc-100">
      {/* Main area */}
      <div className="flex flex-1 min-h-0 gap-px">
        {/* Left: Menu */}
        <div className="w-[65%] p-4 overflow-hidden flex flex-col">
          <POSMenuGrid
            menuItems={menuItems}
            onAddItem={isCartMode ? addToCart : (item) => currentOrderId && addItemToOrder(currentOrderId, item.id, 1, undefined, item.dietType)}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </div>

        {/* Right: Order panel */}
        <div className="w-[35%] flex flex-col border-l border-white/5 bg-zinc-900/80">
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/5 shrink-0">
            <h2 className="text-sm font-bold text-zinc-100 truncate">
              {currentOrder
                ? `Order #${currentOrder.id.slice(-6).toUpperCase()} — Table ${currentOrder.tableNumber}`
                : "New Order"}
            </h2>
            {currentOrder && (
              <p className="text-xs text-zinc-500 mt-0.5">{currentOrder.guestName} · {currentOrder.items.length} items</p>
            )}
          </div>

          {/* Items */}
          <div className="flex-1 overflow-auto p-3">
            <POSOrderPanel
              mode={isCartMode ? "cart" : "order"}
              cartItems={cart}
              order={currentOrder}
              onUpdateCartQty={updateCartQty}
              onRemoveCartItem={removeCartItem}
              onUpdateCartInstructions={updateCartInstructions}
              onVoidItem={handleVoidItem}
              onCompItem={handleCompItem}
              selectedItemId={selectedItemId}
              onSelectItem={setSelectedItemId}
            />
          </div>

          {/* Totals */}
          <div className="px-4 py-3 border-t border-white/5 space-y-1.5 shrink-0">
            <div className="flex justify-between text-xs text-zinc-400">
              <span>Subtotal</span><span className="tabular-nums">{fmt(subtotal)}</span>
            </div>
            {currentOrder?.discountTotal ? (
              <div className="flex justify-between text-xs text-emerald-400">
                <span>Discounts</span><span className="tabular-nums">-{fmt(currentOrder.discountTotal)}</span>
              </div>
            ) : null}
            <div className="flex justify-between text-xs text-zinc-400">
              <span>Tax</span><span className="tabular-nums">{fmt(tax)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-amber-400 pt-1 border-t border-white/5">
              <span>Total</span><span className="tabular-nums">{fmt(total)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="px-3 pb-3 flex gap-2 shrink-0">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleHoldOrder}
              disabled={!hasItems}
              className="flex-1 min-h-12 rounded-xl bg-zinc-800 border border-white/10 text-zinc-300 text-xs font-semibold flex items-center justify-center gap-1.5 touch-manipulation disabled:opacity-30"
            >
              <Pause size={14} strokeWidth={1.5} /> Hold
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowDiscount(true)}
              disabled={!currentOrderId}
              className="flex-1 min-h-12 rounded-xl bg-zinc-800 border border-white/10 text-zinc-300 text-xs font-semibold flex items-center justify-center gap-1.5 touch-manipulation disabled:opacity-30"
            >
              <Tag size={14} strokeWidth={1.5} /> Discount
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={isCartMode ? () => cart.length > 0 && setShowNewOrder(true) : handleSendToKitchen}
              disabled={!hasItems}
              className="flex-[2] min-h-12 rounded-xl bg-amber-500 text-black text-xs font-bold flex items-center justify-center gap-1.5 touch-manipulation disabled:opacity-30 hover:bg-amber-400 transition-colors"
            >
              <Send size={14} strokeWidth={2} />
              {isCartMode ? "Create Order" : "Send to Kitchen"}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-t border-white/5 bg-zinc-900/60 shrink-0">
        {bottomActions.map(({ label, icon: Icon, onClick, badge, disabled }) => (
          <motion.button
            key={label}
            whileTap={{ scale: 0.93 }}
            onClick={onClick}
            disabled={disabled}
            className="relative flex-1 min-h-12 rounded-xl bg-zinc-800/60 border border-white/5 flex flex-col items-center justify-center gap-0.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors touch-manipulation disabled:opacity-30"
          >
            <Icon size={18} strokeWidth={1.5} />
            <span className="text-[10px] font-medium">{label}</span>
            {badge != null && badge > 0 && (
              <span className="absolute top-1 right-2 min-w-[18px] h-[18px] rounded-full bg-amber-500 text-black text-[10px] font-bold flex items-center justify-center px-1">
                {badge}
              </span>
            )}
          </motion.button>
        ))}
      </div>

      {/* Modals / Overlays */}
      <POSNewOrderModal open={showNewOrder} onClose={() => setShowNewOrder(false)} tables={tables} onConfirm={handleNewOrder} />

      <ManagerPinModal
        open={!!pinAction}
        onClose={() => setPinAction(null)}
        onVerified={(staffId) => pinAction?.callback(staffId)}
        actionDescription={pinAction?.type ?? ""}
      />

      {showDiscount && currentOrderId && (
        <DiscountSelector
          open={showDiscount}
          onApply={(d, approvedBy) => {
            applyOrderDiscount(currentOrderId, d, approvedBy);
            setShowDiscount(false);
          }}
          onClose={() => setShowDiscount(false)}
        />
      )}
      <OpenOrdersList open={showOpenOrders} onSelectOrder={handleOpenOrder} onClose={() => setShowOpenOrders(false)} />
      <HeldOrdersList open={showHeldOrders} onResume={handleResumeHeld} onClose={() => setShowHeldOrders(false)} />
      <TableQuickSelect open={showTableSelect} onSelectTable={handleTransferTable} onClose={() => setShowTableSelect(false)} />
      <Receipt order={showReceipt} open={!!showReceipt} onClose={() => setShowReceipt(null)} />
    </div>
  );
}
