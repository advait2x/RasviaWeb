import { useEffect, useRef, useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import { ThemeIconToggle } from "@/components/ThemeToggle";
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
    <div className="min-h-screen bg-[var(--page-overscroll)] text-zinc-900 dark:text-zinc-100">
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-zinc-200/80 bg-white/90 backdrop-blur-xl dark:border-white/[0.06] dark:bg-black/80">
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
                className="hidden h-9 w-auto dark:block dark:brightness-110 dark:contrast-100"
              />
            </a>

            <nav className="hidden items-center gap-1 md:flex">
              <div
                className="relative"
                onMouseEnter={openProducts}
                onMouseLeave={closeProducts}
              >
                <a
                  href="/products"
                  className={cn(
                    "flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    productsOpen
                      ? "bg-zinc-200/90 text-zinc-900 dark:bg-white/[0.06] dark:text-white"
                      : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200",
                  )}
                  aria-expanded={productsOpen}
                >
                  Products
                  <ChevronDown
                    size={14}
                    className={cn("transition-transform duration-200", productsOpen ? "rotate-180" : "")}
                  />
                </a>
                {productsOpen && (
                  <ProductsNavDropdown
                    activeSlug={activeSlug}
                    onNavigate={() => setProductsOpen(false)}
                  />
                )}
              </div>

              <button
                type="button"
                onClick={() => scrollToLandingSection("pricing")}
                className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-200/70 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-zinc-200"
              >
                Pricing
              </button>
              <button
                type="button"
                onClick={() => scrollToLandingSection("about")}
                className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-200/70 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-zinc-200"
              >
                About
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeIconToggle className="hidden sm:inline-flex" />
            <a
              href="/partner-portal"
              className="hidden rounded-xl border border-amber-500/45 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-700 transition-all hover:border-amber-600/60 hover:bg-amber-500/[0.18] dark:border-amber-400/40 dark:bg-amber-500/[0.08] dark:text-amber-400 dark:hover:border-amber-400/60 dark:hover:bg-amber-500/[0.15] sm:inline-flex"
            >
              Partner Portal
            </a>
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="rounded-lg border border-zinc-200 p-2 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white md:hidden"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {mobileOpen ? (
          <div className="border-t border-zinc-200 bg-white/98 backdrop-blur-xl dark:border-white/[0.06] dark:bg-black/95 md:hidden">
            <div className="mx-auto max-w-7xl space-y-1 px-4 py-3">
              <ProductsNavMobileLinks onNavigate={() => setMobileOpen(false)} />
              <button
                type="button"
                className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/5"
                onClick={() => {
                  setMobileOpen(false);
                  scrollToLandingSection("pricing");
                }}
              >
                Pricing
              </button>
              <button
                type="button"
                className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/5"
                onClick={() => {
                  setMobileOpen(false);
                  scrollToLandingSection("about");
                }}
              >
                About
              </button>
              <div className="border-t border-zinc-200 pt-2 dark:border-white/10">
                <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Appearance</p>
                <div className="px-2">
                  <ThemeIconToggle />
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
          </div>
        ) : null}
      </header>

      <div className="pt-[57px]">{children}</div>

      <footer className="mt-16 border-t border-zinc-200/90 dark:border-white/[0.06]">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <a
              href="/"
              className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            >
              ← Back to home
            </a>
            <p className="text-sm text-zinc-500 dark:text-neutral-600">
              {new Date().getFullYear()} Rasvia, Inc. Rasvia™ is a trademark of Rasvia, Inc.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
