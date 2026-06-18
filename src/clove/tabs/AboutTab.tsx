import { Slideshow } from "@/clove/components/Slideshow";
import {
  CLOVE_ABOUT_US,
  CLOVE_MENU_SLIDESHOW,
  CLOVE_NAME,
  CLOVE_OUR_STORY,
  CLOVE_TAGLINE,
} from "@/clove/data";

export function AboutTab() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <header className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">About Us</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-foreground sm:text-5xl">
          {CLOVE_NAME}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-lg text-muted-foreground">{CLOVE_TAGLINE}</p>
      </header>

      <section className="mt-10 flex flex-col gap-4">
        {CLOVE_ABOUT_US.map((para, i) => (
          <p key={i} className="text-base leading-relaxed text-muted-foreground">
            {para}
          </p>
        ))}
      </section>

      <div className="mt-10">
        <Slideshow images={CLOVE_MENU_SLIDESHOW} aspectClass="aspect-[16/7]" />
      </div>

      <section className="mt-12">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Our Story</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-foreground">
          From a family kitchen to your table
        </h2>
        <div className="mt-4 flex flex-col gap-4">
          {CLOVE_OUR_STORY.map((para, i) => (
            <p key={i} className="text-base leading-relaxed text-muted-foreground">
              {para}
            </p>
          ))}
        </div>
      </section>
    </div>
  );
}
