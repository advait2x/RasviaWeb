export type NavView = "dashboard" | "waitlist" | "floorplan" | "menu" | "settings";

export interface WaitlistEntry {
  id: string;
  guestName: string;
  partySize: number;
  phone: string;
  addedAt: Date;
  status: "waiting" | "seated" | "cancelled";
  notifiedAt?: Date;
}

export interface TableInfo {
  id: string;
  tableNumber: number;
  capacity: number;
  status: "available" | "occupied" | "reserved" | "unavailable";
  seatedAt?: Date;
  guestName?: string;
  partySize?: number;
}

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  inStock: boolean;
}
