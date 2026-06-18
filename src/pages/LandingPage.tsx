import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Home,
  Leaf,
  Menu,
  Palette,
  Plug,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  Star,
  UtensilsCrossed,
  User,
  X,
} from "lucide-react";
import { DASH_PRIMARY_CTA } from "@/lib/dashboardUi";
import { cn } from "@/lib/utils";
import { ThemeIconToggle } from "@/components/ThemeToggle";
import { ProductsNavDropdown, ProductsNavMobileLinks } from "@/components/marketing/ProductsNavMenu";
import { MARKETING_NAV_PRODUCTS, getMarketingProductPath } from "@/data/marketing-products";
import { scrollToLandingSection, useLandingHashScroll } from "@/lib/marketing-nav";

// Lead-capture destination for every primary CTA on this page.
const MOCKUP_CTA_HREF = "/support";

// ──────────────────────────────────────────────────────
// VALUE PROP PILLARS (GTM pivot: digital partner for independents)
// ──────────────────────────────────────────────────────

const PILLARS = [
  {
    icon: Palette,
    title: "Custom App & Web Design",
    tagline: "Built in days, not months.",
    description:
      "A beautiful, fully-branded mobile app and web storefront designed around your restaurant — not a generic template. Launched in days, not months.",
  },
  {
    icon: Plug,
    title: "Direct POS Integration",
    tagline: "Works with the tools you already have.",
    description:
      "Orders route straight into your existing Toast, Clover, or Square. No new iPads to buy, no extra hardware, and no retraining your staff.",
  },
  {
    icon: ShieldCheck,
    title: "Zero Hidden Fees",
    tagline: "Keep 100% of your margins.",
    description:
      "No per-order commissions and no surprise taxes passed to your customers. Just a flat setup fee and low monthly hosting.",
  },
] as const;

// ──────────────────────────────────────────────────────
// PRICING / FOUNDERS DATA
// ──────────────────────────────────────────────────────

const PRICING_TIERS = [
  {
    name: "Storefront",
    description: "A custom web storefront for direct, commission-free orders.",
    features: [
      "Custom-branded web storefront",
      "Live menu synced to your POS",
      "Commission-free online ordering",
      "QR code menu & ordering",
      "Flat setup fee + low monthly hosting",
      "Email support",
    ],
    highlighted: false,
  },
  {
    name: "App + Storefront",
    description: "Your own mobile app and storefront — the full Rasvia experience.",
    features: [
      "Everything in Storefront",
      "Custom iOS & Android app, fully branded",
      "Push notifications & one-tap reorder",
      "Loyalty & repeat-customer tools",
      "Direct Toast / Clover / Square integration",
      "Live in days with priority onboarding",
      "Priority support",
    ],
    highlighted: true,
  },
  {
    name: "Multi-Location",
    description: "For owners running more than one location or concept.",
    features: [
      "Everything in App + Storefront",
      "Multiple locations & concepts",
      "Dedicated design partner",
      "Custom feature requests",
      "White-glove menu migration",
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
    bio: "Computer science student at the University of Texas at Dallas interested in full stack development, machine learning, and cloud engineering.",
    initials: "RM",
    gradient: "from-violet-500 to-purple-600",
    imageSrc: null as string | null,
  },
  {
    name: "Advait Sagi",
    role: "CEO & Founder",
    bio: "Engineering student at Texas A&M University passionate about market analytics, consumer psychology, and driving impactful business strategy.",
    initials: "AS",
    gradient: "from-amber-500 to-orange-600",
    imageSrc: null as string | null,
  },
  {
    name: "Akshaj Ande",
    role: "COO & Co-Founder",
    bio: "Computer science student at the University of Texas at Dallas interested in data analytics and cloud infrastructure.",
    initials: "AA",
    gradient: "from-emerald-500 to-teal-600",
    imageSrc: null as string | null,
  },
];

// ──────────────────────────────────────────────────────
// NAVBAR COMPONENT
// ──────────────────────────────────────────────────────

function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openDropdown = (key: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActiveDropdown(key);
  };
  const closeDropdown = () => {
    timeoutRef.current = setTimeout(() => setActiveDropdown(null), 150);
  };

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-zinc-200/80 bg-white/90 backdrop-blur-xl dark:border-white/[0.06] dark:bg-black/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-6">
          <a href="/" className="inline-flex flex-shrink-0 items-center">
            <img
              src="/rasvia-logo-transparent.png"
              alt="Rasvia"
              className="h-10 w-auto dark:hidden"
            />
            <img
              src="/rasvia-logo.png"
              alt="Rasvia"
              className="hidden h-10 w-auto dark:block dark:brightness-110 dark:contrast-100"
            />
          </a>

          <nav className="hidden items-center gap-1 md:flex">
          {/* Products dropdown */}
          <div
            className="relative"
            onMouseEnter={() => openDropdown("products")}
            onMouseLeave={closeDropdown}
          >
            <a
              href="/products"
              className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                activeDropdown === "products"
                  ? "bg-zinc-200/90 text-zinc-900 dark:bg-white/[0.06] dark:text-white"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              Products
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 ${
                  activeDropdown === "products" ? "rotate-180" : ""
                }`}
              />
            </a>
            {activeDropdown === "products" && (
              <ProductsNavDropdown />
            )}
          </div>

          {/* Pricing */}
          <button
            type="button"
            onClick={() => scrollToLandingSection("pricing")}
            className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-200/70 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-zinc-200"
          >
            Pricing
          </button>

          {/* About */}
          <button
            type="button"
            onClick={() => scrollToLandingSection("about")}
            className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-200/70 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-zinc-200"
          >
            About
          </button>
          </nav>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeIconToggle className="hidden sm:inline-flex" />
          <a
            href="/partner-portal"
            className="hidden rounded-xl border border-amber-500/45 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-700 transition-all duration-300 hover:bg-amber-500/[0.18] hover:border-amber-600/60 hover:shadow-[0_0_16px_rgba(245,158,11,0.12)] dark:border-amber-400/40 dark:bg-amber-500/[0.08] dark:text-amber-400 dark:hover:border-amber-400/60 dark:hover:bg-amber-500/[0.15] dark:hover:shadow-[0_0_16px_rgba(245,158,11,0.15)] sm:inline-flex"
          >
            Partner Portal
          </a>
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="rounded-lg border border-zinc-200 p-2 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white md:hidden"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="border-t border-zinc-200 bg-white/98 backdrop-blur-xl dark:border-white/[0.06] dark:bg-black/95 md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-6 py-4">
            <div className="mb-2 flex items-center justify-between md:hidden">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Appearance</p>
              <ThemeIconToggle />
            </div>
            <ProductsNavMobileLinks onNavigate={() => setMobileOpen(false)} />
            <div className="my-2 h-px bg-zinc-200 dark:bg-white/[0.06]" />
            <button
              type="button"
              onClick={() => { scrollToLandingSection("pricing"); setMobileOpen(false); }}
              className="rounded-lg px-3 py-2 text-left text-sm text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/[0.05]"
            >
              Pricing
            </button>
            <button
              type="button"
              onClick={() => { scrollToLandingSection("about"); setMobileOpen(false); }}
              className="rounded-lg px-3 py-2 text-left text-sm text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/[0.05]"
            >
              About
            </button>
            <div className="my-2 h-px bg-zinc-200 dark:bg-white/[0.06]" />
            <a
              href="/partner-portal"
              className="mt-1 block rounded-xl border border-amber-500/45 bg-amber-500/10 px-4 py-2.5 text-center text-sm font-semibold text-amber-700 dark:border-amber-400/40 dark:bg-amber-500/[0.08] dark:text-amber-400"
            >
              Partner Portal
            </a>
          </div>
        </div>
      )}
    </header>
  );
}

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
            className={`whitespace-nowrap rounded-lg px-2.5 py-1 text-[8px] font-bold ${
              i === 0 ? "bg-amber-500 text-black" : "border border-white/10 bg-white/[0.03] text-zinc-400"
            }`}
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
          0% commission — paid directly to the restaurant.
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

  useLandingHashScroll();

  useEffect(() => {
    let raf = 0;
    let cancelled = false;
    // Track the cursor in viewport coords. The glow element is `fixed` at
    // `top: 1/3` and `left: 50%`, with an initial `translate(-50%, -50%)`.
    // So its centre rests at (50vw, 33vh). We shift it so its centre lands
    // exactly on the cursor: offsetX = cursorX - 50vw, offsetY = cursorY - 33vh.
    const onMove = (e: MouseEvent) => {
      glowTarget.current = {
        x: e.clientX - window.innerWidth / 2,
        y: e.clientY - window.innerHeight / 3,
      };
    };
    const lerp = 0.14; // higher = snappier catch-up while still smooth
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
    <div className="w-full min-h-screen overflow-x-hidden bg-[var(--page-overscroll)] text-zinc-900 dark:text-zinc-100">
      {/* Page-wide cursor glow - fixed so it tracks the mouse anywhere on the page */}
      <div
        ref={heroGlowRef}
        className="pointer-events-none fixed top-1/3 left-1/2 h-[700px] w-[min(1000px,100vw)] rounded-full opacity-[0.1] will-change-transform [background:radial-gradient(ellipse_at_center,#EA580C_0%,transparent_70%)] dark:opacity-[0.07] dark:[background:radial-gradient(ellipse_at_center,#F59E0B_0%,transparent_70%)]"
        style={{
          zIndex: 0,
          filter: "blur(70px)",
          transform: "translate(-50%, -50%)",
        }}
      />

      <Navbar />

      <div className="pt-[57px]">
      <main className="relative z-10 w-full py-12">
        {/* ── Hero ─────────────────────────────────────── */}
        <div className="mx-auto max-w-7xl px-6 relative overflow-hidden">
          <section className="relative grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:border-amber-500/30 dark:text-amber-400">
                <Star size={12} className="fill-amber-500 text-amber-500" />
                The digital partner for independent restaurants
              </span>
              <h1 className="mt-4 text-4xl font-black tracking-tighter leading-[1.05] text-zinc-900 sm:text-5xl dark:text-white">
                Stop Paying 30% to Delivery Apps.{" "}
                <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                  Own Your Customers.
                </span>
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-zinc-600 dark:text-neutral-400">
                We build custom, zero-commission mobile apps and digital storefronts for independent,
                high-volume restaurants. You keep 100% of your margins.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                <a
                  href={MOCKUP_CTA_HREF}
                  className="group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3.5 text-sm font-bold text-white shadow-[0_8px_30px_rgba(245,158,11,0.3)] transition-all duration-300 hover:shadow-[0_10px_40px_rgba(245,158,11,0.45)]"
                >
                  See a Free Mockup of Your App
                  <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-0.5" />
                </a>
                <button
                  type="button"
                  onClick={() => scrollToLandingSection("pricing")}
                  className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white/70 px-6 py-3.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-white dark:border-white/15 dark:bg-white/[0.04] dark:text-zinc-300 dark:hover:bg-white/[0.08]"
                >
                  View pricing
                </button>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-zinc-500 dark:text-zinc-500">
                {["0% order commission", "Live in days", "Your brand, your data"].map((point) => (
                  <span key={point} className="inline-flex items-center gap-1.5">
                    <Check size={14} className="text-emerald-500" />
                    {point}
                  </span>
                ))}
              </div>
            </div>

            {/* Consumer-app phone mockup (the product we build for them) */}
            <div className="relative flex justify-center lg:justify-end">
              <div className="pointer-events-none absolute inset-0 -z-10 mx-auto h-[420px] w-[420px] translate-y-8 rounded-full bg-amber-500/20 blur-[90px] dark:bg-amber-500/15" />
              <PhoneFrame className="rotate-[1.5deg]">
                <ScreenMenu />
              </PhoneFrame>
            </div>
          </section>
        </div>

        {/* ── Value Prop Pillars ───────────────────────── */}
        <section className="mt-28 mx-auto max-w-7xl px-6">
          <div className="mb-12 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-600/90 dark:text-amber-400/80">
              Why restaurants switch
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-zinc-900 sm:text-4xl dark:text-white">
              Your restaurant, your app, your customers
            </h2>
            <p className="mt-3 max-w-2xl mx-auto text-zinc-600 dark:text-neutral-400">
              Everything you need to take orders directly — without handing a third of every check to a
              delivery middleman.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {PILLARS.map((pillar) => (
              <div
                key={pillar.title}
                className="group relative overflow-hidden rounded-2xl border border-zinc-200/90 bg-white/80 p-7 shadow-sm transition-all duration-300 hover:border-amber-500/40 hover:shadow-[0_8px_40px_rgba(245,158,11,0.1)] dark:border-white/[0.08] dark:bg-zinc-900/40 dark:shadow-none dark:hover:border-amber-500/30"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-[0_4px_16px_rgba(245,158,11,0.3)]">
                  <pillar.icon size={22} />
                </div>
                <h3 className="mt-5 text-lg font-bold text-zinc-900 dark:text-white">{pillar.title}</h3>
                <p className="mt-1 text-sm font-semibold text-amber-700/90 dark:text-amber-400/80">
                  {pillar.tagline}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-neutral-400">
                  {pillar.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── App Showcase (social proof) ──────────────── */}
        <section className="mt-28 mx-auto max-w-7xl px-6">
          <div className="overflow-hidden rounded-3xl border border-white/[0.06] bg-gradient-to-b from-zinc-900 to-black px-6 py-14 shadow-2xl sm:px-12">
            <div className="mb-12 text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-400/80">
                The app your customers keep
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                A storefront they&apos;ll actually want to order from
              </h2>
              <p className="mt-3 max-w-2xl mx-auto text-neutral-400">
                We design a polished, dark-mode app around your brand — beautiful menus, one-tap reorders,
                and a checkout that sends money straight to you. No marketplace clutter. No commissions.
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
              <a
                href={MOCKUP_CTA_HREF}
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3.5 text-sm font-bold text-white shadow-[0_8px_30px_rgba(245,158,11,0.3)] transition-all duration-300 hover:shadow-[0_10px_40px_rgba(245,158,11,0.45)]"
              >
                See a Free Mockup of Your App
                <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-0.5" />
              </a>
            </div>
          </div>
        </section>

        {/* ── Pricing Section ──────────────────────────── */}
        <section id="pricing" className="mt-28 mx-auto max-w-7xl px-6 scroll-mt-24 md:scroll-mt-28">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-600/90 dark:text-amber-400/80">Pricing</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-zinc-900 sm:text-4xl dark:text-white">
              Flat fees. No commissions. Ever.
            </h2>
            <p className="mt-3 max-w-xl mx-auto text-zinc-600 dark:text-neutral-400">
              Every plan starts with a free app mockup — see your brand come to life before you commit.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {PRICING_TIERS.map((tier) => (
              <div
                key={tier.name}
                className={`relative rounded-2xl border p-6 transition-all duration-300 ${
                  tier.highlighted
                    ? "border-amber-400/50 bg-gradient-to-b from-amber-500/[0.08] to-transparent shadow-[0_0_40px_rgba(245,158,11,0.12)] dark:border-amber-500/30 dark:from-amber-500/[0.04] dark:shadow-[0_0_60px_rgba(245,158,11,0.06)]"
                    : "border-zinc-200/90 bg-white/80 shadow-sm hover:border-zinc-300 dark:border-white/[0.08] dark:bg-zinc-900/40 dark:shadow-none dark:hover:border-white/15"
                }`}
              >
                {tier.highlighted && (
                  <div
                    className={cn(
                      "absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-amber-800/30 px-3 py-0.5 text-[11px] font-bold dark:border-amber-400/40",
                      DASH_PRIMARY_CTA,
                    )}
                  >
                    Most Popular
                  </div>
                )}
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">{tier.name}</h3>
                <p className="mt-1 text-sm text-zinc-600 dark:text-neutral-500">{tier.description}</p>
                <div className="mt-5">
                  <span className="text-2xl font-black tracking-tight text-zinc-900 sm:text-3xl dark:text-white">
                    Contact for Pricing
                  </span>
                </div>
                <a
                  href={MOCKUP_CTA_HREF}
                  className={`mt-6 block rounded-xl py-2.5 text-center text-sm font-bold transition-all duration-300 ${
                    tier.highlighted
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-[0_4px_20px_rgba(245,158,11,0.25)] hover:shadow-[0_6px_28px_rgba(245,158,11,0.35)]"
                      : "border border-zinc-200 bg-zinc-50 text-zinc-800 hover:border-zinc-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-300 dark:hover:bg-white/[0.08] dark:hover:border-white/20"
                  }`}
                >
                  Get a Free Mockup
                </a>
                <ul className="mt-6 flex flex-col gap-2.5">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <Check
                        size={14}
                        className={`mt-0.5 flex-shrink-0 ${
                          tier.highlighted ? "text-amber-600 dark:text-amber-400" : "text-zinc-400 dark:text-zinc-600"
                        }`}
                      />
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* ── About Section ────────────────────────────── */}
        <section id="about" className="mt-28 mx-auto max-w-7xl px-6 scroll-mt-24 md:scroll-mt-28">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-600/90 dark:text-amber-400/80">About</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-zinc-900 sm:text-4xl dark:text-white">
              Our Mission
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-lg leading-relaxed text-zinc-600 dark:text-neutral-400">
              We believe independent restaurants shouldn&apos;t have to hand 30% of every order to third-party
              delivery apps. Rasvia gives mom-and-pop restaurants the same custom apps, direct ordering, and
              guest relationships that national chains spend millions to build — so you own your customers,
              your data, and your margins.
            </p>
          </div>

          <div>
            <p className="text-center text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-8">Meet the Founders</p>
            <div className="grid gap-8 md:grid-cols-3">
              {FOUNDERS.map((founder) => (
                <div
                  key={founder.name}
                  className="group rounded-2xl border border-zinc-200/90 bg-white/80 p-6 text-center shadow-sm transition-all duration-300 hover:border-zinc-300 hover:bg-white dark:border-white/[0.08] dark:bg-zinc-900/40 dark:shadow-none dark:hover:border-white/15 dark:hover:bg-zinc-900/60"
                >
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full">
                    {founder.imageSrc ? (
                      <img src={founder.imageSrc} alt={founder.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${founder.gradient}`}>
                        <span className="text-2xl font-black text-white/90">{founder.initials}</span>
                      </div>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white">{founder.name}</h3>
                  <p className="mt-1 text-sm font-medium text-amber-700/90 dark:text-amber-400/70">{founder.role}</p>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-neutral-500">{founder.bio}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-24 border-t border-zinc-200/90 dark:border-white/[0.06]">
        <div className="mx-auto max-w-7xl px-6 pt-16 pb-8">
          <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <img src="/rasvia-logo-transparent.png" alt="Rasvia" className="h-7 w-auto dark:hidden" />
              <img
                src="/rasvia-logo.png"
                alt="Rasvia"
                className="hidden h-7 w-auto dark:block dark:brightness-110"
              />
              <p className="mt-2 max-w-[200px] text-sm leading-relaxed text-zinc-600 dark:text-neutral-500">
                Custom apps for independent restaurants. Own your customers.
              </p>
            </div>

            {/* Product */}
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-white">Product</p>
              <ul className="mt-4 flex flex-col gap-3">
                {MARKETING_NAV_PRODUCTS.map((item) => (
                  <li key={item.slug}>
                    <a
                      href={getMarketingProductPath(item.slug)}
                      className="text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-neutral-500 dark:hover:text-white"
                    >
                      {item.footerLabel ?? item.name}
                    </a>
                  </li>
                ))}
                <li>
                  <button type="button" onClick={() => scrollToLandingSection("pricing")} className="text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-neutral-500 dark:hover:text-white">
                    Pricing
                  </button>
                </li>
              </ul>
            </div>

            {/* About */}
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-white">About</p>
              <ul className="mt-4 flex flex-col gap-3">
                <li><button type="button" onClick={() => scrollToLandingSection("about")} className="text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-neutral-500 dark:hover:text-white">Our Mission</button></li>
                <li><button type="button" onClick={() => scrollToLandingSection("about")} className="text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-neutral-500 dark:hover:text-white">Team</button></li>
                <li><a href="/support" className="text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-neutral-500 dark:hover:text-white">Contact Support</a></li>
                <li><a href="/partner-portal" className="text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-neutral-500 dark:hover:text-white">Partner Login</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-white">Legal</p>
              <ul className="mt-4 flex flex-col gap-3">
                <li><a href="/privacy" className="text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-neutral-500 dark:hover:text-white">Privacy Policy</a></li>
                <li><a href="/terms" className="text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-neutral-500 dark:hover:text-white">Terms of Service</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-16 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200/90 pt-8 dark:border-white/[0.06]">
            <p className="text-sm text-zinc-500 dark:text-neutral-600">
              {new Date().getFullYear()} Rasvia, Inc. Rasvia™ is a trademark of Rasvia, Inc.
            </p>
            <p className="text-xs text-zinc-400 dark:text-neutral-700">Built with care for the restaurant industry.</p>
          </div>
        </div>
      </footer>
      </div>
    </div>
  );
}
