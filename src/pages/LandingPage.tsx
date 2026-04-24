import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Menu, Pause, Play, X } from "lucide-react";
import { DASH_PRIMARY_CTA } from "@/lib/dashboardUi";
import { cn } from "@/lib/utils";

/** Smooth-scroll to a section id, accounting for the fixed navbar height. */
function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const navHeight = 88;
  const top = el.getBoundingClientRect().top + window.scrollY - navHeight;
  window.scrollTo({ top, behavior: "smooth" });
}

const FEATURE_SLIDES = [
  {
    name: "Fire When Seated",
    description: "Seat a party, notify guests, and fire pre-orders to kitchen in one host action.",
  },
  {
    name: "Real-Time Item Controls",
    description: "Mark sold-out items instantly and sync availability across active guests in real time.",
  },
  {
    name: "Zero-Math Payouts",
    description: "Let guests split freely while restaurants receive one clean payout summary.",
  },
  {
    name: "Location Adjustment",
    description: "Pinpoint accuracy for hungry guests. Adjust drop-offs and routing instantly.",
  },
  {
    name: "Mobile Group Ordering",
    description: "Live cart sync with per-member splits, modifiers, and one-tap group checkout.",
  },
];
type FeatureSlide = (typeof FEATURE_SLIDES)[number];

const BUSINESS_FEATURES: FeatureSlide[] = FEATURE_SLIDES.filter((slide) =>
  ["Fire When Seated", "Real-Time Item Controls", "Location Adjustment"].includes(slide.name)
);

const CONSUMER_FEATURES: FeatureSlide[] = FEATURE_SLIDES.filter((slide) =>
  ["Zero-Math Payouts", "Mobile Group Ordering"].includes(slide.name)
);

const WAITLIST_ROWS = [
  { name: "Anderson Family", seats: 4, wait: "12m", status: "Waiting" },
  { name: "Chen, Margaret", seats: 2, wait: "28m", status: "Notified" },
  { name: "Rodriguez Party", seats: 6, wait: "4m", status: "Waiting" },
];

const PAYOUT_ROWS = [
  { name: "Rahul", amount: "$22.00" },
  { name: "Aisha", amount: "$31.50" },
  { name: "Vikram", amount: "$31.00" },
];

const INVENTORY_ROWS = [
  { name: "Mutton Biryani", category: "Main course", available: false },
  { name: "Garlic Naan", category: "Bread", available: true },
];

// ──────────────────────────────────────────────────────
// NAV / PRICING / ABOUT DATA
// ──────────────────────────────────────────────────────

const NAV_PRODUCT_LINKS = [
  { name: "Waitlists", description: "Real-time waitlist management with SMS notifications" },
  { name: "Group Carts", description: "Live cart sync with per-member splits and modifiers" },
  { name: "Fast Payouts", description: "Clean payout summaries your accounting team can trust" },
];

const PRICING_TIERS = [
  {
    name: "Starter",
    price: 49,
    description: "Perfect for small restaurants getting started",
    features: [
      "Up to 20 tables",
      "Basic waitlist management",
      "Menu management",
      "Email support",
      "1 staff account",
      "Basic analytics dashboard",
    ],
    highlighted: false,
  },
  {
    name: "Professional",
    price: 99,
    description: "For growing restaurants that need more power",
    features: [
      "Unlimited tables",
      "Advanced waitlist with SMS alerts",
      "Group ordering & split payments",
      "Real-time 86 switch",
      "Up to 10 staff accounts",
      "Priority support",
      "Advanced analytics & reports",
      "Stripe Connect payouts",
    ],
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: 149,
    description: "Full-featured solution for high-volume venues",
    features: [
      "Everything in Professional",
      "Unlimited staff accounts",
      "Multi-location support",
      "Custom role permissions",
      "Dedicated account manager",
      "API access",
      "White-label kiosk mode",
      "Custom integrations",
      "24/7 phone support",
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
    bio: "Computer science student at the University of Texas at Dallas interested in full stack development, machine learning, and cloud engineering. ",
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
    role: "CFO & Co-Founder",
    bio: "Computer Science student at the University of Texas at Dallas passionate about Data Analytics and Cloud Infrastructure.",
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
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/[0.06] bg-black/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        {/* Logo */}
        <a href="/" className="flex-shrink-0">
          <img src="/rasvia-logo.png" alt="Rasvia" className="h-10 w-auto" />
        </a>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {/* Products dropdown */}
          <div
            className="relative"
            onMouseEnter={() => openDropdown("products")}
            onMouseLeave={closeDropdown}
          >
            <button
              className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                activeDropdown === "products"
                  ? "bg-white/[0.06] text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Products
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 ${
                  activeDropdown === "products" ? "rotate-180" : ""
                }`}
              />
            </button>
            {activeDropdown === "products" && (
              <div className="absolute left-1/2 top-full z-50 mt-2 w-72 -translate-x-1/2 overflow-hidden rounded-xl border border-white/[0.08] bg-zinc-900 p-1.5 shadow-2xl">
                {NAV_PRODUCT_LINKS.map((item) => (
                  <a
                    key={item.name}
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    className="block rounded-lg px-3 py-2.5 transition-colors hover:bg-white/[0.05]"
                  >
                    <span className="text-sm font-semibold text-zinc-200">{item.name}</span>
                    <span className="mt-0.5 block text-xs text-zinc-500">{item.description}</span>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Pricing */}
          <button
            type="button"
            onClick={() => scrollToSection("pricing")}
            className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
          >
            Pricing
          </button>

          {/* About */}
          <button
            type="button"
            onClick={() => scrollToSection("about")}
            className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
          >
            About
          </button>
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <a
            href="/partner-portal"
            className="hidden rounded-xl border border-amber-400/40 bg-amber-500/[0.08] px-4 py-2 text-sm font-semibold text-amber-400 transition-all duration-300 hover:bg-amber-500/[0.15] hover:border-amber-400/60 hover:shadow-[0_0_16px_rgba(245,158,11,0.15)] sm:inline-flex"
          >
            Partner Portal
          </a>
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="rounded-lg border border-white/10 p-2 text-zinc-400 transition-colors hover:text-white md:hidden"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="border-t border-white/[0.06] bg-black/95 backdrop-blur-xl md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-6 py-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Products</p>
            {NAV_PRODUCT_LINKS.map((item) => (
              <a
                key={item.name}
                href="#"
                onClick={(e) => { e.preventDefault(); setMobileOpen(false); }}
                className="rounded-lg px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-white/[0.05]"
              >
                {item.name}
              </a>
            ))}
            <div className="my-2 h-px bg-white/[0.06]" />
            <button
              type="button"
              onClick={() => { scrollToSection("pricing"); setMobileOpen(false); }}
              className="rounded-lg px-3 py-2 text-left text-sm text-zinc-300 transition-colors hover:bg-white/[0.05]"
            >
              Pricing
            </button>
            <button
              type="button"
              onClick={() => { scrollToSection("about"); setMobileOpen(false); }}
              className="rounded-lg px-3 py-2 text-left text-sm text-zinc-300 transition-colors hover:bg-white/[0.05]"
            >
              About
            </button>
            <div className="my-2 h-px bg-white/[0.06]" />
            <a
              href="/partner-portal"
              className="mt-1 block rounded-xl border border-amber-400/40 bg-amber-500/[0.08] px-4 py-2.5 text-center text-sm font-semibold text-amber-400"
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
// FEATURE MOCKUP COMPONENTS
// ──────────────────────────────────────────────────────

function HostDashboardMockup() {
  return (
    <div className="flex h-full flex-col gap-3 p-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]" />
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest">Waitlist</span>
          <span className="rounded-full bg-zinc-700/80 dark:bg-zinc-700/60 px-1.5 py-0.5 text-[10px] text-zinc-300 dark:text-zinc-500">3 waiting</span>
        </div>
        <div className="h-5 w-16 rounded-md bg-zinc-700/50 animate-pulse" />
      </div>

      <div className="grid grid-cols-[1fr_48px_72px_64px] gap-2 px-1">
        {["Guest", "Party", "Wait", ""].map((h) => (
          <span key={h} className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">{h}</span>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        {WAITLIST_ROWS.map((row) => {
          const isNotified = row.status === "Notified";
          const mins = parseInt(row.wait);
          const waitColor = mins > 20 ? "text-amber-400" : mins > 10 ? "text-yellow-400" : "text-emerald-400";
          return (
            <div
              key={row.name}
              className="grid grid-cols-[1fr_48px_72px_64px] items-center gap-2 rounded-lg border border-white/5 bg-zinc-800/40 px-3 py-2.5 transition-colors hover:bg-zinc-800/70"
            >
              <span className="truncate text-xs font-semibold text-zinc-200">{row.name}</span>
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                <span className="text-xs font-bold text-amber-400">{row.seats}</span>
              </div>
              <span className={`text-[10px] font-bold tabular-nums ${waitColor}`}>{row.wait}</span>
              <button
                className={`rounded-md px-2 py-1 text-[10px] font-bold transition-colors ${
                  isNotified
                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                    : "bg-zinc-700/60 border border-white/10 text-zinc-300 hover:bg-amber-500/10 hover:border-amber-500/20 hover:text-amber-400"
                }`}
              >
                {isNotified ? "Seated" : "Fire"}
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-1.5 opacity-30">
        {[1, 2].map((i) => (
          <div key={i} className="h-9 rounded-lg bg-zinc-800/40 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

function SplitReceiptMockup() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-6">
      <div className="w-full max-w-xs rounded-2xl border border-white/10 bg-neutral-900/40 p-5 backdrop-blur-sm">
        <div className="mb-4 flex items-center justify-between border-b border-white/[0.06] pb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Split Receipt</p>
            <p className="mt-0.5 text-sm font-bold text-zinc-200">Table 44</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-neutral-500">Total</p>
            <p className="text-base font-black tracking-tight text-white">$84.50</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {PAYOUT_ROWS.map((row) => (
            <div
              key={row.name}
              className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-zinc-800/30 px-3.5 py-3"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-700/60 text-[11px] font-bold text-zinc-300">
                  {row.name[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-200">{row.name}</p>
                  <p className="text-[10px] text-neutral-400">paid {row.amount}</p>
                </div>
              </div>
              <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                Settled
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between rounded-lg border border-amber-500/15 bg-amber-500/[0.04] px-3.5 py-2.5">
          <p className="text-[10px] font-semibold text-neutral-500">Restaurant payout</p>
          <p className="text-sm font-black text-amber-400">$84.50</p>
        </div>
      </div>
    </div>
  );
}

function InventoryMockup() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-6">
      <div className="w-full max-w-xs rounded-2xl border border-white/10 bg-neutral-900/40 p-5 backdrop-blur-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Item Controls</p>
            <p className="mt-0.5 text-sm font-bold text-zinc-200">Live Inventory</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-semibold text-emerald-400">Live</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {INVENTORY_ROWS.map((item) => (
            <div
              key={item.name}
              className={`rounded-xl border px-4 py-3 ${
                item.available
                  ? "border-white/[0.06] bg-zinc-800/30"
                  : "border-red-500/20 bg-red-500/[0.04]"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-zinc-200">{item.name}</p>
                  <p className="text-[10px] text-neutral-400">{item.category}</p>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`relative h-6 w-11 rounded-full border ${
                      item.available
                        ? "border-emerald-500/30 bg-emerald-500/20"
                        : "border-red-500/30 bg-red-500/20"
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 h-5 w-5 rounded-full shadow-md transition-all duration-300 ${
                        item.available
                          ? "right-0.5 bg-emerald-400"
                          : "left-0.5 bg-red-400"
                      }`}
                    />
                  </div>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                      item.available
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                        : "border-red-500/20 bg-red-500/10 text-red-400"
                    }`}
                  >
                    {item.available ? "Available" : "Sold Out"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-1.5">
          <div className="h-1 w-1 rounded-full bg-zinc-500 animate-pulse" />
          <p className="text-[10px] text-zinc-600">Changes sync to all active guest sessions instantly</p>
        </div>
      </div>
    </div>
  );
}

function LocationAdjustmentMockup() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-6">
      <div className="w-full max-w-xs rounded-2xl border border-white/10 bg-neutral-900/40 p-4 backdrop-blur-sm">

        <div className="mb-3 flex items-center justify-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/[0.08] px-4 py-2">
          <span className="text-sm">📍</span>
          <span className="text-xs font-semibold text-amber-400">Moving: Chennai Cafe</span>
        </div>

        <div
          className="relative h-40 w-full overflow-hidden rounded-xl border border-white/[0.06]"
          style={{ background: "#1c2233" }}
        >
          <div className="absolute inset-0"
            style={{
              backgroundImage: "linear-gradient(rgba(99,180,150,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(99,180,150,0.06) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
          <div className="absolute inset-0 opacity-60"
            style={{
              backgroundImage: "linear-gradient(rgba(50,70,55,0.4) 2px, transparent 2px), linear-gradient(90deg, rgba(50,70,55,0.4) 2px, transparent 2px)",
              backgroundSize: "60px 60px",
            }}
          />
          <div className="absolute left-[15%] top-[20%] h-8 w-14 rounded-sm bg-emerald-800/40" />
          <div className="absolute right-[10%] bottom-[25%] h-12 w-10 rounded-sm bg-emerald-800/35" />
          <div className="absolute left-[30%] bottom-[15%] h-6 w-20 rounded-sm bg-emerald-800/30" />
          <div className="absolute left-0 right-0 top-[48%] h-px bg-zinc-500/25" />
          <div className="absolute left-0 right-0 top-[62%] h-px bg-zinc-500/15" />
          <div className="absolute bottom-0 left-[35%] top-0 w-px bg-zinc-500/20" />
          <div className="absolute bottom-0 left-[60%] top-0 w-px bg-zinc-500/15" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="relative flex items-center justify-center">
              <div className="h-6 w-6 rounded-full border-2 border-white bg-violet-600 shadow-[0_0_14px_rgba(124,58,237,0.8)]" />
              <div className="absolute h-6 w-6 rounded-full border-2 border-violet-400/40 animate-ping" />
              <div className="absolute h-12 w-12 rounded-full border border-violet-400/20" />
            </div>
          </div>
          <div className="absolute left-2 top-2 rounded-md border border-white/10 bg-black/50 px-1.5 py-0.5 backdrop-blur-sm">
            <span className="text-[9px] font-mono text-zinc-400">13.08N 80.27E</span>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <button className="flex-1 rounded-xl border border-white/10 bg-zinc-800/60 py-2.5 text-xs font-semibold text-zinc-300">
            Cancel
          </button>
          <button
            className="flex-[2] rounded-xl py-2.5 text-sm font-bold text-white"
            style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)", boxShadow: "0 4px 18px rgba(124,58,237,0.45)" }}
          >
            Set Location
          </button>
        </div>
      </div>
    </div>
  );
}

function GroupSplitMockup() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-5">
      <div className="w-full max-w-xs rounded-2xl border border-white/10 bg-[#111113] p-4 backdrop-blur-sm">

        <div className="mb-3 flex items-start justify-between">
          <div>
            <p className="text-sm font-black tracking-tight text-white">Group Order</p>
            <p className="text-[10px] text-neutral-500">5 items &middot; 2 members</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-transparent px-2.5 py-1">
            <span className="text-[10px] font-bold text-amber-400">Party</span>
            <span className="text-[10px] text-zinc-500">— 2 +</span>
          </div>
        </div>

        <div className="mb-2.5 flex gap-1.5">
          <button className="flex-1 rounded-lg border border-amber-500/40 bg-transparent py-1.5 text-[10px] font-semibold text-amber-400">
            Dine In
          </button>
          <button className="flex-1 rounded-lg border border-white/[0.06] bg-zinc-800/50 py-1.5 text-[10px] font-semibold text-zinc-500">
            Takeout
          </button>
        </div>

        <div className="mb-3 flex gap-1.5">
          <button className="flex-1 rounded-lg border border-amber-500/40 bg-transparent py-1.5 text-[10px] font-semibold text-amber-400">
            By Member
          </button>
          <button className="flex-1 rounded-lg border border-white/[0.06] bg-zinc-800/50 py-1.5 text-[10px] font-semibold text-zinc-500">
            All Items
          </button>
        </div>

        <div className="flex flex-col gap-2 mb-3">
          <div className="rounded-xl border border-white/[0.05] bg-zinc-900/60 px-3 py-2">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-black text-white">A</div>
                <span className="text-xs font-bold text-white">Jordan K.</span>
              </div>
              <span className="text-xs font-black text-amber-400">$26.79</span>
            </div>
            <div className="rounded-lg border border-white/[0.04] bg-zinc-800/40 px-2.5 py-1.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-neutral-400">Butter Chicken</span>
                <span className="rounded-full bg-zinc-700/60 px-1.5 text-[9px] text-zinc-500">x3</span>
              </div>
              <span className="text-[10px] text-zinc-400">$26.79</span>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.05] bg-zinc-900/60 px-3 py-2">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-black text-white">A</div>
                <span className="text-xs font-bold text-white">Priya M.</span>
              </div>
              <span className="text-xs font-black text-amber-400">$9.34</span>
            </div>
            <div className="rounded-lg border border-white/[0.04] bg-zinc-800/40 px-2.5 py-1.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-neutral-400">Garlic Naan</span>
                <span className="rounded-full bg-zinc-700/60 px-1.5 text-[9px] text-zinc-500">x2</span>
              </div>
              <span className="text-[10px] text-zinc-400">$9.34</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-2 px-0.5">
          <span className="text-[10px] text-neutral-500">Group Total</span>
          <span className="text-sm font-black text-white">$36.13</span>
        </div>

        <div className="grid grid-cols-3 gap-1.5 mb-2">
          <button className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 py-2 text-[10px] font-bold text-emerald-400">
            I&apos;ll Pay
          </button>
          <button className="rounded-lg border border-white/[0.06] bg-zinc-800/50 py-2 text-[10px] font-semibold text-zinc-400">
            Split
          </button>
          <button className="rounded-lg border border-white/[0.06] bg-zinc-800/50 py-2 text-[10px] font-semibold text-zinc-400">
            Assign
          </button>
        </div>

        <button
          className="w-full rounded-xl py-2.5 text-xs font-bold text-white"
          style={{ background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)", boxShadow: "0 3px 14px rgba(34,197,94,0.3)" }}
        >
          Pay &amp; Submit &middot; $36.13
        </button>
      </div>
    </div>
  );
}

function GallerySlideContent({ slide }: { slide: FeatureSlide }) {
  if (slide.name === "Real-Time Item Controls") {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6">
        <div className="w-full max-w-xs rounded-2xl border border-white/[0.08] bg-zinc-900/60 p-5 backdrop-blur-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Menu Control</p>
              <p className="mt-0.5 text-sm font-bold text-zinc-200">Live Inventory</p>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] animate-pulse" />
              <span className="text-[10px] font-semibold text-emerald-400">Live</span>
            </div>
          </div>

          <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="relative flex-shrink-0">
                  <div className="h-3 w-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.7)]" />
                  <div className="absolute inset-0 h-3 w-3 rounded-full bg-red-400 animate-ping opacity-40" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-200">Mutton Biryani</p>
                  <p className="text-[10px] text-zinc-500">Main course</p>
                </div>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="relative h-6 w-11 cursor-pointer rounded-full border border-red-500/30 bg-red-500/20">
                  <div className="absolute left-1 top-0.5 h-5 w-5 rounded-full bg-red-400 shadow-md" />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wide text-red-400">Sold Out</span>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5">
              <div className="h-1 w-1 rounded-full bg-red-400 animate-pulse" />
              <p className="text-[10px] text-zinc-500">Syncing to 3 active guest sessions...</p>
            </div>
          </div>

          {["Chicken Tikka Masala", "Dal Makhani"].map((item) => (
            <div key={item} className="mt-2 flex items-center justify-between rounded-lg border border-white/5 bg-zinc-800/30 px-4 py-2.5">
              <div className="flex items-center gap-2.5">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
                <p className="text-xs text-zinc-400">{item}</p>
              </div>
              <div className="relative h-5 w-9 rounded-full border border-emerald-500/20 bg-emerald-500/20">
                <div className="absolute right-0.5 top-0.5 h-4 w-4 rounded-full bg-emerald-400 shadow-sm" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (slide.name === "Zero-Math Payouts") {
    return <SplitReceiptMockup />;
  }

  if (slide.name === "Location Adjustment") {
    return <LocationAdjustmentMockup />;
  }

  if (slide.name === "Mobile Group Ordering") {
    return <GroupSplitMockup />;
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-1.5">
        <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">{slide.name}</span>
      </div>
      <p className="max-w-xs text-sm text-zinc-500">{slide.description}</p>
    </div>
  );
}

// ──────────────────────────────────────────────────────
// LANDING PAGE
// ──────────────────────────────────────────────────────

export default function LandingPage() {
  const [audience, setAudience] = useState<"business" | "consumer">("business");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const heroGlowAreaRef = useRef<HTMLDivElement | null>(null);
  const heroGlowRef = useRef<HTMLDivElement | null>(null);
  const glowPos = useRef({ x: 0, y: 0 });
  const glowTarget = useRef({ x: 0, y: 0 });
  const activeSlides = useMemo(
    () => (audience === "business" ? BUSINESS_FEATURES : CONSUMER_FEATURES),
    [audience]
  );

  useEffect(() => {
    setCurrentIndex(0);
  }, [audience]);

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
    const lerp = 0.14;   // higher = snappier catch-up while still smooth
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

  useEffect(() => {
    if (paused || activeSlides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeSlides.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [paused, activeSlides.length]);

  const goPrev = () => {
    if (activeSlides.length <= 1) return;
    setCurrentIndex((p) => (p - 1 + activeSlides.length) % activeSlides.length);
  };
  const goNext = () => {
    if (activeSlides.length <= 1) return;
    setCurrentIndex((p) => (p + 1) % activeSlides.length);
  };

  return (
    <div className="w-full min-h-screen overflow-x-hidden text-zinc-100">
      {/* Page-wide cursor glow — fixed so it tracks the mouse anywhere on the page */}
      <div
        ref={heroGlowRef}
        className="pointer-events-none fixed top-1/3 left-1/2 h-[700px] w-[min(1000px,100vw)] rounded-full opacity-[0.07] will-change-transform"
        style={{
          zIndex: -1,
          background: "radial-gradient(ellipse at center, #F59E0B 0%, transparent 70%)",
          filter: "blur(70px)",
          transform: "translate(-50%, -50%)",
        }}
      />

      <Navbar />

      <main className="w-full py-12 pt-28">
        <div ref={heroGlowAreaRef} className="mx-auto max-w-7xl px-6 relative overflow-hidden">

          <section className="relative grid gap-10 lg:grid-cols-2 lg:items-start">
            <div>
              <h1 className="text-4xl font-black tracking-tighter leading-tight text-white sm:text-5xl">
                Turn waitlists into revenue with real-time service automation.
              </h1>
              <p className="mt-4 max-w-xl leading-relaxed text-neutral-400">
                Rasvia helps restaurant teams move faster during rush hours: smarter pre-orders, instant item controls,
                and clean payouts your accounting team can trust.
              </p>
              <div className="mt-6">
                <a
                  href="/partner-portal"
                  className="inline-flex rounded-xl border border-amber-500/50 bg-amber-500/5 px-5 py-3 text-sm font-bold text-amber-400 transition-all duration-300 hover:bg-amber-500/[0.12] hover:border-amber-500/80 hover:shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                >
                  Partner Portal
                </a>
              </div>
            </div>

            <div
              className="rounded-2xl border border-white/10 bg-neutral-900/50 p-5 backdrop-blur-md"
              style={{
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.04), inset 0 -1px 0 rgba(0,0,0,0.3), 0 20px 40px rgba(0,0,0,0.4)",
              }}
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Feature Spotlight</p>
              <div
                className="mt-3 rounded-xl border border-white/[0.08] bg-zinc-950/70 p-4 backdrop-blur-sm"
                style={{ minHeight: "280px" }}
              >
                <HostDashboardMockup />
              </div>
            </div>
          </section>
        </div>

        <section className="mt-14 mx-auto max-w-7xl px-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Feature Gallery</p>
            <div className="flex items-center rounded-xl border border-white/10 bg-zinc-900/60 p-1">
              <button
                type="button"
                onClick={() => setAudience("business")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  audience === "business"
                    ? "bg-amber-500/15 text-amber-300"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                For Businesses
              </button>
              <button
                type="button"
                onClick={() => setAudience("consumer")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  audience === "consumer"
                    ? "bg-amber-500/15 text-amber-300"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                For Consumers
              </button>
            </div>
          </div>
          <div
            className="group mt-3 rounded-2xl border border-white/10 bg-neutral-900/50 p-3 backdrop-blur-md transition-all duration-300 hover:border-amber-500/20"
            style={{
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.04), inset 0 -1px 0 rgba(0,0,0,0.3), 0 20px 40px rgba(0,0,0,0.4)",
            }}
          >
            <div
              className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-zinc-950/80 backdrop-blur-sm"
              style={{ height: "420px" }}
            >
              <div
                className="flex h-full transition-transform duration-700 ease-in-out"
                style={{ transform: `translateX(-${currentIndex * 100}%)` }}
              >
                {activeSlides.map((slide, idx) => (
                  <div key={slide.name + idx} className="relative h-full min-w-full">
                    <GallerySlideContent slide={slide} />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pb-5 pl-5 pt-16">
                      <p className="text-xl font-bold text-white leading-tight tracking-tight">{slide.name}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={goPrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-black/40 p-2 text-white backdrop-blur-sm hover:bg-black/60 transition-colors"
                aria-label="Previous feature"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={goNext}
                className="absolute right-12 top-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-black/40 p-2 text-white backdrop-blur-sm hover:bg-black/60 transition-colors"
                aria-label="Next feature"
              >
                <ChevronRight size={16} />
              </button>

              <button
                type="button"
                onClick={() => setPaused((p) => !p)}
                className="absolute bottom-3 right-3 rounded-md border border-white/20 bg-black/40 p-1.5 text-white backdrop-blur-sm hover:bg-black/60 transition-colors"
                aria-label={paused ? "Resume auto slide" : "Pause auto slide"}
              >
                {paused ? <Play size={14} /> : <Pause size={14} />}
              </button>

              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {activeSlides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      if (activeSlides.length === 0) return;
                      setCurrentIndex(i);
                    }}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === currentIndex
                        ? "w-4 bg-amber-400"
                        : "w-1.5 bg-white/25 hover:bg-white/40"
                    }`}
                    aria-label={`Go to slide ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Pricing Section ──────────────────────────── */}
        <section id="pricing" className="mt-24 mx-auto max-w-7xl px-6 scroll-mt-24 md:scroll-mt-28">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-400/80">Pricing</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
              Simple, transparent pricing
            </h2>
            <p className="mt-3 max-w-xl mx-auto text-neutral-400">
              Choose the plan that fits your restaurant. All plans include a 14-day free trial.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {PRICING_TIERS.map((tier) => (
              <div
                key={tier.name}
                className={`relative rounded-2xl border p-6 transition-all duration-300 ${
                  tier.highlighted
                    ? "border-amber-500/30 bg-gradient-to-b from-amber-500/[0.04] to-transparent shadow-[0_0_60px_rgba(245,158,11,0.06)]"
                    : "border-white/[0.08] bg-zinc-900/40 hover:border-white/15"
                }`}
              >
                {tier.highlighted && (
                  <div
                    className={cn(
                      "absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-amber-300/50 px-3 py-0.5 text-[11px] font-bold",
                      DASH_PRIMARY_CTA,
                    )}
                  >
                    Most Popular
                  </div>
                )}
                <h3 className="text-lg font-bold text-white">{tier.name}</h3>
                <p className="mt-1 text-sm text-neutral-500">{tier.description}</p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-4xl font-black tracking-tight text-white">${tier.price}</span>
                  <span className="text-sm text-neutral-500">/mo</span>
                </div>
                <a
                  href="/support"
                  className={`mt-6 block rounded-xl py-2.5 text-center text-sm font-bold transition-all duration-300 ${
                    tier.highlighted
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-[0_4px_20px_rgba(245,158,11,0.25)] hover:shadow-[0_6px_28px_rgba(245,158,11,0.35)]"
                      : "border border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08] hover:border-white/20"
                  }`}
                >
                  Contact Support Now
                </a>
                <ul className="mt-6 flex flex-col gap-2.5">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <Check
                        size={14}
                        className={`mt-0.5 flex-shrink-0 ${
                          tier.highlighted ? "text-amber-400" : "text-zinc-600"
                        }`}
                      />
                      <span className="text-sm text-zinc-400">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* ── About Section ────────────────────────────── */}
        <section id="about" className="mt-24 mx-auto max-w-7xl px-6 scroll-mt-24 md:scroll-mt-28">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-400/80">About</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
              Our Mission
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-lg leading-relaxed text-neutral-400">
              We believe every restaurant deserves the tools that were once only available to major chains.
              Rasvia is on a mission to democratize restaurant technology — making real-time operations,
              seamless payments, and smart guest experiences accessible to every restaurant, from family-owned
              spots to high-volume venues.
            </p>
          </div>

          <div>
            <p className="text-center text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-8">Meet the Founders</p>
            <div className="grid gap-8 md:grid-cols-3">
              {FOUNDERS.map((founder) => (
                <div
                  key={founder.name}
                  className="group rounded-2xl border border-white/[0.08] bg-zinc-900/40 p-6 text-center transition-all duration-300 hover:border-white/15 hover:bg-zinc-900/60"
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
                  <h3 className="text-lg font-bold text-white">{founder.name}</h3>
                  <p className="mt-1 text-sm font-medium text-amber-400/70">{founder.role}</p>
                  <p className="mt-3 text-sm leading-relaxed text-neutral-500">{founder.bio}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-24 border-t border-white/[0.06]">
        <div className="mx-auto max-w-7xl px-6 pt-16 pb-8">
          <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <img src="/rasvia-logo.png" alt="Rasvia" className="h-7 w-auto" />
              <p className="mt-2 max-w-[180px] text-sm leading-relaxed text-neutral-500">
                Built for restaurants. Loved by guests.
              </p>
            </div>

            {/* Product */}
            <div>
              <p className="text-sm font-medium text-white">Product</p>
              <ul className="mt-4 flex flex-col gap-3">
                {["Waitlists", "Group Carts", "Fast Payouts"].map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm text-neutral-500 transition-colors hover:text-white">
                      {link}
                    </a>
                  </li>
                ))}
                <li>
                  <button type="button" onClick={() => scrollToSection("pricing")} className="text-sm text-neutral-500 transition-colors hover:text-white">
                    Pricing
                  </button>
                </li>
              </ul>
            </div>

            {/* About */}
            <div>
              <p className="text-sm font-medium text-white">About</p>
              <ul className="mt-4 flex flex-col gap-3">
                <li><button type="button" onClick={() => scrollToSection("about")} className="text-sm text-neutral-500 transition-colors hover:text-white">Our Mission</button></li>
                <li><button type="button" onClick={() => scrollToSection("about")} className="text-sm text-neutral-500 transition-colors hover:text-white">Team</button></li>
                <li><a href="/support" className="text-sm text-neutral-500 transition-colors hover:text-white">Contact Support</a></li>
                <li><a href="/partner-portal" className="text-sm text-neutral-500 transition-colors hover:text-white">Partner Login</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <p className="text-sm font-medium text-white">Legal</p>
              <ul className="mt-4 flex flex-col gap-3">
                <li><a href="/privacy" className="text-sm text-neutral-500 transition-colors hover:text-white">Privacy Policy</a></li>
                <li><a href="/terms" className="text-sm text-neutral-500 transition-colors hover:text-white">Terms of Service</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-16 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-8">
            <p className="text-sm text-neutral-600">&copy; {new Date().getFullYear()} Rasvia, Inc. All rights reserved.</p>
            <p className="text-xs text-neutral-700">Built with care for the restaurant industry.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
