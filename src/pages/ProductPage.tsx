import { useEffect } from "react";
import { Check } from "lucide-react";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import {
  MKT_BODY,
  MKT_DISPLAY,
  MKT_HEADING,
  MKT_PANEL,
  MKT_PANEL_ACCENT,
  mktDashPrimaryClass,
} from "@/lib/marketingUi";
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
          <h1 className={cn("text-2xl", MKT_DISPLAY, MKT_HEADING)}>Page not found</h1>
          <p className={cn("mt-3", MKT_BODY)}>
            That product page does not exist. Pick one from the product hub or go home.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a href="/products" className={mktDashPrimaryClass("inline-flex px-5 py-2.5 text-sm font-bold")}>
              Product overview
            </a>
            <a
              href="/"
              className={cn(
                "rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:border-white/10 dark:bg-zinc-900/40 dark:text-zinc-200 dark:hover:bg-zinc-900/70",
              )}
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
      <article className="mx-auto max-w-3xl px-6 py-12">
        <h1 className={cn("text-3xl leading-tight sm:text-4xl md:text-5xl text-balance", MKT_DISPLAY, MKT_HEADING)}>
          {content.headline}
        </h1>
        <p className={cn("mt-5 text-lg leading-relaxed text-pretty", MKT_BODY)}>{content.subhead}</p>

        <ul className={cn("mt-8 space-y-3 p-5", MKT_PANEL)}>
          {content.highlights.map((h) => (
            <li key={h} className={cn("flex gap-3 text-sm", MKT_BODY)}>
              <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" strokeWidth={2.5} />
              <span>{h}</span>
            </li>
          ))}
        </ul>

        <div className="mt-16 space-y-14">
          {content.sections.map((section) => (
            <section key={section.title} className="border-t border-[var(--mkt-border-subtle)] pt-10">
              <h2 className={cn("text-xl font-bold tracking-tight sm:text-2xl", MKT_HEADING)}>
                {section.title}
              </h2>
              <div className={cn("mt-4 space-y-4 leading-relaxed", MKT_BODY)}>
                {section.paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
              {section.bullets && section.bullets.length > 0 ? (
                <ul className={cn("mt-5 space-y-2.5 text-sm", MKT_BODY)}>
                  {section.bullets.map((b) => (
                    <li key={b} className="flex gap-2">
                      <span className="text-amber-600 dark:text-amber-400" aria-hidden>
                        ·
                      </span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>

        <div className={cn("mt-16 p-6", MKT_PANEL_ACCENT)}>
          <h3 className={cn("text-lg font-bold", MKT_HEADING)}>Talk to us</h3>
          <p className={cn("mt-2 text-sm leading-relaxed", MKT_BODY)}>
            Email us. We will set up a walkthrough that fits how you run service.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href={`mailto:support@rasvia.com?subject=${encodeURIComponent(`Question about ${content.shortTitle}`)}`}
              className={mktDashPrimaryClass("inline-flex px-4 py-2.5 text-sm font-bold")}
            >
              Email support
            </a>
          </div>
        </div>
      </article>
    </MarketingLayout>
  );
}
