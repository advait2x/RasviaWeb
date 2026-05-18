import { useEffect } from "react";
import { Check } from "lucide-react";
import { DASH_PRIMARY_CTA } from "@/lib/dashboardUi";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import {
  getProductPageContent,
  type MarketingProductSlug,
} from "@/data/marketing-products";
import { cn } from "@/lib/utils";

function parseSlugFromPath(pathname: string): string | null {
  const trimmed = pathname.replace(/\/$/, "");
  const match = trimmed.match(/\/products\/([^/]+)$/);
  return match?.[1] ?? null;
}

export default function ProductPage() {
  const slug = parseSlugFromPath(window.location.pathname);

  const content = slug ? getProductPageContent(slug) : null;

  useEffect(() => {
    if (content) {
      document.title = `${content.shortTitle} · Rasvia`;
    } else {
      document.title = "Product not found · Rasvia";
    }
    return () => {
      document.title = "Rasvia";
    };
  }, [content]);

  if (!content || !slug) {
    return (
      <MarketingLayout>
        <div className="mx-auto max-w-xl px-6 py-20 text-center">
          <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">Page not found</h1>
          <p className="mt-3 text-zinc-600 dark:text-neutral-400">
            That product page does not exist. Choose a product from the hub or return home.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="/products"
              className={cn(
                "inline-flex rounded-xl px-5 py-2.5 text-sm font-bold",
                DASH_PRIMARY_CTA,
              )}
            >
              Product overview
            </a>
            <a
              href="/"
              className="rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900/40 dark:text-zinc-200 dark:hover:bg-zinc-900/70"
            >
              Home
            </a>
          </div>
        </div>
      </MarketingLayout>
    );
  }

  const typedSlug = slug as MarketingProductSlug;

  return (
    <MarketingLayout activeSlug={typedSlug}>
      <article className="mx-auto max-w-3xl px-6 py-12 md:max-w-3xl lg:max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-600/90 dark:text-amber-400/80">
          Product
        </p>
        <h1 className="mt-3 text-3xl font-black leading-tight tracking-tighter text-zinc-900 sm:text-4xl md:text-5xl dark:text-white">
          {content.headline}
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-zinc-600 dark:text-neutral-400">{content.subhead}</p>

        <ul className="mt-8 space-y-3 rounded-2xl border border-zinc-200/90 bg-white/80 p-5 shadow-sm dark:border-white/[0.08] dark:bg-zinc-900/40 dark:shadow-none">
          {content.highlights.map((h) => (
            <li key={h} className="flex gap-3 text-sm text-zinc-700 dark:text-zinc-300">
              <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" strokeWidth={2.5} />
              <span>{h}</span>
            </li>
          ))}
        </ul>

        <div className="mt-16 space-y-14">
          {content.sections.map((section) => (
            <section key={section.title} className="border-t border-zinc-200/90 pt-10 dark:border-white/[0.08]">
              <h2 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl dark:text-white">
                {section.title}
              </h2>
              <div className="mt-4 space-y-4 text-zinc-600 leading-relaxed dark:text-zinc-400">
                {section.paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
              {section.bullets && section.bullets.length > 0 ? (
                <ul className="mt-5 space-y-2.5 border-l-2 border-amber-500/40 pl-4 text-sm text-zinc-700 dark:text-zinc-300">
                  {section.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>

        <div className="mt-16 rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-500/[0.08] to-transparent p-6 dark:from-amber-500/[0.05]">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Ready when you are</h3>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Reach out to the team for a
            walkthrough tailored to your service.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href={`mailto:support@rasvia.com?subject=${encodeURIComponent(`Question about ${content.shortTitle}`)}`}
              className={cn("inline-flex rounded-xl px-4 py-2.5 text-sm font-bold", DASH_PRIMARY_CTA)}
            >
              Email support
            </a>
          </div>
        </div>
      </article>
    </MarketingLayout>
  );
}
