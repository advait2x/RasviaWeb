export type NavView =
  | "dashboard"
  | "waitlist"
  | "floorplan"
  | "orders"
  | "menu"
  | "settings"
  | "notifications"
  | "team"
  | "pos"
  | "kds"
  | "reports"
  | "kiosk";

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

export type DietType = "veg" | "non_veg" | "halal";

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

export interface OrderItemModifier {
  id: string;
  modifierId: string;
  name: string;
  priceAdjustment: number;
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  specialInstructions?: string;
  dietType?: DietType;
  voided?: boolean;
  comped?: boolean;
  compReason?: string;
  modifiers?: OrderItemModifier[];
}

export interface OrderDiscount {
  id: string;
  orderId: string;
  discountId?: string;
  name: string;
  type: "percentage" | "fixed";
  value: number;
  appliedAmount: number;
  appliedBy?: string;
  approvedBy?: string;
  createdAt: Date;
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
  discountTotal?: number;
  voidTotal?: number;
  shiftId?: string;
  cashierId?: string;
  splitFromOrderId?: string;
  discounts?: OrderDiscount[];
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
  | "view_notifications"
  | "access_pos"
  | "void_items"
  | "apply_discounts"
  | "manage_shifts"
  | "view_reports"
  | "manage_modifiers"
  | "transfer_tables"
  | "access_kds"
  | "access_kiosk";

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
  { key: "access_pos", label: "Access POS", description: "Use the Point of Sale terminal" },
  { key: "void_items", label: "Void Items", description: "Void order items and orders" },
  { key: "apply_discounts", label: "Apply Discounts", description: "Apply discounts to orders" },
  { key: "manage_shifts", label: "Manage Shifts", description: "Open and close cashier shifts" },
  { key: "view_reports", label: "View Reports", description: "View sales and performance reports" },
  { key: "manage_modifiers", label: "Manage Modifiers", description: "Create and edit item modifiers" },
  { key: "transfer_tables", label: "Transfer Tables", description: "Move orders between tables" },
  { key: "access_kds", label: "Access KDS", description: "View kitchen display system" },
  { key: "access_kiosk", label: "Access Kiosk", description: "Open the walk-in kiosk for customers" },
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
  /** Display: prefer full name from profiles, then email */
  email: string;
  full_name?: string | null;
  role_id: number | null;
  role_name: string;
  restaurant_id: number;
}

// ── POS Types ──────────────────────────────────────────────────────────────

export type ShiftStatus = "open" | "closed";

export interface Shift {
  id: string;
  restaurantId: number;
  staffId: number;
  startedAt: Date;
  endedAt?: Date;
  startingCash: number;
  endingCash?: number;
  expectedCash?: number;
  notes?: string;
  status: ShiftStatus;
}

export type CashDrawerLogType = "pay_in" | "pay_out" | "tip_out" | "starting" | "ending";

export interface CashDrawerLog {
  id: string;
  shiftId: string;
  restaurantId: number;
  type: CashDrawerLogType;
  amount: number;
  reason?: string;
  performedBy?: string;
  approvedBy?: string;
  createdAt: Date;
}

export interface Discount {
  id: string;
  restaurantId: number;
  name: string;
  type: "percentage" | "fixed";
  value: number;
  requiresManagerPin: boolean;
  active: boolean;
}

export interface OrderVoid {
  id: string;
  orderId: string;
  orderItemId?: string;
  reason: string;
  voidedBy?: string;
  approvedBy?: string;
  originalAmount: number;
  createdAt: Date;
}

export interface ItemModifier {
  id: string;
  restaurantId: number;
  name: string;
  priceAdjustment: number;
  category: string;
  active: boolean;
}

export interface HeldOrder {
  id: string;
  restaurantId: number;
  orderData: Record<string, unknown>;
  heldBy?: string;
  reason?: string;
  createdAt: Date;
  resumedAt?: Date;
}

export interface POSCartItem {
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  specialInstructions: string;
  dietType?: DietType;
  modifiers: { id: string; name: string; priceAdjustment: number }[];
}
