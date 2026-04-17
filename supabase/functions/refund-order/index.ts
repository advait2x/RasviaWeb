// supabase/functions/refund-order/index.ts
//
// Dashboard-initiated refund for a single order.
//
// Request body:
//   { order_id: number, amount_cents?: number }
// If amount_cents is omitted, a full refund of the remaining balance is issued.
//
// Flow:
//   1. Authenticate the caller (user JWT) and confirm they belong to the
//      restaurant that owns the order (restaurant_owner / manager / staff).
//   2. Branch on order shape:
//        - Party orders (orders.party_session_id set) -> delegate to the
//          existing party cancel/refund path by calling each party_payment
//          Stripe refund directly, then party_mark_refunded.
//        - Solo orders (stripe_payment_intent_id set) -> call
//          stripe.refunds.create and then mark_order_refunded RPC.
//   3. Return { ok, refunded_cents }.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "npm:stripe@^13.10.0"
import { createClient } from "npm:@supabase/supabase-js@^2.39.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function toPositiveInt(value: unknown): number | null {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.floor(n)
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
  if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey || !stripeSecretKey) {
    console.error('refund-order missing required env vars')
    return json({ error: 'Service not configured.' }, 500)
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) {
    return json({ error: 'Unauthorized.' }, 401)
  }

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON body' }, 400) }

  const orderId = toPositiveInt(body.order_id)
  if (!orderId) return json({ error: 'order_id is required.' }, 400)
  const requestedAmountCents = body.amount_cents == null ? null : toPositiveInt(body.amount_cents)
  if (body.amount_cents != null && requestedAmountCents == null) {
    return json({ error: 'Invalid amount_cents.' }, 400)
  }

  // Verify caller (JWT) using the anon client.
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData, error: userErr } = await userClient.auth.getUser()
  if (userErr || !userData?.user) return json({ error: 'Unauthorized.' }, 401)
  const userId = userData.user.id

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Fetch order.
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('id, restaurant_id, party_session_id, subtotal, tip_amount, refunded_amount_cents, stripe_payment_intent_id, stripe_charge_id, status')
    .eq('id', orderId)
    .maybeSingle()
  if (orderErr || !order) return json({ error: 'Order not found.' }, 404)

  // Authorize: caller must belong to the restaurant (owner/manager/staff via restaurant_members or restaurants.owner_id).
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, owner_id')
    .eq('id', order.restaurant_id)
    .maybeSingle()
  let authorized = restaurant?.owner_id === userId
  if (!authorized) {
    const { data: membership } = await supabase
      .from('restaurant_members')
      .select('user_id, role')
      .eq('restaurant_id', order.restaurant_id)
      .eq('user_id', userId)
      .maybeSingle()
    if (membership) authorized = ['owner', 'manager', 'staff'].includes(String(membership.role ?? ''))
  }
  if (!authorized) return json({ error: 'Forbidden.' }, 403)

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
  })

  // ── Party order branch ──────────────────────────────────────────────────
  if (order.party_session_id) {
    const { data: payments, error: payErr } = await supabase
      .from('party_payments')
      .select('id, amount_cents, status, stripe_payment_intent')
      .eq('session_id', order.party_session_id)
    if (payErr) return json({ error: 'Failed to load party payments.' }, 500)

    const refundable = (payments ?? []).filter((p) =>
      (p.status === 'paid' || p.status === 'covered') && p.stripe_payment_intent,
    )
    if (refundable.length === 0) return json({ error: 'Nothing to refund.' }, 400)

    let refundedTotal = 0
    const failures: Array<{ payment_id: string; error: string }> = []

    // Partial refunds across a party are ambiguous — if a specific amount was
    // provided we only refund up to that amount, distributed row-by-row.
    let remaining = requestedAmountCents ?? Number.POSITIVE_INFINITY

    for (const p of refundable) {
      if (remaining <= 0) break
      const refundAmt = Math.min(remaining, Number(p.amount_cents ?? 0))
      if (refundAmt <= 0) continue
      try {
        const params: Stripe.RefundCreateParams = {
          payment_intent: p.stripe_payment_intent as string,
        }
        if (requestedAmountCents != null) params.amount = refundAmt
        await stripe.refunds.create(params)
        const { error: markErr } = await supabase.rpc('party_mark_refunded', { p_payment_id: p.id })
        if (markErr) console.error('party_mark_refunded failed for', p.id, markErr.message)
        refundedTotal += refundAmt
        remaining -= refundAmt
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        console.error('Stripe refund failed for', p.id, msg)
        failures.push({ payment_id: p.id, error: msg })
      }
    }

    return json({ ok: true, refunded_cents: refundedTotal, failures: failures.length ? failures : undefined })
  }

  // ── Solo order branch ───────────────────────────────────────────────────
  if (!order.stripe_payment_intent_id) {
    return json({ error: 'Order has no Stripe payment on file.' }, 400)
  }

  const totalCents = Math.round((Number(order.subtotal ?? 0) + Number(order.tip_amount ?? 0)) * 100)
  const alreadyRefunded = Number(order.refunded_amount_cents ?? 0)
  const remainingCents = Math.max(0, totalCents - alreadyRefunded)
  if (remainingCents <= 0) return json({ error: 'Already fully refunded.' }, 400)

  const amountToRefund = requestedAmountCents == null
    ? remainingCents
    : Math.min(requestedAmountCents, remainingCents)
  if (amountToRefund <= 0) return json({ error: 'Invalid refund amount.' }, 400)

  try {
    const refund = await stripe.refunds.create({
      payment_intent: order.stripe_payment_intent_id,
      amount: amountToRefund,
    })
    const chargeId = typeof refund.charge === 'string' ? refund.charge : refund.charge?.id ?? null
    const { error: markErr } = await supabase.rpc('mark_order_refunded', {
      p_order_id: order.id,
      p_amount_cents: amountToRefund,
      p_charge_id: chargeId,
    })
    if (markErr) {
      console.error('mark_order_refunded failed:', markErr.message)
      return json({ error: 'Refund issued but not recorded.' }, 500)
    }
    return json({ ok: true, refunded_cents: amountToRefund })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('Stripe refund failed for order', order.id, msg)
    return json({ error: `Stripe refund failed: ${msg}` }, 502)
  }
})
