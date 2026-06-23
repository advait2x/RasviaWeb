/**
 * Marketing site: product nav + long-form product pages.
 * Paths: /products/<slug>
 */

export type MarketingProductSlug =
  | "custom-app"
  | "custom-website"
  | "waitlists-kiosk"
  | "tableside-qr"
  | "kitchen"
  | "menu-qr"
  | "reports";

export type MarketingNavProduct = {
  slug: MarketingProductSlug;
  name: string;
  /** Shorter label for landing footer (optional) */
  footerLabel?: string;
  description: string;
};

export const MARKETING_NAV_PRODUCTS: MarketingNavProduct[] = [
  {
    slug: "custom-app",
    name: "Custom app",
    footerLabel: "Custom app",
    description: "Branded iOS and Android app under your restaurant name",
  },
  {
    slug: "custom-website",
    name: "Custom website",
    footerLabel: "Custom website",
    description: "Web storefront for direct orders. No app download required.",
  },
  {
    slug: "waitlists-kiosk",
    name: "Waitlists & kiosk",
    description: "Walk-in queue, kiosk check-in, guest updates",
  },
  {
    slug: "tableside-qr",
    name: "Tableside QR",
    description: "One QR per table. Guests order and pay from their phones.",
  },
  {
    slug: "kitchen",
    name: "Kitchen display",
    footerLabel: "Kitchen",
    description: "Expedite screen with bump, recall, and ticket status",
  },
  {
    slug: "menu-qr",
    name: "Menu & QR marketing",
    footerLabel: "Menu QR",
    description: "Shareable online menu plus printable QR sheets",
  },
  {
    slug: "reports",
    name: "Reports & insights",
    footerLabel: "Reports",
    description: "Sales by hour, tips, top items, past order lookup",
  },
];

export type ProductSection = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

export type ProductPageContent = {
  slug: MarketingProductSlug;
  /** Short label for <title> and hub cards */
  shortTitle: string;
  headline: string;
  subhead: string;
  /** Hero callouts */
  highlights: string[];
  sections: ProductSection[];
};

export const PRODUCT_PAGES: Record<MarketingProductSlug, ProductPageContent> = {
  "custom-app": {
    slug: "custom-app",
    shortTitle: "Custom app",
    headline: "Your restaurant's own app on iOS and Android",
    subhead:
      "We build a branded mobile app with your logo, menu, and checkout. Guests order from you, not from a delivery marketplace. You keep the guest relationship and the margin on every order.",
    highlights: [
      "Your name and branding in the App Store and Google Play",
      "Push notifications and one-tap reorder for regulars",
      "Menu and orders synced with Toast, Clover, or Square",
    ],
    sections: [
      {
        title: "What guests get",
        paragraphs: [
          "They download your app, not a third-party marketplace. They see your menu, your photos, and your prices. Checkout pays you directly through Stripe. No commission on the order.",
          "Repeat guests can reorder in a few taps. Push alerts can nudge them about specials or a favorite dish coming back on the menu.",
        ],
        bullets: [
          "Dark, readable layout built for menu browsing on a phone",
          "Saved payment and address for faster checkout",
          "Order history tied to their account on your app",
        ],
      },
      {
        title: "What you get",
        paragraphs: [
          "You own the guest list. Orders and customer data stay with your brand, not buried inside a delivery app's merchant portal.",
          "The app pulls from the same menu you manage in Rasvia. When you 86 an item or change a price, the app can reflect it without a separate update cycle.",
        ],
        bullets: [
          "Flat setup fee and monthly hosting. No per-order cut",
          "Works alongside your existing POS integration",
          "Free mockup before you commit so you can see your brand on a phone",
        ],
      },
      {
        title: "How launch works",
        paragraphs: [
          "We start with a mockup using your logo, colors, and menu. Most independent restaurants go live within a few days once assets are in hand.",
          "We handle the technical side of app builds and store listings. You focus on the menu and the offer.",
        ],
      },
      {
        title: "Pairs with the rest of Rasvia",
        paragraphs: [
          "The same account can run your custom website, waitlist, tableside QR, and kitchen display. One menu. One order pipeline.",
          "Many owners start with the app plus web storefront. Others add tableside ordering or waitlists as the room grows into it.",
        ],
      },
    ],
  },
  "custom-website": {
    slug: "custom-website",
    shortTitle: "Custom website",
    headline: "A web storefront guests can order from today",
    subhead:
      "A branded site with your menu, photos, and checkout. Guests order from a link or a QR code. No app download required. No marketplace listing. No commission on the order.",
    highlights: [
      "Shareable link for search, social, and email",
      "QR codes for tables, flyers, and window clings",
      "Menu synced with your POS and your Rasvia dashboard",
    ],
    sections: [
      {
        title: "Where guests find you",
        paragraphs: [
          "Put the link on Instagram, Google Business, or your existing site. Print a QR on table tents and takeout bags. Anyone with a phone can browse and order without installing anything.",
          "The storefront matches your brand. Not a generic template with your logo dropped on top.",
        ],
        bullets: [
          "Readable menu layout on mobile and desktop",
          "Checkout that pays you directly",
          "Tax shown from your configured restaurant rate before payment",
        ],
      },
      {
        title: "One menu to maintain",
        paragraphs: [
          "Edit items in the Rasvia menu manager. The web storefront can pick up changes without redeploying a separate microsite.",
          "Out-of-stock items can drop off the guest view so you are not taking orders for dishes you already ran out of.",
        ],
        bullets: [
          "Photos, descriptions, and diet tags on each item",
          "Same item data powers the app if you add one later",
          "Printable QR PDFs when you need paper collateral",
        ],
      },
      {
        title: "Pricing model",
        paragraphs: [
          "You pay a flat setup fee and monthly hosting. Rasvia does not take a percentage of each order.",
          "Every plan starts with a free mockup so you can see your brand on the web before you sign.",
        ],
      },
      {
        title: "Grow into the full platform",
        paragraphs: [
          "The website is often the first step. Owners add a custom app for push and reorder, tableside QR for dine-in, or waitlists when the lobby gets busy.",
          "All of it runs on the same live data. You are not stitching together five vendors.",
        ],
      },
    ],
  },
  "waitlists-kiosk": {
    slug: "waitlists-kiosk",
    shortTitle: "Waitlists & kiosk",
    headline: "A waitlist the whole floor can read",
    subhead:
      "Hosts add parties from the dashboard or a lobby kiosk. Everyone sees the same queue, wait time, and status. No sticky notes on the podium.",
    highlights: [
      "Kiosk flow for quick party check-in",
      "Live waitlist synced across devices",
      "Party size, notes, and status in one row",
    ],
    sections: [
      {
        title: "How the waitlist works",
        paragraphs: [
          "Add a party from the dashboard or from a tablet by the door. Each entry shows seat count, quoted wait, and status. Waiting, notified, seated, or removed. The floor does not have to guess what changed five minutes ago.",
          "When a table opens, move the party straight to a seat or a tableside QR session. Names and headcounts carry over. No retyping.",
        ],
        bullets: [
          "Sort the board during rush without losing the end of the list",
          "See who was notified and who still needs a text",
          "Past sessions stay on record if you need to settle a dispute",
        ],
      },
      {
        title: "Kiosk for busy lobbies",
        paragraphs: [
          "Guests check themselves in. Name, party size, optional phone. Into the queue. Staff stay at the host stand for exceptions.",
          "Managers can override from the dashboard for accessibility, loyalty, or a reservation mix-up.",
        ],
      },
      {
        title: "Guest updates",
        paragraphs: [
          "When you mark a party notified, they know their table is ready. Pair that with honest wait times on the display. You get fewer no-shows and fewer angry walkouts.",
          "You choose when to text and when to call. Rasvia does not force one policy on every concept.",
        ],
      },
      {
        title: "End of night",
        paragraphs: [
          "Every add, seat, and no-show is timestamped in one place. Not spread across clipboards and group texts.",
          "If you already use Rasvia for orders, the waitlist sits in the same system. Not a separate spreadsheet.",
        ],
      },
    ],
  },
  "tableside-qr": {
    slug: "tableside-qr",
    shortTitle: "Tableside QR",
    headline: "One QR per table. Guests order and pay on their phones.",
    subhead:
      "Print a sticker for each table. Every scan joins the same live cart. Guests add their own items, pay their share, and the kitchen gets one ticket with the table number.",
    highlights: [
      "Fixed QR per table. No server tablet required",
      "Shared cart. First scanner runs lock and checkout",
      "Kitchen fires after each guest pays their share",
    ],
    sections: [
      {
        title: "Print once per table",
        paragraphs: [
          "Generate QR sheets from the partner dashboard. By table count or custom labels like Patio 3 or Bar 2. Each code always opens that table's active session.",
          "When the party leaves and the order is in, the next scan starts a fresh cart.",
        ],
        bullets: [
          "Works in the Rasvia app or in a mobile browser",
          "Late arrivals can join the same session to pay their share",
          "Table label prints on the kitchen ticket",
        ],
      },
      {
        title: "What guests see",
        paragraphs: [
          "The first person to scan is the table host. They can lock the cart and start checkout. Everyone else joins as members, browses the menu, and adds items to the shared cart.",
          "Each guest pays their own share through Stripe. Tax follows your configured restaurant rate before they confirm.",
        ],
      },
      {
        title: "What staff see",
        paragraphs: [
          "The dashboard shows which tables have an active session and whether they are still ordering, locked, or paying.",
          "When every share is paid, one order hits the kitchen display with the table number. No re-keying from paper chits.",
        ],
      },
      {
        title: "Same engine as group orders",
        paragraphs: [
          "Tableside ordering uses Rasvia party sessions, split payments, and Stripe Connect payouts. You do not need a second ordering product.",
          "Pair it with waitlists and kiosk if you want lobby check-in and table ordering in one system.",
        ],
      },
    ],
  },
  kitchen: {
    slug: "kitchen",
    shortTitle: "Kitchen display",
    headline: "Kitchen tickets you can read at arm's length",
    subhead:
      "Full-screen expedite view built for bump discipline and clear status changes from fired to served. Front and back stay on the same page.",
    highlights: [
      "Bump, recall, and status controls that match how tickets age",
      "Large type for line-of-sight reading",
      "Runs on a tablet or a secondary display on the line",
    ],
    sections: [
      {
        title: "Where tickets come from",
        paragraphs: [
          "Tickets arrive from tableside sessions, POS entry, and other Rasvia order paths. Modifiers and quantities stay in a fixed layout so expo can scan while moving.",
          "If an item is pulled back or refired, the ticket updates. The line is not chasing plates that were never fired.",
        ],
        bullets: [
          "Status history your GM can review later",
          "Less shouting over allergy mods vs regular mods",
          "Dense layout for high-volume lines",
        ],
      },
      {
        title: "Fast casual and full service",
        paragraphs: [
          "Fast casual needs speed. Full service still needs nuance. The display shows fire time, hold states, and served status where you use them.",
          "Served status tells FOH when to run food without watching the window.",
        ],
      },
      {
        title: "Busy nights",
        paragraphs: [
          "The display stays up when the room is loud. Updates are realtime. No manual browser refresh mid-service.",
          "Open the floor plan next to tickets when you want table context with ticket age.",
        ],
      },
      {
        title: "Training new line cooks",
        paragraphs: [
          "A clear status model means less tribal knowledge on day one. Color and motion stay restrained so nothing fights the food for attention.",
          "Managers can demo the flow from any browser logged into the partner hub.",
        ],
      },
    ],
  },
  "menu-qr": {
    slug: "menu-qr",
    shortTitle: "Menu & QR marketing",
    headline: "One menu in the app, on the web, and on paper",
    subhead:
      "Publish a branded public menu. Sync 86s from the same editor your staff uses. Print QR sheets for tables, flyers, and window clings.",
    highlights: [
      "Share links that match your brand",
      "PDF export with QR codes sized for print",
      "Guest menus respect out-of-stock in realtime",
    ],
    sections: [
      {
        title: "One menu to edit",
        paragraphs: [
          "Turn an item off in the menu manager and party carts can respect it quickly. Fewer apologies for dishes you 86'd twenty minutes ago.",
          "Photos, descriptions, diet tags, and tax metadata stay on the item. Marketing does not maintain a shadow spreadsheet.",
        ],
        bullets: [
          "Seasonal menu changes without redeploying a microsite",
          "Chef wording and guest-facing copy stay aligned",
          "Stripe tax codes where finance needs them",
        ],
      },
      {
        title: "Public share pages",
        paragraphs: [
          "Guests click from search, social, or your site into a menu that matches what they see in the app.",
          "Event planners get a link instead of a long email thread.",
        ],
      },
      {
        title: "Printable QR sheets",
        paragraphs: [
          "Export PDFs with QR codes for tent cards, tri-folds, or posters. Table numbers and join instructions can follow your brand guidelines.",
          "Reprint after a menu change without waiting on an agency.",
        ],
      },
      {
        title: "Discovery",
        paragraphs: [
          "When your menu lives on Rasvia, discovery flows can surface you without cloning your content. You stay responsible for accuracy. The structure already matches checkout and tax.",
          "Use QR printouts with tableside sessions when you want scan-to-order, not just browse-only menus.",
        ],
      },
    ],
  },
  reports: {
    slug: "reports",
    shortTitle: "Reports & insights",
    headline: "Sales, tips, and top items without exporting CSVs",
    subhead:
      "Hourly and daily revenue, rollups that match how you read a service, and drill-down into past orders when accounting asks about last Tuesday.",
    highlights: [
      "Trend lines aligned with how restaurants read a night",
      "Tip and fee fields for back-office reconciliation",
      "Links into order detail, not just totals",
    ],
    sections: [
      {
        title: "Monday morning view",
        paragraphs: [
          "Revenue curves show how the room moved through the night. Soft open, peak, late dessert. Compare periods when you test a promo or a staffing change.",
          "Top-item reports show what drove margin, not just what sounded popular at the pass.",
        ],
        bullets: [
          "Refunds, voids, and comps when you dig in",
          "Platform fee and tax columns that line up with Stripe exports",
          "Export paths for finance without weekly pivot tables",
        ],
      },
      {
        title: "From chart to check",
        paragraphs: [
          "Click a spike in the chart and open the checks behind it. One big party vs many small ones before you explain variance to a partner.",
          "Past orders keep itemization for chargebacks and coaching conversations.",
        ],
      },
      {
        title: "Who sees what",
        paragraphs: [
          "Owners get the wide view. GMs can focus on service metrics. Accountants stay in reconciliation-friendly tables. Roles keep payout data scoped.",
          "Platform admins supporting many venues can switch restaurants without logging out.",
        ],
      },
      {
        title: "Tied to operations",
        paragraphs: [
          "When reports connect to kitchen status and waitlist history, you can tell whether a dip was demand, execution, or a config mistake. That is harder when POS, waitlist, and payments each export differently.",
          "Use the numbers to plan the next menu or schedule, not only for taxes.",
        ],
      },
    ],
  },
};

export function getMarketingProductPath(slug: MarketingProductSlug): string {
  return `/products/${slug}`;
}

export function getProductPageContent(slug: string): ProductPageContent | null {
  if (slug in PRODUCT_PAGES) {
    return PRODUCT_PAGES[slug as MarketingProductSlug];
  }
  return null;
}
