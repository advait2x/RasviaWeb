/**
 * Marketing site: product nav + long-form product pages.
 * Paths: /products/<slug>
 */

export type MarketingProductSlug =
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
    slug: "waitlists-kiosk",
    name: "Waitlists & kiosk",
    description: "Walk-ins, SMS-ready queue, and a tablet-first lobby flow",
  },
  {
    slug: "tableside-qr",
    name: "Tableside QR",
    description: "Fixed per-table QR: guests self-order, pay their share, one kitchen ticket",
  },
  {
    slug: "kitchen",
    name: "Kitchen display",
    footerLabel: "Kitchen",
    description: "Expedite board with bump, move-back, and explicit ticket status",
  },
  {
    slug: "menu-qr",
    name: "Menu & QR marketing",
    footerLabel: "Menu QR",
    description: "Public share menu plus printable PDFs with scannable codes",
  },
  {
    slug: "reports",
    name: "Reports & insights",
    footerLabel: "Reports",
    description: "Sales curves, tips, top items, and past-order drill-down",
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
  "waitlists-kiosk": {
    slug: "waitlists-kiosk",
    shortTitle: "Waitlists & kiosk",
    headline: "Turn lobby chaos into a calm, measured queue",
    subhead:
      "Rasvia connects a host-facing dashboard, optional in-venue kiosk, and guest-facing updates so walk-ins get accurate waits-without a podium full of sticky notes.",
    highlights: [
      "Tablet-first kiosk flow for quick party capture",
      "Live waitlist your whole team sees in sync",
      "Party size, notes, and status in one dense row",
    ],
    sections: [
      {
        title: "How the waitlist works in practice",
        paragraphs: [
          "Hosts add parties from the dashboard or from a kiosk placed near the door. Each entry keeps seat count, quoted wait, and state (waiting, notified, seated, or removed) so the floor never debates what happened five minutes ago.",
          "Because the queue lives in the same system as your tables and parties, you can graduate a waitlisted group straight into a table or a tableside QR session when you are ready-without re-keying names or headcounts.",
        ],
        bullets: [
          "Sort and scan the board during rush without losing the tail of the list",
          "See at a glance who has been notified and who still needs a ping",
          "Keep historical context in past sessions when you need to settle a dispute",
        ],
      },
      {
        title: "Kiosk mode for high-volume lobbies",
        paragraphs: [
          "Kiosk mode is designed for guests who prefer self-serve check-in and for venues that want to keep the host station for exceptions only. The flow stays short: party name, party size, optional phone or SMS preference, and into the queue.",
          "Staff retain override from the dashboard if someone needs to jump the line for accessibility, loyalty, or a reservation mismatch.",
        ],
      },
      {
        title: "Notifications and guest expectations",
        paragraphs: [
          "When you mark a party as notified, guests have a clear signal that their table-or next step-is ready. Pair that discipline with honest wait-time estimates on the display and you reduce no-shows and angry walkouts.",
          "Policies vary by concept; Rasvia stays flexible on when you text versus when you call, so you can match local norms and carrier rules.",
        ],
      },
      {
        title: "Operational hygiene",
        paragraphs: [
          "End-of-night reviews get easier when every add, seat, and no-show is timestamped in one system instead of across clipboards and DMs. Export-minded finance teams can align wait-time data with service metrics downstream.",
          "If you already run Rasvia for orders and payouts, the waitlist becomes another coordinated surface rather than a standalone spreadsheet.",
        ],
      },
    ],
  },
  "tableside-qr": {
    slug: "tableside-qr",
    shortTitle: "Tableside QR",
    headline: "A fixed QR on every table — guests order and pay themselves",
    subhead:
      "Print one sticker per table. Every scan joins the same live cart; guests add their own items, pay their share, and your kitchen gets one consolidated ticket tagged with the table number.",
    highlights: [
      "Fixed per-table QR — no waiter takes the order on a tablet",
      "Shared live cart; first scanner controls lock and checkout",
      "Pay-first flow: kitchen fires after everyone has paid their share",
    ],
    sections: [
      {
        title: "Print once, run all night",
        paragraphs: [
          "From the partner dashboard, generate a sheet of QR codes for your dining room — by table count or custom labels like Patio 3 or Bar 2. Each code encodes a stable link that always resolves to that table's active session.",
          "When the party leaves and the session is submitted, the next scan starts a fresh cart automatically.",
        ],
        bullets: [
          "Works in the Rasvia app or in the mobile browser — no download required",
          "Late arrivals during payment join the same session to pay their share",
          "Table label flows straight onto the kitchen ticket",
        ],
      },
      {
        title: "How guests experience it",
        paragraphs: [
          "The first person to scan becomes the table host (lock cart, start checkout). Everyone else joins as members, browses the menu on their phone, and adds what they want to the shared cart.",
          "Each guest pays their own share through Stripe checkout. Tax estimates follow your configured restaurant rate before they confirm.",
        ],
      },
      {
        title: "Kitchen and floor visibility",
        paragraphs: [
          "The dashboard shows which tables have an active self-order session and whether they are still ordering, locked, or paying.",
          "When every share is settled, one consolidated order hits the kitchen display with the table number — no re-keying from paper chits.",
        ],
      },
      {
        title: "Built on the same group-order engine",
        paragraphs: [
          "Tableside self-order reuses Rasvia's party sessions, split payments, and Stripe Connect payouts. You get marketplace-grade checkout without training staff to run a separate ordering product.",
          "Pair with waitlists and kiosk when you want lobby check-in and tableside ordering in one system.",
        ],
      },
    ],
  },
  kitchen: {
    slug: "kitchen",
    shortTitle: "Kitchen display",
    headline: "Manage orders with clarity and control",
    subhead:
      "A full-screen kitchen display tuned for readability, bump discipline, and explicit transitions from fired to served so the front and back stay aligned.",
    highlights: [
      "Bump, move-back, and status pickers that match how tickets age",
      "Large-type tickets for arm’s-length reading",
      "Built for tablets or secondary displays in the line",
    ],
    sections: [
      {
        title: "Ticket truth from POS and party orders",
        paragraphs: [
          "Tickets land from tableside sessions, manual POS entry, and other Rasvia order paths. Modifiers and quantities render in a stable column so expedite staff can scan while moving.",
          "When an item is pulled back or refired, the ticket reflects the change so you do not chase phantom plates.",
        ],
        bullets: [
          "Status progression your GM can audit later",
          "Less shouting over \"is this the allergy mod or the regular\"",
          "Room for high-volume lines with dense chits",
        ],
      },
      {
        title: "Throughput without losing hospitality",
        paragraphs: [
          "Fast-casual concepts need ruthless clarity; fine dining still needs nuance. The display separates fire time, hold states, and \"all-day\" style mental models where you use them.",
          "Explicit served states help FOH know when to run food without watching the window physically.",
        ],
      },
      {
        title: "Reliability on busy nights",
        paragraphs: [
          "The display is designed to stay up when the dining room is loud and greasy. Real-time updates mean you are not waiting for a manual browser refresh during service.",
          "Pair the expedite view with your floor plan in the dashboard when you want table context next to ticket age.",
        ],
      },
      {
        title: "Expedite training on day one",
        paragraphs: [
          "A clear status model reduces how much tribal knowledge a new line cook needs. Color, typography, and motion stay restrained so nothing fights the food itself for attention.",
          "Managers can demo the flow from any browser logged into the partner hub.",
        ],
      },
    ],
  },
  "menu-qr": {
    slug: "menu-qr",
    shortTitle: "Menu & QR marketing",
    headline: "One menu everywhere: in-app, on the web, on paper",
    subhead:
      "Publish a branded public menu, sync live 86s from the same editor your staff trusts, and ship printable QR sheets for tables, flyers, and window clings.",
    highlights: [
      "Share links that look like your brand-not a generic PDF bucket",
      "PDF export with placement-ready QR codes",
      "Guest menus respect out-of-stock in real time",
    ],
    sections: [
      {
        title: "Single source of truth for the menu",
        paragraphs: [
          "When you toggle an item off in the menu manager, party carts and discovery surfaces can respect that state quickly. That reduces apologizing for dishes you actually 86’d twenty minutes ago.",
          "Photography, descriptions, dietary tags, and tax metadata stay attached to the structured item so marketing does not fork a shadow spreadsheet.",
        ],
        bullets: [
          "Faster seasonal rotations without redeploying a microsite",
          "Cleaner handoff between chef tastings and guest-facing wording",
          "Room for Stripe tax codes where your finance team needs them",
        ],
      },
      {
        title: "Public share pages",
        paragraphs: [
          "Prospects click from search, Instagram, or your landing links straight into a readable menu that matches what insiders see in the app. That tight loop builds trust before they commit to a reservation or walk-in.",
          "You can push the same narrative to event planners who need a link, not a 20-message email thread.",
        ],
      },
      {
        title: "Printable collateral",
        paragraphs: [
          "Generate PDFs with QR codes sized for tri-folds, tent cards, or poster boards. Table numbers and join instructions can complement your existing branding guidelines.",
          "Operations teams reprint after menu changes without waiting on agency turnaround.",
        ],
      },
      {
        title: "Discovery and remarketing",
        paragraphs: [
          "When your menu lives on-platform, Rasvia can surface you in relevant discovery flows without cloning your content. You stay responsible for accuracy; the structure is already aligned with checkout and tax.",
          "Pair QR collateral with tableside sessions when you want scan-to-join ordering in addition to browse-only menus.",
        ],
      },
    ],
  },
  reports: {
    slug: "reports",
    shortTitle: "Reports & insights",
    headline: "Sales, tips, and top movers without CSV archaeology",
    subhead:
      "Hourly and daily revenue views, rollups that respect your service model, and drill-down into past orders when accounting asks \"what happened last Tuesday?\"",
    highlights: [
      "Trend lines aligned with how restaurants read the night",
      "Tip and fee fields surfaced for back-office reconciliation",
      "Deep links into order detail instead of blind aggregates",
    ],
    sections: [
      {
        title: "What leadership sees on Monday morning",
        paragraphs: [
          "Revenue curves show how the room breathed: soft opens, peak crush, late-night dessert. Compare against prior periods when you are testing a promo or a staffing model.",
          "Top-item reports highlight what actually drove margin, not just what sounded popular anecdotally.",
        ],
        bullets: [
          "Separate signal for refunds, voids, and comps when you dig in",
          "Platform fee and tax columns harmonize with Stripe settlement exports",
          "Export paths for finance without rebuilding pivot tables weekly",
        ],
      },
      {
        title: "From aggregate to invoice line",
        paragraphs: [
          "Click from a spike in the chart into the contributing checks. Identify one big party versus dozens of small ones before you explain variance to investors.",
          "Past orders retain itemization long enough for chargeback support and coaching conversations.",
        ],
      },
      {
        title: "Multi-role access",
        paragraphs: [
          "Owners get the wide lens; GMs might focus on service metrics; accountants can stay in reconciliation-friendly tables. Rasvia’s role model keeps sensitive payout data scoped sensibly.",
          "Platform admins supporting many venues can switch context without logging out.",
        ],
      },
      {
        title: "Closing the loop with operations",
        paragraphs: [
          "When reports tie back to kitchen status and waitlist history, you can answer whether a dip was demand, execution, or a config mistake. That is harder when your POS, waitlist, and payments each export differently.",
          "Use insights to seed the next menu iteration or staffing schedule, not just to file taxes.",
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
