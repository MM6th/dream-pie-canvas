
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PayPalAccessTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

interface PayPalOrderResponse {
  id: string
  status: string
  links: Array<{
    href: string
    rel: string
    method: string
  }>
}

Deno.serve(async (req) => {
  console.log('PayPal payment creation function called')
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create client for user authentication
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Create admin client for database queries
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('No authorization header provided')
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      console.error('Authentication failed:', authError)
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User authenticated:', user.id)

    const { audioProductId } = await req.json()
    console.log('Audio product ID:', audioProductId)

    // Get audio product details using admin client to bypass RLS
    const { data: product, error: productError } = await supabaseAdmin
      .from('audio_products')
      .select('*')
      .eq('id', audioProductId)
      .single()

    if (productError || !product) {
      console.error('Product not found:', productError)
      return new Response(
        JSON.stringify({ error: 'Product not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Product found:', product.title, 'Price:', product.price)

    if (product.is_free) {
      console.log('Product is free, no payment needed')
      return new Response(
        JSON.stringify({ error: 'This product is free' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get PayPal credentials from environment - using the correct secret names
    const clientId = Deno.env.get('PAYPAL_CLIENT_ID')
    const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET')

    console.log('PayPal Client ID exists:', !!clientId)
    console.log('PayPal Secret exists:', !!clientSecret)

    if (!clientId || !clientSecret) {
      console.error('PayPal credentials missing - Client ID:', !!clientId, 'Secret:', !!clientSecret)
      return new Response(
        JSON.stringify({ error: 'PayPal credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get PayPal access token - UPDATED TO LIVE URL
    console.log('Requesting PayPal access token...')
    const tokenResponse = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`
      },
      body: 'grant_type=client_credentials'
    })

    if (!tokenResponse.ok) {
      const tokenErrorText = await tokenResponse.text()
      console.error('PayPal token error:', tokenResponse.status, tokenErrorText)
      return new Response(
        JSON.stringify({ error: 'Failed to get PayPal access token', details: tokenErrorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const tokenData: PayPalAccessTokenResponse = await tokenResponse.json()
    console.log('PayPal access token obtained successfully')

    // Create PayPal order
    const returnUrl = `${req.headers.get('origin')}/payment-success?product_id=${audioProductId}`
    const cancelUrl = `${req.headers.get('origin')}/payment-cancelled`
    
    console.log('Return URL:', returnUrl)
    console.log('Cancel URL:', cancelUrl)

    const orderData = {
      intent: 'CAPTURE',
      application_context: {
        brand_name: 'PIE Base',
        landing_page: 'NO_PREFERENCE',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW',
        return_url: returnUrl,
        cancel_url: cancelUrl
      },
      purchase_units: [{
        reference_id: audioProductId,
        amount: {
          currency_code: 'USD',
          value: product.price.toString()
        },
        description: `${product.title} by ${product.artist_name || 'Unknown Artist'}`
      }]
    }

    console.log('Creating PayPal order with data:', JSON.stringify(orderData, null, 2))

    // Create PayPal order - UPDATED TO LIVE URL
    const orderResponse = await fetch('https://api-m.paypal.com/v2/checkout/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenData.access_token}`,
        'PayPal-Request-Id': `${audioProductId}-${Date.now()}`
      },
      body: JSON.stringify(orderData)
    })

    if (!orderResponse.ok) {
      const orderErrorText = await orderResponse.text()
      console.error('PayPal order creation error:', orderResponse.status, orderErrorText)
      return new Response(
        JSON.stringify({ error: 'Failed to create PayPal order', details: orderErrorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const order: PayPalOrderResponse = await orderResponse.json()
    console.log('PayPal order created successfully:', order.id)
    
    const approvalUrl = order.links.find(link => link.rel === 'approve')?.href

    if (!approvalUrl) {
      console.error('No approval URL found in PayPal response')
      return new Response(
        JSON.stringify({ error: 'No approval URL found' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Payment URL generated successfully:', approvalUrl)
    
    return new Response(
      JSON.stringify({ 
        orderId: order.id,
        approvalUrl: approvalUrl
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error in PayPal payment creation:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
