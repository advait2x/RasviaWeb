export type NavView = "dashboard" | "waitlist" | "floorplan" | "menu" | "settings" | "notifications";

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

export type MealTime = "breakfast" | "lunch" | "dinner" | "specials" | "all_day";

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number | null;
  imageUrl: string | null;
  mealTimes: MealTime[];
  inStock: boolean;
}

export interface AppNotification {
  id: string;
  type: "joined" | "left";
  guestName: string;
  partySize: number;
  timestamp: Date;
  read: boolean;
}
