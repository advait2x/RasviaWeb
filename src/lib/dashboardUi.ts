import type { DietType, OrderStatus } from "@/types/dashboard";

/**
 * Shared dashboard UI tokens - amber primary accent, consistent "Add" and notification styling.
 */

/**
 * Secondary outline actions: Add item, Add slide, Add walk-in, Add period, etc.
 * Light: muted amber surface - not neon on white.
 */
export const DASH_BTN_ADD =
  "inline-flex items-center gap-1.5 rounded-lg border border-amber-800/30 bg-amber-50/95 text-amber-950/90 text-sm font-medium shadow-sm transition-colors hover:bg-amber-100/95 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300 dark:shadow-none dark:hover:bg-amber-500/20";

/** Compact add (toolbars, dense rows) */
export const DASH_BTN_ADD_SM =
  "inline-flex items-center gap-1.5 rounded-lg border border-amber-800/30 bg-amber-50/95 text-amber-950/90 text-xs font-medium shadow-sm transition-colors hover:bg-amber-100/95 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300 dark:shadow-none dark:hover:bg-amber-500/20";

/** Extra-small (settings sub-actions) */
export const DASH_BTN_ADD_XS =
  "inline-flex items-center gap-1.5 rounded-lg border border-amber-800/30 bg-amber-50/95 text-amber-950/90 text-[11px] font-semibold shadow-sm transition-colors hover:bg-amber-100/95 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300 dark:shadow-none dark:hover:bg-amber-500/20";

/**
 * QR / section icon tile (Tableside header, empty state) - same border + fill as {@link DASH_BTN_ADD},
 * without inline-flex/gap (wrap with `flex … items-center justify-center`).
 */
export const DASH_QR_ICON_SURFACE =
  "border border-amber-800/30 bg-amber-50/95 text-amber-950/90 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300 dark:shadow-none";

/** Full notification row (panel + consistent cards) */
export const DASH_NOTIF_CARD =
  "flex items-start gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3.5";

export const DASH_NOTIF_ICON_WRAP =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/12";

export const DASH_NOTIF_ICON = "text-amber-400";

/** Section headers: "Next up", "Notifications" pulse dot */
export const DASH_HEADER_DOT_PING =
  "absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400/30 opacity-50";

export const DASH_HEADER_DOT = "relative inline-flex h-2 w-2 rounded-full bg-amber-400/70";

/** Nav item count badges (orders, waitlist) */
export const DASH_NAV_COUNT_BADGE =
  "absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full border border-amber-500/35 bg-amber-500/25 px-1 text-[10px] font-semibold tabular-nums text-amber-800 dark:text-amber-100 ring-1 ring-amber-400/20";

/** Unread / emphasis pill (notifications preview) */
export const DASH_BADGE_UNREAD =
  "rounded-full border border-amber-500/35 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-amber-200";

export function dashWaitTextClass(minutes: number): string {
  if (minutes < 15) return "text-amber-200/95";
  if (minutes <= 30) return "text-amber-300/90";
  return "text-orange-300/90";
}

export function dashWaitRowBgClass(minutes: number): string {
  if (minutes < 15) return "border-amber-400/18 bg-amber-500/[0.07]";
  if (minutes <= 30) return "border-amber-400/14 bg-amber-500/[0.05]";
  return "border-orange-400/20 bg-orange-500/[0.06]";
}

/**
 * Primary solid CTA (replaces `bg-amber-500` + black text + `hover:bg-amber-400`).
 * Use for Save, Continue, and main actions in light and dark mode.
 */
export const DASH_PRIMARY_CTA =
  "bg-amber-800 text-amber-50 shadow-sm hover:bg-amber-700 dark:bg-amber-600 dark:text-zinc-950 dark:shadow-none dark:hover:bg-amber-500/95";

/** Menu manager primary actions - slightly deeper in light than {@link DASH_PRIMARY_CTA} (less orange glare on white). */
export const DASH_MENU_PRIMARY_CTA =
  "bg-amber-900 text-amber-50 shadow-sm hover:bg-amber-800 dark:bg-amber-600 dark:text-zinc-950 dark:shadow-none dark:hover:bg-amber-500/95";

/**
 * Filled “on” state (tabs, segmented controls) using the same palette as {@link DASH_PRIMARY_CTA}.
 */
export const DASH_PRIMARY_SELECTED =
  "border-amber-800 bg-amber-800 text-amber-50 dark:border-amber-500 dark:bg-amber-600 dark:text-zinc-950";

/**
 * Muted amber outline (Add item, New modifier, icon toolbars) - calmer in light
 * than `text-amber-400` on `bg-amber-500/10` when the shell is `data-theme=light`.
 */
export const DASH_AMBER_MUTED =
  "border border-amber-800/30 bg-amber-50/95 text-amber-950/90 shadow-sm transition-colors hover:bg-amber-100/95 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300 dark:shadow-none dark:hover:bg-amber-500/20";

/**
 * Slightly stronger filled amber for secondary confirmation (e.g. stock confirm).
 */
export const DASH_AMBER_MUTED_EMPHASIS =
  "border border-amber-800/45 bg-amber-100/95 text-amber-950/95 transition-colors hover:bg-amber-200/80 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-200 dark:hover:bg-amber-500/25";

/** Small icon/ring accent for dialogs (e.g. duplicate item) in menu */
export const DASH_AMBER_ICON_RING =
  "border-amber-300/60 bg-amber-100/90 dark:border-amber-500/20 dark:bg-amber-500/10";

/** Sort / filter row “selected” in light (avoid neon on white popovers) */
export const DASH_AMBER_LIST_SELECTED =
  "bg-amber-100/95 text-amber-950 dark:bg-amber-500/10 dark:text-amber-300";

/** Order totals and price emphasis in lists - not neon in light. */
export const DASH_MONEY_EMPHASIS = "text-amber-800 dark:text-amber-400";

/** Order filter chips when unselected (Active / Pre-orders diet & meal rows, etc.) */
export const ORDER_FILTER_CHIP_OFF =
  "bg-zinc-200/55 border border-zinc-300/45 text-zinc-600 transition-all hover:text-zinc-800 dark:bg-zinc-800/40 dark:border-white/[0.08] dark:text-zinc-500 dark:hover:text-zinc-300";

/** Status pills on order cards and in the filter bar */
export const ORDER_STATUS_PILL: Record<OrderStatus, string> = {
  pending:
    "bg-yellow-100/90 border border-yellow-800/20 text-yellow-900 dark:bg-yellow-500/10 dark:border-yellow-500/30 dark:text-yellow-400",
  preparing:
    "bg-sky-100/90 border border-sky-800/25 text-sky-900 dark:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-400",
  ready:
    "bg-emerald-100/90 border border-emerald-800/25 text-emerald-900 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400",
  served:
    "bg-violet-100/90 border border-violet-800/30 text-violet-900 dark:bg-violet-500/10 dark:border-violet-500/30 dark:text-violet-400",
  completed:
    "bg-zinc-200/80 border border-zinc-500/30 text-zinc-800 dark:bg-zinc-700/30 dark:border-zinc-600/30 dark:text-zinc-400",
  cancelled:
    "bg-rose-100/90 border border-rose-800/25 text-rose-900 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-400",
};

export const ORDER_PILL_TYPE_PRE =
  "bg-sky-100/90 border border-sky-800/25 text-sky-900 dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-400";

export const ORDER_PILL_TYPE_TAKEOUT =
  "bg-violet-100/90 border border-violet-800/30 text-violet-900 dark:bg-purple-500/10 dark:border-purple-500/20 dark:text-purple-400";

export const ORDER_PILL_GROUP =
  "bg-violet-100/90 border border-violet-800/30 text-violet-900 dark:bg-purple-500/10 dark:border-purple-500/30 dark:text-purple-300";

export const ORDER_DIET_PILL: Record<DietType, string> = {
  veg: "bg-emerald-100/90 border border-emerald-800/25 text-emerald-900 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400",
  halal: "bg-sky-100/90 border border-sky-800/25 text-sky-900 dark:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-400",
  non_veg:
    "bg-rose-100/90 border border-rose-800/25 text-rose-900 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-400",
};

export const ORDER_MEAL_PILLS: Record<"breakfast" | "lunch" | "dinner" | "specials", string> = {
  breakfast:
    "bg-orange-100/90 border border-orange-800/25 text-orange-900 dark:bg-orange-500/10 dark:border-orange-500/30 dark:text-orange-400",
  lunch:
    "bg-emerald-100/90 border border-emerald-800/25 text-emerald-900 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400",
  dinner:
    "bg-indigo-100/90 border border-indigo-800/30 text-indigo-900 dark:bg-indigo-500/10 dark:border-indigo-500/30 dark:text-indigo-400",
  specials:
    "bg-amber-100/90 border border-amber-800/25 text-amber-900 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-400",
};

export const ORDER_PILL_REFUND_FULL =
  "bg-rose-100/90 border border-rose-800/25 text-rose-900 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-300";

export const ORDER_PILL_REFUND_PARTIAL =
  "bg-amber-100/90 border border-amber-800/25 text-amber-900 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-300";

export const ORDER_PILL_NOTIFY_DONE =
  "bg-emerald-100/90 border border-emerald-800/25 text-emerald-900 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400";

/** Pending “Notify” (needs tap) - matches muted CTA, still pulses in dark. */
export const ORDER_PILL_NOTIFY_PENDING =
  "bg-amber-50/95 border border-amber-800/30 text-amber-950/90 dark:bg-amber-500/10 dark:border-amber-500/40 dark:text-amber-400 animate-pulse dark:shadow-none";

/** Past orders: range + “More” selected segment */
export const DASH_PAST_FILTER_SELECTED = "bg-amber-200/90 text-amber-950 dark:bg-amber-500/15 dark:text-amber-400";

/** Soft rose - remove / sign out (avoids harsh red-600) */
export const DASH_SOFT_DESTRUCTIVE_BTN =
  "border border-rose-400/30 bg-rose-500/15 text-rose-100 shadow-sm transition-colors hover:border-rose-400/50 hover:bg-rose-500/25 hover:text-white";

export const DASH_SOFT_DESTRUCTIVE_ACTION =
  "bg-rose-500/90 text-white hover:bg-rose-400 focus-visible:ring-rose-300/50";

/**
 * Shared sign-out control: zinc bar, rose on hover.
 * Use for the settings nav trigger and the sign-out confirmation action.
 */
export const DASH_SIGN_OUT_BUTTON =
  "group inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-zinc-800/90 px-2.5 py-2 text-xs font-medium text-zinc-300 transition-colors hover:border-rose-400/40 hover:bg-rose-500/20 hover:text-rose-50 sm:px-3";

/** Top nav: sign out (settings) */
export const DASH_SIGN_OUT_TRIGGER = `shrink-0 ${DASH_SIGN_OUT_BUTTON}`;
