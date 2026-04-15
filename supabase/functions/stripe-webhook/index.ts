import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "npm:stripe@^13.10.0"
import { createClient } from "npm:@supabase/supabase-js@^2.39.0"

serve(async (req) => {
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
  })

  // Verify Signature — always required to prevent forged webhook events
  const signature = req.headers.get('stripe-signature')
  const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

  if (!endpointSecret) {
    console.error('⚠️ STRIPE_WEBHOOK_SECRET is not configured. Rejecting webhook.')
    return new Response('Webhook secret not configured', { status: 500 })
  }

  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 })
  }

  let event: Stripe.Event;

  try {
    const body = await req.text()
    const cryptoProvider = Stripe.createSubtleCryptoProvider()
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      endpointSecret,
      undefined,
      cryptoProvider
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error(`⚠️ Webhook signature verification failed.`, message)
    return new Response(`Webhook Error: ${message}`, { status: 400 })
  }

  // Process Event
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session

      if (session.payment_status === 'paid') {
        const stripeSessionId = session.id
        
        // Find the order that is 'pending_payment' with this stripe_session_id
        const { data: order, error: findErr } = await supabase
          .from('orders')
          .select('id, order_type, party_session_id, subtotal, restaurant_id')
          .eq('stripe_session_id', stripeSessionId)
          .single()

        if (findErr || !order) {
           console.error("Order not found or error:", findErr)
           return new Response("Order not found", { status: 404 })
        }

        // Update status from pending_payment to pending (or preparing if takeout)
        const newStatus = order.order_type === 'takeout' ? 'preparing' : 'pending'

        const { error: updateErr } = await supabase
          .from('orders')
          .update({ status: newStatus })
          .eq('id', order.id)

        if (updateErr) {
          throw new Error(`Failed to update order status: ${updateErr.message}`)
        }

        // Update group ordering session if it exists
        if (order.party_session_id) {
            await supabase
              .from('party_sessions')
              .update({ status: 'submitted', submitted_at: new Date().toISOString() })
              .eq('id', order.party_session_id)

            // Extract cart summary from metadata if it was passed
            const meta = session.metadata || {}
            let cartItems: Array<{ name?: string; price?: number; quantity?: number; added_by?: string }> = []
            try { cartItems = JSON.parse(meta.cart_items || '[]') } catch { /* noop */ }
            
            if (cartItems.length > 0) {
              const orderSummary = cartItems.map((i) => ({
                name: i.name || 'Unknown',
                price: Number(i.price) || 0,
                quantity: i.quantity ?? 1,
                added_by: i.added_by || meta.customer_name || 'Unknown',
              }))

              await supabase.from('group_orders').insert({
                party_session_id: order.party_session_id,
                restaurant_id: order.restaurant_id,
                items: orderSummary,
                total: order.subtotal,
                submitted_at: new Date().toISOString(),
              })
            }
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error(`Webhook handler failed:`, message)
    return new Response(`Webhook handler failed: ${message}`, { status: 500 })
  }
})
