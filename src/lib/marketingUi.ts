import { cn } from "@/lib/utils";
import { DASH_PRIMARY_CTA } from "@/lib/dashboardUi";

/** Body copy — AA contrast on marketing surfaces */
export const MKT_BODY = "text-[var(--mkt-ink-muted)]";

/** Secondary / footer / caption copy */
export const MKT_MUTED = "text-[var(--mkt-ink-muted)]";

/** Page and section headings */
export const MKT_HEADING = "text-[var(--mkt-ink)]";

/** Display headline tracking (floor -0.04em) */
export const MKT_DISPLAY = "font-black tracking-tight";

/** Full-bleed section band with amber-tinted neutral wash */
export const MKT_SECTION_BAND = "mkt-section-band";

/** Bordered marketing panel — no decorative shadow */
export const MKT_PANEL =
  "rounded-xl border border-[var(--mkt-border)] bg-[var(--mkt-surface-raised)]";

/** Highlighted panel (pricing featured tier, product heroes) */
export const MKT_PANEL_ACCENT =
  "rounded-xl border border-[var(--mkt-accent-border)] bg-[var(--mkt-accent-bg)]";

/** Hero / section kicker pill */
export const MKT_HERO_BADGE =
  "inline-flex items-center gap-1.5 rounded-full border border-[var(--mkt-accent-border)] bg-[var(--mkt-accent-bg)] px-3 py-1 text-xs font-semibold text-amber-800 dark:text-amber-300";

/** Semantic trust / success accent (checkmarks only) */
export const MKT_TRUST = "text-[var(--mkt-trust)]";

/** Primary marketing CTA — gradient fill allowed; glow capped per DESIGN.md */
export const MKT_CTA_PRIMARY =
  "group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 px-6 py-3.5 text-sm font-bold text-white transition-[box-shadow,transform] duration-150 ease-[var(--mkt-ease-out)] motion-safe:active:scale-[0.98] hover:shadow-[0_6px_20px_rgba(245,158,11,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950";

/** Secondary outline CTA */
export const MKT_CTA_SECONDARY =
  "inline-flex items-center justify-center rounded-xl border border-[var(--mkt-border)] bg-[var(--mkt-surface-raised)] px-6 py-3.5 text-sm font-semibold text-[var(--mkt-ink)] transition-[color,background-color,border-color,transform] duration-150 ease-[var(--mkt-ease-out)] motion-safe:active:scale-[0.98] hover:border-[var(--mkt-accent-border)] hover:bg-[var(--mkt-accent-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950";

/** Mobile nav toggle — 44px minimum touch target */
export const MKT_NAV_ICON_BTN =
  "inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-[var(--mkt-border)] text-[var(--mkt-ink-muted)] transition-colors hover:border-[var(--mkt-accent-border)] hover:bg-[var(--mkt-accent-bg)] hover:text-[var(--mkt-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500";

/** Fixed marketing top bar — frosted in both themes */
export const MKT_TOP_BAR =
  "border-b border-[var(--mkt-border-subtle)] bg-white/95 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/95";

/** Opaque products nav dropdown — not semi-transparent like MKT_PANEL */
export const MKT_NAV_DROPDOWN =
  "rounded-xl border border-[var(--mkt-border)] bg-white dark:bg-zinc-900";

/** Nav links — .mkt-top-bar-interactive hover in index.css (light-theme zinc wildcards block Tailwind bg) */
export const MKT_TOP_BAR_LINK =
  "mkt-top-bar-interactive rounded-lg px-3 py-2 text-sm font-medium text-[var(--mkt-ink-muted)] transition-colors duration-150 hover:text-[var(--mkt-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:text-[#d4d4d8] dark:hover:text-white";

export const MKT_TOP_BAR_LINK_ACTIVE = "mkt-top-bar-interactive--active text-[var(--mkt-ink)] dark:text-white";

export const MKT_TOP_BAR_ICON_BTN =
  "mkt-top-bar-interactive inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-[var(--mkt-border)] text-[var(--mkt-ink-muted)] transition-colors duration-150 hover:text-[var(--mkt-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:border-white/15 dark:text-[#d4d4d8] dark:hover:border-white/20 dark:hover:text-white";

export const MKT_TOP_BAR_THEME_TOGGLE = "mkt-top-bar-interactive";

export const MKT_TOP_BAR_MOBILE_LINK =
  "mkt-top-bar-interactive block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[var(--mkt-ink-muted)] transition-colors duration-150 hover:text-[var(--mkt-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:text-[#d4d4d8] dark:hover:text-white";

/** Amber accent phrase in headlines (solid — no gradient text) */
export const MKT_ACCENT_INK = "text-amber-800 dark:text-amber-400";

/** Founder / avatar fallback — on-brand zinc, not violet */
export const MKT_AVATAR_FALLBACK = "flex h-full w-full items-center justify-center bg-zinc-800 dark:bg-zinc-700";

/** Body copy on dark marketing bands (showcase shell) */
export const MKT_BODY_ON_DARK = "text-[var(--mkt-body-on-dark)]";

/** Inline text link with amber emphasis */
export const MKT_LINK_ARROW =
  "inline-flex items-center gap-1.5 text-sm font-semibold text-amber-800 transition-colors hover:text-amber-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:text-amber-400 dark:hover:text-amber-300 dark:focus-visible:ring-offset-zinc-950";

/** Featured product card (landing) — extends accent panel */
export const MKT_PRODUCT_FEATURED_LINK =
  "group flex h-full flex-col transition-[border-color,transform,background-color] duration-200 ease-[var(--mkt-ease-out)] hover:border-[var(--mkt-accent-border)] hover:bg-[var(--mkt-accent-bg-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 motion-safe:hover:-translate-y-0.5 dark:focus-visible:ring-offset-zinc-950";

/** Secondary product row inside a shared panel */
export const MKT_PRODUCT_ROW_LINK =
  "group flex min-h-[44px] items-start gap-4 px-6 py-5 transition-colors hover:bg-[var(--mkt-row-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500";

/** Icon well on product rows */
export const MKT_ICON_WELL =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--mkt-accent-bg-strong)] text-amber-800 dark:text-amber-400";

/** Compact tier / outline button on marketing panels */
export const MKT_BTN_OUTLINE =
  "inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-xl border border-[var(--mkt-border)] bg-[var(--mkt-accent-bg)] px-5 py-2.5 text-center text-sm font-bold text-[var(--mkt-ink)] transition-[color,background-color,border-color,transform] duration-150 ease-[var(--mkt-ease-out)] motion-safe:active:scale-[0.98] hover:border-[var(--mkt-accent-border)] hover:bg-[var(--mkt-accent-bg-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950";

export function mktPrimaryCtaClass(extra?: string) {
  return cn(MKT_CTA_PRIMARY, extra);
}

export function mktLearnMoreClass(extra?: string) {
  return cn(
    "inline-flex items-center gap-1 text-sm font-semibold text-amber-800 dark:text-amber-400",
    extra,
  );
}

/** Form field label — sentence case, not uppercase eyebrow */
export const MKT_LABEL = "text-sm font-medium text-[var(--mkt-ink)]";

/** Bordered input shell */
export const MKT_INPUT =
  "rounded-lg border border-[var(--mkt-border)] bg-[var(--mkt-accent-bg)] transition-[border-color,box-shadow] focus-within:border-[var(--mkt-accent-border)] focus-within:ring-2 focus-within:ring-amber-500/25";

/** Auth / form card — border only, no ghost shadow */
export const MKT_FORM_CARD =
  "overflow-hidden rounded-xl border border-[var(--mkt-border)] bg-[var(--mkt-surface-raised)]";

export function mktDashPrimaryClass(extra?: string) {
  return cn(
    DASH_PRIMARY_CTA,
    "rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950",
    extra,
  );
}
