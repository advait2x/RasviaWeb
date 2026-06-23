import { useEffect, useRef, useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import { ThemeIconToggle } from "@/components/ThemeToggle";
import { MarketingLandingFooter } from "@/components/marketing/MarketingLandingFooter";
import {
  MKT_TOP_BAR,
  MKT_TOP_BAR_ICON_BTN,
  MKT_TOP_BAR_LINK,
  MKT_TOP_BAR_LINK_ACTIVE,
  MKT_TOP_BAR_MOBILE_LINK,
  MKT_TOP_BAR_THEME_TOGGLE,
} from "@/lib/marketingUi";
import { cn } from "@/lib/utils";
import type { MarketingProductSlug } from "@/data/marketing-products";
import { ProductsNavDropdown, ProductsNavMobileLinks } from "@/components/marketing/ProductsNavMenu";
import { scrollToLandingSection } from "@/lib/marketing-nav";

type MarketingLayoutProps = {
  children: React.ReactNode;
  /** Highlight current product in nav when set */
  activeSlug?: MarketingProductSlug;
};

export function MarketingLayout({ children, activeSlug }: MarketingLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const productCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!mobileOpen) return;
    const onResize = () => {
      if (window.innerWidth >= 768) setMobileOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [mobileOpen]);

  const openProducts = () => {
    if (productCloseTimer.current) clearTimeout(productCloseTimer.current);
    setProductsOpen(true);
  };
  const closeProducts = () => {
    productCloseTimer.current = setTimeout(() => setProductsOpen(false), 120);
  };

  return (
    <div className="min-h-screen bg-[var(--mkt-canvas)] text-[var(--mkt-ink)]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-amber-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>

      <header className={cn("fixed left-0 right-0 top-0 z-50", MKT_TOP_BAR)}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex min-w-0 flex-1 items-center gap-6">
            <a href="/" className="inline-flex flex-shrink-0 items-center">
              <img
                src="/rasvia-logo-transparent.png"
                alt="Rasvia"
                className="h-9 w-auto dark:hidden"
              />
              <img
                src="/rasvia-logo.png"
                alt="Rasvia"
                className="hidden h-9 w-auto dark:block dark:brightness-110"
              />
            </a>

            <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
              <div
                className="relative"
                onMouseEnter={openProducts}
                onMouseLeave={closeProducts}
              >
                <a
                  href="/products"
                  className={cn(
                    "flex items-center gap-1",
                    MKT_TOP_BAR_LINK,
                    productsOpen && MKT_TOP_BAR_LINK_ACTIVE,
                  )}
                  aria-expanded={productsOpen}
                >
                  Products
                  <ChevronDown
                    size={14}
                    className={cn(
                      "transition-transform duration-200 ease-[var(--mkt-ease-out)]",
                      productsOpen ? "rotate-180" : "",
                    )}
                  />
                </a>
                {productsOpen && (
                  <ProductsNavDropdown
                    activeSlug={activeSlug}
                    onNavigate={() => setProductsOpen(false)}
                  />
                )}
              </div>

              <button type="button" onClick={() => scrollToLandingSection("products")} className={MKT_TOP_BAR_LINK}>
                Platform
              </button>
              <button type="button" onClick={() => scrollToLandingSection("pricing")} className={MKT_TOP_BAR_LINK}>
                Pricing
              </button>
              <button type="button" onClick={() => scrollToLandingSection("about")} className={MKT_TOP_BAR_LINK}>
                About
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeIconToggle className={cn("hidden sm:inline-flex", MKT_TOP_BAR_THEME_TOGGLE)} />
            <a
              href="/partner-portal"
              className="hidden rounded-xl border border-amber-500/45 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-700 transition-colors hover:border-amber-600/60 hover:bg-amber-500/[0.18] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:border-amber-400/40 dark:bg-amber-500/[0.08] dark:text-amber-400 dark:hover:border-amber-400/60 dark:hover:bg-amber-500/[0.15] sm:inline-flex"
            >
              Partner Portal
            </a>
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className={cn(MKT_TOP_BAR_ICON_BTN, "md:hidden")}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              aria-controls="marketing-mobile-nav"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        <div
          className={cn(
            "grid overflow-hidden transition-[grid-template-rows] duration-250 ease-[var(--mkt-ease-out)] md:hidden",
            mobileOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
          aria-hidden={!mobileOpen}
        >
          <div
            id="marketing-mobile-nav"
            className={cn(
              "min-h-0 overflow-hidden border-t border-[var(--mkt-border-subtle)] bg-white dark:border-white/10 dark:bg-zinc-900",
              !mobileOpen && "pointer-events-none",
            )}
          >
            {mobileOpen ? (
              <div className="mkt-menu-in mx-auto max-w-7xl space-y-1 px-4 py-3">
              <ProductsNavMobileLinks onNavigate={() => setMobileOpen(false)} />
              <button
                type="button"
                className={MKT_TOP_BAR_MOBILE_LINK}
                onClick={() => {
                  setMobileOpen(false);
                  scrollToLandingSection("products");
                }}
              >
                Platform overview
              </button>
              <button
                type="button"
                className={MKT_TOP_BAR_MOBILE_LINK}
                onClick={() => {
                  setMobileOpen(false);
                  scrollToLandingSection("pricing");
                }}
              >
                Pricing
              </button>
              <button
                type="button"
                className={MKT_TOP_BAR_MOBILE_LINK}
                onClick={() => {
                  setMobileOpen(false);
                  scrollToLandingSection("about");
                }}
              >
                About
              </button>
              <div className="border-t border-[var(--mkt-border-subtle)] pt-3 dark:border-white/10">
                <p className="px-2 pb-2 text-sm font-medium text-[var(--mkt-ink-muted)] dark:text-zinc-300">Appearance</p>
                <div className="px-2">
                  <ThemeIconToggle className={MKT_TOP_BAR_THEME_TOGGLE} />
                </div>
              </div>
              <a
                href="/partner-portal"
                className="mt-2 block rounded-xl border border-amber-500/45 bg-amber-500/10 py-2.5 text-center text-sm font-semibold text-amber-800 dark:border-amber-400/40 dark:bg-amber-500/[0.08] dark:text-amber-400"
                onClick={() => setMobileOpen(false)}
              >
                Partner Portal
              </a>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div id="main-content" className="pt-[57px]">
        {children}
      </div>

      <MarketingLandingFooter />
    </div>
  );
}
