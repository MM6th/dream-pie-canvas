
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

interface PayPalCaptureResponse {
  id: string
  status: string
  purchase_units: Array<{
    reference_id: string
    custom_id?: string
    payments: {
      captures: Array<{
        id: string
        status: string
        amount: {
          currency_code: string
          value: string
        }
      }>
    }
  }>
}

Deno.serve(async (req) => {
  console.log('PayPal payment capture function called')
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create client for user authentication
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Create admin client for database operations
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

    const { orderId } = await req.json()
    console.log('Capturing PayPal order:', orderId)

    // Get PayPal access token
    const clientId = Deno.env.get('PAYPAL_CLIENT_ID')
    const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET')

    if (!clientId || !clientSecret) {
      console.error('PayPal credentials missing')
      return new Response(
        JSON.stringify({ error: 'PayPal credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get PayPal access token
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

    // Capture the payment
    console.log('Capturing PayPal payment...')
    const captureResponse = await fetch(`https://api-m.paypal.com/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    })

    if (!captureResponse.ok) {
      const captureErrorText = await captureResponse.text()
      console.error('PayPal capture error:', captureResponse.status, captureErrorText)
      return new Response(
        JSON.stringify({ error: 'Failed to capture PayPal payment', details: captureErrorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const captureData: PayPalCaptureResponse = await captureResponse.json()
    console.log('PayPal capture response:', JSON.stringify(captureData, null, 2))

    if (captureData.status === 'COMPLETED') {
      const purchaseUnit = captureData.purchase_units[0]
      const capture = purchaseUnit.payments.captures[0]
      
      console.log('Recording purchase in database...')
      console.log('User ID:', user.id)
      console.log('Product ID:', purchaseUnit.reference_id)
      console.log('Transaction ID:', capture.id)
      console.log('Amount:', capture.amount.value)
      
      // Check if this purchase already exists to prevent duplicates
      const { data: existingPurchase } = await supabaseAdmin
        .from('user_purchases')
        .select('id')
        .eq('user_id', user.id)
        .eq('audio_product_id', purchaseUnit.reference_id)
        .eq('paypal_transaction_id', capture.id)
        .single()

      if (existingPurchase) {
        console.log('Purchase already exists, returning success')
        return new Response(
          JSON.stringify({ 
            success: true,
            transactionId: capture.id,
            audioProductId: purchaseUnit.reference_id,
            amountPaid: capture.amount.value,
            message: 'Purchase already recorded'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Calculate revenue distribution
      const referrerId = purchaseUnit.custom_id || null
      const amountPaid = parseFloat(capture.amount.value)
      const paypalFee = amountPaid * 0.029 + 0.30
      const netRevenue = amountPaid - paypalFee
      const piePlatformShare = netRevenue * 0.10
      const remainingAfterPie = netRevenue - piePlatformShare
      
      let referrerCommission = null
      let merchantRevenue = null
      let validReferrerId = null

      // Validate and calculate referrer commission if applicable
      if (referrerId && referrerId !== user.id) {
        console.log('Validating referrer:', referrerId)
        
        const { data: referrerProfile } = await supabaseAdmin
          .from('profiles')
          .select('user_type, playlist_public')
          .eq('id', referrerId)
          .single()

        if (referrerProfile && 
            referrerProfile.user_type === 'supporter' && 
            referrerProfile.playlist_public === true) {
          
          const { data: referrerOwnsProduct } = await supabaseAdmin
            .from('user_purchases')
            .select('id')
            .eq('user_id', referrerId)
            .eq('audio_product_id', purchaseUnit.reference_id)
            .single()

          if (referrerOwnsProduct) {
            validReferrerId = referrerId
            referrerCommission = remainingAfterPie * 0.10
            const remainingAfterReferrer = remainingAfterPie - referrerCommission
            merchantRevenue = remainingAfterReferrer
            console.log('Valid referrer found. Commission:', referrerCommission)
          }
        }
      }

      if (!validReferrerId) {
        merchantRevenue = remainingAfterPie
        console.log('No valid referrer. Full merchant revenue:', merchantRevenue)
      }
      
      // Record the purchase in our database using admin client
      const { data: insertedPurchase, error: insertError } = await supabaseAdmin
        .from('user_purchases')
        .insert({
          user_id: user.id,
          audio_product_id: purchaseUnit.reference_id,
          paypal_transaction_id: capture.id,
          amount_paid: amountPaid,
          is_free_download: false,
          referrer_user_id: validReferrerId,
          referrer_commission: referrerCommission,
          merchant_revenue_after_referral: merchantRevenue
        })
        .select()

      if (insertError) {
        console.error('Database insert error:', insertError)
        return new Response(
          JSON.stringify({ 
            error: 'Failed to record purchase in database', 
            details: insertError.message,
            code: insertError.code 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('Purchase recorded successfully:', insertedPurchase)

      return new Response(
        JSON.stringify({ 
          success: true,
          transactionId: capture.id,
          audioProductId: purchaseUnit.reference_id,
          amountPaid: capture.amount.value
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      console.error('Payment not completed. Status:', captureData.status)
      return new Response(
        JSON.stringify({ error: `Payment not completed. Status: ${captureData.status}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('Unexpected error in PayPal payment capture:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
