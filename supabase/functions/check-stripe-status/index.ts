import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@13.10.0?target=deno"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { stripe_account_id } = await req.json()

    if (!stripe_account_id) {
      throw new Error('stripe_account_id is required')
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    const account = await stripe.accounts.retrieve(stripe_account_id)

    return new Response(
      JSON.stringify({ 
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error: any) {
    console.error(error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
