import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PayPalAccessTokenResponse {
  access_token: string;
}

interface PayPalCaptureResponse {
  id: string;
  status: string;
  purchase_units: Array<{
    payments: {
      captures: Array<{ id: string }>;
    };
  }>;
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

    const { orderId, creditAmount } = await req.json();

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

    // Capture PayPal order
    const captureResponse = await fetch(
      `https://api-m.paypal.com/v2/checkout/orders/${orderId}/capture`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const captureData = await captureResponse.json() as PayPalCaptureResponse;

    if (captureData.status !== 'COMPLETED') {
      throw new Error('Payment capture failed');
    }

    const transactionId = captureData.purchase_units[0]?.payments?.captures[0]?.id;

    // Use admin client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get or create user's credit record
    const { data: existingCredits } = await supabaseAdmin
      .from('messaging_credits')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (existingCredits) {
      // Update existing record
      const { error: updateError } = await supabaseAdmin
        .from('messaging_credits')
        .update({
          balance: existingCredits.balance + creditAmount,
          total_purchased: existingCredits.total_purchased + creditAmount,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;
    } else {
      // Create new record
      const { error: insertError } = await supabaseAdmin
        .from('messaging_credits')
        .insert({
          user_id: user.id,
          balance: creditAmount,
          total_purchased: creditAmount,
        });

      if (insertError) throw insertError;
    }

    // Record transaction
    const { error: transactionError } = await supabaseAdmin
      .from('credit_transactions')
      .insert({
        user_id: user.id,
        type: 'purchase',
        amount: creditAmount,
        description: `Purchased ${creditAmount} credits`,
        paypal_order_id: transactionId,
      });

    if (transactionError) throw transactionError;

    // Calculate and record platform revenue (10% platform fee)
    const packagePrices: Record<number, number> = { 50: 5.00, 100: 9.00, 200: 16.00 };
    const totalAmount = packagePrices[creditAmount] || 0;
    const platformFee = totalAmount * 0.10;

    const { error: revenueError } = await supabaseAdmin
      .from('platform_revenue')
      .insert({
        amount: platformFee,
        revenue_type: 'messaging_credits',
        source_user_id: user.id,
        source_transaction_id: transactionId,
        metadata: {
          credits_purchased: creditAmount,
          total_amount: totalAmount,
        },
      });

    if (revenueError) {
      console.error('Error recording platform revenue:', revenueError);
    }

    // Get updated balance
    const { data: updatedCredits } = await supabaseAdmin
      .from('messaging_credits')
      .select('balance')
      .eq('user_id', user.id)
      .single();

    console.log('Credit purchase completed:', { user_id: user.id, credits: creditAmount });

    return new Response(
      JSON.stringify({ 
        success: true, 
        newBalance: updatedCredits?.balance || creditAmount,
        creditsAdded: creditAmount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in capture-credit-payment:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});