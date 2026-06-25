import { motion } from "framer-motion";
import { ArrowRight, Building2, CalendarClock, ChefHat, PartyPopper } from "lucide-react";
import { Slideshow } from "@/clove/components/Slideshow";
import {
  CLOVE_CATERING_INTRO,
  CLOVE_CATERING_MIN_NOTICE,
  CLOVE_CATERING_PACKAGES,
  CLOVE_CATERING_SLIDESHOW,
  CLOVE_CATERING_STEPS,
  type CloveTabId,
} from "@/clove/data";

const revealVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const PACKAGE_ICONS = [Building2, PartyPopper, ChefHat];

export function CateringTab({ onNavigate }: { onNavigate: (tab: CloveTabId) => void }) {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Catering</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-foreground sm:text-5xl">
          Bring the feast to your event
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          {CLOVE_CATERING_INTRO}
        </p>
        <button
          type="button"
          onClick={() => onNavigate("contact")}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Request a catering quote
          <ArrowRight size={15} />
        </button>
      </header>

      {/* ── Hero slideshow ─────────────────────────────────────────────── */}
      <motion.div
        variants={revealVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        className="mt-12"
      >
        <Slideshow images={CLOVE_CATERING_SLIDESHOW} aspectClass="aspect-[16/7]" />
      </motion.div>

      {/* ── Packages ───────────────────────────────────────────────────── */}
      <motion.section
        variants={revealVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        className="mt-16"
      >
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">What we cater</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-foreground">
            Built for any kind of gathering
          </h2>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {CLOVE_CATERING_PACKAGES.map((pkg, i) => {
            const Icon = PACKAGE_ICONS[i] ?? ChefHat;
            return (
              <div
                key={pkg.title}
                className="flex flex-col rounded-2xl border-2 border-border bg-card p-6 transition-colors hover:border-primary"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-clove-saffron">
                  <Icon size={22} />
                </div>
                <h3 className="mt-4 text-lg font-black tracking-tight text-foreground">{pkg.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{pkg.description}</p>
              </div>
            );
          })}
        </div>
      </motion.section>

      {/* ── How it works ───────────────────────────────────────────────── */}
      <motion.section
        variants={revealVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        className="mt-16"
      >
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">How it works</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-foreground">
            Three steps to a full table
          </h2>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          {CLOVE_CATERING_STEPS.map((step, i) => (
            <div key={step.title} className="rounded-2xl border-2 border-border bg-card p-6">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-black text-primary-foreground">
                {i + 1}
              </span>
              <h3 className="mt-4 text-base font-bold text-foreground">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* ── Closing CTA ────────────────────────────────────────────────── */}
      <motion.section
        variants={revealVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        className="mt-16 flex flex-col items-center gap-4 rounded-3xl border-2 border-border bg-secondary px-8 py-12 text-center"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground">
          <CalendarClock size={14} className="text-clove-saffron" />
          {CLOVE_CATERING_MIN_NOTICE} notice recommended
        </div>
        <h2 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
          Ready to plan your event?
        </h2>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          Tell us the date and headcount and our team will put together a tailored menu and quote.
        </p>
        <button
          type="button"
          onClick={() => onNavigate("contact")}
          className="mt-1 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Start your catering inquiry
          <ArrowRight size={15} />
        </button>
      </motion.section>
    </div>
  );
}
