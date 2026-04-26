import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChefHat, ChevronDown, ChevronLeft, ChevronRight, ClipboardList, Copy, DollarSign, Menu, Pause, Play, Share2, ShoppingBag, Sparkles, Users, X } from "lucide-react";
import { QRCode } from "@/lib/resolve-react-qr-code";
import { DASH_PRIMARY_CTA } from "@/lib/dashboardUi";
import { cn } from "@/lib/utils";

/** Smooth-scroll to a section id, accounting for the fixed navbar height. */
function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const navHeight = document.querySelector("header")?.offsetHeight ?? 88;
  const top = el.getBoundingClientRect().top + window.scrollY - navHeight;
  window.scrollTo({ top, behavior: "smooth" });
}

const FEATURE_SLIDES = [
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
  {
    name: "Kitchen Display Mode",
    description: "Live order tickets with stage-by-stage bump controls your kitchen team can trust.",
  },
  {
    name: "Revenue Snapshot",
    description: "Shift-by-shift revenue charts with hourly and daily breakdowns at a glance.",
  },
  {
    name: "Order History & Reorder",
    description: "Re-create any past group order in one tap — modifiers and all.",
  },
  {
    name: "Real-Time Order Tracker",
    description: "Watch your order progress from kitchen to table in real time.",
  },
  {
    name: "Social Group Invite",
    description: "Share a QR code or link so friends join the group cart from their own phone.",
  },
];
type FeatureSlide = (typeof FEATURE_SLIDES)[number];

const BUSINESS_FEATURES: FeatureSlide[] = FEATURE_SLIDES.filter((slide) =>
  ["Real-Time Item Controls", "Location Adjustment", "Kitchen Display Mode", "Revenue Snapshot"].includes(slide.name)
);

const USER_FEATURES: FeatureSlide[] = FEATURE_SLIDES.filter((slide) =>
  ["Zero-Math Payouts", "Mobile Group Ordering", "Order History & Reorder", "Real-Time Order Tracker", "Social Group Invite"].includes(slide.name)
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
      "Real-time item availability controls",
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
    bio: "Computer Science student at the University of Texas at Dallas interested in data analytics and cloud infrastructure.",
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
  const [seatedIds, setSeatedIds] = useState<Set<string>>(
    () => new Set(["Chen, Margaret"])
  );

  const toggleSeated = (name: string) => {
    setSeatedIds((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

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
          const isSeated = seatedIds.has(row.name);
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
                type="button"
                onClick={() => toggleSeated(row.name)}
                className={`rounded-md px-2 py-1 text-[10px] font-bold transition-colors ${
                  isSeated
                    ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                    : "bg-zinc-700/60 border border-white/10 text-zinc-300 hover:bg-blue-500/15 hover:border-blue-500/30 hover:text-blue-400"
                }`}
              >
                {isSeated ? "Seated" : "Seat"}
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

function LocationAdjustmentMockup({ onInteract }: { onInteract?: () => void }) {
  const [saved, setSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (savedTimerRef.current) clearTimeout(savedTimerRef.current); }, []);

  const handleSetLocation = () => {
    onInteract?.();
    setSaved(true);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSaved(false), 1500);
  };

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
            <span className="text-[9px] font-mono text-zinc-400">32.79N 96.81W</span>
          </div>
          {/* Location saved pill — overlaid on the map */}
          {saved && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="rounded-full border border-emerald-500/40 bg-black/70 px-4 py-1.5 text-xs font-semibold text-emerald-400 shadow-lg backdrop-blur-sm">
                Location saved
              </span>
            </div>
          )}
        </div>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => {}}
            className="flex-1 rounded-xl border border-white/10 bg-zinc-800/60 py-2.5 text-xs font-semibold text-zinc-300 transition-all hover:bg-zinc-800/80 active:scale-95 active:bg-zinc-700/60 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSetLocation}
            className="flex-[2] rounded-xl py-2.5 text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95 active:opacity-75 cursor-pointer"
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
    <div className="flex h-full flex-col items-center justify-center px-5 py-3">
      <div className="w-full max-w-xs rounded-2xl border border-white/10 bg-[#111113] px-3.5 py-3 backdrop-blur-sm">

        <div className="mb-2 flex items-center justify-between">
          <div>
            <p className="text-xs font-black tracking-tight text-white">Group Order</p>
            <p className="text-[9px] text-neutral-500">5 items &middot; 2 members</p>
          </div>
          <div className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-transparent px-2 py-0.5">
            <span className="text-[9px] font-bold text-amber-400">Party</span>
            <span className="text-[9px] text-zinc-500">— 2 +</span>
          </div>
        </div>

        <div className="mb-1.5 flex gap-1.5">
          <button className="flex-1 rounded-lg border border-amber-500/40 bg-transparent py-1 text-[9px] font-semibold text-amber-400">
            Dine In
          </button>
          <button className="flex-1 rounded-lg border border-white/[0.06] bg-zinc-800/50 py-1 text-[9px] font-semibold text-zinc-500">
            Takeout
          </button>
          <button className="flex-1 rounded-lg border border-amber-500/40 bg-transparent py-1 text-[9px] font-semibold text-amber-400">
            By Member
          </button>
          <button className="flex-1 rounded-lg border border-white/[0.06] bg-zinc-800/50 py-1 text-[9px] font-semibold text-zinc-500">
            All Items
          </button>
        </div>

        <div className="flex flex-col gap-1.5 mb-2">
          <div className="rounded-xl border border-white/[0.05] bg-zinc-900/60 px-2.5 py-1.5">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[9px] font-black text-white">A</div>
                <span className="text-[10px] font-bold text-white">Jordan K.</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black text-amber-400">$26.79</span>
                <p className="text-[8px] text-zinc-600">+ $2.21 tax</p>
              </div>
            </div>
            <div className="rounded-md border border-white/[0.04] bg-zinc-800/40 px-2 py-1 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-[9px] text-neutral-400">Butter Chicken</span>
                <span className="rounded-full bg-zinc-700/60 px-1 text-[8px] text-zinc-500">x3</span>
              </div>
              <span className="text-[9px] text-zinc-400">$26.79</span>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.05] bg-zinc-900/60 px-2.5 py-1.5">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[9px] font-black text-white">A</div>
                <span className="text-[10px] font-bold text-white">Priya M.</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black text-amber-400">$9.34</span>
                <p className="text-[8px] text-zinc-600">+ $0.77 tax</p>
              </div>
            </div>
            <div className="rounded-md border border-white/[0.04] bg-zinc-800/40 px-2 py-1 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-[9px] text-neutral-400">Garlic Naan</span>
                <span className="rounded-full bg-zinc-700/60 px-1 text-[8px] text-zinc-500">x2</span>
              </div>
              <span className="text-[9px] text-zinc-400">$9.34</span>
            </div>
          </div>
        </div>

        <div className="mb-1.5 flex flex-col gap-0.5 px-0.5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-neutral-500">Subtotal</span>
            <span className="text-[9px] font-semibold text-zinc-400">$36.13</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-neutral-500">Sales tax</span>
            <span className="text-[9px] font-semibold text-zinc-400">$2.98</span>
          </div>
          <div className="mt-0.5 flex items-center justify-between border-t border-white/[0.06] pt-1">
            <span className="text-[9px] font-bold text-zinc-300">Total</span>
            <span className="text-xs font-black text-white">$39.11</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1 mb-1.5">
          <button className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 py-1.5 text-[9px] font-bold text-emerald-400">
            I&apos;ll Pay
          </button>
          <button className="rounded-lg border border-white/[0.06] bg-zinc-800/50 py-1.5 text-[9px] font-semibold text-zinc-400">
            Split
          </button>
          <button className="rounded-lg border border-white/[0.06] bg-zinc-800/50 py-1.5 text-[9px] font-semibold text-zinc-400">
            Assign
          </button>
        </div>

        <button
          className="w-full rounded-xl py-2 text-[10px] font-bold text-white"
          style={{ background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)", boxShadow: "0 3px 14px rgba(34,197,94,0.3)" }}
        >
          Pay &amp; Submit &middot; $39.11
        </button>
      </div>
    </div>
  );
}

function InteractiveInventoryMockup({ onInteract }: { onInteract?: () => void }) {
  const [items, setItems] = useState([
    { name: "Mutton Biryani", category: "Main course", available: false },
    { name: "Chicken Tikka Masala", category: "Curry", available: true },
    { name: "Dal Makhani", category: "Lentils", available: true },
  ]);
  const [syncingItem, setSyncingItem] = useState<string | null>(null);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (syncTimerRef.current) clearTimeout(syncTimerRef.current); }, []);

  const toggle = (name: string) => {
    onInteract?.();
    setItems((prev) =>
      prev.map((i) => (i.name === name ? { ...i, available: !i.available } : i))
    );
    setSyncingItem(name);
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => setSyncingItem(null), 1500);
  };

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

        <div className="flex flex-col gap-2">
          {items.map((item) => {
            const isSyncing = syncingItem === item.name;
            return (
              <div
                key={item.name}
                className={`rounded-xl border px-4 py-3 transition-colors duration-300 ${
                  item.available
                    ? "border-white/[0.06] bg-zinc-800/30"
                    : "border-red-500/20 bg-red-500/[0.04]"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="relative flex-shrink-0">
                      <div
                        className={`h-3 w-3 rounded-full transition-colors duration-300 ${
                          item.available
                            ? "bg-emerald-400/70"
                            : "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.7)]"
                        }`}
                      />
                      {!item.available && (
                        <div className="absolute inset-0 h-3 w-3 rounded-full bg-red-400 animate-ping opacity-40" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-200">{item.name}</p>
                      <p className="text-[10px] text-zinc-500">{item.category}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <button
                      onClick={() => toggle(item.name)}
                      className={`relative h-6 w-11 rounded-full border transition-colors duration-300 ${
                        item.available
                          ? "border-emerald-500/30 bg-emerald-500/20"
                          : "border-red-500/30 bg-red-500/20"
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 h-5 w-5 rounded-full shadow-md transition-all duration-300 ${
                          item.available ? "right-0.5 bg-emerald-400" : "left-0.5 bg-red-400"
                        }`}
                      />
                    </button>
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wide transition-colors duration-300 ${
                        item.available ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {item.available ? "Available" : "Sold Out"}
                    </span>
                  </div>
                </div>
                {isSyncing && (
                  <div className="mt-2.5 flex items-center gap-1.5">
                    <div className={`h-1 w-1 rounded-full animate-pulse ${item.available ? "bg-emerald-400" : "bg-red-400"}`} />
                    <p className="text-[10px] text-zinc-500">Syncing to 3 users...</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// BUSINESS: Kitchen Display Mode
// ─────────────────────────────────────────────

const KDS_STAGES = ["Pending", "Preparing", "Ready", "Served"] as const;
type KdsStage = typeof KDS_STAGES[number];

const KDS_STAGE_STYLES: Record<KdsStage, { pill: string; dot: string; btn: string; pillText: string; pillLabel: string }> = {
  Pending:   { pill: "bg-amber-950/50 border-amber-800/50", dot: "bg-amber-500", pillText: "text-amber-400/90", btn: "bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30", pillLabel: "NEW — Not Started" },
  Preparing: { pill: "bg-blue-950/40 border-blue-800/40", dot: "bg-blue-500 animate-pulse", pillText: "text-blue-400/90", btn: "bg-blue-500/20 border-blue-500/40 text-blue-300 hover:bg-blue-500/30", pillLabel: "IN PROGRESS — Cooking" },
  Ready:     { pill: "bg-emerald-950/40 border-emerald-800/40", dot: "bg-emerald-400", pillText: "text-emerald-400/90", btn: "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30", pillLabel: "READY — Expedite Now" },
  Served:    { pill: "bg-indigo-950/40 border-indigo-800/40", dot: "bg-indigo-400", pillText: "text-indigo-400/90", btn: "bg-indigo-500/20 border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/30", pillLabel: "SERVED — Complete" },
};

interface KdsTicket {
  id: string;
  guestName: string;
  table: string;
  elapsed: string;
  items: string[];
  defaultStage: number;
}

const KDS_TICKETS: KdsTicket[] = [
  { id: "A4F2", guestName: "Rodriguez Party", table: "Table 7", elapsed: "8m", items: ["2× Mutton Biryani", "1× Garlic Naan", "1× Mango Lassi"], defaultStage: 1 },
  { id: "B8C1", guestName: "Chen, Margaret", table: "Table 3", elapsed: "3m", items: ["1× Paneer Tikka", "2× Dal Makhani"], defaultStage: 2 },
];

function KdsTicketCard({ ticket, onInteract }: { ticket: KdsTicket; onInteract?: () => void }) {
  const [stageIdx, setStageIdx] = useState(ticket.defaultStage);
  const stage = KDS_STAGES[stageIdx];
  const styles = KDS_STAGE_STYLES[stage];

  const bump = () => { onInteract?.(); setStageIdx((i) => (i + 1) % KDS_STAGES.length); };

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-l-4 border-zinc-800/90 bg-zinc-900/90 p-3" style={{ borderLeftColor: stage === "Pending" ? "#d97706" : stage === "Preparing" ? "#3b82f6" : stage === "Ready" ? "#22c55e" : "#6366f1" }}>
      <div className={`flex items-center gap-2 rounded-md border px-2 py-0.5 ${styles.pill}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
        <span className={`text-[9px] font-bold uppercase tracking-wide ${styles.pillText}`}>{styles.pillLabel}</span>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <span className="font-mono text-sm font-bold text-zinc-100">#{ticket.id}</span>
          <span className="ml-1.5 text-[10px] uppercase text-zinc-500">{ticket.table}</span>
        </div>
        <span className="text-[10px] font-medium text-zinc-500">{ticket.elapsed}</span>
      </div>
      <p className="text-[10px] text-zinc-500">{ticket.guestName}</p>
      <div className="flex flex-col gap-0.5">
        {ticket.items.map((item) => (
          <span key={item} className="text-[10px] text-zinc-300">{item}</span>
        ))}
      </div>
      <button
        type="button"
        onClick={bump}
        className={`mt-1 w-full rounded-lg border py-1.5 text-[10px] font-bold uppercase tracking-wide transition-colors active:scale-95 ${styles.btn}`}
      >
        {stage} — Bump →
      </button>
    </div>
  );
}

function KitchenDisplayMockup({ onInteract }: { onInteract?: () => void }) {
  return (
    <div className="flex h-full flex-col p-4 gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ChefHat size={14} className="text-amber-600/80" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Kitchen Display</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[9px] font-semibold text-emerald-400">Live</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 flex-1">
        {KDS_TICKETS.map((ticket) => (
          <KdsTicketCard key={ticket.id} ticket={ticket} onInteract={onInteract} />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// BUSINESS: Revenue Snapshot
// ─────────────────────────────────────────────

const REVENUE_THIS_WEEK = [
  { label: "Sun", value: 312 },
  { label: "Mon", value: 487 },
  { label: "Tue", value: 628 },
  { label: "Wed", value: 541 },
  { label: "Thu", value: 710 },
  { label: "Fri", value: 893 },
  { label: "Sat", value: 756 },
];

const REVENUE_TODAY = [
  { label: "10am", value: 84 },
  { label: "11am", value: 143 },
  { label: "12pm", value: 267 },
  { label: "1pm", value: 231 },
  { label: "2pm", value: 189 },
  { label: "3pm", value: 122 },
];

function RevenueSnapshotMockup({ onInteract }: { onInteract?: () => void }) {
  const [range, setRange] = useState<"today" | "week">("week");
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const [selectedBar, setSelectedBar] = useState<number | null>(null);

  const data = range === "week" ? REVENUE_THIS_WEEK : REVENUE_TODAY;
  const maxVal = Math.max(...data.map((d) => d.value));
  const total = data.reduce((s, d) => s + d.value, 0);

  const handleBarClick = (idx: number) => {
    onInteract?.();
    setSelectedBar((prev) => (prev === idx ? null : idx));
  };

  return (
    <div className="flex h-full flex-col p-4 gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign size={13} className="text-zinc-500" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Revenue</span>
        </div>
        <div className="flex gap-1.5">
          {(["today", "week"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => { onInteract?.(); setRange(r); setSelectedBar(null); setHoveredBar(null); }}
              className={`rounded-lg border px-2.5 py-1 text-[9px] font-semibold transition-colors ${
                range === r
                  ? "border-white/[0.12] bg-white/[0.08] text-zinc-100"
                  : "border-white/[0.06] bg-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {r === "today" ? "Today" : "This Week"}
            </button>
          ))}
        </div>
      </div>

      {/* Total */}
      <div>
        <p className="text-[9px] text-zinc-600 uppercase tracking-widest">Total revenue</p>
        <p className="text-xl font-black tabular-nums tracking-tight text-zinc-100">${total.toLocaleString()}</p>
      </div>

      {/* Chart */}
      <div className="relative flex-1" style={{ minHeight: 0, zIndex: 0, isolation: "isolate" }}>
        {/* Bar track — sits above the labels row */}
        <div className="absolute inset-x-0 top-0 bottom-5 flex items-end gap-1.5">
          {data.map((bar, idx) => {
            const heightPct = Math.max(6, (bar.value / maxVal) * 100);
            const isHovered = hoveredBar === idx;
            const isSelected = selectedBar === idx;
            return (
              <div
                key={bar.label}
                className="relative flex flex-1 h-full flex-col justify-end cursor-pointer"
                onMouseEnter={() => setHoveredBar(idx)}
                onMouseLeave={() => setHoveredBar(null)}
                onClick={() => handleBarClick(idx)}
              >
                {/* Tooltip — pinned 6px above the bar top regardless of bar height */}
                {(isHovered || isSelected) && (
                  <div
                    className="absolute left-1/2 -translate-x-1/2 z-20 whitespace-nowrap rounded-full border border-amber-500/30 bg-zinc-900 px-2 py-0.5 text-[9px] font-bold text-amber-400 shadow-lg pointer-events-none"
                    style={{ bottom: `calc(${heightPct}% + 6px)` }}
                  >
                    ${bar.value}
                  </div>
                )}
                {/* Bar */}
                <div
                  className={`w-full rounded-t-sm transition-all duration-200 ${
                    isSelected ? "ring-1 ring-amber-400/70 shadow-[0_0_8px_rgba(245,158,11,0.4)]" : ""
                  }`}
                  style={{
                    height: `${heightPct}%`,
                    background: isHovered || isSelected
                      ? "rgba(245,158,11,0.75)"
                      : "rgba(148,163,184,0.55)",
                  }}
                />
              </div>
            );
          })}
        </div>
        {/* Labels row pinned to bottom */}
        <div className="absolute inset-x-0 bottom-0 z-20 flex gap-1.5" style={{ height: "20px" }}>
          {data.map((bar) => (
            <div key={bar.label} className="flex flex-1 items-center justify-center">
              <span className="text-[8px] font-medium text-white tabular-nums">{bar.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// USER: Order History & Reorder
// ─────────────────────────────────────────────

function OrderHistoryMockup({ onInteract }: { onInteract?: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-5 py-4">
      <div className="w-full max-w-xs rounded-2xl border border-white/10 bg-[#111113] px-4 py-3.5 backdrop-blur-sm">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-black tracking-tight text-white">My Orders</p>
          <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-400">Completed</span>
        </div>

        {/* Order card */}
        <div className="rounded-xl border border-white/[0.06] bg-zinc-900/60 px-3 py-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <div>
              <p className="text-xs font-bold text-zinc-100">Spice Garden</p>
              <p className="text-[9px] text-zinc-600">Apr 20, 2026 · Dine In</p>
            </div>
            <p className="text-xs font-black text-amber-400">$26.79</p>
          </div>
          <div className="flex flex-col gap-0.5 mb-2.5">
            {[{ name: "Butter Chicken", qty: 1, price: "$17.99" }, { name: "Garlic Naan", qty: 2, price: "$7.98" }].map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <span className="text-[9px] text-zinc-500">{item.qty}× {item.name}</span>
                <span className="text-[9px] text-zinc-600">{item.price}</span>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => onInteract?.()}
            className="w-full rounded-xl border border-amber-500/40 bg-amber-500/10 py-2 text-[10px] font-bold text-amber-400 transition-colors hover:bg-amber-500/20 active:scale-95 cursor-pointer"
          >
            Order Again
          </button>
        </div>

        {/* Blurred second card */}
        <div className="mt-2 rounded-xl border border-white/[0.06] bg-zinc-900/30 px-3 py-2.5 opacity-40">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-zinc-300">Biryani House</p>
              <p className="text-[9px] text-zinc-400">Apr 14, 2026</p>
            </div>
            <p className="text-xs font-black text-zinc-300">$18.50</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// USER: Real-Time Order Tracker
// ─────────────────────────────────────────────

const TRACKER_STAGES = [
  { label: "Received", color: "#FF9933", Icon: ClipboardList },
  { label: "Preparing", color: "#F59E0B", Icon: ChefHat },
  { label: "Ready", color: "#22C55E", Icon: ShoppingBag },
  { label: "Served", color: "#818CF8", Icon: Sparkles },
] as const;

const TRACKER_STATUS: Record<number, { title: string; subtitle: string }> = {
  0: { title: "Order received", subtitle: "The restaurant has your order and will start shortly." },
  1: { title: "Being prepared", subtitle: "The kitchen is working on your order right now." },
  2: { title: "Food is ready", subtitle: "Your food is on its way to your table." },
  3: { title: "Served", subtitle: "Your food has been served. Enjoy your meal!" },
};

function OrderTrackerMockup({ isActive, isPaused }: { isActive: boolean; isPaused: boolean }) {
  const [stageIdx, setStageIdx] = useState(1);

  useEffect(() => {
    if (!isActive || !isPaused) {
      setStageIdx(1);
      return;
    }
    const delay = stageIdx === 3 ? 4000 : 3000;
    const t = setTimeout(() => setStageIdx((s) => (s + 1) % 4), delay);
    return () => clearTimeout(t);
  }, [isActive, isPaused, stageIdx]);

  const { title, subtitle } = TRACKER_STATUS[stageIdx];
  const activeColor = TRACKER_STAGES[stageIdx].color;

  return (
    <div className="flex h-full flex-col items-center justify-center px-5 py-4">
      <div className="w-full max-w-xs rounded-2xl border border-white/10 bg-[#111113] px-4 py-4 backdrop-blur-sm">
        {/* Restaurant header */}
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-800 border border-white/[0.06]">
            <ShoppingBag size={14} className="text-zinc-400" />
          </div>
          <div>
            <p className="text-xs font-bold text-zinc-100">Spice Garden</p>
            <p className="text-[9px] text-zinc-600">Order #A4F2 · Dine In</p>
          </div>
        </div>

        {/* Stepper */}
        <div className="mb-4">
          {/* Circles + connectors */}
          <div className="relative flex items-center justify-between">
            {/* Background connector track */}
            <div className="absolute inset-x-4 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-zinc-700/60" />
            {/* Filled connector segments — one per gap between circles */}
            {TRACKER_STAGES.slice(0, -1).map((seg, i) =>
              i < stageIdx ? (
                <div
                  key={i}
                  className="absolute top-1/2 h-0.5 -translate-y-1/2 rounded-full transition-all duration-500"
                  style={{
                    // Each circle is 32px (w-8). With justify-between across N=4 circles,
                    // the gap between circle centres is (100% - 32px) / 3.
                    // Segment i starts at centre of circle i and ends at centre of circle i+1.
                    left: `calc(${(i / 3) * 100}% + 16px)`,
                    right: `calc(${((3 - i - 1) / 3) * 100}% + 16px)`,
                    background: seg.color,
                  }}
                />
              ) : null
            )}
            {TRACKER_STAGES.map((step, idx) => {
              const isCompleted = idx < stageIdx;
              const isActiveStep = idx === stageIdx;
              const bg = isCompleted ? step.color : isActiveStep ? `${step.color}22` : "rgba(39,39,42,0.9)";
              const border = isCompleted || isActiveStep ? step.color : "#52525b";
              return (
                <div
                  key={step.label}
                  className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300"
                  style={{ background: bg, borderColor: border }}
                >
                  {isCompleted ? (
                    <Check size={13} color="#fff" />
                  ) : isActiveStep ? (
                    <div className="h-2.5 w-2.5 rounded-full animate-pulse" style={{ background: step.color }} />
                  ) : (
                    <step.Icon size={11} color={step.color} opacity={0.25} />
                  )}
                </div>
              );
            })}
          </div>
          {/* Labels — same 4-column grid so they align under each circle */}
          <div className="mt-2 flex justify-between">
            {TRACKER_STAGES.map((step, idx) => (
              <div key={step.label} className="w-8 text-center">
                <span
                  className="text-[8px] font-semibold leading-tight"
                  style={{ color: idx === stageIdx ? step.color : idx < stageIdx ? "#71717a" : "#3f3f46" }}
                >
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Status card */}
        <div
          className="rounded-xl border px-3 py-2.5"
          style={{ borderColor: `${activeColor}30`, background: `${activeColor}10` }}
        >
          <p className="text-[11px] font-bold" style={{ color: activeColor }}>{title}</p>
          <p className="text-[9px] text-zinc-500 mt-0.5 leading-relaxed">{subtitle}</p>
        </div>

        {/* Hint when not animating */}
        {(!isActive || !isPaused) && (
          <p className="mt-2 text-center text-[8px] text-zinc-700">Pause the gallery to watch live updates</p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// USER: Social Group Invite
// ─────────────────────────────────────────────

async function copyTextToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch { /* fall through */ }
  // execCommand fallback for browsers that block clipboard without HTTPS/focus
  const el = document.createElement("textarea");
  el.value = text;
  el.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
  document.body.appendChild(el);
  el.focus();
  el.select();
  try { document.execCommand("copy"); } catch { /* ignore */ }
  document.body.removeChild(el);
}

function GroupInviteMockup({ onInteract }: { onInteract?: () => void }) {
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [shareState, setShareState] = useState<"idle" | "copied">("idle");
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shareTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    if (shareTimerRef.current) clearTimeout(shareTimerRef.current);
  }, []);

  const handleCopy = () => {
    onInteract?.();
    copyTextToClipboard("rasvia.com");
    setCopyState("copied");
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopyState("idle"), 2000);
  };

  const handleShare = () => {
    onInteract?.();
    copyTextToClipboard("rasvia.com");
    setShareState("copied");
    if (shareTimerRef.current) clearTimeout(shareTimerRef.current);
    shareTimerRef.current = setTimeout(() => setShareState("idle"), 2000);
  };

  return (
    <div className="flex h-full flex-col items-center justify-center px-5 py-3">
      <div className="w-full max-w-xs rounded-2xl border border-white/10 bg-[#111113] px-4 py-3 backdrop-blur-sm">
        {/* Header */}
        <div className="mb-2.5 text-center">
          <p className="text-xs font-black tracking-tight text-white">Group Order Created</p>
          <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/[0.08] px-3 py-1">
            <Users size={10} className="text-amber-400" />
            <span className="text-[9px] font-semibold text-amber-400">Spice Garden</span>
          </div>
        </div>

        {/* QR Code */}
        <div className="mb-2.5 flex justify-center">
          <div className="rounded-xl border border-white/10 bg-white p-2.5">
            <QRCode value="https://rasvia.com" size={80} bgColor="#ffffff" fgColor="#0a0a0a" />
          </div>
        </div>

        {/* Link */}
        <div className="mb-2 rounded-xl border border-white/[0.06] bg-zinc-800/40 px-3 py-1.5">
          <p className="font-mono text-[10px] text-zinc-400 truncate">rasvia.com</p>
        </div>

        {/* Buttons */}
        <div className="mb-2 flex gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2 text-[10px] font-semibold transition-all active:scale-95 ${
              copyState === "copied"
                ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                : "border-white/[0.08] bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800/80"
            }`}
          >
            {copyState === "copied" ? <Check size={11} /> : <Copy size={11} />}
            {copyState === "copied" ? "Link Copied" : "Copy Link"}
          </button>
          <button
            type="button"
            onClick={handleShare}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2 text-[10px] font-semibold transition-all active:scale-95 ${
              shareState === "copied"
                ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                : "border-white/[0.08] bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800/80"
            }`}
          >
            {shareState === "copied" ? <Check size={11} /> : <Share2 size={11} />}
            {shareState === "copied" ? "Link Copied" : "Share"}
          </button>
        </div>

        {/* Join button */}
        <button
          type="button"
          onClick={() => {}}
          className="w-full rounded-xl py-2.5 text-[10px] font-bold text-zinc-900 transition-opacity hover:opacity-90 active:scale-95 flex items-center justify-center gap-1.5"
          style={{ background: "linear-gradient(135deg, #FF9933 0%, #fb923c 100%)" }}
        >
          <Users size={12} />
          Join Group Order
        </button>

        <p className="mt-2 text-center text-[8px] text-zinc-700">Share the link first and join later.</p>
      </div>
    </div>
  );
}

function GallerySlideContent({
  slide,
  isActive = false,
  isPaused = false,
  onInteract,
}: {
  slide: FeatureSlide;
  isActive?: boolean;
  isPaused?: boolean;
  onInteract?: () => void;
}) {
  if (slide.name === "Real-Time Item Controls") {
    return <InteractiveInventoryMockup onInteract={onInteract} />;
  }

  if (slide.name === "Zero-Math Payouts") {
    return <SplitReceiptMockup />;
  }

  if (slide.name === "Location Adjustment") {
    return <LocationAdjustmentMockup onInteract={onInteract} />;
  }

  if (slide.name === "Mobile Group Ordering") {
    return <GroupSplitMockup />;
  }

  if (slide.name === "Kitchen Display Mode") {
    return <KitchenDisplayMockup onInteract={onInteract} />;
  }

  if (slide.name === "Revenue Snapshot") {
    return <RevenueSnapshotMockup onInteract={onInteract} />;
  }

  if (slide.name === "Order History & Reorder") {
    return <OrderHistoryMockup onInteract={onInteract} />;
  }

  if (slide.name === "Real-Time Order Tracker") {
    return <OrderTrackerMockup isActive={isActive} isPaused={isPaused} />;
  }

  if (slide.name === "Social Group Invite") {
    return <GroupInviteMockup onInteract={onInteract} />;
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
  const [audience, setAudience] = useState<"business" | "user">("business");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const heroGlowAreaRef = useRef<HTMLDivElement | null>(null);
  const heroGlowRef = useRef<HTMLDivElement | null>(null);
  const glowPos = useRef({ x: 0, y: 0 });
  const glowTarget = useRef({ x: 0, y: 0 });
  const activeSlides = useMemo(
    () => (audience === "business" ? BUSINESS_FEATURES : USER_FEATURES),
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
    }, 4000);
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
                onClick={() => setAudience("user")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  audience === "user"
                    ? "bg-amber-500/15 text-amber-300"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                For Users
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
                    <GallerySlideContent slide={slide} isActive={idx === currentIndex} isPaused={paused} onInteract={() => setPaused(true)} />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pb-5 pl-5 pt-16">
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
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-black/40 p-2 text-white backdrop-blur-sm hover:bg-black/60 transition-colors"
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
                {activeSlides.map((slide, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      if (activeSlides.length === 0) return;
                      setCurrentIndex(i);
                    }}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === currentIndex
                        ? "w-4 bg-amber-400"
                        : "w-1.5 bg-white/25 hover:bg-white/40"
                    }`}
                    aria-label={`Go to slide ${i + 1}: ${slide.name}`}
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
                    <button type="button" className="text-sm text-neutral-500 transition-colors hover:text-white cursor-default">
                      {link}
                    </button>
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
