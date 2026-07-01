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
  MKT_BTN_OUTLINE,
} from "@/lib/marketingUi";
import { cn } from "@/lib/utils";
import type { MarketingProductSlug } from "@/data/marketing-products";
import { ProductsNavDropdown, ProductsNavMobileLinks } from "@/components/marketing/ProductsNavMenu";
import { CLOVE_BASE_PATH } from "@/clove/data";

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

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
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

      <header
        className={cn(
          "fixed left-0 right-0 top-0 z-50 flex flex-col",
          MKT_TOP_BAR,
          mobileOpen && "h-dvh md:h-auto",
        )}
      >
        <div
          data-marketing-nav-bar
          className="mx-auto flex w-full max-w-7xl shrink-0 items-center justify-between px-6 py-3"
        >
          <div className="flex min-w-0 flex-1 items-center gap-6">
            <div className="flex flex-shrink-0 items-center gap-2">
              <a href="/" className="inline-flex items-center">
                <img src="/rasvia-logo-transparent.png" alt="Rasvia" className="h-9 w-auto" />
              </a>
              <div className={cn("sm:hidden", mobileOpen && "hidden")}>
                <ThemeIconToggle variant="marketing" className={MKT_TOP_BAR_THEME_TOGGLE} />
              </div>
            </div>

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
            <div className={cn(mobileOpen ? "inline-flex" : "hidden sm:inline-flex")}>
              <ThemeIconToggle variant="marketing" className={MKT_TOP_BAR_THEME_TOGGLE} />
            </div>
            <a
              href={CLOVE_BASE_PATH}
              className={cn(
                MKT_BTN_OUTLINE,
                "inline-flex min-h-0 px-2.5 py-1.5 text-[11px] sm:px-4 sm:py-2.5 sm:text-sm",
              )}
            >
              View Demo Site
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
            "grid min-h-0 flex-1 overflow-hidden transition-[grid-template-rows] duration-250 ease-[var(--mkt-ease-out)] md:hidden",
            mobileOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
          aria-hidden={!mobileOpen}
        >
          <div
            id="marketing-mobile-nav"
            className={cn(
              "min-h-0 overflow-y-auto overscroll-contain border-t border-[var(--mkt-border-subtle)] bg-white dark:border-white/10 dark:bg-zinc-900",
              !mobileOpen && "pointer-events-none",
            )}
          >
            {mobileOpen ? (
              <div className="mkt-menu-in mx-auto flex min-h-full max-w-7xl flex-col space-y-1 px-4 py-3 pb-8">
              <button
                type="button"
                className={MKT_TOP_BAR_MOBILE_LINK}
                onClick={() => {
                  setMobileOpen(false);
                  scrollToLandingSectionFromMobileNav("products");
                }}
              >
                Platform overview
              </button>
              <button
                type="button"
                className={MKT_TOP_BAR_MOBILE_LINK}
                onClick={() => {
                  setMobileOpen(false);
                  scrollToLandingSectionFromMobileNav("pricing");
                }}
              >
                Pricing
              </button>
              <button
                type="button"
                className={MKT_TOP_BAR_MOBILE_LINK}
                onClick={() => {
                  setMobileOpen(false);
                  scrollToLandingSectionFromMobileNav("about");
                }}
              >
                About
              </button>
              <div className="my-2 border-t border-[var(--mkt-border-subtle)] dark:border-white/10" />
              <ProductsNavMobileLinks onNavigate={() => setMobileOpen(false)} />
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
