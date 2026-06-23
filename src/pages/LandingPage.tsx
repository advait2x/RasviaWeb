import { useEffect, useRef } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  ChefHat,
  Clock,
  Globe,
  Home,
  Leaf,
  Plus,
  QrCode,
  ScanLine,
  Search,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Star,
  UtensilsCrossed,
  User,
} from "lucide-react";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import {
  MARKETING_NAV_PRODUCTS,
  PRODUCT_PAGES,
  getMarketingProductPath,
  type MarketingProductSlug,
} from "@/data/marketing-products";
import {
  MKT_ACCENT_INK,
  MKT_AVATAR_FALLBACK,
  MKT_BODY,
  MKT_BODY_ON_DARK,
  MKT_CTA_PRIMARY,
  MKT_CTA_SECONDARY,
  MKT_BTN_OUTLINE,
  MKT_DISPLAY,
  MKT_HEADING,
  MKT_HERO_BADGE,
  MKT_ICON_WELL,
  MKT_LINK_ARROW,
  MKT_MUTED,
  MKT_PANEL,
  MKT_PANEL_ACCENT,
  MKT_PRODUCT_FEATURED_LINK,
  MKT_PRODUCT_ROW_LINK,
  MKT_SECTION_BAND,
  MKT_TRUST,
  mktLearnMoreClass,
  mktPrimaryCtaClass,
} from "@/lib/marketingUi";
import { cn } from "@/lib/utils";
import { scrollToLandingSection, useLandingHashScroll } from "@/lib/marketing-nav";
import { useRevealOnce } from "@/hooks/useRevealOnce";

// Lead-capture destination for every primary CTA on this page.
const MOCKUP_CTA_HREF = "/support";

const FEATURED_PRODUCT_SLUGS = ["custom-app", "custom-website"] as const satisfies readonly MarketingProductSlug[];

const LANDING_PRODUCT_ICONS: Record<MarketingProductSlug, typeof Smartphone> = {
  "custom-app": Smartphone,
  "custom-website": Globe,
  "waitlists-kiosk": Clock,
  "tableside-qr": QrCode,
  kitchen: ChefHat,
  "menu-qr": ScanLine,
  reports: BarChart3,
};

const SECONDARY_PRODUCT_SLUGS = MARKETING_NAV_PRODUCTS.filter(
  (p) => p.slug !== "custom-app" && p.slug !== "custom-website",
).map((p) => p.slug);

// ──────────────────────────────────────────────────────
// PRICING / FOUNDERS DATA
// ──────────────────────────────────────────────────────

const PRICING_TIERS = [
  {
    name: "Storefront",
    description: "A branded web storefront for direct orders.",
    features: [
      "Branded web storefront",
      "Menu synced to your POS",
      "Online ordering with no commission",
      "QR menu and ordering",
      "Flat setup fee plus monthly hosting",
      "Email support",
    ],
    highlighted: false,
  },
  {
    name: "App + Storefront",
    description: "Your own iOS and Android app plus the web storefront.",
    features: [
      "Everything in Storefront",
      "Custom iOS and Android app",
      "Push notifications and one-tap reorder",
      "Tools for repeat guests",
      "Priority onboarding",
      "Priority support",
    ],
    highlighted: true,
  },
  {
    name: "Multi-Location",
    description: "For owners with more than one location or concept.",
    features: [
      "Everything in App + Storefront",
      "Multiple locations and concepts",
      "Dedicated design help",
      "Custom feature work",
      "Menu migration support",
      "24/7 priority support",
    ],
    highlighted: false,
  },
];

/* ── Founder data ─────────────────────────────────────
   To add a real photo, set `imageSrc` to the image path,
   e.g. imageSrc: "/founders/arjun.jpg"
   ──────────────────────────────────────────────────── */
const FOUNDERS = [
  {
    name: "Rithwik Matta",
    role: "CTO & Co-Founder",
    bio: "Computer science student at UT Dallas interested in full stack development, machine learning, and cloud engineering.",
    initials: "RM",
    imageSrc: null as string | null,
  },
  {
    name: "Advait Sagi",
    role: "CEO & Founder",
    bio: "Engineering student at Texas A&M University passionate about market analytics, consumer psychology, and driving impactful business strategy.",
    initials: "AS",
    imageSrc: null as string | null,
  },
  {
    name: "Akshaj Ande",
    role: "COO & Co-Founder",
    bio: "Computer science student at UT Austin interested in data analytics and cloud infrastructure.",
    initials: "AA",
    imageSrc: null as string | null,
  },
];

// ──────────────────────────────────────────────────────
// CONSUMER APP PHONE MOCKUPS
// High-fidelity, dark-mode "Clove Dining"-style storefront the
// customer actually sees. This is the product we sell — so it is
// the visual hero, not an internal ops dashboard.
// ──────────────────────────────────────────────────────

const APP_IMG = {
  hero: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80",
  butterChicken:
    "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=400&q=80",
  biryani:
    "https://images.unsplash.com/photo-1505253758473-96b7015fcd40?auto=format&fit=crop&w=400&q=80",
  paneer:
    "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=400&q=80",
  detail:
    "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=80",
};

const APP_MENU_ITEMS = [
  { name: "Butter Chicken", price: "$17.99", img: APP_IMG.butterChicken, veg: false, desc: "Tandoori chicken · silky tomato gravy" },
  { name: "Paneer Tikka", price: "$14.99", img: APP_IMG.paneer, veg: true, desc: "Char-grilled cottage cheese · mint" },
  { name: "Lamb Biryani", price: "$19.49", img: APP_IMG.biryani, veg: false, desc: "Saffron basmati · slow-cooked lamb" },
];

function PhoneStatusBar() {
  return (
    <div className="flex items-center justify-between px-5 pt-3 text-[10px] font-bold text-white">
      <span>9:41</span>
      <div className="flex items-center gap-1">
        <div className="flex items-end gap-[1.5px]">
          <span className="h-1.5 w-0.5 rounded-sm bg-white/80" />
          <span className="h-2 w-0.5 rounded-sm bg-white/80" />
          <span className="h-2.5 w-0.5 rounded-sm bg-white/80" />
        </div>
        <div className="ml-1 h-2 w-4 rounded-[2px] border border-white/60">
          <div className="m-[1px] h-[6px] w-[10px] rounded-[1px] bg-white/80" />
        </div>
      </div>
    </div>
  );
}

function PhoneTabBar({ active }: { active: "home" | "menu" | "cart" | "profile" }) {
  const tabs = [
    { id: "home", label: "Home", Icon: Home },
    { id: "menu", label: "Menu", Icon: UtensilsCrossed },
    { id: "cart", label: "Cart", Icon: ShoppingBag },
    { id: "profile", label: "You", Icon: User },
  ] as const;
  return (
    <div className="mt-auto flex items-center justify-around border-t border-white/[0.06] bg-black/70 px-2 py-2.5 backdrop-blur">
      {tabs.map(({ id, label, Icon }) => {
        const on = id === active;
        return (
          <div key={id} className="relative flex flex-col items-center gap-0.5">
            <Icon size={15} className={on ? "text-amber-400" : "text-zinc-600"} />
            <span className={`text-[7px] font-bold ${on ? "text-amber-400" : "text-zinc-600"}`}>{label}</span>
            {id === "cart" && (
              <span className="absolute -right-2 -top-1 flex h-3 w-3 items-center justify-center rounded-full bg-amber-500 text-[6px] font-black text-black">
                2
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PhoneFrame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("relative mx-auto w-[260px] sm:w-[272px]", className)}>
      <div className="relative rounded-[2.75rem] border border-zinc-800 bg-black p-2.5 shadow-2xl shadow-black/50 ring-1 ring-white/[0.06]">
        {/* notch */}
        <div className="absolute left-1/2 top-2.5 z-30 h-5 w-24 -translate-x-1/2 rounded-b-2xl bg-black" />
        <div className="relative flex h-[520px] flex-col overflow-hidden rounded-[2.25rem] bg-[#0a0a0a]">
          {children}
        </div>
      </div>
    </div>
  );
}

function ScreenMenu() {
  return (
    <div className="flex h-full flex-col">
      <PhoneStatusBar />
      <div className="flex items-start justify-between px-4 pb-2 pt-2">
        <div>
          <p className="text-[8px] font-black uppercase tracking-[0.2em] text-amber-500">Clove Dining</p>
          <div className="mt-0.5 flex items-center gap-1">
            <span className="h-1 w-1 rounded-full bg-emerald-400" />
            <span className="text-[9px] text-zinc-400">Downtown · Open now</span>
          </div>
        </div>
        <div className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5">
          <Search size={13} className="text-zinc-300" />
        </div>
      </div>

      <div className="relative mx-4 overflow-hidden rounded-2xl">
        <img src={APP_IMG.hero} alt="Featured dish" className="h-28 w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />
        <div className="absolute inset-x-3 bottom-2">
          <p className="text-[11px] font-black leading-tight text-white">Modern Indian, rooted in tradition</p>
          <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-500 px-1.5 py-0.5">
            <Star size={8} className="fill-black text-black" />
            <span className="text-[7px] font-black text-black">4.9 · ready in 20 min</span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex gap-1.5 px-4">
        {["Popular", "Tandoor", "Curries", "Biryani"].map((c, i) => (
          <span
            key={c}
            className={
              i === 0
                ? "whitespace-nowrap rounded-lg bg-amber-500 px-2.5 py-1 text-[8px] font-bold text-black"
                : "whitespace-nowrap rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[8px] font-bold text-zinc-300"
            }
          >
            {c}
          </span>
        ))}
      </div>

      <div className="mt-2 flex flex-1 flex-col gap-2 overflow-hidden px-4 pb-2">
        {APP_MENU_ITEMS.map((item) => (
          <div
            key={item.name}
            className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.03] p-2"
          >
            <img src={item.img} alt={item.name} className="h-11 w-11 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <p className="truncate text-[10px] font-bold text-white">{item.name}</p>
                {item.veg && <Leaf size={9} className="shrink-0 text-emerald-400" />}
              </div>
              <p className="truncate text-[8px] text-zinc-500">{item.desc}</p>
              <p className="mt-0.5 text-[9px] font-black text-amber-400">{item.price}</p>
            </div>
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500 text-black">
              <Plus size={12} />
            </div>
          </div>
        ))}
      </div>

      <PhoneTabBar active="home" />
    </div>
  );
}

function ScreenItem() {
  return (
    <div className="flex h-full flex-col">
      <div className="relative">
        <img src={APP_IMG.detail} alt="Butter Chicken" className="h-40 w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-black/40" />
        <div className="absolute left-3 top-9 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 backdrop-blur">
          <ArrowLeft size={14} className="text-white" />
        </div>
      </div>

      <div className="flex flex-1 flex-col px-4 pt-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-black text-white">Butter Chicken</h3>
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[8px] font-bold text-amber-400">
                <Star size={8} className="fill-amber-400 text-amber-400" />
                4.9
              </span>
              <span className="text-[8px] text-zinc-500">Chef&apos;s favorite</span>
            </div>
          </div>
          <p className="text-base font-black text-amber-400">$17.99</p>
        </div>

        <p className="mt-2.5 text-[9px] leading-relaxed text-zinc-400">
          Tandoor-roasted chicken simmered in a velvety tomato, butter, and fenugreek gravy.
          Served with fragrant basmati. Mild heat, deeply comforting.
        </p>

        <div className="mt-3 flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2">
          <span className="text-[9px] font-semibold text-zinc-300">Quantity</span>
          <div className="flex items-center gap-3">
            <span className="flex h-5 w-5 items-center justify-center rounded-md border border-white/10 text-[10px] text-zinc-400">–</span>
            <span className="text-[10px] font-black text-white">1</span>
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-500 text-[10px] font-black text-black">+</span>
          </div>
        </div>

        <button
          type="button"
          className="mt-auto mb-4 flex w-full items-center justify-between rounded-xl bg-amber-500 px-4 py-2.5 text-[10px] font-black text-black"
        >
          <span>Add to cart</span>
          <span>$17.99</span>
        </button>
      </div>
    </div>
  );
}

function ScreenCheckout() {
  return (
    <div className="flex h-full flex-col">
      <PhoneStatusBar />
      <div className="px-4 pb-1 pt-3">
        <h3 className="text-sm font-black text-white">Your order</h3>
        <p className="text-[9px] text-zinc-500">Clove Dining · Dine in</p>
      </div>

      <div className="flex flex-col gap-2 px-4 pt-2">
        {[
          { name: "Butter Chicken", qty: 1, price: "$17.99", img: APP_IMG.butterChicken },
          { name: "Lamb Biryani", qty: 1, price: "$19.49", img: APP_IMG.biryani },
        ].map((row) => (
          <div key={row.name} className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.03] p-2">
            <img src={row.img} alt={row.name} className="h-9 w-9 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[10px] font-bold text-white">{row.name}</p>
              <p className="text-[8px] text-zinc-500">Qty {row.qty}</p>
            </div>
            <p className="text-[10px] font-black text-amber-400">{row.price}</p>
          </div>
        ))}
      </div>

      <div className="mx-4 mt-3 flex flex-col gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
        <div className="flex items-center justify-between text-[9px]">
          <span className="text-zinc-500">Subtotal</span>
          <span className="font-semibold text-zinc-300">$37.48</span>
        </div>
        <div className="flex items-center justify-between text-[9px]">
          <span className="text-zinc-500">Tax</span>
          <span className="font-semibold text-zinc-300">$3.09</span>
        </div>
        <div className="mt-0.5 flex items-center justify-between border-t border-white/[0.06] pt-1.5">
          <span className="text-[10px] font-bold text-white">Total</span>
          <span className="text-xs font-black text-white">$40.57</span>
        </div>
      </div>

      <div className="mx-4 mt-2.5 flex items-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/[0.08] px-2.5 py-2">
        <ShieldCheck size={12} className="shrink-0 text-emerald-400" />
        <p className="text-[8px] font-semibold leading-snug text-emerald-300">
          No commission. Payment goes straight to the restaurant.
        </p>
      </div>

      <button
        type="button"
        className="mx-4 mt-auto mb-3 flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 py-2.5 text-[10px] font-black text-black"
      >
        Pay $40.57
      </button>

      <PhoneTabBar active="cart" />
    </div>
  );
}

// ──────────────────────────────────────────────────────
// LANDING PAGE
// ──────────────────────────────────────────────────────

export default function LandingPage() {
  const heroGlowRef = useRef<HTMLDivElement | null>(null);
  const glowPos = useRef({ x: 0, y: 0 });
  const glowTarget = useRef({ x: 0, y: 0 });
  const { ref: foundersRef, revealed: foundersRevealed } = useRevealOnce<HTMLDivElement>();

  useLandingHashScroll();

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    let raf = 0;
    let cancelled = false;
    const onMove = (e: MouseEvent) => {
      glowTarget.current = {
        x: e.clientX - window.innerWidth / 2,
        y: e.clientY - window.innerHeight / 3,
      };
    };
    const lerp = 0.14;
    const tick = () => {
      if (cancelled) return;
      glowPos.current.x += (glowTarget.current.x - glowPos.current.x) * lerp;
      glowPos.current.y += (glowTarget.current.y - glowPos.current.y) * lerp;
      const el = heroGlowRef.current;
      if (el) {
        el.style.transform = `translate(calc(-50% + ${glowPos.current.x}px), calc(-50% + ${glowPos.current.y}px))`;
      }
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return (
    <MarketingLayout footer="landing">
      <div className="relative w-full min-h-screen overflow-x-hidden">
      <div
        ref={heroGlowRef}
        className="pointer-events-none fixed top-1/3 left-1/2 hidden h-[700px] w-[min(1000px,100vw)] rounded-full opacity-[0.08] motion-safe:block [background:radial-gradient(ellipse_at_center,#EA580C_0%,transparent_70%)] dark:opacity-[0.06] dark:[background:radial-gradient(ellipse_at_center,#F59E0B_0%,transparent_70%)]"
        style={{
          zIndex: 0,
          filter: "blur(48px)",
          transform: "translate(-50%, -50%)",
        }}
      />

      <main className="relative z-10 w-full py-12">
        {/* ── Hero ─────────────────────────────────────── */}
        <div className="mx-auto max-w-7xl px-6 relative overflow-hidden">
          <section className="relative grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <span
                className={cn("mkt-enter", MKT_HERO_BADGE)}
                style={{ "--mkt-i": 0 } as React.CSSProperties}
              >
                <Star size={12} className="fill-amber-500 text-amber-500" aria-hidden />
                Built for independent restaurants
              </span>
              <h1
                className={cn("mkt-enter mt-4 text-4xl leading-[1.05] sm:text-5xl text-balance", MKT_DISPLAY, MKT_HEADING)}
                style={{ "--mkt-i": 1 } as React.CSSProperties}
              >
                Delivery apps take 30%.{" "}
                <span className={MKT_ACCENT_INK}>Keep your customers.</span>
              </h1>
              <p
                className={cn("mkt-enter mt-5 max-w-xl text-lg leading-relaxed text-pretty", MKT_BODY)}
                style={{ "--mkt-i": 2 } as React.CSSProperties}
              >
                We build branded mobile apps and web storefronts for independent restaurants.
                No per-order commission. You keep the margin on every sale.
              </p>
              <div
                className="mkt-enter mt-7 flex flex-col gap-3 sm:flex-row sm:items-center"
                style={{ "--mkt-i": 3 } as React.CSSProperties}
              >
                <a href={MOCKUP_CTA_HREF} className={mktPrimaryCtaClass()}>
                  See a free mockup
                  <ArrowRight size={16} className="transition-transform duration-200 ease-[var(--mkt-ease-out)] motion-safe:group-hover:translate-x-0.5" />
                </a>
                <button
                  type="button"
                  onClick={() => scrollToLandingSection("pricing")}
                  className={MKT_CTA_SECONDARY}
                >
                  View pricing
                </button>
              </div>
              <div
                className={cn("mkt-enter mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium", MKT_MUTED)}
                style={{ "--mkt-i": 4 } as React.CSSProperties}
              >
                {["No order commission", "Up in days", "Your brand, your guest list"].map((point) => (
                  <span key={point} className="inline-flex items-center gap-1.5">
                    <Check size={14} className={MKT_TRUST} aria-hidden />
                    {point}
                  </span>
                ))}
              </div>
            </div>

            {/* Consumer-app phone mockup (the product we build for them) */}
            <div
              className="mkt-enter relative flex justify-center lg:justify-end"
              style={{ "--mkt-i": 5 } as React.CSSProperties}
            >
              <div className="pointer-events-none absolute inset-0 -z-10 mx-auto h-[320px] w-[320px] translate-y-8 rounded-full bg-amber-500/15 blur-3xl motion-reduce:hidden dark:bg-amber-500/10" />
              <div className="mkt-float">
                <PhoneFrame className="rotate-[1.5deg]">
                  <ScreenMenu />
                </PhoneFrame>
              </div>
            </div>
          </section>
        </div>

        {/* ── Products ─────────────────────────────────── */}
        <section id="products" className="mt-28 scroll-mt-24 md:scroll-mt-28" aria-labelledby="products-heading">
          <div className={cn("py-14 md:py-16", MKT_SECTION_BAND)}>
            <div className="mx-auto max-w-7xl px-6">
          <div className="mb-10 max-w-2xl">
            <h2 id="products-heading" className={cn("text-3xl sm:text-4xl text-balance", MKT_DISPLAY, MKT_HEADING)}>
              Start with your brand. Run the rest on the same system.
            </h2>
            <p className={cn("mt-3 max-w-prose text-pretty", MKT_BODY)}>
              Most owners begin with a custom app or website. Waitlists, table ordering, kitchen display,
              menus, and reporting plug into the same live menu and order data.
            </p>
          </div>

          <div className="grid items-stretch gap-6 lg:grid-cols-2">
            {FEATURED_PRODUCT_SLUGS.map((slug) => {
              const nav = MARKETING_NAV_PRODUCTS.find((p) => p.slug === slug)!;
              const page = PRODUCT_PAGES[slug];
              const Icon = LANDING_PRODUCT_ICONS[slug];
              return (
                <a
                  key={slug}
                  href={getMarketingProductPath(slug)}
                  aria-label={`${nav.name}. ${page.headline}`}
                  className={cn("p-8 lg:p-10", MKT_PANEL_ACCENT, MKT_PRODUCT_FEATURED_LINK)}
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-600 text-white">
                    <Icon size={22} aria-hidden />
                  </div>
                  <h3 className={cn("mt-5 text-xl font-bold text-balance sm:text-2xl", MKT_HEADING)}>
                    {page.headline}
                  </h3>
                  <p className={cn("mt-3 flex-1 text-sm leading-relaxed text-pretty", MKT_BODY)}>{nav.description}</p>
                  <span className={mktLearnMoreClass("mt-6")}>
                    Learn more
                    <ArrowRight
                      size={16}
                      className="transition-transform duration-200 ease-[var(--mkt-ease-out)] motion-safe:group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </span>
                </a>
              );
            })}
          </div>

          <div className={cn("mt-8 overflow-hidden", MKT_PANEL)}>
            {SECONDARY_PRODUCT_SLUGS.map((slug, index) => {
              const nav = MARKETING_NAV_PRODUCTS.find((p) => p.slug === slug)!;
              const Icon = LANDING_PRODUCT_ICONS[slug];
              return (
                <a
                  key={slug}
                  href={getMarketingProductPath(slug)}
                  aria-label={`${nav.name}. ${nav.description}`}
                  className={cn(
                    MKT_PRODUCT_ROW_LINK,
                    index > 0 && "border-t border-[var(--mkt-border-subtle)]",
                  )}
                >
                  <span className={MKT_ICON_WELL}>
                    <Icon size={20} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-base font-bold", MKT_HEADING)}>{nav.name}</span>
                    <span className={cn("mt-1 block text-sm leading-relaxed text-pretty", MKT_BODY)}>
                      {nav.description}
                    </span>
                  </span>
                  <ArrowRight
                    size={18}
                    className="mt-0.5 shrink-0 text-amber-600 opacity-70 transition-[opacity,transform] duration-200 ease-[var(--mkt-ease-out)] motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:opacity-100 dark:text-amber-400"
                    aria-hidden
                  />
                </a>
              );
            })}
          </div>

          <div className="mt-8">
            <a href="/products" className={MKT_LINK_ARROW}>
              View all products
              <ArrowRight size={16} aria-hidden />
            </a>
          </div>
            </div>
          </div>
        </section>

        {/* ── App Showcase ─────────────────────────────── */}
        <section className="mt-28 mx-auto max-w-7xl px-6">
          <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-b from-zinc-900 to-black px-6 py-14 sm:px-12">
            <div className="mb-12 max-w-2xl">
              <h2 className={cn("text-3xl sm:text-4xl text-balance text-white", MKT_DISPLAY)}>
                An app people will actually use
              </h2>
              <p className={cn("mt-3 max-w-prose text-pretty", MKT_BODY_ON_DARK)}>
                Clean layout. Easy menu browsing. One-tap reorder. Checkout pays you directly.
                No marketplace listing. No commission.
              </p>
            </div>

            <div className="flex items-end justify-center gap-2 sm:gap-6">
              <div className="hidden translate-y-8 scale-90 opacity-80 lg:block">
                <PhoneFrame className="-rotate-3">
                  <ScreenCheckout />
                </PhoneFrame>
              </div>
              <div className="z-10">
                <PhoneFrame>
                  <ScreenItem />
                </PhoneFrame>
              </div>
              <div className="hidden translate-y-8 scale-90 opacity-80 lg:block">
                <PhoneFrame className="rotate-3">
                  <ScreenMenu />
                </PhoneFrame>
              </div>
            </div>

            <div className="mt-12 flex justify-center">
              <a href={MOCKUP_CTA_HREF} className={mktPrimaryCtaClass()}>
                See a free mockup
                <ArrowRight size={16} className="transition-transform duration-200 ease-[var(--mkt-ease-out)] motion-safe:group-hover:translate-x-0.5" />
              </a>
            </div>
          </div>
        </section>

        {/* ── Pricing Section ──────────────────────────── */}
        <section id="pricing" className="mt-28 mx-auto max-w-7xl px-6 scroll-mt-24 md:scroll-mt-28">
          <div className="mb-10 max-w-2xl">
            <h2 className={cn("text-3xl sm:text-4xl text-balance", MKT_DISPLAY, MKT_HEADING)}>
              Flat fees. No commissions.
            </h2>
            <p className={cn("mt-3", MKT_BODY)}>
              Every plan starts with a free mockup. See your brand before you commit.
            </p>
          </div>

          {(() => {
            const featured = PRICING_TIERS.find((t) => t.highlighted) ?? PRICING_TIERS[1];
            const others = PRICING_TIERS.filter((t) => t !== featured);
            return (
              <>
                <div className={cn("p-8 lg:p-10", MKT_PANEL_ACCENT)}>
                  <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-md shrink-0">
                      <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Where most owners start</p>
                      <h3 className={cn("mt-2 text-2xl font-bold", MKT_HEADING)}>{featured.name}</h3>
                      <p className={cn("mt-2 text-pretty", MKT_BODY)}>{featured.description}</p>
                      <p className={cn("mt-6 text-2xl sm:text-3xl", MKT_DISPLAY, MKT_HEADING)}>Contact for pricing</p>
                      <a href={MOCKUP_CTA_HREF} className={cn("mt-6 inline-flex", MKT_CTA_PRIMARY)}>
                        See a free mockup
                        <ArrowRight size={16} className="transition-transform duration-200 ease-[var(--mkt-ease-out)] motion-safe:group-hover:translate-x-0.5" />
                      </a>
                    </div>
                    <ul className="grid flex-1 gap-x-8 gap-y-2.5 sm:grid-cols-2 lg:max-w-xl">
                      {featured.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2.5">
                          <Check size={14} className={cn("mt-0.5 shrink-0", MKT_TRUST)} aria-hidden />
                          <span className={cn("text-sm", MKT_BODY)}>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {others.map((tier) => (
                    <div
                      key={tier.name}
                      className={cn("flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between", MKT_PANEL)}
                    >
                      <div className="min-w-0">
                        <h3 className={cn("text-lg font-bold", MKT_HEADING)}>{tier.name}</h3>
                        <p className={cn("mt-1 text-sm text-pretty", MKT_BODY)}>{tier.description}</p>
                      </div>
                      <a href={MOCKUP_CTA_HREF} className={MKT_BTN_OUTLINE}>
                        See a mockup
                      </a>
                    </div>
                  ))}
                </div>
              </>
            );
          })()}
        </section>

        {/* ── About Section ────────────────────────────── */}
        <section id="about" className="mt-28 mx-auto max-w-7xl px-6 scroll-mt-24 md:scroll-mt-28">
          <div className="mb-14 max-w-2xl">
            <h2 className={cn("text-3xl sm:text-4xl text-balance", MKT_DISPLAY, MKT_HEADING)}>
              Our Mission
            </h2>
            <p className={cn("mt-4 text-lg leading-relaxed text-pretty", MKT_BODY)}>
              Delivery apps charge too much. Independent restaurants deserve the same direct ordering
              tools big chains already have. Custom app. Your guest list. Your data.
            </p>
          </div>

          <div>
            <h3 className={cn("mb-8 text-xl font-bold", MKT_HEADING)}>Meet the founders</h3>
            <div ref={foundersRef} className="grid gap-8 md:grid-cols-3">
              {FOUNDERS.map((founder, index) => (
                <div
                  key={founder.name}
                  className={cn(
                    "p-6 text-center transition-[border-color,transform] duration-200 ease-[var(--mkt-ease-out)] hover:border-[var(--mkt-accent-border)] motion-safe:hover:-translate-y-0.5",
                    MKT_PANEL,
                    foundersRevealed && "mkt-enter",
                  )}
                  style={foundersRevealed ? ({ "--mkt-i": index } as React.CSSProperties) : undefined}
                >
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full">
                    {founder.imageSrc ? (
                      <img
                        src={founder.imageSrc}
                        alt={founder.name}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className={MKT_AVATAR_FALLBACK}>
                        <span className="text-2xl font-black text-zinc-200">{founder.initials}</span>
                      </div>
                    )}
                  </div>
                  <h3 className={cn("text-lg font-bold", MKT_HEADING)}>{founder.name}</h3>
                  <p className="mt-1 text-sm font-medium text-amber-700 dark:text-amber-400">{founder.role}</p>
                  <p className={cn("mt-3 text-sm leading-relaxed", MKT_BODY)}>{founder.bio}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      </div>
    </MarketingLayout>
  );
}
