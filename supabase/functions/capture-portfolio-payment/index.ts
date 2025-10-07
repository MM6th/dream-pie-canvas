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
    const { orderId, portfolioId } = await req.json();

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

    // Capture PayPal order
    const captureResponse = await fetch(`${PAYPAL_API_URL}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
    });

    const captureData = await captureResponse.json();
    console.log('PayPal capture response:', captureData);

    if (captureData.status !== 'COMPLETED') {
      throw new Error('Payment capture failed');
    }

    // Get portfolio details
    const { data: portfolio, error: portfolioError } = await supabase
      .from('portfolios')
      .select('*')
      .eq('id', portfolioId)
      .single();

    if (portfolioError) {
      throw new Error('Portfolio not found');
    }

    const grossAmount = parseFloat(captureData.purchase_units[0].payments.captures[0].amount.value);
    const paypalFee = parseFloat(captureData.purchase_units[0].payments.captures[0].seller_receivable_breakdown.paypal_fee.value);
    const netRevenue = grossAmount - paypalFee;

    // Calculate revenue split: 10% PIE, 90% Merchant
    const platformFee = netRevenue * 0.10;
    const merchantRevenue = netRevenue * 0.90;

    const transactionId = captureData.purchase_units[0].payments.captures[0].id;

    // Record purchase
    const { error: purchaseError } = await supabase
      .from('portfolio_purchases')
      .insert({
        user_id: user.id,
        portfolio_id: portfolioId,
        amount_paid: grossAmount,
        paypal_transaction_id: transactionId,
      });

    if (purchaseError) {
      console.error('Error recording purchase:', purchaseError);
      throw purchaseError;
    }

    // Get admin user ID
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('is_admin', true)
      .limit(1)
      .single();

    if (!adminProfile) {
      console.error('No admin user found');
      throw new Error('Admin user not found');
    }

    // Record platform fee for admin
    await supabase.rpc('update_quarterly_income', {
      p_user_id: adminProfile.id,
      p_income_type: 'platform_fee',
      p_amount: platformFee,
    });

    // Record merchant revenue
    await supabase.rpc('update_quarterly_income', {
      p_user_id: portfolio.user_id,
      p_income_type: 'portfolio_revenue',
      p_amount: merchantRevenue,
    });

    console.log('Revenue distribution completed:', {
      platformFee,
      merchantRevenue,
      portfolioOwnerId: portfolio.user_id,
    });

    return new Response(JSON.stringify({ 
      success: true,
      purchaseId: portfolioId,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error capturing portfolio payment:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
