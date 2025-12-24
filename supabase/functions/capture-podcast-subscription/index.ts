import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { subscriptionId, podcastRecordingId, tier } = await req.json();
    
    console.log('Capturing subscription:', { subscriptionId, podcastRecordingId, tier });

    if (!subscriptionId) {
      return new Response(
        JSON.stringify({ error: 'Missing subscription ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get PayPal access token
    const paypalClientId = Deno.env.get('PAYPAL_CLIENT_ID');
    const paypalClientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET');

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
      console.error('PayPal token error');
      return new Response(
        JSON.stringify({ error: 'Failed to authenticate with PayPal' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokenData = await tokenResponse.json();

    // Get subscription details from PayPal
    const subscriptionResponse = await fetch(`https://api-m.paypal.com/v1/billing/subscriptions/${subscriptionId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      }
    });

    if (!subscriptionResponse.ok) {
      const errorText = await subscriptionResponse.text();
      console.error('Failed to get subscription:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to verify subscription' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const subscriptionData = await subscriptionResponse.json();
    console.log('Subscription status:', subscriptionData.status);

    if (subscriptionData.status !== 'ACTIVE' && subscriptionData.status !== 'APPROVED') {
      return new Response(
        JSON.stringify({ error: `Subscription not active. Status: ${subscriptionData.status}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse custom data
    let customData;
    try {
      customData = JSON.parse(subscriptionData.custom_id);
    } catch {
      console.error('Failed to parse custom_id');
      return new Response(
        JSON.stringify({ error: 'Invalid subscription data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { userId, merchantId, amount } = customData;

    // Check for existing subscription
    const { data: existingSub } = await supabase
      .from('podcast_subscriptions')
      .select('id')
      .eq('paypal_subscription_id', subscriptionId)
      .single();

    if (existingSub) {
      console.log('Subscription already recorded');
      return new Response(
        JSON.stringify({ success: true, message: 'Subscription already active' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create subscription record
    const { error: insertError } = await supabase
      .from('podcast_subscriptions')
      .insert({
        subscriber_id: userId,
        podcast_recording_id: podcastRecordingId || customData.podcastRecordingId,
        merchant_id: merchantId,
        paypal_subscription_id: subscriptionId,
        tier: tier || customData.tier,
        amount: amount,
        status: 'active',
        started_at: new Date().toISOString(),
        next_billing_date: subscriptionData.billing_info?.next_billing_time || null
      });

    if (insertError) {
      console.error('Failed to insert subscription:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to record subscription' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create notification for merchant
    await supabase
      .from('notifications')
      .insert({
        user_id: merchantId,
        type: 'new_subscription',
        title: 'New Subscription!',
        message: `Someone subscribed to your podcast at the ${tier || customData.tier} tier ($${amount}/month).`
      });

    // Create notification for subscriber
    await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'subscription_active',
        title: 'Subscription Active!',
        message: `Your podcast subscription is now active. Enjoy your content!`
      });

    console.log('Subscription recorded successfully');

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error capturing subscription:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
