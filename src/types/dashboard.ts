export type NavView =
  | "dashboard"
  | "waitlist"
  | "floorplan"
  | "orders"
  | "menu"
  | "settings"
  | "notifications";

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
  /** IDs of the child tables that make up this combined table */
  combinedTableIds?: string[];
  /** True when this table is hidden because it has been merged into a combined table */
  isCombinedChild?: boolean;
}

export type MealTime =
  | "breakfast"
  | "lunch"
  | "dinner"
  | "specials"
  | "all_day";

export type DietType = "veg" | "non_veg" | "vegan";

export type OrderType = "dine_in" | "pre_order" | "takeout";

export type OrderStatus =
  | "pending"
  | "preparing"
  | "ready"
  | "served"
  | "completed"
  | "cancelled";

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number | null;
  imageUrl: string | null;
  mealTimes: MealTime[];
  inStock: boolean;
  dietType?: DietType;
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  specialInstructions?: string;
  dietType?: DietType;
}

export interface Order {
  id: string;
  tableId: string;
  tableNumber: number;
  guestName: string;
  partySize: number;
  items: OrderItem[];
  status: OrderStatus;
  orderType: OrderType;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  subtotal: number;
  tax: number;
  total: number;
  tipAmount?: number;
  tipPercent?: number;
  paymentMethod: "cash" | "card" | "other";
  notes?: string;
  customerPhone?: string;
  customerNotifiedAt?: Date;
}

export interface CompletedTableSession {
  id: string;
  tableId: string;
  tableNumber: number;
  guestName: string;
  partySize: number;
  seatedAt: Date;
  clearedAt: Date;
  durationMinutes: number;
  orderTotal: number;
  tipAmount: number;
  tipPercent: number;
  notes?: string;
}

export interface AppNotification {
  id: string;
  type: "joined" | "left" | "group_created";
  guestName: string;
  partySize: number;
  timestamp: Date;
  read: boolean;
  sessionId?: string;
}
