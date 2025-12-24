import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Pre-defined PayPal subscription plan IDs - these must be created in PayPal dashboard
// Tier pricing: Moon = $4.99/mo, Venus = $9.99/mo, Jupiter = $14.99/mo
const SUBSCRIPTION_TIERS = {
  moon: { name: 'Moon', price: 4.99 },
  venus: { name: 'Venus', price: 9.99 },
  jupiter: { name: 'Jupiter', price: 14.99 },
} as const;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid user token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { podcastRecordingId, tier, returnUrl, cancelUrl } = await req.json();
    
    console.log('Creating subscription:', { podcastRecordingId, tier, userId: user.id });

    // Validate tier
    if (!tier || !SUBSCRIPTION_TIERS[tier as keyof typeof SUBSCRIPTION_TIERS]) {
      return new Response(
        JSON.stringify({ error: 'Invalid subscription tier' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tierConfig = SUBSCRIPTION_TIERS[tier as keyof typeof SUBSCRIPTION_TIERS];

    // Get podcast recording details
    const { data: recording, error: recordingError } = await supabase
      .from('podcast_recordings')
      .select('*, profiles:merchant_id(id, display_name, business_name)')
      .eq('id', podcastRecordingId)
      .single();

    if (recordingError || !recording) {
      console.error('Recording not found:', recordingError);
      return new Response(
        JSON.stringify({ error: 'Podcast recording not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already has active subscription
    const { data: existingSub } = await supabase
      .from('podcast_subscriptions')
      .select('id, status')
      .eq('subscriber_id', user.id)
      .eq('podcast_recording_id', podcastRecordingId)
      .eq('status', 'active')
      .single();

    if (existingSub) {
      return new Response(
        JSON.stringify({ error: 'You already have an active subscription to this podcast' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get PayPal access token
    const paypalClientId = Deno.env.get('PAYPAL_CLIENT_ID');
    const paypalClientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET');

    if (!paypalClientId || !paypalClientSecret) {
      console.error('PayPal credentials not configured');
      return new Response(
        JSON.stringify({ error: 'Payment system not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get PayPal access token
    const tokenResponse = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${paypalClientId}:${paypalClientSecret}`)}`
      },
      body: 'grant_type=client_credentials'
    });

    if (!tokenResponse.ok) {
      console.error('PayPal token error:', await tokenResponse.text());
      return new Response(
        JSON.stringify({ error: 'Failed to authenticate with PayPal' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokenData = await tokenResponse.json();
    console.log('Got PayPal access token');

    // Create a product for this podcast if it doesn't exist
    const productId = `PODCAST_${podcastRecordingId.replace(/-/g, '_').toUpperCase()}`;
    
    // Try to get existing product or create new one
    let paypalProductId = productId;
    
    const getProductResponse = await fetch(`https://api-m.paypal.com/v1/catalogs/products/${productId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      }
    });

    if (!getProductResponse.ok) {
      // Product doesn't exist, create it
      console.log('Creating new PayPal product...');
      const createProductResponse = await fetch('https://api-m.paypal.com/v1/catalogs/products', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
          'PayPal-Request-Id': `product-${podcastRecordingId}-${Date.now()}`
        },
        body: JSON.stringify({
          id: productId,
          name: `Podcast: ${recording.title}`,
          description: `Monthly subscription to ${recording.title}`,
          type: 'SERVICE',
          category: 'MEDIA_AND_ENTERTAINMENT',
        })
      });

      if (!createProductResponse.ok) {
        const errorText = await createProductResponse.text();
        console.error('Failed to create product:', errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to create subscription product' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const productData = await createProductResponse.json();
      paypalProductId = productData.id;
      console.log('Created product:', paypalProductId);
    } else {
      console.log('Product already exists:', productId);
    }

    // Create a billing plan for this tier
    const planId = `PLAN_${tier.toUpperCase()}_${podcastRecordingId.replace(/-/g, '_').toUpperCase()}`;
    
    // Check if plan exists
    const getPlanResponse = await fetch(`https://api-m.paypal.com/v1/billing/plans/${planId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      }
    });

    let paypalPlanId = planId;
    
    if (!getPlanResponse.ok) {
      // Plan doesn't exist, create it
      console.log('Creating new billing plan...');
      const createPlanResponse = await fetch('https://api-m.paypal.com/v1/billing/plans', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
          'PayPal-Request-Id': `plan-${tier}-${podcastRecordingId}-${Date.now()}`
        },
        body: JSON.stringify({
          product_id: paypalProductId,
          name: `${tierConfig.name} Tier - ${recording.title}`,
          description: `${tierConfig.name} monthly subscription ($${tierConfig.price}/month)`,
          status: 'ACTIVE',
          billing_cycles: [
            {
              frequency: {
                interval_unit: 'MONTH',
                interval_count: 1
              },
              tenure_type: 'REGULAR',
              sequence: 1,
              total_cycles: 0, // 0 = infinite
              pricing_scheme: {
                fixed_price: {
                  value: tierConfig.price.toFixed(2),
                  currency_code: 'USD'
                }
              }
            }
          ],
          payment_preferences: {
            auto_bill_outstanding: true,
            setup_fee: {
              value: '0',
              currency_code: 'USD'
            },
            setup_fee_failure_action: 'CONTINUE',
            payment_failure_threshold: 3
          }
        })
      });

      if (!createPlanResponse.ok) {
        const errorText = await createPlanResponse.text();
        console.error('Failed to create plan:', errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to create billing plan' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const planData = await createPlanResponse.json();
      paypalPlanId = planData.id;
      console.log('Created plan:', paypalPlanId);

      // Store plan ID in recording
      await supabase
        .from('podcast_recordings')
        .update({ paypal_plan_id: paypalPlanId })
        .eq('id', podcastRecordingId);
    } else {
      const existingPlan = await getPlanResponse.json();
      paypalPlanId = existingPlan.id;
      console.log('Plan already exists:', paypalPlanId);
    }

    // Create subscription
    console.log('Creating subscription with plan:', paypalPlanId);
    const subscriptionResponse = await fetch('https://api-m.paypal.com/v1/billing/subscriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': `sub-${user.id}-${podcastRecordingId}-${Date.now()}`
      },
      body: JSON.stringify({
        plan_id: paypalPlanId,
        start_time: new Date(Date.now() + 60000).toISOString(), // Start in 1 minute
        subscriber: {
          email_address: user.email
        },
        application_context: {
          brand_name: 'PIE Podcasts',
          locale: 'en-US',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'SUBSCRIBE_NOW',
          payment_method: {
            payer_selected: 'PAYPAL',
            payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED'
          },
          return_url: returnUrl || `${req.headers.get('origin')}/payment-success?type=subscription&podcastId=${podcastRecordingId}&tier=${tier}`,
          cancel_url: cancelUrl || `${req.headers.get('origin')}/payment-cancelled`
        },
        custom_id: JSON.stringify({
          userId: user.id,
          podcastRecordingId,
          merchantId: recording.merchant_id,
          tier,
          amount: tierConfig.price
        })
      })
    });

    if (!subscriptionResponse.ok) {
      const errorText = await subscriptionResponse.text();
      console.error('Failed to create subscription:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to create subscription' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const subscriptionData = await subscriptionResponse.json();
    console.log('Created subscription:', subscriptionData.id);

    // Find approval URL
    const approvalLink = subscriptionData.links.find((link: any) => link.rel === 'approve');
    
    if (!approvalLink) {
      return new Response(
        JSON.stringify({ error: 'No approval URL returned from PayPal' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        subscriptionId: subscriptionData.id,
        approvalUrl: approvalLink.href,
        tier: tierConfig.name,
        price: tierConfig.price
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating subscription:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
