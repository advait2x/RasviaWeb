import { useEffect, useState } from "react";
import { Pause, Play } from "lucide-react";

const FEATURE_SLIDES = [
  {
    name: "Fire When Seated",
    description: "Seat a party, notify guests, and fire pre-orders to kitchen in one host action.",
    image: "",
  },
  {
    name: "1-Tap 86 Switch",
    description: "Mark sold-out items instantly and sync availability across active guests in real time.",
    image: "",
  },
  {
    name: "Zero-Math Payouts",
    description: "Let guests split freely while restaurants receive one clean payout summary.",
    image: "",
  },
  {
    name: "Mobile Group Ordering",
    description: "Live cart sync for groups with a smooth phone-first ordering experience.",
    image: "",
  },
];

export default function LandingPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % FEATURE_SLIDES.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [paused]);

  const goPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + FEATURE_SLIDES.length) % FEATURE_SLIDES.length);
  };

  const goNext = () => {
    setCurrentIndex((prev) => (prev + 1) % FEATURE_SLIDES.length);
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#09090b]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-3xl font-black tracking-tight text-amber-400">rasvia</p>
            <p className="mt-1 text-sm text-zinc-500">Built for restaurants. Loved by guests.</p>
          </div>
          <a
            href="/partner-portal"
            className="rounded-xl border border-amber-400/30 bg-amber-500/15 px-4 py-2 text-sm font-semibold text-amber-300 hover:bg-amber-500/25"
          >
            Enter Partner Portal
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <section className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
              Turn waitlists into revenue with real-time service automation.
            </h1>
            <p className="mt-4 max-w-xl text-zinc-400">
              Rasvia helps restaurant teams move faster during rush hours: smarter pre-orders, instant item controls,
              and clean payouts your accounting team can trust.
            </p>
            <div className="mt-6">
              <a
                href="/partner-portal"
                className="inline-flex rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-black hover:bg-amber-400"
              >
                Partner Portal
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Feature Spotlight</p>
            <div className="mt-3 rounded-xl border border-white/10 bg-zinc-950/70 p-4">
              <div className="h-60 rounded-lg bg-zinc-900" />
            </div>
          </div>
        </section>

        <section className="mt-12">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Feature Gallery</p>
          <div className="mt-3 rounded-2xl border border-white/10 bg-zinc-900/65 p-3">
            <div className="relative overflow-hidden rounded-xl border border-white/10 bg-zinc-950">
              <div
                className="flex transition-transform duration-700 ease-in-out"
                style={{ transform: `translateX(-${currentIndex * 100}%)` }}
              >
                {FEATURE_SLIDES.map((slide, idx) => (
                  <div key={slide.name + idx} className="group relative h-[420px] min-w-full">
                    {slide.image ? (
                      <img src={slide.image} alt={slide.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full bg-zinc-900" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/20" />
                    <div className="absolute left-5 bottom-5 max-w-xl">
                      <p className="text-2xl font-bold text-white">{slide.name}</p>
                      <p className="mt-2 text-sm text-zinc-200 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                        {slide.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={goPrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-black/35 px-2.5 py-2 text-sm text-white hover:bg-black/50"
                aria-label="Previous feature"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={goNext}
                className="absolute right-12 top-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-black/35 px-2.5 py-2 text-sm text-white hover:bg-black/50"
                aria-label="Next feature"
              >
                ›
              </button>

              <button
                type="button"
                onClick={() => setPaused((prev) => !prev)}
                className="absolute bottom-3 right-3 rounded-md border border-white/20 bg-black/35 p-1.5 text-white hover:bg-black/50"
                aria-label={paused ? "Resume auto slide" : "Pause auto slide"}
              >
                {paused ? <Play size={14} /> : <Pause size={14} />}
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer id="contact" className="mt-8 border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-sm text-zinc-500">
          <p>© {new Date().getFullYear()} Rasvia</p>
          <a href="mailto:support@rasvia.com" className="hover:text-zinc-300">
            Contact sales: support@rasvia.com
          </a>
        </div>
      </footer>
    </div>
  );
}
