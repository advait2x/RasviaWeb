import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { NavView, WaitlistEntry, TableInfo, MenuItem } from "@/types/dashboard";
import { initialWaitlist, initialTables, initialMenuItems } from "@/data/mock-data";

interface DashboardState {
  activeView: NavView;
  setActiveView: (view: NavView) => void;
  waitlistOpen: boolean;
  setWaitlistOpen: (open: boolean) => void;
  currentWaitTime: number;
  setCurrentWaitTime: (time: number) => void;
  waitlist: WaitlistEntry[];
  tables: TableInfo[];
  menuItems: MenuItem[];
  addWalkIn: (name: string, partySize: number, phone: string) => void;
  seatParty: (waitlistId: string, tableId: string) => void;
  cancelParty: (waitlistId: string) => void;
  toggleMenuItem: (itemId: string) => void;
  clearTable: (tableId: string) => void;
  quickSeatNext: (tableId: string) => WaitlistEntry | null;
}

const DashboardContext = createContext<DashboardState | null>(null);

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
}

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [activeView, setActiveView] = useState<NavView>("waitlist");
  const [waitlistOpen, setWaitlistOpen] = useState(true);
  const [currentWaitTime, setCurrentWaitTime] = useState(25);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>(initialWaitlist);
  const [tables, setTables] = useState<TableInfo[]>(initialTables);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(initialMenuItems);

  // Auto-increment wait times every minute (force re-render)
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const addWalkIn = useCallback((name: string, partySize: number, phone: string) => {
    const newEntry: WaitlistEntry = {
      id: `w-${Date.now()}`,
      guestName: name,
      partySize,
      phone,
      addedAt: new Date(),
      status: "waiting",
    };
    setWaitlist((prev) => [newEntry, ...prev]);
  }, []);

  const seatParty = useCallback((waitlistId: string, tableId: string) => {
    const entry = waitlist.find((w) => w.id === waitlistId);
    if (!entry) return;

    setWaitlist((prev) => prev.filter((w) => w.id !== waitlistId));
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

  const cancelParty = useCallback((waitlistId: string) => {
    setWaitlist((prev) => prev.filter((w) => w.id !== waitlistId));
  }, []);

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

  const quickSeatNext = useCallback((tableId: string): WaitlistEntry | null => {
    const waiting = waitlist.filter((w) => w.status === "waiting");
    if (waiting.length === 0) return null;
    const next = waiting[0];
    seatParty(next.id, tableId);
    return next;
  }, [waitlist, seatParty]);

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
        tables,
        menuItems,
        addWalkIn,
        seatParty,
        cancelParty,
        toggleMenuItem,
        clearTable,
        quickSeatNext,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}
