
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { astrologyProductId, deliveryType, totalPrice } = await req.json();
    
    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      console.error('Auth error:', userError);
      throw new Error('Failed to authenticate user');
    }
    
    console.log('Creating astrology payment for:', { astrologyProductId, deliveryType, totalPrice, userId: user.id });

    // Get PayPal access token using live credentials
    const clientId = Deno.env.get('PAYPAL_CLIENT_ID');
    const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET');
    
    if (!clientId || !clientSecret) {
      throw new Error('PayPal credentials not configured');
    }

    console.log('Getting PayPal access token...');
    
    const authResponse = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      console.error('PayPal auth error:', errorText);
      throw new Error(`PayPal authentication failed: ${errorText}`);
    }

    const { access_token } = await authResponse.json();
    console.log('PayPal access token obtained');

    // Create PayPal order
    const orderData = {
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: astrologyProductId,
        amount: {
          currency_code: 'USD',
          value: totalPrice.toString()
        },
        description: `Astrology ${deliveryType.replace('_', ' ')} service`
      }],
      application_context: {
        return_url: `https://veaupehwfsbagzfuvach.supabase.co/functions/v1/capture-astrology-payment?productId=${astrologyProductId}&userId=${user.id}`,
        cancel_url: 'https://lovable.app/payment-cancelled',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW'
      }
    };

    console.log('Creating PayPal order with data:', orderData);

    const orderResponse = await fetch('https://api-m.paypal.com/v2/checkout/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${access_token}`,
      },
      body: JSON.stringify(orderData),
    });

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text();
      console.error('PayPal order creation error:', errorText);
      throw new Error(`Failed to create PayPal order: ${errorText}`);
    }

    const order = await orderResponse.json();
    console.log('PayPal order created:', order.id);

    // Find the approval URL
    const approvalUrl = order.links?.find((link: any) => link.rel === 'approve')?.href;
    
    if (!approvalUrl) {
      throw new Error('No approval URL found in PayPal response');
    }

    console.log('Returning approval URL:', approvalUrl);

    return new Response(
      JSON.stringify({ 
        orderId: order.id, 
        approvalUrl,
        astrologyProductId
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in create-astrology-payment:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to create payment',
        details: error.toString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
