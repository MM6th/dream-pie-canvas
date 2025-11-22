
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
      const piePlatformShare = netRevenue * 0.10 // 10% to PIE
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
            referrerCommission = remainingAfterPie * 0.10 // 10% to referrer
            const remainingAfterReferrer = remainingAfterPie - referrerCommission
            merchantRevenue = remainingAfterReferrer // 80% to merchant (90% - 10% referrer)
            console.log('Valid referrer found. Merchant: 80%, Referrer: 10%, PIE: 10%')
          }
        }
      }

      if (!validReferrerId) {
        merchantRevenue = remainingAfterPie // 90% to merchant (100% - 10% PIE)
        console.log('No valid referrer. Merchant: 90%, PIE: 10%')
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

      // Get audio product to find merchant_id
      const { data: audioProduct } = await supabaseAdmin
        .from('audio_products')
        .select('merchant_id, album_id')
        .eq('id', purchaseUnit.reference_id)
        .single()

      // Check if this is an album purchase - if so, add all album tracks to user's library
      if (audioProduct?.album_id) {
        console.log('Album purchase detected. Adding all tracks to library...')
        
        // Get all tracks in the album via album_tracks join
        const { data: albumTracks } = await supabaseAdmin
          .from('album_tracks')
          .select('audio_product_id')
          .eq('album_id', audioProduct.album_id);

        if (albumTracks && albumTracks.length > 0) {
          // Get track IDs that aren't already added
          const additionalTrackIds = albumTracks
            .map(t => t.audio_product_id)
            .filter(id => id !== purchaseUnit.reference_id);

          if (additionalTrackIds.length > 0) {
            // Add all other tracks to user's library
            const additionalPurchases = additionalTrackIds.map(trackId => ({
              user_id: user.id,
              audio_product_id: trackId,
              paypal_transaction_id: capture.id,
              amount_paid: 0, // Only the first track counts towards payment
              is_free_download: false,
              referrer_user_id: validReferrerId,
              referrer_commission: null,
              merchant_revenue_after_referral: null
            }));

            const { error: bulkInsertError } = await supabaseAdmin
              .from('user_purchases')
              .insert(additionalPurchases);

            if (bulkInsertError) {
              console.error('Error adding album tracks:', bulkInsertError);
            } else {
              console.log(`Added ${additionalTrackIds.length} additional album tracks to library`);
            }
          }
        }
      }

      if (audioProduct) {
        // Record platform operational cost
        await supabaseAdmin
          .from('platform_revenue')
          .insert({
            amount: piePlatformShare,
            revenue_type: 'platform_operational_cost',
            source_transaction_id: capture.id,
            source_user_id: user.id,
            metadata: { 
              product_type: 'audio',
              audio_product_id: purchaseUnit.reference_id 
            }
          })

        // 2. Check if this is a track with featuring artist and distribute revenue
        const { data: albumTrack } = await supabaseAdmin
          .from('album_tracks')
          .select('*, albums!inner(*)')
          .eq('audio_product_id', purchaseUnit.reference_id)
          .maybeSingle();

        if (albumTrack && albumTrack.featuring_artist_user_id) {
          // This is a single track purchase with featuring artist
          await supabaseAdmin.rpc('distribute_featuring_artist_revenue', {
            p_purchase_id: insertedPurchase[0].id,
            p_audio_product_id: purchaseUnit.reference_id,
            p_total_net_revenue: merchantRevenue,
            p_album_id: null
          });
        } else if (audioProduct.album_id) {
          // Check if album has any featuring artists
          const { data: albumTracks } = await supabaseAdmin
            .from('album_tracks')
            .select('*')
            .eq('album_id', audioProduct.album_id);

          const hasFeaturing = albumTracks?.some(t => t.featuring_artist_user_id !== null);

          if (hasFeaturing) {
            // Album purchase with featuring artists
            await supabaseAdmin.rpc('distribute_featuring_artist_revenue', {
              p_purchase_id: insertedPurchase[0].id,
              p_audio_product_id: purchaseUnit.reference_id,
              p_total_net_revenue: merchantRevenue,
              p_album_id: audioProduct.album_id
            });
          } else {
            // Regular album - company revenue
            await supabaseAdmin.rpc('update_quarterly_income', {
              p_user_id: audioProduct.merchant_id,
              p_income_type: 'company_revenue',
              p_amount: merchantRevenue,
              p_is_test_data: false
            });
          }
        } else {
          // Single track, no featuring artist - company revenue
          await supabaseAdmin.rpc('update_quarterly_income', {
            p_user_id: audioProduct.merchant_id,
            p_income_type: 'company_revenue',
            p_amount: merchantRevenue,
            p_is_test_data: false
          });
        }

        // 3. Track referrer commission if applicable
        if (validReferrerId && referrerCommission && referrerCommission > 0) {
          await supabaseAdmin.rpc('update_quarterly_income', {
            p_user_id: validReferrerId,
            p_income_type: 'referral_commission',
            p_amount: referrerCommission
          })
        }
      }

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
