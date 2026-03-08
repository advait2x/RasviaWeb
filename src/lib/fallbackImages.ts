/**
 * Fallback image pools for restaurants and menu items.
 * When an image_url is missing or broken, rotate through these pools using the item's ID.
 */

export const RESTAURANT_FALLBACKS: string[] = [
  "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&q=80",
  "https://images.unsplash.com/photo-1567337710282-00832b415979?w=800&q=80",
  "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=800&q=80",
  "https://images.unsplash.com/photo-1574653853027-5382a3d23a15?w=800&q=80",
  "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=800&q=80",
  "https://images.unsplash.com/photo-1505253758473-96b7015fcd40?w=800&q=80",
  "https://images.unsplash.com/photo-1548943487-a2e4e43b4853?w=800&q=80",
  "https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=800&q=80",
  "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800&q=80",
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80",
];

export const MENU_ITEM_FALLBACKS: string[] = [
  "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=600&q=80",
  "https://images.unsplash.com/photo-1631452180539-96aca7d48617?w=600&q=80",
  "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&q=80",
  "https://images.unsplash.com/photo-1574484284002-952d92456975?w=600&q=80",
  "https://images.unsplash.com/photo-1567337710282-00832b415979?w=600&q=80",
  "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=600&q=80",
  "https://images.unsplash.com/photo-1505253758473-96b7015fcd40?w=600&q=80",
  "https://images.unsplash.com/photo-1548943487-a2e4e43b4853?w=600&q=80",
  "https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=600&q=80",
  "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&q=80",
];

/** Convert any id (string or number) to a stable integer for indexing */
function idToInt(id: string | number): number {
  if (typeof id === "number") return Math.abs(id);
  // Sum char codes for string IDs (e.g. UUIDs)
  return id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
}

export function getRestaurantFallback(id: string | number): string {
  return RESTAURANT_FALLBACKS[idToInt(id) % RESTAURANT_FALLBACKS.length];
}

export function getMenuItemFallback(id: string | number): string {
  return MENU_ITEM_FALLBACKS[idToInt(id) % MENU_ITEM_FALLBACKS.length];
}
