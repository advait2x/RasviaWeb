import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_MENU_QR_PDF_SETTINGS,
  type MenuQrPdfSettings,
} from "@/lib/menu-qr-pdf-settings";

/** Must match `menu_qr_session_inactivity_interval()` in Postgres (4 hours). */
export const MENU_QR_SESSION_INACTIVITY_HOURS = 4;

export type MenuQrSlotMode = "menu" | "table";

export type MenuQrSlot = {
  slotIndex: number;
  mode: MenuQrSlotMode;
  tableLabel: string;
};

export type MenuQrConfig = {
  guestCanOrder: boolean;
  pdfSettings: MenuQrPdfSettings;
  slots: MenuQrSlot[];
};

export type TableQrBinding = {
  id: string;
  restaurantId: number;
  tableLabel: string;
  slotId: string | null;
  partySessionId: string | null;
  guestCanOrder: boolean;
  active: boolean;
  lastScanAt: string | null;
  lastActivityAt: string | null;
};

export type ResolveMenuQrScanResult = {
  mode: "menu" | "table";
  guestCanOrder: boolean;
  staffManaged: boolean;
  slotIndex?: number;
  tableLabel?: string;
  bindingId?: string;
  sessionId?: string;
  redirect?: string | null;
};

const DEFAULT_SLOTS: MenuQrSlot[] = Array.from({ length: 6 }, (_, i) => ({
  slotIndex: i,
  mode: "menu" as const,
  tableLabel: "",
}));

function parsePdfSettings(raw: unknown): MenuQrPdfSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_MENU_QR_PDF_SETTINGS };
  const p = raw as Partial<MenuQrPdfSettings>;
  return {
    ...DEFAULT_MENU_QR_PDF_SETTINGS,
    ...p,
    codesPerPage: ([4, 6, 9] as const).includes(p.codesPerPage as 4 | 6 | 9)
      ? (p.codesPerPage as 4 | 6 | 9)
      : 6,
    pageFormat: p.pageFormat === "letter" ? "letter" : "a4",
  };
}

export async function fetchMenuQrConfig(
  supabase: SupabaseClient,
  restaurantId: number,
): Promise<MenuQrConfig> {
  const [configRes, slotsRes] = await Promise.all([
    supabase
      .from("restaurant_menu_qr_config")
      .select("guest_can_order, pdf_settings")
      .eq("restaurant_id", restaurantId)
      .maybeSingle(),
    supabase
      .from("restaurant_menu_qr_slots")
      .select("slot_index, mode, table_label")
      .eq("restaurant_id", restaurantId)
      .order("slot_index", { ascending: true }),
  ]);

  const guestCanOrder = configRes.data?.guest_can_order === true;
  const pdfSettings = parsePdfSettings(configRes.data?.pdf_settings);

  const slotRows = (slotsRes.data ?? []) as {
    slot_index: number;
    mode: MenuQrSlotMode;
    table_label: string | null;
  }[];

  const byIndex = new Map<number, MenuQrSlot>();
  for (const row of slotRows) {
    byIndex.set(row.slot_index, {
      slotIndex: row.slot_index,
      mode: row.mode === "table" ? "table" : "menu",
      tableLabel: row.table_label?.trim() ?? "",
    });
  }

  const codesPerPage = pdfSettings.codesPerPage;
  const slotCount = Math.max(6, codesPerPage);
  const slots: MenuQrSlot[] = [];
  for (let i = 0; i < slotCount; i++) {
    slots.push(byIndex.get(i) ?? { slotIndex: i, mode: "menu", tableLabel: "" });
  }

  return { guestCanOrder, pdfSettings, slots };
}

export async function saveMenuQrConfig(
  supabase: SupabaseClient,
  restaurantId: number,
  config: MenuQrConfig,
): Promise<void> {
  const { error } = await supabase.rpc("upsert_restaurant_menu_qr_settings", {
    p_restaurant_id: restaurantId,
    p_guest_can_order: config.guestCanOrder,
    p_pdf_settings: config.pdfSettings,
    p_slots: config.slots.map((s) => ({
      slot_index: s.slotIndex,
      mode: s.mode,
      table_label: s.tableLabel,
    })),
  });
  if (error) throw new Error(error.message);
}

export async function fetchActiveTableBindings(
  supabase: SupabaseClient,
  restaurantId: number,
): Promise<TableQrBinding[]> {
  const { data, error } = await supabase
    .from("restaurant_table_qr_bindings")
    .select(
      "id, restaurant_id, table_label, slot_id, party_session_id, guest_can_order, active, last_scan_at, last_activity_at",
    )
    .eq("restaurant_id", restaurantId)
    .eq("active", true)
    .is("cancelled_at", null)
    .order("table_label", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: String(row.id),
    restaurantId: Number(row.restaurant_id),
    tableLabel: String(row.table_label ?? ""),
    slotId: row.slot_id ? String(row.slot_id) : null,
    partySessionId: row.party_session_id ? String(row.party_session_id) : null,
    guestCanOrder: row.guest_can_order === true,
    active: row.active === true,
    lastScanAt: row.last_scan_at ?? null,
    lastActivityAt: row.last_activity_at ?? null,
  }));
}

export async function cancelTableQrBinding(
  supabase: SupabaseClient,
  bindingId: string,
): Promise<void> {
  const { error } = await supabase.rpc("cancel_table_qr_binding", {
    p_binding_id: bindingId,
  });
  if (error) throw new Error(error.message);
}

export async function resolveMenuQrScan(
  supabase: SupabaseClient,
  restaurantId: number,
  slotIndex: number,
): Promise<ResolveMenuQrScanResult> {
  const { data, error } = await supabase.rpc("resolve_menu_qr_scan", {
    p_restaurant_id: restaurantId,
    p_slot_index: slotIndex,
  });
  if (error) throw new Error(error.message);
  const d = data as Record<string, unknown>;
  return {
    mode: d.mode === "table" ? "table" : "menu",
    guestCanOrder: d.guest_can_order === true,
    staffManaged: d.staff_managed !== false,
    slotIndex: typeof d.slot_index === "number" ? d.slot_index : slotIndex,
    tableLabel: typeof d.table_label === "string" ? d.table_label : undefined,
    bindingId: typeof d.binding_id === "string" ? d.binding_id : undefined,
    sessionId: typeof d.session_id === "string" ? d.session_id : undefined,
    redirect: typeof d.redirect === "string" ? d.redirect : null,
  };
}

/** Migrate legacy localStorage PDF settings into Supabase once. */
export async function migrateLocalMenuQrSettings(
  supabase: SupabaseClient,
  restaurantId: number,
  localSettings: MenuQrPdfSettings,
): Promise<void> {
  const existing = await supabase
    .from("restaurant_menu_qr_config")
    .select("restaurant_id")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();
  if (existing.data) return;
  await saveMenuQrConfig(supabase, restaurantId, {
    guestCanOrder: false,
    pdfSettings: localSettings,
    slots: DEFAULT_SLOTS,
  });
}

export function defaultMenuQrSlots(codesPerPage: number): MenuQrSlot[] {
  const count = Math.max(6, codesPerPage);
  return Array.from({ length: count }, (_, i) => ({
    slotIndex: i,
    mode: "menu" as const,
    tableLabel: "",
  }));
}
