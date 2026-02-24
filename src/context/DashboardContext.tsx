import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { NavView, WaitlistEntry, TableInfo, MenuItem, MealTime, AppNotification } from "@/types/dashboard";
import { initialTables } from "@/data/mock-data";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

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
        () => fetchRef.current()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "waitlist_entries", filter: `restaurant_id=eq.${restaurantId}` },
        (payload) => {
          if (!waitlistInitialized.current) return;
          const row = payload.new as Record<string, unknown>;
          if (row.status === "waiting") {
            const entry = mapRow(row);
            setNotifications((prev) => [
              {
                id: `n-${Date.now()}-${Math.random()}`,
                type: "joined",
                guestName: entry.guestName,
                partySize: entry.partySize,
                timestamp: new Date(),
                read: false,
              },
              ...prev,
            ]);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "waitlist_entries", filter: `restaurant_id=eq.${restaurantId}` },
        (payload) => {
          if (!waitlistInitialized.current) return;
          const row = payload.new as Record<string, unknown>;
          if (row.status === "cancelled") {
            const entry = mapRow(row);
            setNotifications((prev) => [
              {
                id: `n-${Date.now()}-${Math.random()}`,
                type: "left",
                guestName: entry.guestName,
                partySize: entry.partySize,
                timestamp: new Date(),
                read: false,
              },
              ...prev,
            ]);
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
    setTables((prev) =>
      prev.map((t) =>
        t.id === tableId
          ? { ...t, status: "available" as const, seatedAt: undefined, guestName: undefined, partySize: undefined }
          : t
      )
    );
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

  const quickSeatNext = useCallback(async (tableId: string): Promise<WaitlistEntry | null> => {
    const table = tables.find((t) => t.id === tableId);
    if (!table) return null;
    const waiting = waitlist.filter((w) => w.status === "waiting" && w.partySize <= table.capacity);
    if (waiting.length === 0) return null;
    const next = waiting[0];
    await seatParty(next.id, tableId);
    return next;
  }, [waitlist, tables, seatParty]);

  const unreadCount = notifications.filter((n) => !n.read).length;

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
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}
