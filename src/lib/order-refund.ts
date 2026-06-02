import { supabase } from "@/lib/supabase";
import type { Order } from "@/types/dashboard";

export function orderTotalCents(order: Order): number {
  return Math.round(((order.subtotal ?? 0) + (order.tipAmount ?? 0)) * 100);
}

export function remainingRefundable(order: Order): number {
  const total = orderTotalCents(order);
  const refunded = order.refundedAmountCents ?? 0;
  return Math.max(0, total - refunded);
}

/** Order has a Stripe refund path (solo PI or party-session payments). */
export function orderHasStripeRefundPath(order: Order): boolean {
  return Boolean(order.stripePaymentIntentId || order.partySessionId);
}

/** Active-order cancel should issue a full remaining refund before marking cancelled. */
export function shouldAutoRefundOnCancel(order: Order): boolean {
  return orderHasStripeRefundPath(order) && remainingRefundable(order) > 0;
}

/** Pull the real `{ error }` message out of a Supabase FunctionsHttpError. */
export async function extractFunctionError(err: unknown): Promise<string> {
  const fallback = err instanceof Error ? err.message : "Refund failed.";
  const context = (err as { context?: Response } | null)?.context;
  if (!context || typeof context.clone !== "function") return fallback;
  try {
    const body = await context.clone().json();
    if (body && typeof body === "object" && "error" in body && body.error) {
      return String((body as { error: unknown }).error);
    }
  } catch {
    // Not JSON — try plain text below.
  }
  try {
    const text = await context.clone().text();
    if (text) return text;
  } catch {
    // ignore
  }
  return fallback;
}

/**
 * Refund the remaining balance on an order via the `refund-order` edge function.
 * Returns cents refunded (0 when nothing was charged / already refunded).
 */
export async function refundOrderRemaining(
  order: Order,
  reason = "Order cancelled by restaurant",
): Promise<number> {
  const amountCents = remainingRefundable(order);
  if (amountCents <= 0 || !orderHasStripeRefundPath(order)) return 0;

  const { data, error } = await supabase.functions.invoke("refund-order", {
    body: {
      order_id: Number(order.id),
      amount_cents: amountCents,
      reason,
    },
  });

  if (error) {
    const msg = await extractFunctionError(error);
    throw new Error(msg);
  }
  if (data && typeof data === "object" && "error" in data && data.error) {
    throw new Error(String((data as { error: string }).error));
  }

  const refunded =
    data && typeof data === "object" && "refunded_cents" in data
      ? Number((data as { refunded_cents: unknown }).refunded_cents)
      : amountCents;
  return Number.isFinite(refunded) && refunded > 0 ? refunded : amountCents;
}
