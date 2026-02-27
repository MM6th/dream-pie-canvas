import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PayPalAccessTokenResponse {
  access_token: string;
}

interface PayPalOrderResponse {
  id: string;
  links: Array<{ href: string; rel: string }>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Verify admin status
    const { data: isAdmin } = await supabaseClient.rpc('is_admin', { user_id: user.id });
    if (!isAdmin) {
      throw new Error('Admin access required');
    }

    const { usdAmount } = await req.json();
    const amount = parseFloat(usdAmount);

    if (!amount || amount < 1 || amount > 10000) {
      throw new Error('Amount must be between $1 and $10,000');
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

    const origin = req.headers.get('origin') || 'https://lovable.app';
    const returnUrl = `https://veaupehwfsbagzfuvach.supabase.co/functions/v1/capture-token-purchase?amount=${amount}&userId=${user.id}&origin=${encodeURIComponent(origin)}`;

    const orderResponse = await fetch('https://api-m.paypal.com/v2/checkout/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: 'USD',
            value: amount.toFixed(2),
          },
          description: `SIXTH Token Purchase - $${amount.toFixed(2)}`,
          custom_id: JSON.stringify({
            user_id: user.id,
            amount: amount,
            type: 'token_purchase',
          }),
        }],
        application_context: {
          return_url: returnUrl,
          cancel_url: `${origin}/mint?cancelled=true`,
          brand_name: 'SIXTH Token',
          user_action: 'PAY_NOW',
        },
      }),
    });

    const orderData = await orderResponse.json() as PayPalOrderResponse;
    const approvalUrl = orderData.links.find(link => link.rel === 'approve')?.href;

    console.log('Token purchase order created:', orderData.id, 'Amount:', amount);

    return new Response(
      JSON.stringify({ orderId: orderData.id, approvalUrl, amount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in create-token-purchase:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
