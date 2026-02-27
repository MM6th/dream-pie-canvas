import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PayPalAccessTokenResponse {
  access_token: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const amount = parseFloat(url.searchParams.get('amount') || '0');
    const userId = url.searchParams.get('userId') || '';
    const origin = decodeURIComponent(url.searchParams.get('origin') || 'https://lovable.app');
    const paypalToken = url.searchParams.get('token') || '';

    if (!amount || !userId || !paypalToken) {
      throw new Error('Missing required parameters');
    }

    const paypalClientId = Deno.env.get('PAYPAL_CLIENT_ID');
    const paypalClientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET');

    if (!paypalClientId || !paypalClientSecret) {
      throw new Error('PayPal credentials not configured');
    }

    // Get PayPal access token
    const auth = btoa(`${paypalClientId}:${paypalClientSecret}`);
    const tokenResponse = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    const { access_token } = await tokenResponse.json() as PayPalAccessTokenResponse;

    // Capture the PayPal order
    const captureResponse = await fetch(`https://api-m.paypal.com/v2/checkout/orders/${paypalToken}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
    });

    const captureData = await captureResponse.json();
    console.log('Token purchase capture result:', JSON.stringify(captureData));

    if (captureData.status !== 'COMPLETED') {
      throw new Error('Payment capture failed: ' + captureData.status);
    }

    const transactionId = captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id || paypalToken;

    // Record as credit_purchase in platform_revenue to trigger minting
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error: revenueError } = await supabaseAdmin
      .from('platform_revenue')
      .insert({
        amount: amount,
        revenue_type: 'credit_purchase',
        source_user_id: userId,
        source_transaction_id: transactionId,
        metadata: {
          type: 'direct_token_purchase',
          paypal_order_id: paypalToken,
          usd_amount: amount,
        },
      });

    if (revenueError) {
      console.error('Error recording revenue:', revenueError);
      throw new Error('Failed to record purchase');
    }

    console.log('Token purchase completed for user:', userId, 'Amount:', amount);

    // Redirect back to mint page with success
    return new Response(null, {
      status: 302,
      headers: {
        'Location': `${origin}/mint?success=true&amount=${amount}`,
      },
    });
  } catch (error) {
    console.error('Error in capture-token-purchase:', error);
    const url = new URL(req.url);
    const origin = decodeURIComponent(url.searchParams.get('origin') || 'https://lovable.app');
    return new Response(null, {
      status: 302,
      headers: {
        'Location': `${origin}/mint?error=${encodeURIComponent(error.message)}`,
      },
    });
  }
});
