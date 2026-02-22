import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { NavView, WaitlistEntry, TableInfo, MenuItem } from "@/types/dashboard";
import { initialTables, initialMenuItems } from "@/data/mock-data";
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
  addWalkIn: (partyLeaderName: string, partySize: number, phone: string) => Promise<void>;
  bulkAddWalkIns: (entries: { guestName: string; partySize: number; phone: string; minutesAgo: number }[]) => Promise<void>;
  seatParty: (waitlistId: string, tableId: string) => Promise<void>;
  cancelParty: (waitlistId: string) => Promise<void>;
  notifyParty: (waitlistId: string) => Promise<void>;
  toggleMenuItem: (itemId: string) => void;
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

// Map a raw Supabase row to our WaitlistEntry type
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

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const { restaurantId } = useAuth();

  const [activeView, setActiveView] = useState<NavView>("waitlist");
  const [waitlistOpen, setWaitlistOpen] = useState(true);
  const [currentWaitTime, setCurrentWaitTime] = useState(25);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [waitlistLoading, setWaitlistLoading] = useState(true);
  const [tables, setTables] = useState<TableInfo[]>(initialTables);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(initialMenuItems);

  // Auto-increment wait times every minute (force re-render for timers)
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  // Keep a stable ref to fetchEntries so the subscription callback doesn't go stale
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
  }, [restaurantId]);

  const fetchRef = useRef(fetchEntries);
  fetchRef.current = fetchEntries;

  // Real-time subscription — replaces mock data
  useEffect(() => {
    if (!restaurantId) {
      setWaitlist([]);
      setWaitlistLoading(false);
      return;
    }

    setWaitlistLoading(true);
    fetchRef.current();

    const channel = supabase
      .channel(`waitlist-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "waitlist_entries",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => fetchRef.current()
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

      // Insert one at a time so a single failure doesn't block the rest
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
      // Subscription will automatically refresh the list from Supabase
    },
    [restaurantId]
  );

  const seatParty = useCallback(async (waitlistId: string, tableId: string) => {
    // Grab the entry from local state before we mark it seated
    const entry = waitlist.find((w) => w.id === waitlistId);
    if (!entry) return;

    // Mark as seated in Supabase (will be removed from local list via subscription)
    const { error } = await supabase
      .from("waitlist_entries")
      .update({ status: "seated" })
      .eq("id", waitlistId);

    if (error) {
      console.error("seatParty failed:", error.message);
      return;
    }

    // Update table locally (tables aren't in Supabase yet)
    setTables((prev) =>
      prev.map((t) =>
        t.id === tableId
          ? {
              ...t,
              status: "occupied" as const,
              seatedAt: new Date(),
              guestName: entry.guestName,
              partySize: entry.partySize,
            }
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

  const quickSeatNext = useCallback(async (tableId: string): Promise<WaitlistEntry | null> => {
    const table = tables.find((t) => t.id === tableId);
    if (!table) return null;
    const waiting = waitlist.filter(
      (w) => w.status === "waiting" && w.partySize <= table.capacity
    );
    if (waiting.length === 0) return null;
    const next = waiting[0];
    await seatParty(next.id, tableId);
    return next;
  }, [waitlist, tables, seatParty]);

  // ── Table mutations (local only for now) ─────────────────────────────────

  const toggleMenuItem = useCallback((itemId: string) => {
    setMenuItems((prev) =>
      prev.map((m) => (m.id === itemId ? { ...m, inStock: !m.inStock } : m))
    );
  }, []);

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
        addWalkIn,
        bulkAddWalkIns,
        seatParty,
        cancelParty,
        notifyParty,
        toggleMenuItem,
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
