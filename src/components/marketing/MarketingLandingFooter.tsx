import { MARKETING_NAV_PRODUCTS, getMarketingProductPath } from "@/data/marketing-products";
import { MKT_BODY, MKT_HEADING, MKT_MUTED } from "@/lib/marketingUi";
import { scrollToLandingSection } from "@/lib/marketing-nav";
import { cn } from "@/lib/utils";

export function MarketingLandingFooter() {
  return (
    <footer className="mt-24 border-t border-zinc-200/90 dark:border-white/[0.06]">
      <div className="mx-auto max-w-7xl px-6 pt-16 pb-8">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <img src="/rasvia-logo-transparent.png" alt="Rasvia" className="h-7 w-auto" />
            <p className={cn("mt-2 max-w-[200px] text-sm leading-relaxed", MKT_BODY)}>
              Custom apps for independent restaurants. You own the guest relationship.
            </p>
          </div>

          <div>
            <p className={cn("text-sm font-medium", MKT_HEADING)}>Product</p>
            <ul className="mt-4 flex flex-col gap-3">
              {MARKETING_NAV_PRODUCTS.map((item) => (
                <li key={item.slug}>
                  <a
                    href={getMarketingProductPath(item.slug)}
                    className={cn("text-sm transition-colors hover:text-zinc-900 dark:hover:text-white", MKT_BODY)}
                  >
                    {item.footerLabel ?? item.name}
                  </a>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={() => scrollToLandingSection("pricing")}
                  className={cn("text-sm transition-colors hover:text-zinc-900 dark:hover:text-white", MKT_BODY)}
                >
                  Pricing
                </button>
              </li>
            </ul>
          </div>

          <div>
            <p className={cn("text-sm font-medium", MKT_HEADING)}>About</p>
            <ul className="mt-4 flex flex-col gap-3">
              <li>
                <button
                  type="button"
                  onClick={() => scrollToLandingSection("about")}
                  className={cn("text-sm transition-colors hover:text-zinc-900 dark:hover:text-white", MKT_BODY)}
                >
                  Our Mission
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => scrollToLandingSection("about")}
                  className={cn("text-sm transition-colors hover:text-zinc-900 dark:hover:text-white", MKT_BODY)}
                >
                  Team
                </button>
              </li>
              <li>
                <a href="/support" className={cn("text-sm transition-colors hover:text-zinc-900 dark:hover:text-white", MKT_BODY)}>
                  Contact Support
                </a>
              </li>
              <li>
                <a
                  href="/partner-portal"
                  className={cn("text-sm transition-colors hover:text-zinc-900 dark:hover:text-white", MKT_BODY)}
                >
                  Partner Login
                </a>
              </li>
            </ul>
          </div>

          <div>
            <p className={cn("text-sm font-medium", MKT_HEADING)}>Legal</p>
            <ul className="mt-4 flex flex-col gap-3">
              <li>
                <a href="/privacy" className={cn("text-sm transition-colors hover:text-zinc-900 dark:hover:text-white", MKT_BODY)}>
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="/terms" className={cn("text-sm transition-colors hover:text-zinc-900 dark:hover:text-white", MKT_BODY)}>
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200/90 pt-8 dark:border-white/[0.06]">
          <p className={cn("text-sm", MKT_MUTED)}>
            {new Date().getFullYear()} Rasvia, Inc. Rasvia™ is a trademark of Rasvia, Inc.
          </p>
          <p className={cn("text-xs", MKT_MUTED)}>Built for restaurants.</p>
        </div>
      </div>
    </footer>
  );
}
