import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";

const FEATURE_SLIDES = [
  {
    name: "Fire When Seated",
    description: "Seat a party, notify guests, and fire pre-orders to kitchen in one host action.",
  },
  {
    name: "1-Tap 86 Switch",
    description: "Mark sold-out items instantly and sync availability across active guests in real time.",
  },
  {
    name: "Zero-Math Payouts",
    description: "Let guests split freely while restaurants receive one clean payout summary.",
  },
  {
    name: "Mobile Group Ordering",
    description: "Live cart sync for groups with a smooth phone-first ordering experience.",
  },
];

const WAITLIST_ROWS = [
  { name: "Anderson Family", seats: 4, wait: "12m", status: "Waiting" },
  { name: "Chen, Margaret", seats: 2, wait: "28m", status: "Notified" },
  { name: "Rodriguez Party", seats: 6, wait: "4m", status: "Waiting" },
];

function HostDashboardMockup() {
  return (
    <div className="flex h-full flex-col gap-3 p-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]" />
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest">Waitlist</span>
          <span className="rounded-full bg-zinc-700/60 px-1.5 py-0.5 text-[10px] text-zinc-500">3 waiting</span>
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

function GallerySlideContent({ slide }: { slide: (typeof FEATURE_SLIDES)[0] }) {
  const isEightySix = slide.name === "1-Tap 86 Switch";

  if (isEightySix) {
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

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-1.5">
        <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">{slide.name}</span>
      </div>
      <p className="max-w-xs text-sm text-zinc-500">{slide.description}</p>
    </div>
  );
}

export default function LandingPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % FEATURE_SLIDES.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [paused]);

  const goPrev = () => setCurrentIndex((p) => (p - 1 + FEATURE_SLIDES.length) % FEATURE_SLIDES.length);
  const goNext = () => setCurrentIndex((p) => (p + 1) % FEATURE_SLIDES.length);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-zinc-100">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0A0A0A]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-3xl font-black tracking-tighter text-amber-400">rasvia</p>
            <p className="mt-1 text-sm text-neutral-500">Built for restaurants. Loved by guests.</p>
          </div>
          <a
            href="/partner-portal"
            className="rounded-xl border border-amber-400/40 bg-amber-500/[0.08] px-4 py-2 text-sm font-semibold text-amber-400 transition-all duration-300 hover:bg-amber-500/[0.15] hover:border-amber-400/60 hover:shadow-[0_0_16px_rgba(245,158,11,0.15)]"
          >
            Enter Partner Portal
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="relative">
          <div
            className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full opacity-[0.07]"
            style={{
              background: "radial-gradient(ellipse at center, #F59E0B 0%, transparent 70%)",
              filter: "blur(60px)",
            }}
          />

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

        <section className="mt-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Feature Gallery</p>
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
                {FEATURE_SLIDES.map((slide, idx) => (
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
                {FEATURE_SLIDES.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentIndex(i)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === currentIndex ? "w-4 bg-amber-400" : "w-1.5 bg-white/25 hover:bg-white/40"
                    }`}
                    aria-label={`Go to slide ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer id="contact" className="mt-10 border-t border-white/[0.08]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-sm text-zinc-600">
          <p>&copy; {new Date().getFullYear()} Rasvia</p>
          <a href="mailto:support@rasvia.com" className="transition-colors hover:text-zinc-300">
            Contact sales: support@rasvia.com
          </a>
        </div>
      </footer>
    </div>
  );
}