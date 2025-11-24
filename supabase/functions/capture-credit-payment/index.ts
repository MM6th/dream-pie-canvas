import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CREDIT_PACKAGES = {
  50: { credits: 50, price: 5.00 },
  100: { credits: 100, price: 9.00 },
  200: { credits: 200, price: 16.00 },
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    const credits = url.searchParams.get('credits');
    const userId = url.searchParams.get('userId');
    
    console.log('Capturing credit payment for token:', token, 'credits:', credits, 'userId:', userId);

    if (!token || !credits || !userId) {
      throw new Error('Missing required parameters');
    }

    // Validate credit package
    const packageInfo = CREDIT_PACKAGES[parseInt(credits) as keyof typeof CREDIT_PACKAGES];
    if (!packageInfo) {
      throw new Error('Invalid credit package');
    }

    // Get PayPal access token
    const clientId = Deno.env.get('PAYPAL_CLIENT_ID');
    const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET');
    
    if (!clientId || !clientSecret) {
      throw new Error('PayPal credentials not configured');
    }

    const authResponse = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!authResponse.ok) {
      throw new Error('PayPal authentication failed');
    }

    const { access_token } = await authResponse.json();

    // Capture the payment
    const captureResponse = await fetch(`https://api-m.paypal.com/v2/checkout/orders/${token}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${access_token}`,
      },
    });

    if (!captureResponse.ok) {
      const errorText = await captureResponse.text();
      console.error('PayPal capture error:', errorText);
      throw new Error('Failed to capture PayPal payment');
    }

    const captureData = await captureResponse.json();
    console.log('Payment captured:', captureData);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get transaction details
    const transactionId = captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id;
    const amountPaid = parseFloat(captureData.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value || '0');

    // Calculate revenue splits
    const paypalFee = (amountPaid * 0.0349) + 0.49;
    const netRevenue = amountPaid - paypalFee;

    // Update or create messaging credits record
    const { data: existingCredits } = await supabase
      .from('messaging_credits')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (existingCredits) {
      await supabase
        .from('messaging_credits')
        .update({
          balance: existingCredits.balance + packageInfo.credits,
          total_purchased: existingCredits.total_purchased + packageInfo.credits,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
    } else {
      await supabase
        .from('messaging_credits')
        .insert({
          user_id: userId,
          balance: packageInfo.credits,
          total_purchased: packageInfo.credits,
          total_spent: 0,
        });
    }

    // Record the transaction
    await supabase
      .from('credit_transactions')
      .insert({
        user_id: userId,
        type: 'purchase',
        amount: packageInfo.credits,
        description: `Purchased ${packageInfo.credits} messaging credits`,
        paypal_order_id: transactionId,
      });

    // Record platform revenue
    await supabase
      .from('platform_revenue')
      .insert({
        amount: netRevenue,
        revenue_type: 'credit_purchase',
        source_user_id: userId,
        source_transaction_id: transactionId,
        metadata: {
          credits_purchased: packageInfo.credits,
          price: packageInfo.price,
          paypal_fee: paypalFee,
        }
      });

    // Get admin user ID
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('is_admin', true)
      .single();

    if (adminProfile) {
      // Update quarterly income for admin (company revenue)
      await supabase.rpc('update_quarterly_income', {
        p_user_id: adminProfile.id,
        p_income_type: 'company_revenue',
        p_amount: netRevenue,
        p_is_test_data: false
      });

      // Notify admin
      await supabase
        .from('notifications')
        .insert({
          user_id: adminProfile.id,
          type: 'credit_purchase',
          title: 'New Credit Purchase',
          message: `A user purchased ${packageInfo.credits} messaging credits for $${packageInfo.price}`
        });
    }

    // Notify buyer
    await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'credit_purchase',
        title: 'Credits Purchased',
        message: `You successfully purchased ${packageInfo.credits} messaging credits!`
      });

    console.log('Credit purchase recorded successfully');

    // Get the base URL from the referer header
    const referer = req.headers.get('referer');
    let baseUrl = 'https://lovable.app';
    if (referer) {
      const refererUrl = new URL(referer);
      baseUrl = `${refererUrl.protocol}//${refererUrl.host}`;
    }

    // Redirect to success page
    return Response.redirect(`${baseUrl}/payment-success?orderId=${captureData.id}&paymentType=credit&credits=${packageInfo.credits}`, 302);

  } catch (error) {
    console.error('Error in capture-credit-payment:', error);
    
    // Get the base URL from the referer header
    const referer = req.headers.get('referer');
    let baseUrl = 'https://lovable.app';
    if (referer) {
      const refererUrl = new URL(referer);
      baseUrl = `${refererUrl.protocol}//${refererUrl.host}`;
    }
    
    // Redirect to error page
    return Response.redirect(`${baseUrl}/payment-cancelled`, 302);
  }
});
