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

const CREDIT_PACKAGES = {
  50: { credits: 50, price: 5.00 },
  100: { credits: 100, price: 9.00 },
  200: { credits: 200, price: 16.00 },
};

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

    const { creditAmount } = await req.json();

    // Validate credit package
    const packageInfo = CREDIT_PACKAGES[creditAmount as keyof typeof CREDIT_PACKAGES];
    if (!packageInfo) {
      throw new Error('Invalid credit package');
    }

    const { credits, price } = packageInfo;

    // Get PayPal credentials
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

    // Create PayPal order
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
            value: price.toFixed(2),
          },
          description: `${credits} Messaging Credits`,
          custom_id: JSON.stringify({
            user_id: user.id,
            credits: credits,
          }),
        }],
        application_context: {
          return_url: `${req.headers.get('origin')}/payment-success?type=credit&credits=${credits}`,
          cancel_url: `${req.headers.get('origin')}/payment-cancelled`,
          brand_name: 'Messaging Credits',
          user_action: 'PAY_NOW',
        },
      }),
    });

    const orderData = await orderResponse.json() as PayPalOrderResponse;
    const approvalUrl = orderData.links.find(link => link.rel === 'approve')?.href;

    console.log('PayPal order created:', orderData.id);
    console.log('Return URL sent to PayPal:', `${req.headers.get('origin')}/payment-success?type=credit&credits=${credits}`);
    console.log('Approval URL:', approvalUrl);

    return new Response(
      JSON.stringify({ 
        orderId: orderData.id, 
        approvalUrl,
        credits,
        price,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-credit-payment:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});