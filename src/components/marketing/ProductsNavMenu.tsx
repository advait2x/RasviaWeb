import { MKT_PANEL } from "@/lib/marketingUi";
import { cn } from "@/lib/utils";
import {
  MARKETING_NAV_PRODUCTS,
  getMarketingProductPath,
  type MarketingProductSlug,
} from "@/data/marketing-products";

type ProductsNavMenuProps = {
  activeSlug?: MarketingProductSlug;
  onNavigate?: () => void;
  /** Desktop dropdown panel alignment under the Products trigger */
  align?: "left" | "center";
  className?: string;
};

export function ProductsNavDropdown({
  activeSlug,
  onNavigate,
  align = "left",
  className,
}: ProductsNavMenuProps) {
  return (
    <div
      className={cn(
        "absolute top-full z-50 mt-1 w-80",
        align === "center" ? "left-1/2 -translate-x-1/2" : "left-0",
        className,
      )}
    >
      <div className={cn("mkt-dropdown-in overflow-hidden shadow-2xl", MKT_PANEL)}>
      {MARKETING_NAV_PRODUCTS.map((p) => (
        <a
          key={p.slug}
          href={getMarketingProductPath(p.slug)}
          className={cn(
            "block px-4 py-3 transition-colors hover:bg-[var(--mkt-row-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500",
            activeSlug === p.slug && "bg-amber-500/10 dark:bg-amber-500/10",
          )}
          onClick={onNavigate}
        >
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-200">{p.name}</span>
          <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500">{p.description}</span>
        </a>
      ))}
      <div className="border-t border-zinc-200/80 dark:border-white/10">
        <a
          href="/products"
          className="block px-4 py-2.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-zinc-100 dark:text-amber-400 dark:hover:bg-white/[0.05]"
          onClick={onNavigate}
        >
          View all product pages →
        </a>
      </div>
      </div>
    </div>
  );
}

export function ProductsNavMobileLinks({ onNavigate }: { onNavigate?: () => void }) {
  const linkClass = cn(
    "block rounded-lg px-3 py-2.5 transition-colors hover:bg-[var(--mkt-accent-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500",
    "dark:hover:bg-zinc-700/70",
  );

  return (
    <>
      <a
        href="/products"
        className={cn(linkClass, "text-sm font-semibold text-[var(--mkt-ink)] dark:text-zinc-200")}
        onClick={onNavigate}
      >
        All products
      </a>
      <p className="px-2 pt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">By product</p>
      {MARKETING_NAV_PRODUCTS.map((p) => (
        <a
          key={p.slug}
          href={getMarketingProductPath(p.slug)}
          className={linkClass}
          onClick={onNavigate}
        >
          <span className="text-sm font-semibold text-[var(--mkt-ink)] dark:text-zinc-200">{p.name}</span>
          <span className="mt-0.5 block text-xs leading-relaxed text-[var(--mkt-ink-muted)]">{p.description}</span>
        </a>
      ))}
      <a
        href="/products"
        className="block rounded-lg px-3 py-2 text-xs font-semibold text-amber-700 dark:text-amber-400"
        onClick={onNavigate}
      >
        View all product pages →
      </a>
    </>
  );
}
