import { useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { MKT_BODY, MKT_DISPLAY, MKT_HEADING, MKT_PANEL, mktLearnMoreClass } from "@/lib/marketingUi";
import { cn } from "@/lib/utils";
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
        <h1 className={cn("text-4xl sm:text-5xl text-balance", MKT_DISPLAY, MKT_HEADING)}>
          What Rasvia includes
        </h1>
        <p className={cn("mt-4 max-w-2xl text-lg leading-relaxed text-pretty", MKT_BODY)}>
          Waitlists, table ordering, kitchen display, menus, and reporting. All tied to the same live data.
        </p>

        <div className="mt-14 flex flex-col space-y-12 sm:mt-16 sm:grid sm:grid-cols-2 sm:gap-x-10 sm:gap-y-14 sm:space-y-0">
          {MARKETING_NAV_PRODUCTS.map((p) => {
            const page = PRODUCT_PAGES[p.slug];
            return (
              <a
                key={p.slug}
                href={getMarketingProductPath(p.slug)}
                className={cn(
                  "group flex min-h-0 flex-col p-6 transition-[border-color,transform] duration-200 ease-[var(--mkt-ease-out)] hover:border-amber-400/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 motion-safe:hover:-translate-y-0.5 dark:hover:border-amber-500/30 dark:focus-visible:ring-offset-zinc-950 sm:p-7",
                  MKT_PANEL,
                )}
              >
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">{page.shortTitle}</p>
                <h2 className={cn("mt-2 text-xl font-bold tracking-tight group-hover:text-amber-800 dark:group-hover:text-amber-300", MKT_HEADING)}>
                  {page.headline}
                </h2>
                <p className={cn("mt-3 flex-1 text-sm leading-relaxed", MKT_BODY)}>{page.subhead}</p>
                <span className={mktLearnMoreClass("mt-4")}>
                  Learn more
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-[var(--mkt-ease-out)] motion-safe:group-hover:translate-x-0.5" aria-hidden />
                </span>
              </a>
            );
          })}
        </div>
      </div>
    </MarketingLayout>
  );
}
