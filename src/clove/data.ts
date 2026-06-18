/**
 * Static data + config for the Clove Dining microsite (/clove-dining).
 * Menu items are fetched live from Supabase (restaurant id 64); everything
 * here is brand copy, hardcoded imagery, and the demo promo configuration.
 */

export const CLOVE_RESTAURANT_ID = 64;
export const CLOVE_NAME = "Clove Dining";
export const CLOVE_SUPPORT_EMAIL = "support@rasvia.com";

/** Tab routing for the microsite. `path` is the full pathname. */
export type CloveTabId = "home" | "about" | "menu" | "catering" | "contact";

export const CLOVE_BASE_PATH = "/clove-dining";

export const CLOVE_TABS: { id: CloveTabId; label: string; path: string }[] = [
  { id: "home", label: "Home", path: CLOVE_BASE_PATH },
  { id: "about", label: "About", path: `${CLOVE_BASE_PATH}/about` },
  { id: "menu", label: "Menu", path: `${CLOVE_BASE_PATH}/menu` },
  { id: "catering", label: "Catering", path: `${CLOVE_BASE_PATH}/catering` },
  { id: "contact", label: "Contact", path: `${CLOVE_BASE_PATH}/contact` },
];

export function pathToTab(pathname: string): CloveTabId {
  const clean = pathname.replace(/\/+$/, "") || CLOVE_BASE_PATH;
  if (clean === `${CLOVE_BASE_PATH}/about`) return "about";
  if (clean === `${CLOVE_BASE_PATH}/menu`) return "menu";
  if (clean === `${CLOVE_BASE_PATH}/catering`) return "catering";
  if (clean === `${CLOVE_BASE_PATH}/contact`) return "contact";
  return "home";
}

export function tabToPath(tab: CloveTabId): string {
  return CLOVE_TABS.find((t) => t.id === tab)?.path ?? CLOVE_BASE_PATH;
}

/* ── Demo promo code ─────────────────────────────────────────
   Only "rasvia" works for now. Comparison is case-insensitive
   and trims surrounding whitespace. Deducts 67 cents. */
export const CLOVE_PROMO = {
  code: "rasvia",
  discountCents: 67,
} as const;

export function buildPromoAppliedMessage(code: string): string {
  return `Promo code "${code}" has been applied. Note: This is not a real promo code and is used for testing purposes only.`;
}

/* ── Brand copy (made up for this site) ─────────────────────── */
export const CLOVE_TAGLINE = "Modern Indian dining, rooted in tradition.";

export const CLOVE_ABOUT_SHORT =
  "Clove Dining is a contemporary Indian kitchen where heirloom spice blends meet a refined, seasonal table. Every dish is built around the warmth of the clove — quietly aromatic, deeply comforting.";

export const CLOVE_ABOUT_US = [
  "At Clove Dining, we believe Indian food deserves a stage as thoughtful as its history. Our kitchen blends the soul of regional home cooking with the precision of a modern dining room — slow-simmered curries, smoky tandoor specialties, and biryanis layered with patience.",
  "We source whole spices, toast and grind them in-house daily, and treat every plate as a small act of hospitality. Whether you are here for a quiet dinner or a celebration with friends, you are family at our table.",
];

export const CLOVE_OUR_STORY = [
  "Clove Dining began with a single cast-iron kadai and a family recipe book passed down through three generations. What started as weekend supper clubs in a small kitchen grew into a restaurant devoted to the idea that great Indian food should feel both adventurous and like coming home.",
  "Named for the humble clove — the spice that opens nearly every great Indian dish — we built our menu around balance: heat and sweetness, smoke and citrus, comfort and surprise. Our chefs trained across Delhi, Hyderabad, and the coastal south, and they bring those regions to one shared table.",
  "Today, Clove Dining is a neighborhood gathering place where the tandoor never stops glowing and the chai is always on. We are proud to share our story with every guest who walks through the door.",
];

/* ── Hardcoded Indian-food imagery (Unsplash) ───────────────── */
export const CLOVE_MENU_SLIDESHOW: string[] = [
  "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=1200&q=80", // butter chicken
  "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=1200&q=80", // thali
  "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=1200&q=80", // curry spread
  "https://images.unsplash.com/photo-1505253758473-96b7015fcd40?auto=format&fit=crop&w=1200&q=80", // biryani
];

export const CLOVE_CATERING_SLIDESHOW: string[] = [
  "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1200&q=80", // banquet spread
  "https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=1200&q=80", // buffet platters
  "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=1200&q=80", // assorted indian dishes
  "https://images.unsplash.com/photo-1542367592-8849eb950fd8?auto=format&fit=crop&w=1200&q=80", // catering table
];

export const CLOVE_HERO_IMAGE =
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=80";

export const CLOVE_HOME_MENU_BLURB =
  "From the tandoor to slow-cooked curries and fragrant biryanis, our menu is a tour of India's most loved flavors — handcrafted daily with house-ground spices.";

export const CLOVE_HOME_CATERING_BLURB =
  "Hosting a celebration? Clove Dining brings the feast to you — generous platters, live counters, and crowd-favorite classics scaled for any gathering.";
