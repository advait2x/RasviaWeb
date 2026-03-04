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

// ── RBAC Permissions ────────────────────────────────────────────────────────

export type Permission =
  | "view_dashboard"
  | "manage_waitlist"
  | "view_floorplan"
  | "manage_tables"
  | "view_orders"
  | "manage_orders"
  | "update_order_status"
  | "view_menu"
  | "manage_menu"
  | "view_settings"
  | "manage_settings"
  | "manage_team"
  | "view_notifications";

export const ALL_PERMISSIONS: { key: Permission; label: string; description: string }[] = [
  { key: "view_dashboard", label: "View Dashboard", description: "See the overview dashboard" },
  { key: "manage_waitlist", label: "Manage Waitlist", description: "Add walk-ins, notify, cancel, seat parties" },
  { key: "view_floorplan", label: "View Floor Plan", description: "See the floor plan layout" },
  { key: "manage_tables", label: "Manage Tables", description: "Add, remove, or combine tables" },
  { key: "view_orders", label: "View Orders", description: "See the orders panel" },
  { key: "manage_orders", label: "Manage Orders", description: "Create orders, add items" },
  { key: "update_order_status", label: "Update Order Status", description: "Change order status (preparing, ready, served)" },
  { key: "view_menu", label: "View Menu", description: "See the menu editor" },
  { key: "manage_menu", label: "Manage Menu", description: "Add, edit, delete menu items" },
  { key: "view_settings", label: "View Settings", description: "See the settings panel" },
  { key: "manage_settings", label: "Manage Settings", description: "Edit restaurant profile and hours" },
  { key: "manage_team", label: "Manage Team", description: "Create roles, invite and remove staff" },
  { key: "view_notifications", label: "View Notifications", description: "See the notifications panel" },
];

export interface RestaurantRole {
  id: number;
  restaurant_id: number;
  name: string;
  is_owner: boolean;
  permissions: Permission[];
}

export interface StaffMember {
  id: number;
  user_id: string;
  email: string;
  role_id: number | null;
  role_name: string;
  restaurant_id: number;
}
