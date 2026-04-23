import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@13.11.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/**
 * calculate-tax — server-side tax computation for POS / cash / manual orders.
 *
 * Body:
 *   restaurant_id: number
 *   items: Array<{ menu_item_id: number; quantity: number }>
 *
 * Returns:
 *   { tax_amount_cents, line_items: [...], tax_calculation_id }
 *
 * Uses Stripe Tax Calculations API so the POS never applies a hardcoded rate.
 */
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace('Bearer ', '')

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, serviceKey)

    // Auth: only authenticated dashboard users
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401)

    const body = await req.json()
    const restaurantId = Number(body.restaurant_id)
    const items: Array<{ menu_item_id: number; quantity: number }> = body.items ?? []
    if (!restaurantId || items.length === 0) {
      return json({ error: 'restaurant_id and items[] are required.' }, 400)
    }

    // Fetch restaurant address
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('street_address, city, state, postal_code, country')
      .eq('id', restaurantId)
      .maybeSingle()
    if (!restaurant || !restaurant.state || !restaurant.postal_code) {
      return json({ error: 'Restaurant address incomplete — cannot compute tax.', code: 'missing_address' }, 400)
    }

    // Fetch menu items with tax codes
    const menuItemIds = items.map((i) => i.menu_item_id)
    const { data: menuRows } = await supabase
      .from('menu_items')
      .select('id, name, price, stripe_tax_code')
      .eq('restaurant_id', restaurantId)
      .in('id', menuItemIds)

    const menuById = new Map((menuRows ?? []).map((r: Record<string, unknown>) => [
      Number(r.id),
      { name: String(r.name), price: Number(r.price ?? 0), taxCode: String(r.stripe_tax_code ?? 'txcd_40060003') },
    ]))

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    // Build line items for Stripe Tax Calculation
    const lineItems = items.map((item) => {
      const mi = menuById.get(item.menu_item_id)
      if (!mi) throw new Error(`Menu item ${item.menu_item_id} not found`)
      return {
        amount: Math.round(mi.price * 100) * item.quantity,
        tax_code: mi.taxCode,
        reference: String(item.menu_item_id),
        quantity: item.quantity,
        tax_behavior: 'exclusive' as const,
      }
    })

    const calculation = await stripe.tax.calculations.create({
      currency: 'usd',
      line_items: lineItems,
      customer_details: {
        address: {
          line1: restaurant.street_address ?? '',
          city: restaurant.city ?? '',
          state: restaurant.state,
          postal_code: restaurant.postal_code,
          country: restaurant.country ?? 'US',
        },
        address_source: 'shipping',
      },
    })

    return json({
      tax_amount_cents: calculation.tax_amount_exclusive,
      tax_calculation_id: calculation.id,
      line_items: (calculation.line_items?.data ?? []).map((li: any) => ({
        reference: li.reference,
        amount: li.amount,
        tax: li.amount_tax,
      })),
    })
  } catch (err: unknown) {
    console.error('calculate-tax error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return json({ error: message }, 500)
  }
})
