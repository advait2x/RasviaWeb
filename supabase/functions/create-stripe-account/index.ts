import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "npm:stripe@^13.10.0"
import { createClient } from "npm:@supabase/supabase-js@^2.39.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function safePortalOrigin(originHeader: string | null): string {
  if (!originHeader) return 'https://rasvia.com'

  try {
    const parsed = new URL(originHeader)
    const host = parsed.hostname.toLowerCase()

    if (
      parsed.protocol === 'https:' &&
      (host === 'rasvia.com' || host === 'www.rasvia.com')
    ) {
      return parsed.origin
    }

    if (
      parsed.protocol === 'http:' &&
      (host === 'localhost' || host === '127.0.0.1')
    ) {
      return parsed.origin
    }
  } catch {
    // fall back to production origin
  }

  return 'https://rasvia.com'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    // Authenticate the caller
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (!authHeader.toLowerCase().startsWith('bearer ')) {
      return new Response(JSON.stringify({ error: 'Invalid authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const token = authHeader.slice(7).trim()
    if (!token) {
      return new Response(JSON.stringify({ error: 'Missing bearer token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { restaurant_id } = await req.json()
    const restaurantId = Number(restaurant_id)

    if (!Number.isFinite(restaurantId) || restaurantId <= 0) {
      return new Response(JSON.stringify({ error: 'restaurant_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify the user has access to this restaurant (owner or admin)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const isAdmin = profile?.role?.toLowerCase().trim() === 'admin'

    if (!isAdmin) {
      // Check if user owns this restaurant
      const { data: restaurant, error: ownerCheck } = await supabase
        .from('restaurants')
        .select('owner_id')
        .eq('id', restaurantId)
        .single()

      if (ownerCheck || !restaurant || restaurant.owner_id !== user.id) {
        return new Response(JSON.stringify({ error: 'Not authorized for this restaurant' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    // Check if the restaurant already has a Stripe account
    const { data: restaurantData, error: fetchErr } = await supabase
      .from('restaurants')
      .select('stripe_account_id, name')
      .eq('id', restaurantId)
      .single()

    if (fetchErr || !restaurantData) {
      return new Response(JSON.stringify({ error: 'Restaurant not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let accountId = restaurantData.stripe_account_id

    // Create new account if needed
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: {
          name: restaurantData.name || 'Rasvia Partner',
        },
      })
      accountId = account.id

      await supabase
        .from('restaurants')
        .update({ stripe_account_id: accountId })
        .eq('id', restaurantId)
    }

    const origin = safePortalOrigin(req.headers.get('origin'))

    // Create an Account Link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/partner-portal`,
      return_url: `${origin}/partner-portal`,
      type: 'account_onboarding',
    })

    return new Response(
      JSON.stringify({ url: accountLink.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('create-stripe-account error:', message)
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
