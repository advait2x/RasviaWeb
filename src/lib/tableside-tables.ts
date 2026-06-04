import { supabase } from "@/lib/supabase";

export type TablesideTable = {
  id: string;
  restaurant_id: number;
  code: string;
  display_name: string;
  sort_order: number;
  created_at: string;
};

function parseTableRow(raw: unknown): TablesideTable | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id : null;
  const code = typeof o.code === "string" ? o.code : null;
  const display_name = typeof o.display_name === "string" ? o.display_name : null;
  const restaurant_id = Number(o.restaurant_id);
  if (!id || !code || !display_name || !Number.isFinite(restaurant_id)) return null;
  return {
    id,
    restaurant_id,
    code,
    display_name,
    sort_order: Number(o.sort_order) || 0,
    created_at: typeof o.created_at === "string" ? o.created_at : "",
  };
}

function parseTableList(data: unknown): TablesideTable[] {
  if (!Array.isArray(data)) return [];
  return data.map(parseTableRow).filter((t): t is TablesideTable => t !== null);
}

function rpcErrorMessage(err: { message?: string; details?: string } | null): string {
  const msg = err?.message ?? "";
  if (msg.includes("duplicate_display_name")) return "A table with that name already exists.";
  if (msg.includes("table_limit_reached")) return "You can manage up to 200 tables.";
  if (msg.includes("display_name_required")) return "Enter a table name.";
  if (msg.includes("not_allowed")) return "You do not have permission to manage tables for this restaurant.";
  return msg || "Something went wrong.";
}

export async function listTablesideTables(restaurantId: number): Promise<TablesideTable[]> {
  const { data, error } = await supabase.rpc("list_tableside_tables", {
    p_restaurant_id: restaurantId,
  });
  if (error) throw new Error(rpcErrorMessage(error));
  return parseTableList(data);
}

export async function createTablesideTable(
  restaurantId: number,
  displayName: string,
): Promise<TablesideTable> {
  const { data, error } = await supabase.rpc("create_tableside_table", {
    p_restaurant_id: restaurantId,
    p_display_name: displayName,
  });
  if (error) throw new Error(rpcErrorMessage(error));
  const row = parseTableRow(data);
  if (!row) throw new Error("Could not create table.");
  return row;
}

export async function createTablesideTablesBulk(
  restaurantId: number,
  names: string[],
): Promise<TablesideTable[]> {
  const { data, error } = await supabase.rpc("create_tableside_tables_bulk", {
    p_restaurant_id: restaurantId,
    p_names: names,
  });
  if (error) throw new Error(rpcErrorMessage(error));
  return parseTableList(data);
}

export async function updateTablesideTableName(
  tableId: string,
  displayName: string,
): Promise<TablesideTable> {
  const { data, error } = await supabase.rpc("update_tableside_table_name", {
    p_table_id: tableId,
    p_display_name: displayName,
  });
  if (error) throw new Error(rpcErrorMessage(error));
  const row = parseTableRow(data);
  if (!row) throw new Error("Could not update table.");
  return row;
}

export async function deleteTablesideTable(tableId: string): Promise<void> {
  const { error } = await supabase.rpc("delete_tableside_table", { p_table_id: tableId });
  if (error) throw new Error(rpcErrorMessage(error));
}

export async function deleteAllTablesideTables(restaurantId: number): Promise<void> {
  const { error } = await supabase.rpc("delete_all_tableside_tables", {
    p_restaurant_id: restaurantId,
  });
  if (error) throw new Error(rpcErrorMessage(error));
}
