
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
    const userId = url.searchParams.get('userId');
    
    console.log('Capturing astrology payment for token:', token, 'productId:', productId, 'userId:', userId);

    if (!token || !productId || !userId) {
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

    // Record the purchase in the database
    const transactionId = captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id;
    const amountPaid = parseFloat(captureData.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value || '0');

    // Calculate revenue splits - PIE OWNED PRODUCT (100% to company after PayPal fees)
    const paypalFee = (amountPaid * 0.0349) + 0.49;
    const netRevenue = amountPaid - paypalFee;
    // For PIE's own astrology products, no platform fee - 100% goes to company
    const adminRevenue = netRevenue; // 100% to PIE

    const { data: purchase, error: purchaseError } = await supabase
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
      })
      .select()
      .single();

    if (purchaseError) throw purchaseError;

    // Track quarterly income for admin (REAL PURCHASE - Company Revenue)
    // PIE receives 100% of net revenue (after PayPal fees) for own products
    await supabase.rpc('update_quarterly_income', {
      p_user_id: product.admin_id,
      p_income_type: 'company_revenue',
      p_amount: adminRevenue,
      p_is_test_data: false
    });

    // Record PayPal processing fee in platform_revenue for SE Calculator tracking
    await supabase.from('platform_revenue').insert({
      revenue_type: 'astrology_processing_fee',
      amount: 0, // We track the fee in metadata, not as revenue
      source_user_id: userId,
      source_transaction_id: transactionId,
      metadata: {
        paypal_fee: paypalFee,
        gross_amount: amountPaid,
        net_amount: netRevenue,
        product_type: 'astrology_reading'
      }
    });

    console.log('Recorded PayPal fee for astrology purchase:', paypalFee);

    // Notify admin about the purchase and create delivery record
    if (purchase && product.admin_id) {
      try {
        await fetch(`${supabaseUrl}/functions/v1/notify-admin-astrology-purchase`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            purchaseId: purchase.id,
            productId: productId,
            buyerId: userId,
            adminId: product.admin_id
          })
        });
      } catch (notifyError) {
        console.error('Error notifying admin:', notifyError);
        // Don't fail the payment if notification fails
      }
    }

    console.log('Astrology purchase recorded successfully');

    // Get the base URL from the referer header
    const referer = req.headers.get('referer');
    let baseUrl = 'https://lovable.app';
    if (referer) {
      const refererUrl = new URL(referer);
      baseUrl = `${refererUrl.protocol}//${refererUrl.host}`;
    }

    // Redirect to success page
    return Response.redirect(`${baseUrl}/payment-success?orderId=${captureData.id}&paymentType=astrology`, 302);

  } catch (error) {
    console.error('Error in capture-astrology-payment:', error);
    
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
