/**
 * Shared dashboard UI tokens — amber primary accent, consistent "Add" and notification styling.
 */

/** Secondary outline actions: Add item, Add slide, Add walk-in, Add period, etc. */
export const DASH_BTN_ADD =
  "inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400 text-sm font-medium transition-colors hover:bg-amber-500/20";

/** Compact add (toolbars, dense rows) */
export const DASH_BTN_ADD_SM =
  "inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-medium transition-colors hover:bg-amber-500/20";

/** Extra-small (settings sub-actions) */
export const DASH_BTN_ADD_XS =
  "inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400 text-[11px] font-semibold transition-colors hover:bg-amber-500/20";

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
  "absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full border border-amber-500/35 bg-amber-500/25 px-1 text-[10px] font-semibold tabular-nums text-amber-100 ring-1 ring-amber-400/20";

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
