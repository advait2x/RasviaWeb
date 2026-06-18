import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, UtensilsCrossed } from "lucide-react";
import { Slideshow } from "@/clove/components/Slideshow";
import {
  CLOVE_ABOUT_SHORT,
  CLOVE_CATERING_SLIDESHOW,
  CLOVE_HERO_IMAGE,
  CLOVE_HOME_CATERING_BLURB,
  CLOVE_HOME_MENU_BLURB,
  CLOVE_MENU_SLIDESHOW,
  CLOVE_NAME,
  CLOVE_TAGLINE,
  type CloveTabId,
} from "@/clove/data";

// Shared scroll-reveal variant — fade up 20 px with premium cubic ease
const revealVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const PARALLAX_PX = 60; // total vertical travel budget for parallax

export function HomeTab({ onNavigate }: { onNavigate: (tab: CloveTabId) => void }) {
  const heroRef = useRef<HTMLElement>(null);
  const { scrollY } = useScroll();

  // Hero image moves SLOWER than the page: 0 → PARALLAX_PX over first 500 px of scroll.
  // The image is padded so no empty space is ever exposed.
  const heroImageY = useTransform(scrollY, [0, 500], [0, PARALLAX_PX]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section
        ref={heroRef}
        className="overflow-hidden rounded-3xl border-2 border-border bg-card"
      >
        {/* Parallax image container — overflow-hidden clips the extra height */}
        <div className="relative h-[280px] overflow-hidden sm:h-[360px]">
          <motion.img
            src={CLOVE_HERO_IMAGE}
            alt="Clove Dining — warm, elegant Indian restaurant interior"
            loading="eager"
            style={{
              y: heroImageY,
              position: "absolute",
              top: -PARALLAX_PX,
              left: 0,
              width: "100%",
              height: `calc(100% + ${PARALLAX_PX * 2}px)`,
              objectFit: "cover",
              objectPosition: "center",
            }}
          />
        </div>

        <div className="border-t-4 border-clove-saffron bg-card p-8 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-clove-saffron">
            Welcome to
          </p>
          {/* h1 is in the initial HTML payload — visible to crawlers without JS */}
          <h1 className="mt-1 text-4xl font-black tracking-tight text-foreground sm:text-5xl">
            {CLOVE_NAME}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {CLOVE_TAGLINE}
          </p>
          <motion.button
            type="button"
            onClick={() => onNavigate("menu")}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground"
          >
            <UtensilsCrossed size={16} />
            Explore the menu
          </motion.button>
        </div>
      </section>

      {/* ── About blurb ───────────────────────────────────────────────────── */}
      <motion.section
        variants={revealVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        className="mt-12 text-center"
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          Our Kitchen
        </p>
        <p className="mx-auto mt-3 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          {CLOVE_ABOUT_SHORT}
        </p>
        <motion.button
          type="button"
          onClick={() => onNavigate("about")}
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-primary"
        >
          Read our story
          <ArrowRight size={15} />
        </motion.button>
      </motion.section>

      {/* ── Our Menu section ──────────────────────────────────────────────── */}
      <motion.section
        variants={revealVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        className="mt-14 grid items-center gap-8 lg:grid-cols-2"
      >
        <Slideshow images={CLOVE_MENU_SLIDESHOW} />
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            The Menu
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-foreground">
            Flavors worth the journey
          </h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">{CLOVE_HOME_MENU_BLURB}</p>
          <motion.button
            type="button"
            onClick={() => onNavigate("menu")}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="mt-5 inline-flex items-center gap-2 rounded-xl border-2 border-primary bg-secondary px-5 py-3 text-sm font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            View full menu
            <ArrowRight size={15} />
          </motion.button>
        </div>
      </motion.section>

      {/* ── Catering section ──────────────────────────────────────────────── */}
      <motion.section
        variants={revealVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        className="mt-14 grid items-center gap-8 lg:grid-cols-2"
      >
        <div className="order-2 lg:order-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Catering
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-foreground">
            Bring the feast to your event
          </h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            {CLOVE_HOME_CATERING_BLURB}
          </p>
          <motion.button
            type="button"
            onClick={() => onNavigate("catering")}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="mt-5 inline-flex items-center gap-2 rounded-xl border-2 border-primary bg-secondary px-5 py-3 text-sm font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            Learn about catering
            <ArrowRight size={15} />
          </motion.button>
        </div>
        <div className="order-1 lg:order-2">
          <Slideshow images={CLOVE_CATERING_SLIDESHOW} />
        </div>
      </motion.section>

    </div>
  );
}
