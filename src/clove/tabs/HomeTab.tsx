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

export function HomeTab({ onNavigate }: { onNavigate: (tab: CloveTabId) => void }) {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <section className="overflow-hidden rounded-3xl border-2 border-border bg-card">
        <img
          src={CLOVE_HERO_IMAGE}
          alt=""
          className="h-[280px] w-full object-cover sm:h-[360px]"
          loading="eager"
        />
        <div className="border-t-4 border-clove-saffron bg-card p-7 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-clove-saffron">
            Welcome to
          </p>
          <h1 className="mt-1 text-4xl font-black tracking-tight text-foreground sm:text-5xl">
            {CLOVE_NAME}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {CLOVE_TAGLINE}
          </p>
          <button
            type="button"
            onClick={() => onNavigate("menu")}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <UtensilsCrossed size={16} />
            Explore the menu
          </button>
        </div>
      </section>

      <section className="mt-12 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Our Kitchen</p>
        <p className="mx-auto mt-3 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          {CLOVE_ABOUT_SHORT}
        </p>
        <button
          type="button"
          onClick={() => onNavigate("about")}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-primary transition-opacity hover:opacity-80"
        >
          Read our story
          <ArrowRight size={15} />
        </button>
      </section>

      <section className="mt-14 grid items-center gap-8 lg:grid-cols-2">
        <Slideshow images={CLOVE_MENU_SLIDESHOW} />
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">The Menu</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-foreground">
            Flavors worth the journey
          </h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">{CLOVE_HOME_MENU_BLURB}</p>
          <button
            type="button"
            onClick={() => onNavigate("menu")}
            className="mt-5 inline-flex items-center gap-2 rounded-xl border-2 border-primary bg-secondary px-5 py-2.5 text-sm font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            View full menu
            <ArrowRight size={15} />
          </button>
        </div>
      </section>

      <section className="mt-14 grid items-center gap-8 lg:grid-cols-2">
        <div className="order-2 lg:order-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Catering</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-foreground">
            Bring the feast to your event
          </h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">{CLOVE_HOME_CATERING_BLURB}</p>
          <button
            type="button"
            onClick={() => onNavigate("catering")}
            className="mt-5 inline-flex items-center gap-2 rounded-xl border-2 border-primary bg-secondary px-5 py-2.5 text-sm font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            Learn about catering
            <ArrowRight size={15} />
          </button>
        </div>
        <div className="order-1 lg:order-2">
          <Slideshow images={CLOVE_CATERING_SLIDESHOW} />
        </div>
      </section>
    </div>
  );
}
