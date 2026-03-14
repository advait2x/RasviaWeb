import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { NavView, WaitlistEntry, TableInfo, MenuItem, MealTime, AppNotification, Order, OrderItem, OrderStatus, OrderType, DietType, CompletedTableSession, Shift, Discount, ItemModifier, HeldOrder, OrderDiscount } from "@/types/dashboard";
import { initialTables } from "@/data/mock-data";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface DashboardState {
  activeView: NavView;
  setActiveView: (view: NavView) => void;
  waitlistOpen: boolean;
  setWaitlistOpen: (open: boolean) => void;
  currentWaitTime: number;
  setCurrentWaitTime: (time: number) => void;
  waitlist: WaitlistEntry[];
  waitlistLoading: boolean;
  tables: TableInfo[];
  menuItems: MenuItem[];
  menuLoading: boolean;
  notifications: AppNotification[];
  unreadCount: number;
  orders: Order[];
  completedSessions: CompletedTableSession[];
  addWalkIn: (partyLeaderName: string, partySize: number, phone: string) => Promise<void>;
  bulkAddWalkIns: (entries: { guestName: string; partySize: number; phone: string; minutesAgo: number }[]) => Promise<void>;
  clearAllWaitlist: () => Promise<void>;
  seatParty: (waitlistId: string, tableId: string) => Promise<void>;
  cancelParty: (waitlistId: string) => Promise<void>;
  notifyParty: (waitlistId: string) => Promise<void>;
  toggleMenuItem: (itemId: string) => void;
  addMenuItem: (data: Omit<MenuItem, "id">, force?: boolean) => Promise<void>;
  updateMenuItem: (id: string, data: Partial<Omit<MenuItem, "id">>) => Promise<void>;
  deleteMenuItem: (id: string) => Promise<void>;
  markNotificationsRead: () => void;
  clearTable: (tableId: string) => void;
  quickSeatNext: (tableId: string) => Promise<WaitlistEntry | null>;
  setTableStatus: (tableId: string, status: TableInfo["status"]) => void;
  addTable: (capacity: number) => void;
  removeTable: (tableId: string) => void;
  combineTablesForParty: (tableIds: string[]) => string | null;
  splitCombinedTable: (combinedId: string) => void;
  createOrder: (tableId: string, orderType: OrderType, guestName?: string, partySize?: number, customerPhone?: string) => Promise<Order>;
  addItemToOrder: (orderId: string, menuItemId: string, qty: number, specialInstructions?: string, dietType?: DietType) => void;
  removeItemFromOrder: (orderId: string, itemId: string) => void;
  updateItemQuantity: (orderId: string, itemId: string, qty: number) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  getOrdersForTable: (tableId: string) => Order[];
  clearTableWithTip: (tableId: string, tipAmount: number, tipPercent: number, notes?: string) => Promise<void>;
  notifyCustomer: (orderId: string) => void;
  preorderCount: number;

  // POS functions
  discounts: Discount[];
  itemModifiers: ItemModifier[];
  heldOrders: HeldOrder[];
  activeShift: Shift | null;
  completedOrders: Order[];

  voidOrderItem: (orderId: string, itemId: string, reason: string, approvedBy: string) => Promise<void>;
  compOrderItem: (orderId: string, itemId: string, reason: string) => Promise<void>;
  applyOrderDiscount: (orderId: string, discount: { name: string; type: "percentage" | "fixed"; value: number; discountId?: string }, approvedBy?: string) => Promise<void>;
  removeOrderDiscount: (orderId: string, discountId: string) => Promise<void>;
  transferOrder: (orderId: string, newTableId: string) => Promise<void>;
  splitOrder: (orderId: string, itemIds: string[]) => Promise<Order | null>;
  mergeOrders: (orderIds: string[]) => Promise<void>;
  holdOrder: (orderData: Record<string, unknown>, reason?: string) => Promise<void>;
  resumeHeldOrder: (heldOrderId: string) => Promise<HeldOrder | null>;

  openShift: (startingCash: number) => Promise<Shift | null>;
  closeShift: (endingCash: number, notes?: string) => Promise<void>;
  addCashDrawerLog: (type: "pay_in" | "pay_out" | "tip_out", amount: number, reason: string, approvedBy?: string) => Promise<void>;

  fetchCompletedOrders: (dateFrom?: Date, dateTo?: Date) => Promise<Order[]>;
}

const DashboardContext = createContext<DashboardState | null>(null);

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
}

function mapRow(row: Record<string, unknown>): WaitlistEntry {
  return {
    id: row.id as string,
    guestName: row.party_leader_name
      ? `${row.party_leader_name}'s Party`
      : (row.name ?? row.guest_name ?? "Guest") as string,
    partySize: row.party_size as number,
    phone: (row.phone_number ?? row.phone ?? "") as string,
    addedAt: new Date(row.created_at as string),
    status: row.status as WaitlistEntry["status"],
    notifiedAt: row.notified_at ? new Date(row.notified_at as string) : undefined,
  };
}

function mapMenuItem(row: Record<string, unknown>): MenuItem {
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string) ?? "",
    price: row.price != null ? Number(row.price) : null,
    imageUrl: (row.image_url as string) ?? null,
    mealTimes: ((row.meal_times as string[]) ?? []) as MealTime[],
    inStock: (row.in_stock as boolean) ?? true,
  };
}

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const { restaurantId } = useAuth();

  const [activeView, setActiveView] = useState<NavView>("dashboard");
  const [waitlistOpen, setWaitlistOpen] = useState(true);
  const [currentWaitTime, setCurrentWaitTime] = useState(25);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [waitlistLoading, setWaitlistLoading] = useState(true);
  const [tables, setTables] = useState<TableInfo[]>(initialTables);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [completedSessions, setCompletedSessions] = useState<CompletedTableSession[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [itemModifiers, setItemModifiers] = useState<ItemModifier[]>([]);
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([]);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);

  const TAX_RATE = 0.0825;

  // Prevent notification spam on first load
  const waitlistInitialized = useRef(false);

  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  // ── Waitlist fetching ─────────────────────────────────────────────────────

  const fetchEntries = useCallback(async () => {
    if (!restaurantId) return;
    const { data, error } = await supabase
      .from("waitlist_entries")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .in("status", ["waiting"])
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to fetch waitlist:", error.message);
      return;
    }
    setWaitlist((data ?? []).map(mapRow));
    setWaitlistLoading(false);
    waitlistInitialized.current = true;
  }, [restaurantId]);

  const fetchRef = useRef(fetchEntries);
  fetchRef.current = fetchEntries;

  useEffect(() => {
    if (!restaurantId) {
      setWaitlist([]);
      setWaitlistLoading(false);
      return;
    }

    waitlistInitialized.current = false;
    setWaitlistLoading(true);
    fetchRef.current();

    const channel = supabase
      .channel(`waitlist-${restaurantId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "waitlist_entries", filter: `restaurant_id=eq.${restaurantId}` },
        (payload) => {
          fetchRef.current();

          if (!waitlistInitialized.current) return;
          const row = payload.new as Record<string, unknown>;
          const eventType = payload.eventType;

          if (eventType === "INSERT" && row.status === "waiting") {
            const entry = mapRow(row);
            const notif: AppNotification = {
              id: `n-${Date.now()}-${Math.random()}`,
              type: "joined",
              guestName: entry.guestName,
              partySize: entry.partySize,
              timestamp: new Date(),
              read: false,
            };
            setNotifications((prev) => [notif, ...prev]);
            toast(`${entry.guestName} joined the waitlist`, {
              description: `Party of ${entry.partySize}`,
            });
          }

          if (eventType === "UPDATE" && row.status === "cancelled") {
            const entry = mapRow(row);
            const notif: AppNotification = {
              id: `n-${Date.now()}-${Math.random()}`,
              type: "left",
              guestName: entry.guestName,
              partySize: entry.partySize,
              timestamp: new Date(),
              read: false,
            };
            setNotifications((prev) => [notif, ...prev]);
            toast(`${entry.guestName} left the waitlist`, {
              description: `Party of ${entry.partySize}`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId]);

  // ── Menu items fetching ───────────────────────────────────────────────────

  const fetchMenuItems = useCallback(async () => {
    if (!restaurantId) return;
    const { data, error } = await supabase
      .from("menu_items")
      .select("*")
      .eq("restaurant_id", restaurantId);

    if (error) {
      console.error("fetchMenuItems failed:", error.message);
      setMenuLoading(false);
      return;
    }

    // Sort array in memory by name
    const items = (data ?? []).map(mapMenuItem).sort((a, b) => a.name.localeCompare(b.name));
    setMenuItems(items);
    setMenuLoading(false);
  }, [restaurantId]);

  const fetchMenuRef = useRef(fetchMenuItems);
  fetchMenuRef.current = fetchMenuItems;

  useEffect(() => {
    if (!restaurantId) {
      setMenuItems([]);
      setMenuLoading(false);
      return;
    }

    setMenuLoading(true);
    fetchMenuRef.current();

    const channel = supabase
      .channel(`menu-${restaurantId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "menu_items" },
        () => fetchMenuRef.current()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId]);

  // ── Waitlist mutations ────────────────────────────────────────────────────

  const addWalkIn = useCallback(async (partyLeaderName: string, partySize: number, phone: string) => {
    if (!restaurantId) return;
    const { error } = await supabase.from("waitlist_entries").insert({
      restaurant_id: restaurantId,
      name: `${partyLeaderName}'s Party`,
      party_leader_name: partyLeaderName,
      party_size: partySize,
      phone_number: phone,
      status: "waiting",
    });
    if (error) console.error("addWalkIn failed:", error.message);
  }, [restaurantId]);

  const bulkAddWalkIns = useCallback(
    async (entries: { guestName: string; partySize: number; phone: string; minutesAgo: number }[]) => {
      if (!restaurantId) return;
      for (const e of entries) {
        const { error } = await supabase.from("waitlist_entries").insert({
          restaurant_id: restaurantId,
          name: e.guestName,
          party_size: e.partySize,
          phone_number: e.phone,
          status: "waiting",
        });
        if (error) {
          console.error("Debug insert failed:", error.message, error.details);
          alert(`Debug insert failed: ${error.message}\n\nCheck the browser console for details.`);
          return;
        }
      }
    },
    [restaurantId]
  );

  const clearAllWaitlist = useCallback(async () => {
    if (!restaurantId) return;
    const waitingIds = waitlist.filter((w) => w.status === "waiting").map((w) => w.id);
    if (waitingIds.length === 0) return;
    const { error } = await supabase
      .from("waitlist_entries")
      .update({ status: "cancelled" })
      .in("id", waitingIds);
    if (error) console.error("clearAllWaitlist failed:", error.message);
  }, [restaurantId, waitlist]);

  const seatParty = useCallback(async (waitlistId: string, tableId: string) => {
    const entry = waitlist.find((w) => w.id === waitlistId);
    if (!entry) return;

    const { error } = await supabase
      .from("waitlist_entries")
      .update({ status: "seated" })
      .eq("id", waitlistId);

    if (error) {
      console.error("seatParty failed:", error.message);
      return;
    }

    setTables((prev) =>
      prev.map((t) =>
        t.id === tableId
          ? { ...t, status: "occupied" as const, seatedAt: new Date(), guestName: entry.guestName, partySize: entry.partySize }
          : t
      )
    );
  }, [waitlist]);

  const cancelParty = useCallback(async (waitlistId: string) => {
    const { error } = await supabase
      .from("waitlist_entries")
      .update({ status: "cancelled" })
      .eq("id", waitlistId);
    if (error) console.error("cancelParty failed:", error.message);
  }, []);

  const notifyParty = useCallback(async (waitlistId: string) => {
    const { error } = await supabase
      .from("waitlist_entries")
      .update({ notified_at: new Date().toISOString() })
      .eq("id", waitlistId);
    if (error) console.error("notifyParty failed:", error.message);
  }, []);

  // ── Menu mutations ────────────────────────────────────────────────────────

  const toggleMenuItem = useCallback((itemId: string) => {
    const item = menuItems.find((m) => m.id === itemId);
    if (!item) return;
    const newInStock = !item.inStock;
    setMenuItems((prev) => prev.map((m) => (m.id === itemId ? { ...m, inStock: newInStock } : m)));
    supabase
      .from("menu_items")
      .update({ in_stock: newInStock })
      .eq("id", itemId)
      .then(({ error }) => {
        if (error) {
          console.error("toggleMenuItem failed:", error.message);
          setMenuItems((prev) => prev.map((m) => (m.id === itemId ? { ...m, inStock: item.inStock } : m)));
        }
      });
  }, [menuItems]);

  const addMenuItem = useCallback(async (data: Omit<MenuItem, "id">, force: boolean = false) => {
    if (!restaurantId) throw new Error("Not authenticated");

    // Check for duplicates
    if (!force) {
      const isDuplicate = menuItems.some(
        (item) => item.name.trim().toLowerCase() === data.name.trim().toLowerCase()
      );

      if (isDuplicate) {
        throw new Error("Duplicate Item");
      }
    }

    const { data: insertedData, error } = await supabase.from("menu_items").insert({
      restaurant_id: restaurantId,
      name: data.name,
      description: data.description,
      price: data.price,
      image_url: data.imageUrl,
      meal_times: data.mealTimes,
      in_stock: data.inStock,
    }).select().single();
    if (error) throw new Error(error.message);
    if (insertedData) {
      setMenuItems((prev) => [...prev, mapMenuItem(insertedData)]);
    }
  }, [restaurantId, menuItems]);

  const updateMenuItem = useCallback(async (id: string, data: Partial<Omit<MenuItem, "id">>) => {
    const patch: Record<string, unknown> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.description !== undefined) patch.description = data.description;
    if (data.price !== undefined) patch.price = data.price;
    if (data.imageUrl !== undefined) patch.image_url = data.imageUrl;
    if (data.mealTimes !== undefined) patch.meal_times = data.mealTimes;
    if (data.inStock !== undefined) patch.in_stock = data.inStock;
    const { data: updatedData, error } = await supabase.from("menu_items").update(patch).eq("id", id).select().single();
    if (error) throw new Error(error.message);
    if (updatedData) {
      setMenuItems((prev) => prev.map((m) => m.id === id ? mapMenuItem(updatedData) : m));
    }
  }, []);

  const deleteMenuItem = useCallback(async (id: string) => {
    const { error } = await supabase.from("menu_items").delete().eq("id", id);
    if (error) {
      console.error("deleteMenuItem failed:", error.message);
    } else {
      setMenuItems((prev) => prev.filter((m) => m.id !== id));
    }
  }, []);

  // ── Notification helpers ──────────────────────────────────────────────────

  const markNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  // ── Table mutations ───────────────────────────────────────────────────────

  const clearTable = useCallback((tableId: string) => {
    setTables((prev) => {
      const target = prev.find((t) => t.id === tableId);
      if (target?.combinedTableIds && target.combinedTableIds.length > 0) {
        // Restore child tables and remove the combined virtual table
        return prev
          .filter((t) => t.id !== tableId)
          .map((t) =>
            target.combinedTableIds!.includes(t.id)
              ? { ...t, isCombinedChild: false, status: "available" as const }
              : t
          );
      }
      return prev.map((t) =>
        t.id === tableId
          ? { ...t, status: "available" as const, seatedAt: undefined, guestName: undefined, partySize: undefined }
          : t
      );
    });
  }, []);

  const setTableStatus = useCallback((tableId: string, status: TableInfo["status"]) => {
    setTables((prev) =>
      prev.map((t) =>
        t.id === tableId
          ? { ...t, status, seatedAt: undefined, guestName: undefined, partySize: undefined }
          : t
      )
    );
  }, []);

  const addTable = useCallback((capacity: number) => {
    setTables((prev) => {
      const maxNumber = prev.reduce((max, t) => Math.max(max, t.tableNumber), 0);
      const newTable: TableInfo = {
        id: `t-${Date.now()}`,
        tableNumber: maxNumber + 1,
        capacity,
        status: "available",
      };
      return [...prev, newTable];
    });
  }, []);

  const removeTable = useCallback((tableId: string) => {
    setTables((prev) => prev.filter((t) => t.id !== tableId));
  }, []);

  const combineTablesForParty = useCallback((tableIds: string[]): string | null => {
    const allTables = tables;
    const children = allTables.filter((t) => tableIds.includes(t.id));
    if (children.length < 2) return null;
    const totalCapacity = children.reduce((sum, t) => sum + t.capacity, 0);
    const numbers = children.map((t) => t.tableNumber).sort((a, b) => a - b);
    const newId = `combined-${Date.now()}`;
    const combinedTable: TableInfo = {
      id: newId,
      tableNumber: numbers[0],
      capacity: totalCapacity,
      status: "available",
      combinedTableIds: tableIds,
    };
    setTables((prev) => [
      ...prev.map((t) =>
        tableIds.includes(t.id) ? { ...t, isCombinedChild: true } : t
      ),
      combinedTable,
    ]);
    return newId;
  }, [tables]);

  const splitCombinedTable = useCallback((combinedId: string) => {
    setTables((prev) => {
      const combined = prev.find((t) => t.id === combinedId);
      if (!combined?.combinedTableIds) return prev;
      return prev
        .filter((t) => t.id !== combinedId)
        .map((t) =>
          combined.combinedTableIds!.includes(t.id)
            ? { ...t, isCombinedChild: false, status: "available" as const }
            : t
        );
    });
  }, []);

  const quickSeatNext = useCallback(async (tableId: string): Promise<WaitlistEntry | null> => {
    const table = tables.find((t) => t.id === tableId);
    if (!table) return null;
    const waiting = waitlist.filter((w) => w.status === "waiting" && w.partySize <= table.capacity);
    if (waiting.length === 0) return null;
    const next = waiting[0];
    await seatParty(next.id, tableId);
    return next;
  }, [waitlist, tables, seatParty]);

  // ── Order helpers ─────────────────────────────────────────────────────────

  const TAX_RATE_LOCAL = TAX_RATE; // keep reference accessible inside closures

  // DB and app now both use 'pending' — no mapping needed

  // Parse metadata stored in the notes field as JSON
  const parseMeta = (notes: string | null): Record<string, unknown> => {
    if (!notes) return {};
    try { return JSON.parse(notes); } catch { return {}; }
  };

  const mapOrder = useCallback((
    row: Record<string, unknown>,
    itemRows: Record<string, unknown>[]
  ): Order => {
    const meta = parseMeta(row.notes as string | null);
    const items: OrderItem[] = itemRows.map((ir) => {
      const itemMeta = parseMeta(ir.notes as string | null);
      return {
        id: String(ir.id),
        menuItemId: String(ir.menu_item_id ?? ""),
        menuItemName: ir.name as string,
        quantity: ir.quantity as number,
        unitPrice: Number(ir.price),
        specialInstructions: (itemMeta.specialInstructions as string) || undefined,
        dietType: (itemMeta.dietType as DietType) || ((ir.is_vegetarian as boolean) ? "veg" : undefined),
      };
    });
    const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    const tax = Math.round(subtotal * TAX_RATE_LOCAL * 100) / 100;
    return {
      id: String(row.id),
      tableId: (meta.tableId as string) ?? "",
      tableNumber: Number(row.table_number) || 0,
      guestName: (row.customer_name as string) ?? (meta.guestName as string) ?? "Guest",
      partySize: (row.party_size as number) ?? 1,
      items,
      status: row.status as OrderStatus,
      orderType: row.order_type as OrderType,
      createdAt: new Date(row.created_at as string),
      updatedAt: row.updated_at ? new Date(row.updated_at as string) : (row.closed_at ? new Date(row.closed_at as string) : new Date(row.created_at as string)),
      completedAt: row.closed_at ? new Date(row.closed_at as string) : undefined,
      subtotal,
      tax,
      total: Math.round((subtotal + tax) * 100) / 100,
      tipAmount: row.tip_amount ? Number(row.tip_amount) : undefined,
      tipPercent: row.tip_percent ? Number(row.tip_percent) : undefined,
      paymentMethod: (row.payment_method as "cash" | "card" | "other") ?? "cash",
      customerPhone: (row.customer_phone as string) || (meta.customerPhone as string) || undefined,
      customerNotifiedAt: meta.customerNotifiedAt ? new Date(meta.customerNotifiedAt as string) : undefined,
    };
  }, []);

  // ── Orders fetch + realtime ───────────────────────────────────────────────

  const fetchOrders = useCallback(async () => {
    if (!restaurantId) return;
    const { data: orderRows, error } = await supabase
      .from("orders")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .not("status", "in", "(completed,cancelled)")
      .order("created_at", { ascending: false });

    if (error) { console.error("fetchOrders failed:", error.message); return; }

    const ids = (orderRows ?? []).map((r) => r.id as number);
    let itemRows: Record<string, unknown>[] = [];
    if (ids.length > 0) {
      const { data: items } = await supabase
        .from("order_items")
        .select("*")
        .in("order_id", ids);
      itemRows = (items ?? []) as Record<string, unknown>[];
    }

    const mapped = (orderRows ?? []).map((row) =>
      mapOrder(
        row as Record<string, unknown>,
        itemRows.filter((ir) => ir.order_id === (row as Record<string, unknown>).id)
      )
    );
    setOrders(mapped);
  }, [restaurantId, mapOrder]);

  const fetchOrdersRef = useRef(fetchOrders);
  fetchOrdersRef.current = fetchOrders;

  useEffect(() => {
    if (!restaurantId) { setOrders([]); return; }
    fetchOrdersRef.current();

    const channel = supabase
      .channel(`orders-${restaurantId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `restaurant_id=eq.${restaurantId}` },
        (payload) => {
          fetchOrdersRef.current();
          // Toast on new takeout / pre-order coming in
          if (payload.eventType === "INSERT") {
            const row = payload.new as Record<string, unknown>;
            const meta = parseMeta(row.notes as string | null);
            const orderType = row.order_type as string;
            const guestName = (row.customer_name as string) ?? (meta.guestName as string) ?? "Guest";
            if (orderType === "takeout" || orderType === "pre_order") {
              const label = orderType === "takeout" ? "Takeout" : "Pre-Order";
              toast(`New ${label} order received`, {
                description: `Table ${row.table_number} · ${guestName}`,
              });
              setNotifications((prev) => [{
                id: `n-order-${Date.now()}`,
                type: "joined",
                guestName,
                partySize: (row.party_size as number) ?? 1,
                timestamp: new Date(),
                read: false,
              }, ...prev]);
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        () => fetchOrdersRef.current()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [restaurantId]);

  // ── Group session notifications ────────────────────────────────────────────

  useEffect(() => {
    if (!restaurantId) return;

    const channel = supabase
      .channel(`party-sessions-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "party_sessions",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          const sessionId = String(row.id ?? "");
          const hostName = (row.host_name as string) ?? (row.name as string) ?? "A guest";
          const partySize = (row.party_size as number) ?? 0;

          toast(`New group session started`, {
            description: `${hostName} created a group${partySize > 0 ? ` · Party of ${partySize}` : ""}`,
          });

          setNotifications((prev) => [
            {
              id: `n-group-${Date.now()}`,
              type: "group_created" as const,
              guestName: hostName,
              partySize,
              timestamp: new Date(),
              read: false,
              sessionId,
            },
            ...prev,
          ]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [restaurantId]);

  // ── Order mutations ───────────────────────────────────────────────────────

  const recalcOrderTotals = (items: OrderItem[]): { subtotal: number; tax: number; total: number } => {
    const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    const tax = Math.round(subtotal * TAX_RATE_LOCAL * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;
    return { subtotal, tax, total };
  };

  const createOrder = useCallback(async (tableId: string, orderType: OrderType, guestName?: string, partySize?: number, customerPhone?: string): Promise<Order> => {
    const table = tables.find((t) => t.id === tableId);
    const effectiveGuestName = guestName ?? table?.guestName ?? "Guest";
    const effectivePartySize = partySize ?? table?.partySize ?? 1;
    const tableNumber = table ? String(table.tableNumber) : "0";

    const meta = JSON.stringify({
      tableId,
    });

    const { data, error } = await supabase.from("orders").insert({
      restaurant_id: restaurantId,
      table_number: tableNumber,
      party_size: effectivePartySize,
      order_type: orderType,
      status: "pending",
      payment_method: "cash",
      customer_name: effectiveGuestName,
      customer_phone: customerPhone?.trim() || null,
      notes: meta,
    }).select().single();

    if (error || !data) {
      console.error("createOrder failed:", error?.message);
      // Fallback: return a local order so the UI doesn't break
      const fallback: Order = {
        id: `local-${Date.now()}`,
        tableId,
        tableNumber: table?.tableNumber ?? 0,
        guestName: effectiveGuestName,
        partySize: effectivePartySize,
        items: [],
        status: "pending",
        orderType,
        createdAt: new Date(),
        updatedAt: new Date(),
        subtotal: 0, tax: 0, total: 0,
        paymentMethod: "cash",
        customerPhone: customerPhone?.trim() || undefined,
      };
      setOrders((prev) => [fallback, ...prev]);
      return fallback;
    }

    const newOrder = mapOrder(data as Record<string, unknown>, []);
    setOrders((prev) => [newOrder, ...prev]);
    return newOrder;
  }, [tables, restaurantId, mapOrder]);

  const addItemToOrder = useCallback(async (orderId: string, menuItemId: string, qty: number, specialInstructions?: string, dietType?: DietType) => {
    const menuItem = menuItems.find((m) => m.id === menuItemId);
    if (!menuItem || menuItem.price == null) return;

    const itemMeta = JSON.stringify({
      specialInstructions: specialInstructions || undefined,
      dietType: dietType ?? menuItem.dietType,
    });

    const { data, error } = await supabase.from("order_items").insert({
      order_id: Number(orderId),
      menu_item_id: Number(menuItemId),
      name: menuItem.name,
      price: menuItem.price,
      quantity: qty,
      is_vegetarian: (dietType ?? menuItem.dietType) === "veg",
      notes: itemMeta,
    }).select().single();

    if (error) { console.error("addItemToOrder failed:", error.message); return; }

    // Optimistic update
    setOrders((prev) => prev.map((o) => {
      if (o.id !== orderId) return o;
      const newItem: OrderItem = {
        id: String((data as Record<string, unknown>).id),
        menuItemId,
        menuItemName: menuItem.name,
        quantity: qty,
        unitPrice: menuItem.price!,
        specialInstructions,
        dietType: dietType ?? menuItem.dietType,
      };
      const existing = o.items.find((i) => i.menuItemId === menuItemId && i.specialInstructions === (specialInstructions ?? ""));
      const items = existing
        ? o.items.map((i) => i.id === existing.id ? { ...i, quantity: i.quantity + qty } : i)
        : [...o.items, newItem];
      return { ...o, items, updatedAt: new Date(), ...recalcOrderTotals(items) };
    }));

    // Also update order subtotal in DB
    const order = orders.find((o) => o.id === orderId);
    if (order) {
      const newItems = [...order.items, { unitPrice: menuItem.price!, quantity: qty } as OrderItem];
      const { subtotal } = recalcOrderTotals(newItems);
      await supabase.from("orders").update({ subtotal }).eq("id", Number(orderId));
    }
  }, [menuItems, orders]);

  const removeItemFromOrder = useCallback(async (orderId: string, itemId: string) => {
    await supabase.from("order_items").delete().eq("id", Number(itemId));
    setOrders((prev) => prev.map((o) => {
      if (o.id !== orderId) return o;
      const items = o.items.filter((i) => i.id !== itemId);
      return { ...o, items, updatedAt: new Date(), ...recalcOrderTotals(items) };
    }));
  }, []);

  const updateItemQuantity = useCallback(async (orderId: string, itemId: string, qty: number) => {
    if (qty <= 0) { removeItemFromOrder(orderId, itemId); return; }
    await supabase.from("order_items").update({ quantity: qty }).eq("id", Number(itemId));
    setOrders((prev) => prev.map((o) => {
      if (o.id !== orderId) return o;
      const items = o.items.map((i) => i.id === itemId ? { ...i, quantity: qty } : i);
      return { ...o, items, updatedAt: new Date(), ...recalcOrderTotals(items) };
    }));
  }, [removeItemFromOrder]);

  const updateOrderStatus = useCallback(async (orderId: string, status: OrderStatus) => {
    const patch: Record<string, unknown> = { status };
    if (status === "completed" || status === "cancelled") patch.closed_at = new Date().toISOString();
    await supabase.from("orders").update(patch).eq("id", Number(orderId));
    setOrders((prev) => prev.map((o) => o.id !== orderId ? o : {
      ...o, status, updatedAt: new Date(),
      completedAt: status === "completed" || status === "cancelled" ? new Date() : o.completedAt,
    }));
  }, []);

  const getOrdersForTable = useCallback((tableId: string): Order[] => {
    return orders.filter((o) => o.tableId === tableId && o.status !== "completed" && o.status !== "cancelled");
  }, [orders]);

  const notifyCustomer = useCallback(async (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    const notifiedAt = new Date().toISOString();
    // Update the meta in notes to include notification timestamp
    const { data: row } = await supabase.from("orders").select("notes").eq("id", Number(orderId)).single();
    const currentMeta = row ? parseMeta((row as Record<string, unknown>).notes as string | null) : {};
    const newMeta = JSON.stringify({ ...currentMeta, customerNotifiedAt: notifiedAt });
    await supabase.from("orders").update({ notes: newMeta }).eq("id", Number(orderId));
    setOrders((prev) => prev.map((o) =>
      o.id !== orderId ? o : { ...o, customerNotifiedAt: new Date(notifiedAt) }
    ));
    toast(`Customer notified`, {
      description: `${order.guestName} · ${order.customerPhone}`,
    });
  }, [orders]);

  const clearTableWithTip = useCallback(async (tableId: string, tipAmount: number, tipPercent: number, notes?: string) => {
    const tableOrders = orders.filter((o) => o.tableId === tableId && o.status !== "completed" && o.status !== "cancelled");
    const orderTotal = tableOrders.reduce((sum, o) => sum + o.total, 0);

    // Bulk update all active orders to completed with tip info
    for (const o of tableOrders) {
      const { data: row } = await supabase.from("orders").select("notes").eq("id", Number(o.id)).single();
      const existingMeta = row ? parseMeta((row as Record<string, unknown>).notes as string | null) : {};
      await supabase.from("orders").update({
        status: "completed",
        closed_at: new Date().toISOString(),
        tip_amount: tipAmount,
        tip_percent: tipPercent,
        notes: JSON.stringify({ ...existingMeta, sessionNotes: notes }),
      }).eq("id", Number(o.id));
    }

    // Optimistic update local state
    setOrders((prev) => prev.map((o) => {
      if (o.tableId !== tableId || o.status === "completed" || o.status === "cancelled") return o;
      return { ...o, status: "completed" as const, completedAt: new Date(), updatedAt: new Date(), tipAmount, tipPercent };
    }));

    // Record session
    const table = tables.find((t) => t.id === tableId);
    if (table?.seatedAt) {
      const session: CompletedTableSession = {
        id: `session-${Date.now()}`,
        tableId,
        tableNumber: table.tableNumber,
        guestName: table.guestName ?? "Guest",
        partySize: table.partySize ?? 1,
        seatedAt: table.seatedAt,
        clearedAt: new Date(),
        durationMinutes: Math.floor((Date.now() - table.seatedAt.getTime()) / 60000),
        orderTotal,
        tipAmount,
        tipPercent,
        notes,
      };
      setCompletedSessions((prev) => [session, ...prev]);
    }

    clearTable(tableId);
  }, [orders, tables, clearTable]);


  // ── POS: Fetch discounts ──────────────────────────────────────────────────

  const fetchDiscounts = useCallback(async () => {
    if (!restaurantId) return;
    const { data } = await supabase
      .from("discounts")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("active", true);
    setDiscounts((data ?? []).map((d) => ({
      id: String(d.id),
      restaurantId: d.restaurant_id,
      name: d.name,
      type: d.type as "percentage" | "fixed",
      value: Number(d.value),
      requiresManagerPin: d.requires_manager_pin,
      active: d.active,
    })));
  }, [restaurantId]);

  // ── POS: Fetch item modifiers ───────────────────────────────────────────

  const fetchItemModifiers = useCallback(async () => {
    if (!restaurantId) return;
    const { data } = await supabase
      .from("item_modifiers")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("active", true);
    setItemModifiers((data ?? []).map((m) => ({
      id: String(m.id),
      restaurantId: m.restaurant_id,
      name: m.name,
      priceAdjustment: Number(m.price_adjustment),
      category: m.category,
      active: m.active,
    })));
  }, [restaurantId]);

  // ── POS: Fetch held orders ──────────────────────────────────────────────

  const fetchHeldOrders = useCallback(async () => {
    if (!restaurantId) return;
    const { data } = await supabase
      .from("held_orders")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .is("resumed_at", null)
      .order("created_at", { ascending: false });
    setHeldOrders((data ?? []).map((h) => ({
      id: String(h.id),
      restaurantId: h.restaurant_id,
      orderData: h.order_data as Record<string, unknown>,
      heldBy: h.held_by,
      reason: h.reason,
      createdAt: new Date(h.created_at),
      resumedAt: h.resumed_at ? new Date(h.resumed_at) : undefined,
    })));
  }, [restaurantId]);

  // ── POS: Fetch active shift ─────────────────────────────────────────────

  const fetchActiveShift = useCallback(async () => {
    if (!restaurantId) return;
    const { data } = await supabase
      .from("shifts")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("status", "open")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      setActiveShift({
        id: String(data.id),
        restaurantId: data.restaurant_id,
        staffId: data.staff_id,
        startedAt: new Date(data.started_at),
        endedAt: data.ended_at ? new Date(data.ended_at) : undefined,
        startingCash: Number(data.starting_cash),
        endingCash: data.ending_cash ? Number(data.ending_cash) : undefined,
        expectedCash: data.expected_cash ? Number(data.expected_cash) : undefined,
        notes: data.notes,
        status: data.status as "open" | "closed",
      });
    } else {
      setActiveShift(null);
    }
  }, [restaurantId]);

  useEffect(() => {
    if (!restaurantId) return;
    fetchDiscounts();
    fetchItemModifiers();
    fetchHeldOrders();
    fetchActiveShift();
  }, [restaurantId, fetchDiscounts, fetchItemModifiers, fetchHeldOrders, fetchActiveShift]);

  // ── POS: Void an order item ─────────────────────────────────────────────

  const voidOrderItem = useCallback(async (orderId: string, itemId: string, reason: string, approvedBy: string) => {
    const order = orders.find((o) => o.id === orderId);
    const item = order?.items.find((i) => i.id === itemId);
    if (!order || !item) return;

    const originalAmount = item.unitPrice * item.quantity;

    await supabase.from("order_items").update({ voided: true }).eq("id", Number(itemId));
    await supabase.from("order_voids").insert({
      order_id: Number(orderId),
      order_item_id: Number(itemId),
      reason,
      voided_by: approvedBy,
      approved_by: approvedBy,
      original_amount: originalAmount,
    });

    const currentVoidTotal = Number(order.voidTotal ?? 0);
    await supabase.from("orders").update({
      void_total: currentVoidTotal + originalAmount,
    }).eq("id", Number(orderId));

    setOrders((prev) => prev.map((o) => {
      if (o.id !== orderId) return o;
      const items = o.items.map((i) => i.id === itemId ? { ...i, voided: true } : i);
      const activeItems = items.filter((i) => !i.voided && !i.comped);
      const subtotal = activeItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
      const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
      return { ...o, items, voidTotal: (o.voidTotal ?? 0) + originalAmount, subtotal, tax, total: Math.round((subtotal + tax) * 100) / 100 };
    }));
    toast("Item voided", { description: `${item.menuItemName} — ${reason}` });
  }, [orders]);

  // ── POS: Comp an order item ─────────────────────────────────────────────

  const compOrderItem = useCallback(async (orderId: string, itemId: string, reason: string) => {
    await supabase.from("order_items").update({ comped: true, comp_reason: reason }).eq("id", Number(itemId));

    setOrders((prev) => prev.map((o) => {
      if (o.id !== orderId) return o;
      const items = o.items.map((i) => i.id === itemId ? { ...i, comped: true, compReason: reason } : i);
      const activeItems = items.filter((i) => !i.voided && !i.comped);
      const subtotal = activeItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
      const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
      return { ...o, items, subtotal, tax, total: Math.round((subtotal + tax) * 100) / 100 };
    }));
    toast("Item comped");
  }, []);

  // ── POS: Apply discount to order ────────────────────────────────────────

  const applyOrderDiscount = useCallback(async (
    orderId: string,
    discount: { name: string; type: "percentage" | "fixed"; value: number; discountId?: string },
    approvedBy?: string
  ) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    const appliedAmount = discount.type === "percentage"
      ? Math.round(order.subtotal * (discount.value / 100) * 100) / 100
      : Math.min(discount.value, order.subtotal);

    const { data } = await supabase.from("order_discounts").insert({
      order_id: Number(orderId),
      discount_id: discount.discountId ? Number(discount.discountId) : null,
      name: discount.name,
      type: discount.type,
      value: discount.value,
      applied_amount: appliedAmount,
      applied_by: approvedBy,
      approved_by: approvedBy,
    }).select().single();

    const newDiscountTotal = (order.discountTotal ?? 0) + appliedAmount;
    await supabase.from("orders").update({ discount_total: newDiscountTotal }).eq("id", Number(orderId));

    if (data) {
      setOrders((prev) => prev.map((o) => {
        if (o.id !== orderId) return o;
        const discountEntry: OrderDiscount = {
          id: String(data.id),
          orderId,
          discountId: discount.discountId,
          name: discount.name,
          type: discount.type,
          value: discount.value,
          appliedAmount,
          appliedBy: approvedBy,
          approvedBy,
          createdAt: new Date(),
        };
        const newDiscounts = [...(o.discounts ?? []), discountEntry];
        const totalDiscount = newDiscounts.reduce((s, d) => s + d.appliedAmount, 0);
        const taxable = o.subtotal - totalDiscount;
        const tax = Math.round(Math.max(0, taxable) * TAX_RATE * 100) / 100;
        return { ...o, discounts: newDiscounts, discountTotal: totalDiscount, tax, total: Math.round((Math.max(0, taxable) + tax) * 100) / 100 };
      }));
    }
    toast(`Discount applied: ${discount.name}`);
  }, [orders]);

  // ── POS: Remove discount ────────────────────────────────────────────────

  const removeOrderDiscount = useCallback(async (orderId: string, discountId: string) => {
    await supabase.from("order_discounts").delete().eq("id", Number(discountId));

    setOrders((prev) => prev.map((o) => {
      if (o.id !== orderId) return o;
      const newDiscounts = (o.discounts ?? []).filter((d) => d.id !== discountId);
      const totalDiscount = newDiscounts.reduce((s, d) => s + d.appliedAmount, 0);
      const taxable = o.subtotal - totalDiscount;
      const tax = Math.round(Math.max(0, taxable) * TAX_RATE * 100) / 100;
      return { ...o, discounts: newDiscounts, discountTotal: totalDiscount, tax, total: Math.round((Math.max(0, taxable) + tax) * 100) / 100 };
    }));

    const order = orders.find((o) => o.id === orderId);
    if (order) {
      const remaining = (order.discounts ?? []).filter((d) => d.id !== discountId);
      const totalDiscount = remaining.reduce((s, d) => s + d.appliedAmount, 0);
      await supabase.from("orders").update({ discount_total: totalDiscount }).eq("id", Number(orderId));
    }
  }, [orders]);

  // ── POS: Transfer order to another table ────────────────────────────────

  const transferOrder = useCallback(async (orderId: string, newTableId: string) => {
    const newTable = tables.find((t) => t.id === newTableId);
    if (!newTable) return;

    const { data: row } = await supabase.from("orders").select("notes").eq("id", Number(orderId)).single();
    const currentMeta = row ? parseMeta((row as Record<string, unknown>).notes as string | null) : {};
    const newMeta = JSON.stringify({ ...currentMeta, tableId: newTableId });
    await supabase.from("orders").update({
      table_number: String(newTable.tableNumber),
      notes: newMeta,
    }).eq("id", Number(orderId));

    setOrders((prev) => prev.map((o) =>
      o.id !== orderId ? o : { ...o, tableId: newTableId, tableNumber: newTable.tableNumber }
    ));
    toast(`Order transferred to Table ${newTable.tableNumber}`);
  }, [tables]);

  // ── POS: Split order ────────────────────────────────────────────────────

  const splitOrder = useCallback(async (orderId: string, itemIds: string[]): Promise<Order | null> => {
    const order = orders.find((o) => o.id === orderId);
    if (!order || itemIds.length === 0) return null;

    const splitItems = order.items.filter((i) => itemIds.includes(i.id));
    if (splitItems.length === 0) return null;

    const newOrder = await createOrder(order.tableId, order.orderType, order.guestName + " (Split)", order.partySize);

    for (const item of splitItems) {
      await supabase.from("order_items").update({ order_id: Number(newOrder.id) }).eq("id", Number(item.id));
    }

    await supabase.from("orders").update({ split_from_order_id: Number(orderId) }).eq("id", Number(newOrder.id));
    await fetchOrdersRef.current();

    toast("Order split successfully");
    return newOrder;
  }, [orders, createOrder]);

  // ── POS: Merge orders ───────────────────────────────────────────────────

  const mergeOrders = useCallback(async (orderIds: string[]) => {
    if (orderIds.length < 2) return;
    const targetId = orderIds[0];
    const sourceIds = orderIds.slice(1);

    for (const sourceId of sourceIds) {
      await supabase.from("order_items").update({ order_id: Number(targetId) }).eq("order_id", Number(sourceId));
      await supabase.from("orders").update({ status: "cancelled", closed_at: new Date().toISOString() }).eq("id", Number(sourceId));
    }

    await fetchOrdersRef.current();
    toast("Orders merged");
  }, []);

  // ── POS: Hold order ─────────────────────────────────────────────────────

  const holdOrder = useCallback(async (orderData: Record<string, unknown>, reason?: string) => {
    if (!restaurantId) return;
    await supabase.from("held_orders").insert({
      restaurant_id: restaurantId,
      order_data: orderData,
      reason,
    });
    await fetchHeldOrders();
    toast("Order held");
  }, [restaurantId, fetchHeldOrders]);

  // ── POS: Resume held order ──────────────────────────────────────────────

  const resumeHeldOrder = useCallback(async (heldOrderId: string): Promise<HeldOrder | null> => {
    const held = heldOrders.find((h) => h.id === heldOrderId);
    if (!held) return null;

    await supabase.from("held_orders").update({ resumed_at: new Date().toISOString() }).eq("id", Number(heldOrderId));
    setHeldOrders((prev) => prev.filter((h) => h.id !== heldOrderId));
    toast("Order resumed");
    return held;
  }, [heldOrders]);

  // ── POS: Shift management ──────────────────────────────────────────────

  const openShift = useCallback(async (startingCash: number): Promise<Shift | null> => {
    if (!restaurantId) return null;

    const { data: staffRow } = await supabase
      .from("restaurant_staff")
      .select("id")
      .eq("restaurant_id", restaurantId)
      .limit(1)
      .maybeSingle();

    if (!staffRow) return null;

    const { data, error } = await supabase.from("shifts").insert({
      restaurant_id: restaurantId,
      staff_id: staffRow.id,
      starting_cash: startingCash,
      status: "open",
    }).select().single();

    if (error || !data) return null;

    await supabase.from("cash_drawer_logs").insert({
      shift_id: data.id,
      restaurant_id: restaurantId,
      type: "starting",
      amount: startingCash,
      performed_by: staffRow.id,
    });

    const shift: Shift = {
      id: String(data.id),
      restaurantId: data.restaurant_id,
      staffId: data.staff_id,
      startedAt: new Date(data.started_at),
      startingCash: Number(data.starting_cash),
      status: "open",
    };
    setActiveShift(shift);
    toast("Shift opened");
    return shift;
  }, [restaurantId]);

  const closeShift = useCallback(async (endingCash: number, notes?: string) => {
    if (!activeShift) return;

    await supabase.from("shifts").update({
      ended_at: new Date().toISOString(),
      ending_cash: endingCash,
      notes,
      status: "closed",
    }).eq("id", Number(activeShift.id));

    await supabase.from("cash_drawer_logs").insert({
      shift_id: Number(activeShift.id),
      restaurant_id: restaurantId,
      type: "ending",
      amount: endingCash,
    });

    setActiveShift(null);
    toast("Shift closed");
  }, [activeShift, restaurantId]);

  const addCashDrawerLog = useCallback(async (type: "pay_in" | "pay_out" | "tip_out", amount: number, reason: string, approvedBy?: string) => {
    if (!activeShift || !restaurantId) return;

    await supabase.from("cash_drawer_logs").insert({
      shift_id: Number(activeShift.id),
      restaurant_id: restaurantId,
      type,
      amount,
      reason,
      approved_by: approvedBy ? Number(approvedBy) : null,
    });

    toast(`${type.replace("_", " ")} recorded: $${amount.toFixed(2)}`);
  }, [activeShift, restaurantId]);

  // ── POS: Fetch completed orders for reports ─────────────────────────────

  const fetchCompletedOrders = useCallback(async (dateFrom?: Date, dateTo?: Date): Promise<Order[]> => {
    if (!restaurantId) return [];

    let query = supabase
      .from("orders")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .in("status", ["completed", "cancelled"])
      .order("created_at", { ascending: false });

    if (dateFrom) query = query.gte("created_at", dateFrom.toISOString());
    if (dateTo) query = query.lte("created_at", dateTo.toISOString());

    const { data: orderRows } = await query;
    if (!orderRows || orderRows.length === 0) { setCompletedOrders([]); return []; }

    const ids = orderRows.map((r) => r.id as number);
    const { data: itemData } = await supabase.from("order_items").select("*").in("order_id", ids);
    const itemRows = (itemData ?? []) as Record<string, unknown>[];

    const mapped = orderRows.map((row) =>
      mapOrder(row as Record<string, unknown>, itemRows.filter((ir) => ir.order_id === (row as Record<string, unknown>).id))
    );
    setCompletedOrders(mapped);
    return mapped;
  }, [restaurantId, mapOrder]);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const activeStatuses: OrderStatus[] = ["pending", "preparing", "ready", "served"];
  const preorderCount = orders.filter(
    (o) => activeStatuses.includes(o.status) && (o.orderType === "pre_order" || o.orderType === "takeout")
  ).length;

  return (
    <DashboardContext.Provider
      value={{
        activeView,
        setActiveView,
        waitlistOpen,
        setWaitlistOpen,
        currentWaitTime,
        setCurrentWaitTime,
        waitlist,
        waitlistLoading,
        tables,
        menuItems,
        menuLoading,
        notifications,
        unreadCount,
        orders,
        completedSessions,
        addWalkIn,
        bulkAddWalkIns,
        clearAllWaitlist,
        seatParty,
        cancelParty,
        notifyParty,
        toggleMenuItem,
        addMenuItem,
        updateMenuItem,
        deleteMenuItem,
        markNotificationsRead,
        clearTable,
        quickSeatNext,
        setTableStatus,
        addTable,
        removeTable,
        combineTablesForParty,
        splitCombinedTable,
        createOrder,
        addItemToOrder,
        removeItemFromOrder,
        updateItemQuantity,
        updateOrderStatus,
        getOrdersForTable,
        clearTableWithTip,
        notifyCustomer,
        preorderCount,

        discounts,
        itemModifiers,
        heldOrders,
        activeShift,
        completedOrders,

        voidOrderItem,
        compOrderItem,
        applyOrderDiscount,
        removeOrderDiscount,
        transferOrder,
        splitOrder,
        mergeOrders,
        holdOrder,
        resumeHeldOrder,

        openShift,
        closeShift,
        addCashDrawerLog,

        fetchCompletedOrders,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}
