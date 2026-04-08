import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "npm:stripe@^13.10.0"
import { createClient } from "npm:@supabase/supabase-js@^2.39.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { restaurant_id } = await req.json()

    if (!restaurant_id) {
      throw new Error('restaurant_id is required')
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Check if the restaurant already has a Stripe account
    const { data: restaurant, error: fetchErr } = await supabase
      .from('restaurants')
      .select('stripe_account_id, name')
      .eq('id', restaurant_id)
      .single()

    if (fetchErr || !restaurant) {
      throw new Error('Restaurant not found')
    }

    let accountId = restaurant.stripe_account_id

    // 2. Manage Express account
    if (!accountId) {
      // Create new account
      const account = await stripe.accounts.create({
        type: 'express',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: {
          name: restaurant.name || 'Rasvia Partner',
        },
      })
      accountId = account.id

      // Save to Supabase
      const { error: updateErr } = await supabase
        .from('restaurants')
        .update({ stripe_account_id: accountId })
        .eq('id', restaurant_id)

    }

    const origin = req.headers.get('origin') || 'https://rasvia.com' // Fallback for testing
    // In local dev this might be localhost:5173, so let's rely on the Request headers or environment

    // 3. Create an Account Link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/partner-portal`, // Where to send them if link expires
      return_url: `${origin}/partner-portal`,  // Where to send them when done
      type: 'account_onboarding',
    })

    return new Response(
      JSON.stringify({ url: accountLink.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error: any) {
    console.error(error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
