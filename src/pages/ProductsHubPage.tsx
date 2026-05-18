import { useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { MARKETING_NAV_PRODUCTS, PRODUCT_PAGES, getMarketingProductPath } from "@/data/marketing-products";

export default function ProductsHubPage() {
  useEffect(() => {
    document.title = "Products · Rasvia";
    return () => {
      document.title = "Rasvia";
    };
  }, []);

  return (
    <MarketingLayout>
      <div className="mx-auto max-w-5xl px-6 py-12">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-600/90 dark:text-amber-400/80">
          Products
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tighter text-zinc-900 sm:text-5xl dark:text-white">
          Everything we ship for restaurants and guests
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-zinc-600 dark:text-neutral-400">
          Deep dives on each pillar of the Rasvia platform: operations, front-of-house tooling, and the consumer app
          experience that connects to the same live data.
        </p>

        <div className="mt-14 flex flex-col space-y-12 sm:mt-16 sm:grid sm:grid-cols-2 sm:gap-x-10 sm:gap-y-14 sm:space-y-0">
          {MARKETING_NAV_PRODUCTS.map((p) => {
            const page = PRODUCT_PAGES[p.slug];
            return (
              <a
                key={p.slug}
                href={getMarketingProductPath(p.slug)}
                className="group flex min-h-0 flex-col rounded-2xl border border-zinc-200/90 bg-white/90 p-6 shadow-sm transition-all hover:border-amber-400/50 hover:shadow-md dark:border-white/[0.08] dark:bg-zinc-900/40 dark:shadow-none dark:hover:border-amber-500/30 sm:p-7"
              >
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700/90 dark:text-amber-400/90">
                  {page.shortTitle}
                </span>
                <h2 className="mt-2 text-xl font-bold tracking-tight text-zinc-900 group-hover:text-amber-800 dark:text-white dark:group-hover:text-amber-300">
                  {page.headline}
                </h2>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{page.subhead}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-amber-700 dark:text-amber-400">
                  Read more
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </a>
            );
          })}
        </div>
      </div>
    </MarketingLayout>
  );
}
