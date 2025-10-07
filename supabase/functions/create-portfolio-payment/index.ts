import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { portfolioId } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get portfolio details
    const { data: portfolio, error: portfolioError } = await supabase
      .from('portfolios')
      .select('*, portfolio_images(*)')
      .eq('id', portfolioId)
      .single();

    if (portfolioError || !portfolio) {
      throw new Error('Portfolio not found');
    }

    if (!portfolio.is_for_sale || !portfolio.price) {
      throw new Error('Portfolio not for sale');
    }

    // Check if user already purchased
    const { data: existingPurchase } = await supabase
      .from('portfolio_purchases')
      .select('id')
      .eq('user_id', user.id)
      .eq('portfolio_id', portfolioId)
      .maybeSingle();

    if (existingPurchase) {
      throw new Error('Already purchased');
    }

    // Check if user is the owner
    if (portfolio.user_id === user.id) {
      throw new Error('Cannot purchase your own portfolio');
    }

    const PAYPAL_CLIENT_ID = Deno.env.get('PAYPAL_CLIENT_ID');
    const PAYPAL_CLIENT_SECRET = Deno.env.get('PAYPAL_CLIENT_SECRET');
    const PAYPAL_API_URL = 'https://api-m.paypal.com';

    // Get PayPal access token
    const auth = btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`);
    const tokenResponse = await fetch(`${PAYPAL_API_URL}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    const { access_token } = await tokenResponse.json();

    // Create PayPal order
    const orderResponse = await fetch(`${PAYPAL_API_URL}/v2/checkout/orders`, {
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
            value: portfolio.price.toFixed(2),
          },
          description: `Portfolio: ${portfolio.title}`,
          custom_id: JSON.stringify({
            portfolioId,
            userId: user.id,
            type: 'portfolio',
          }),
        }],
        application_context: {
          return_url: `${req.headers.get('origin')}/payment-success?type=portfolio&portfolioId=${portfolioId}`,
          cancel_url: `${req.headers.get('origin')}/payment-cancelled`,
        },
      }),
    });

    const orderData = await orderResponse.json();
    console.log('PayPal order created:', orderData);

    return new Response(JSON.stringify(orderData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error creating portfolio payment:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
