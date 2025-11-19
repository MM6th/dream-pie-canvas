import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use service role for auth check
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Use service role client for database operations to bypass RLS
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { audioProductId, referrerId } = await req.json();

    if (!audioProductId) {
      throw new Error('Audio product ID is required');
    }

    console.log('Starting test purchase simulation', { audioProductId, buyerId: user.id, referrerId });

    // Get product details
    const { data: product, error: productError } = await supabaseClient
      .from('audio_products')
      .select('*')
      .eq('id', audioProductId)
      .single();

    if (productError || !product) {
      console.error('Product fetch error:', productError);
      throw new Error('Product not found');
    }

    const productPrice = product.price || 0;
    
    // Calculate revenue splits (same logic as capture-paypal-payment)
    const paypalFee = productPrice * 0.0349 + 0.49;
    const afterPayPalFee = productPrice - paypalFee;
    const platformFee = afterPayPalFee * 0.10;
    const merchantShare = afterPayPalFee * 0.90;

    let referrerCommission = 0;
    let merchantRevenueAfterReferral = merchantShare;

    if (referrerId && referrerId !== product.merchant_id) {
      referrerCommission = merchantShare * 0.10;
      merchantRevenueAfterReferral = merchantShare - referrerCommission;
    }

    // Handle featuring artist revenue
    let featuringArtistRevenue = 0;
    if (product.featuring_artist_user_id && product.featuring_percentage) {
      featuringArtistRevenue = merchantRevenueAfterReferral * (product.featuring_percentage / 100);
      merchantRevenueAfterReferral -= featuringArtistRevenue;
    }

    console.log('Revenue breakdown:', {
      productPrice,
      paypalFee,
      platformFee,
      merchantShare,
      referrerCommission,
      merchantRevenueAfterReferral,
      featuringArtistRevenue
    });

    // Create test purchase record
    const { data: purchase, error: purchaseError } = await supabaseClient
      .from('user_purchases')
      .insert({
        user_id: user.id,
        audio_product_id: audioProductId,
        amount_paid: productPrice,
        paypal_transaction_id: `TEST_${Date.now()}`,
        referrer_user_id: referrerId || null,
        referrer_commission: referrerCommission,
        merchant_revenue_after_referral: merchantRevenueAfterReferral,
        is_free_download: false,
      })
      .select()
      .single();

    if (purchaseError) {
      throw new Error(`Failed to create purchase: ${purchaseError.message}`);
    }

    console.log('Test purchase created:', purchase.id);

    // Update quarterly income for merchant
    const { error: merchantIncomeError } = await supabaseClient.rpc('update_quarterly_income', {
      p_user_id: product.merchant_id,
      p_amount: merchantRevenueAfterReferral,
      p_income_type: 'merchant_revenue'
    });

    if (merchantIncomeError) {
      console.error('Merchant income update error:', merchantIncomeError);
    }

    // Update quarterly income for referrer if applicable
    if (referrerId && referrerCommission > 0) {
      const { error: referrerIncomeError } = await supabaseClient.rpc('update_quarterly_income', {
        p_user_id: referrerId,
        p_amount: referrerCommission,
        p_income_type: 'referral_commission'
      });

      if (referrerIncomeError) {
        console.error('Referrer income update error:', referrerIncomeError);
      }
    }

    // Update quarterly income for featuring artist if applicable
    if (product.featuring_artist_user_id && featuringArtistRevenue > 0) {
      const { error: featuringIncomeError } = await supabaseClient.rpc('update_quarterly_income', {
        p_user_id: product.featuring_artist_user_id,
        p_amount: featuringArtistRevenue,
        p_income_type: 'featuring_artist_revenue'
      });

      if (featuringIncomeError) {
        console.error('Featuring artist income update error:', featuringIncomeError);
      }
    }

    // Record platform fee
    const { error: platformRevenueError } = await supabaseClient
      .from('platform_revenue')
      .insert({
        amount: platformFee,
        revenue_type: 'platform_fee',
        source_transaction_id: purchase.id,
        source_user_id: user.id,
        metadata: { test_simulation: true }
      });

    if (platformRevenueError) {
      console.error('Platform revenue error:', platformRevenueError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Test purchase simulation completed',
        purchaseId: purchase.id,
        breakdown: {
          productPrice,
          paypalFee,
          platformFee,
          merchantRevenue: merchantRevenueAfterReferral,
          referrerCommission,
          featuringArtistRevenue
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Test simulation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
