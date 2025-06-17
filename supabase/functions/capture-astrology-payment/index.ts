
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

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
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    const productId = url.searchParams.get('productId');
    
    console.log('Capturing astrology payment for token:', token, 'productId:', productId);

    if (!token || !productId) {
      throw new Error('Missing required parameters');
    }

    // Get PayPal access token using live credentials
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
      throw new Error('Failed to capture PayPal payment');
    }

    const captureData = await captureResponse.json();
    console.log('Payment captured:', captureData);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the astrology product details
    const { data: product, error: productError } = await supabase
      .from('astrology_products')
      .select('*')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      console.error('Error fetching astrology product:', productError);
      throw new Error('Product not found');
    }

    // Extract user ID from the JWT token in the authorization header
    const authHeader = req.headers.get('authorization');
    let userId = null;
    
    if (authHeader) {
      try {
        const jwt = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(jwt);
        userId = user?.id;
      } catch (error) {
        console.error('Error getting user from token:', error);
      }
    }

    if (!userId) {
      // Try to get user from the order details or use a placeholder
      console.log('No user ID found, will need to handle this appropriately');
    }

    // Record the purchase in the database
    const transactionId = captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id;
    const amountPaid = parseFloat(captureData.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value || '0');

    const { error: purchaseError } = await supabase
      .from('astrology_purchases')
      .insert({
        user_id: userId,
        astrology_product_id: productId,
        buyer_email: captureData.payer?.email_address || '',
        amount_paid: amountPaid,
        paypal_transaction_id: transactionId,
        delivery_type: product.delivery_type,
        hours_purchased: product.hours_selected,
        status: 'completed'
      });

    if (purchaseError) {
      console.error('Error recording astrology purchase:', purchaseError);
      throw new Error('Failed to record purchase');
    }

    console.log('Astrology purchase recorded successfully');

    // Redirect to success page
    return Response.redirect('https://your-app-domain.com/payment-success', 302);

  } catch (error) {
    console.error('Error in capture-astrology-payment:', error);
    
    // Redirect to error page
    return Response.redirect('https://your-app-domain.com/payment-cancelled', 302);
  }
});
