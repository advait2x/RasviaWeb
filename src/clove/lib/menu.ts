import { supabase } from "@/lib/supabase";
import { CLOVE_RESTAURANT_ID } from "@/clove/data";

export type CloveMenuItem = {
  id: number;
  name: string;
  description: string;
  /** Price in dollars (numeric column). */
  price: number;
  category: string;
  isVegetarian: boolean;
};

export type CloveMenuCategory = {
  name: string;
  items: CloveMenuItem[];
};

type MenuItemRow = {
  id: number;
  name: string;
  description: string | null;
  price: number | string | null;
  category: string | null;
  is_vegetarian: boolean | null;
  in_stock: boolean | null;
  is_available: boolean | null;
};

const UNCATEGORIZED = "More Dishes";

function mapRow(row: MenuItemRow): CloveMenuItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description?.trim() ?? "",
    price: typeof row.price === "string" ? Number(row.price) || 0 : row.price ?? 0,
    category: (row.category ?? "").trim() || UNCATEGORIZED,
    isVegetarian: !!row.is_vegetarian,
  };
}

/**
 * Fetch Clove Dining's menu and group it by the text `category` column,
 * preserving first-seen category order (mirrors the mobile app's grouping).
 */
export async function fetchCloveMenu(): Promise<CloveMenuCategory[]> {
  const { data, error } = await supabase
    .from("menu_items")
    .select(
      "id, name, description, price, category, is_vegetarian, in_stock, is_available",
    )
    .eq("restaurant_id", CLOVE_RESTAURANT_ID)
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;

  const rows = (data ?? []) as MenuItemRow[];
  const available = rows.filter(
    (r) => (r.in_stock ?? true) && (r.is_available ?? true),
  );

  const order: string[] = [];
  const byCategory = new Map<string, CloveMenuItem[]>();

  for (const row of available) {
    const item = mapRow(row);
    if (!byCategory.has(item.category)) {
      byCategory.set(item.category, []);
      order.push(item.category);
    }
    byCategory.get(item.category)!.push(item);
  }

  return order.map((name) => ({ name, items: byCategory.get(name)! }));
}

export function formatPrice(dollars: number): string {
  return `$${dollars.toFixed(2)}`;
}
