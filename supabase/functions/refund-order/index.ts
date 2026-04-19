// supabase/functions/refund-order/index.ts
//
// Dashboard-initiated refund for a single order.
//
// Request body:
//   {
//     order_id: number,
//     amount_cents?: number,            // optional — defaults to remaining refundable
//     reason?: string,                  // optional — surfaced on Stripe + audit log
//     items?: { order_item_id: number, quantity: number }[]  // optional itemized refund
//   }
//
// If `items` is provided the server computes the refund amount from the
// order_items.price × quantity (capped at the remaining refundable balance).
// An explicit `amount_cents` always wins over the itemized computation so the
// manager can override.
//
// Flow:
//   1. Authenticate the caller (user JWT) and confirm they belong to the
//      restaurant that owns the order (owner or restaurant_staff).
//   2. Branch on order shape:
//        - Party orders  (orders.party_session_id set): refund each party
//          payment via Stripe, then party_mark_refunded(payment, order, …).
//        - Solo  orders  (stripe_payment_intent_id set): stripe.refunds.create
//          → mark_order_refunded(order, …).
//   3. Always return JSON so the client can surface the real error.
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

type RefundItemInput = { order_item_id: number; quantity: number }

function parseItems(raw: unknown): RefundItemInput[] {
  if (!Array.isArray(raw)) return []
  const out: RefundItemInput[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const rec = row as Record<string, unknown>
    const id = toPositiveInt(rec.order_item_id)
    const qty = toPositiveInt(rec.quantity)
    if (id == null || qty == null) continue
    out.push({ order_item_id: id, quantity: qty })
  }
  return out
}

// Truncate a reason to a sane length for Stripe metadata (values are
// capped at 500 chars per field).
function trimReason(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const t = raw.trim()
  if (!t) return null
  return t.slice(0, 500)
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
  const missingEnv: string[] = []
  if (!supabaseUrl)        missingEnv.push('SUPABASE_URL')
  if (!supabaseServiceKey) missingEnv.push('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseAnonKey)    missingEnv.push('SUPABASE_ANON_KEY')
  if (!stripeSecretKey)    missingEnv.push('STRIPE_SECRET_KEY')
  if (missingEnv.length > 0) {
    console.error('refund-order missing env vars:', missingEnv.join(', '))
    return json({
      error:
        `Refund service is misconfigured. Missing Edge Function secrets: ${missingEnv.join(', ')}. ` +
        `Set them in Supabase Dashboard → Project Settings → Edge Functions → Secrets.`,
    }, 500)
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader) {
    return json({ error: 'Refund failed: no Authorization header reached the edge function. Sign out and back in, then retry.' }, 401)
  }
  if (!authHeader.startsWith('Bearer ')) {
    return json({ error: 'Refund failed: Authorization header is not a Bearer token. Sign out and back in, then retry.' }, 401)
  }

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON body' }, 400) }

  const orderId = toPositiveInt(body.order_id)
  if (!orderId) return json({ error: 'order_id is required.' }, 400)
  const reason = trimReason(body.reason)
  const items = parseItems(body.items)

  const explicitAmount = body.amount_cents == null ? null : toPositiveInt(body.amount_cents)
  if (body.amount_cents != null && explicitAmount == null) {
    return json({ error: 'Invalid amount_cents (must be a positive integer).' }, 400)
  }

  // Detect the common "client passed the anon key as the JWT" case before we
  // even talk to auth. `supabase.functions.invoke` from a signed-out browser
  // falls back to sending Authorization: Bearer <ANON_KEY>.
  const presentedToken = authHeader.slice('Bearer '.length).trim()
  if (!presentedToken) {
    return json({
      error: 'Refund failed: empty bearer token. Sign out and back in, then retry.',
    }, 401)
  }
  if (presentedToken === supabaseAnonKey) {
    return json({
      error:
        'Refund failed: you appear to be signed out (the request sent the anon key instead of a user token). ' +
        'Refresh the dashboard, make sure you are signed in, then retry.',
    }, 401)
  }

  // Validate the JWT directly — do NOT rely on getUser() reading the client's
  // stored session. Inside an edge function there is no session store, so the
  // token has to be passed explicitly.
  const authClient = createClient(supabaseUrl, supabaseAnonKey)
  const { data: userData, error: userErr } = await authClient.auth.getUser(presentedToken)
  if (userErr) {
    console.error('refund-order auth.getUser failed:', userErr.message)
    const msg = userErr.message.toLowerCase()
    const hint =
      msg.includes('expired')
        ? 'Your dashboard session has expired. Sign out and back in, then retry.'
        : msg.includes('invalid') || msg.includes('jwt')
          ? 'The dashboard session token was rejected. This usually means the SUPABASE_ANON_KEY on the function does not match the project that issued the token. Re-check it under Project Settings → Edge Functions → Secrets, or sign out and back in.'
          : `Auth check failed: ${userErr.message}`
    return json({ error: `Refund failed: ${hint}` }, 401)
  }
  if (!userData?.user) {
    return json({
      error:
        'Refund failed: no signed-in user was found for the provided token. ' +
        'Sign out of the dashboard and sign back in, then retry.',
    }, 401)
  }
  const userId = userData.user.id

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Fetch the order.
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('id, restaurant_id, party_session_id, subtotal, tip_amount, refunded_amount_cents, stripe_payment_intent_id, stripe_charge_id, status')
    .eq('id', orderId)
    .maybeSingle()
  if (orderErr) {
    console.error('refund-order order lookup failed:', orderErr.message)
    return json({ error: `Order lookup failed: ${orderErr.message}` }, 500)
  }
  if (!order) return json({ error: `Order #${orderId} not found.` }, 404)

  // RBAC — owner or restaurant_staff.
  const { data: restaurant, error: restErr } = await supabase
    .from('restaurants')
    .select('id, owner_id, name')
    .eq('id', order.restaurant_id)
    .maybeSingle()
  if (restErr) console.error('refund-order restaurant lookup failed:', restErr.message)

  let authorized = restaurant?.owner_id === userId
  let authorizedVia = authorized ? 'owner' : ''

  const { data: membership, error: memErr } = await supabase
    .from('restaurant_staff')
    .select('user_id, role, role_id')
    .eq('restaurant_id', order.restaurant_id)
    .eq('user_id', userId)
    .maybeSingle()
  if (memErr) console.error('refund-order membership lookup failed:', memErr.message)

  if (!authorized && membership) {
    const roleStr = String(membership.role ?? '').toLowerCase()
    if (['owner', 'manager', 'staff', 'admin'].includes(roleStr)) {
      authorized = true
      authorizedVia = `restaurant_staff.role=${roleStr}`
    }
  }
  if (!authorized && membership?.role_id) {
    const { data: roleRow } = await supabase
      .from('restaurant_roles')
      .select('name, is_owner')
      .eq('id', membership.role_id)
      .maybeSingle()
    const roleName = String(roleRow?.name ?? '').toLowerCase()
    if (roleRow && (roleRow.is_owner || ['owner', 'manager', 'staff', 'admin'].includes(roleName))) {
      authorized = true
      authorizedVia = `restaurant_roles.${roleRow.is_owner ? 'is_owner' : `name=${roleName}`}`
    }
  }

  if (!authorized) {
    // Build a descriptive hint so the user can tell whether they're looking at
    // the wrong account, the wrong restaurant, or a missing staff row.
    const hints: string[] = []
    hints.push(`your user id: ${userId}`)
    hints.push(`order.restaurant_id: ${order.restaurant_id}`)
    if (!restaurant) {
      hints.push('the restaurant for this order was not found')
    } else {
      hints.push(`restaurant owner_id: ${restaurant.owner_id ?? 'null'}`)
    }
    if (!membership) {
      hints.push('no restaurant_staff row exists for your user on this restaurant')
    } else {
      hints.push(`restaurant_staff.role: ${membership.role ?? 'null'}${membership.role_id ? `, role_id: ${membership.role_id}` : ''}`)
    }
    console.warn('refund-order denied:', hints.join(' | '))
    return json({
      error:
        'Refund failed: you do not have permission to refund this order. ' +
        'You must be the restaurant owner or a staff member with role owner/manager/staff/admin. ' +
        `Details — ${hints.join('; ')}.`,
    }, 403)
  }
  console.log(`refund-order authorized via ${authorizedVia} (user=${userId}, restaurant=${order.restaurant_id})`)

  // Compute amount and items snapshot.
  const totalCents = Math.round((Number(order.subtotal ?? 0) + Number(order.tip_amount ?? 0)) * 100)
  const alreadyRefunded = Number(order.refunded_amount_cents ?? 0)
  const remainingCents = Math.max(0, totalCents - alreadyRefunded)
  if (remainingCents <= 0 && !order.party_session_id) {
    return json({ error: 'This order is already fully refunded.' }, 400)
  }

  // Load item rows so we can compute itemized refund totals + store a snapshot
  // on order_refunds for the dashboard audit trail.
  let itemsSnapshot: Array<{ order_item_id: number; name: string; quantity: number; unit_price_cents: number }> = []
  let itemsTotalCents = 0
  if (items.length > 0) {
    const { data: itemRows, error: itemErr } = await supabase
      .from('order_items')
      .select('id, name, price, quantity')
      .eq('order_id', order.id)
      .in('id', items.map((i) => i.order_item_id))
    if (itemErr) {
      console.error('refund-order item lookup failed:', itemErr.message)
      return json({ error: `Could not load order items: ${itemErr.message}` }, 500)
    }
    const byId = new Map<number, { name: string; price: number; quantity: number }>()
    for (const r of itemRows ?? []) {
      byId.set(Number(r.id), { name: String(r.name ?? ''), price: Number(r.price ?? 0), quantity: Number(r.quantity ?? 0) })
    }
    for (const it of items) {
      const row = byId.get(it.order_item_id)
      if (!row) continue
      const qty = Math.min(it.quantity, row.quantity)
      if (qty <= 0) continue
      const unitCents = Math.round(row.price * 100)
      itemsSnapshot.push({
        order_item_id: it.order_item_id,
        name: row.name,
        quantity: qty,
        unit_price_cents: unitCents,
      })
      itemsTotalCents += unitCents * qty
    }
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
  })

  const stripeMetadata: Record<string, string> = {
    order_id: String(order.id),
    refunded_by: userId,
  }
  if (reason) stripeMetadata.reason = reason

  // ── Party order branch ──────────────────────────────────────────────────
  if (order.party_session_id) {
    const { data: payments, error: payErr } = await supabase
      .from('party_payments')
      .select('id, amount_cents, status, stripe_payment_intent')
      .eq('session_id', order.party_session_id)
    if (payErr) {
      console.error('refund-order party_payments lookup failed:', payErr.message)
      return json({ error: `Could not load party payments: ${payErr.message}` }, 500)
    }

    const refundable = (payments ?? []).filter((p) =>
      (p.status === 'paid' || p.status === 'covered') && p.stripe_payment_intent,
    )
    if (refundable.length === 0) {
      // Summarise what we *did* see so the user can tell whether the order is
      // already refunded, truly cash-only, or the webhook never fired.
      const statusCounts: Record<string, number> = {}
      let paidMissingIntent = 0
      let coveredMissingIntent = 0
      for (const p of payments ?? []) {
        const s = String(p.status ?? 'null')
        statusCounts[s] = (statusCounts[s] ?? 0) + 1
        if (!p.stripe_payment_intent) {
          if (p.status === 'paid') paidMissingIntent += 1
          else if (p.status === 'covered') coveredMissingIntent += 1
        }
      }
      const total = (payments ?? []).length
      const refundedCount = statusCounts['refunded'] ?? 0
      const coveredCount  = statusCounts['covered']  ?? 0
      const paidCount     = statusCounts['paid']     ?? 0

      // Case A: everything that could possibly be refunded already has been.
      // (refunded rows + covered rows == total, and there are no paid rows with
      // real payment intents.)
      if (total > 0 && paidCount === 0 && refundedCount > 0) {
        return json({
          error:
            'Refund failed: this group order has already been refunded in Stripe. ' +
            `Party payment breakdown — refunded: ${refundedCount}, covered: ${coveredCount}. ` +
            "If the dashboard still shows a refund button, the order's refunded total just needs to be synced — " +
            "re-run the refund on the underlying charge or have an engineer update orders.refunded_amount_cents to match.",
        }, 400)
      }

      // Case B: only covered rows exist and none have a payment intent. That
      // means the covering payer never actually charged (host-covers-everyone
      // session was forced through without payment).
      if (total > 0 && paidCount === 0 && refundedCount === 0 && coveredCount > 0 && coveredMissingIntent === coveredCount) {
        return json({
          error:
            'Refund failed: this group order has no Stripe charge on file. Every diner was marked as "covered" ' +
            'but no covering payer ever checked out through Stripe. Refund manually / in cash and mark the order cancelled.',
        }, 400)
      }

      const summary =
        total === 0
          ? 'no party_payments rows exist for this session'
          : `party payment breakdown — ${Object.entries(statusCounts).map(([k, v]) => `${k}: ${v}`).join(', ')}` +
            (paidMissingIntent > 0 ? `; ${paidMissingIntent} paid row(s) missing stripe_payment_intent (webhook may not have fired)` : '')
      return json({
        error:
          'Refund failed: this group order has no Stripe charges we can refund. ' +
          `Details — ${summary}. ` +
          'If a diner paid with cash, refund manually and mark the order cancelled. ' +
          'If they paid with card, the checkout webhook may not have written the payment intent back — check stripe-webhook logs and confirm party_settle_payment ran.',
      }, 400)
    }

    // Target amount: prefer explicit amount_cents, then itemized total, else full.
    const isPartial = explicitAmount != null || itemsTotalCents > 0
    let remaining =
      explicitAmount != null
        ? explicitAmount
        : itemsTotalCents > 0
          ? itemsTotalCents
          : Number.POSITIVE_INFINITY

    let refundedTotal = 0
    const failures: Array<{ payment_id: string; error: string }> = []

    for (const p of refundable) {
      if (remaining <= 0) break
      const payAmt = Number(p.amount_cents ?? 0)
      const refundAmt = Math.min(remaining, payAmt)
      if (refundAmt <= 0) continue
      try {
        const params: Stripe.RefundCreateParams = {
          payment_intent: p.stripe_payment_intent as string,
          metadata: stripeMetadata,
        }
        // Only include `amount` on partial refunds; omitting it issues a full
        // refund of the underlying charge (which avoids Stripe warnings for
        // amount == captured).
        if (isPartial && refundAmt < payAmt) params.amount = refundAmt
        const refund = await stripe.refunds.create(params)
        const { error: markErr } = await supabase.rpc('party_mark_refunded', { p_payment_id: p.id })
        if (markErr) console.error('party_mark_refunded failed for', p.id, markErr.message)
        // Also record a delta into orders.refunded_amount_cents so the
        // dashboard's per-order totals line up with reality.
        const { error: markOrderErr } = await supabase.rpc('mark_order_refunded', {
          p_order_id: order.id,
          p_amount_cents: refundAmt,
          p_charge_id: typeof refund.charge === 'string' ? refund.charge : refund.charge?.id ?? null,
          p_refund_id: refund.id,
          p_reason: reason,
          p_items: itemsSnapshot.length ? itemsSnapshot : [],
          p_refunded_by: userId,
          p_payment_intent: p.stripe_payment_intent,
          p_party_payment: p.id,
        })
        if (markOrderErr) console.error('mark_order_refunded (party) failed:', markOrderErr.message)
        refundedTotal += refundAmt
        remaining -= refundAmt
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        console.error('Stripe refund failed for party payment', p.id, msg)
        failures.push({ payment_id: String(p.id), error: msg })
      }
    }

    if (refundedTotal <= 0) {
      return json({
        error: failures[0]?.error
          ? `Stripe refused the refund: ${failures[0].error}`
          : 'No party payment could be refunded.',
        failures,
      }, 502)
    }

    return json({
      ok: true,
      refunded_cents: refundedTotal,
      failures: failures.length ? failures : undefined,
    })
  }

  // ── Solo order branch ───────────────────────────────────────────────────
  if (!order.stripe_payment_intent_id) {
    return json({
      error:
        'This order has no Stripe payment on file — likely paid in cash or predates the current checkout flow. ' +
        'Refund the customer manually and mark the order as cancelled.',
    }, 400)
  }

  // Pick amount: explicit > items > remaining full
  const amountToRefund = (() => {
    if (explicitAmount != null) return Math.min(explicitAmount, remainingCents)
    if (itemsTotalCents > 0)  return Math.min(itemsTotalCents, remainingCents)
    return remainingCents
  })()
  if (amountToRefund <= 0) return json({ error: 'Nothing to refund (amount is zero).' }, 400)
  if (amountToRefund > remainingCents) {
    return json({
      error: `Refund amount $${(amountToRefund / 100).toFixed(2)} exceeds the remaining refundable balance of $${(remainingCents / 100).toFixed(2)}.`,
    }, 400)
  }

  try {
    const refund = await stripe.refunds.create({
      payment_intent: order.stripe_payment_intent_id,
      amount: amountToRefund,
      metadata: stripeMetadata,
    })
    const chargeId = typeof refund.charge === 'string' ? refund.charge : refund.charge?.id ?? null
    const { error: markErr } = await supabase.rpc('mark_order_refunded', {
      p_order_id: order.id,
      p_amount_cents: amountToRefund,
      p_charge_id: chargeId,
      p_refund_id: refund.id,
      p_reason: reason,
      p_items: itemsSnapshot,
      p_refunded_by: userId,
      p_payment_intent: order.stripe_payment_intent_id,
      p_party_payment: null,
    })
    if (markErr) {
      console.error('mark_order_refunded failed:', markErr.message)
      return json({
        error: `Refund issued on Stripe but not recorded in database: ${markErr.message}. Stripe refund id: ${refund.id}.`,
      }, 500)
    }
    return json({
      ok: true,
      refunded_cents: amountToRefund,
      stripe_refund_id: refund.id,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('Stripe refund failed for order', order.id, msg)
    return json({ error: `Stripe refund failed: ${msg}` }, 502)
  }
})
