
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
    
    console.log('Creating astrology payment for:', { astrologyProductId, deliveryType, totalPrice });

    // Get PayPal access token - use sandbox for development
    const clientId = Deno.env.get('PAYPAL_CLIENT_ID');
    const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET');
    const isProduction = Deno.env.get('PAYPAL_ENVIRONMENT') === 'production';
    
    if (!clientId || !clientSecret) {
      throw new Error('PayPal credentials not configured');
    }

    console.log('Getting PayPal access token...');
    
    // Use sandbox endpoints for development
    const authUrl = isProduction 
      ? 'https://api-m.paypal.com/v1/oauth2/token'
      : 'https://api-m.sandbox.paypal.com/v1/oauth2/token';
    
    const authResponse = await fetch(authUrl, {
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
        return_url: `${req.headers.get('origin') || 'https://2bd288ec-59c8-49d3-a376-72589a059d77.lovableproject.com'}/payment-success?type=astrology&productId=${astrologyProductId}`,
        cancel_url: `${req.headers.get('origin') || 'https://2bd288ec-59c8-49d3-a376-72589a059d77.lovableproject.com'}/payment-cancelled`,
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW'
      }
    };

    console.log('Creating PayPal order with data:', orderData);

    // Use sandbox or production endpoints
    const orderUrl = isProduction 
      ? 'https://api-m.paypal.com/v2/checkout/orders'
      : 'https://api-m.sandbox.paypal.com/v2/checkout/orders';

    const orderResponse = await fetch(orderUrl, {
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
