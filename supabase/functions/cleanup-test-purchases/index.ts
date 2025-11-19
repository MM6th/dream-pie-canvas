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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    console.log('Starting cleanup of test purchases');

    // Get all test purchases (those with TEST_ prefix in paypal_transaction_id)
    const { data: testPurchases, error: fetchError } = await supabaseClient
      .from('user_purchases')
      .select('id, audio_product_id, amount_paid, referrer_user_id, referrer_commission, merchant_revenue_after_referral')
      .like('paypal_transaction_id', 'TEST_%');

    if (fetchError) {
      throw new Error(`Failed to fetch test purchases: ${fetchError.message}`);
    }

    if (!testPurchases || testPurchases.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No test purchases to clean up' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${testPurchases.length} test purchases to clean up`);

    // For each purchase, reverse the quarterly income updates
    for (const purchase of testPurchases) {
      // Get merchant ID from audio product
      const { data: product } = await supabaseClient
        .from('audio_products')
        .select('merchant_id, featuring_artist_user_id, featuring_percentage')
        .eq('id', purchase.audio_product_id)
        .single();

      if (product) {
        // Reverse merchant revenue
        await supabaseClient.rpc('update_quarterly_income', {
          p_user_id: product.merchant_id,
          p_amount: -purchase.merchant_revenue_after_referral,
          p_income_type: 'merchant_revenue'
        });

        // Reverse referrer commission if applicable
        if (purchase.referrer_user_id && purchase.referrer_commission) {
          await supabaseClient.rpc('update_quarterly_income', {
            p_user_id: purchase.referrer_user_id,
            p_amount: -purchase.referrer_commission,
            p_income_type: 'referral_commission'
          });
        }

        // Reverse featuring artist revenue if applicable
        if (product.featuring_artist_user_id && product.featuring_percentage) {
          const featuringRevenue = purchase.merchant_revenue_after_referral * (product.featuring_percentage / 100);
          await supabaseClient.rpc('update_quarterly_income', {
            p_user_id: product.featuring_artist_user_id,
            p_amount: -featuringRevenue,
            p_income_type: 'featuring_artist_revenue'
          });
        }
      }
    }

    // Delete test platform revenue records
    const { error: platformDeleteError } = await supabaseClient
      .from('platform_revenue')
      .delete()
      .in('source_transaction_id', testPurchases.map(p => p.id));

    if (platformDeleteError) {
      console.error('Platform revenue deletion error:', platformDeleteError);
    }

    // Delete test purchases
    const { error: deleteError } = await supabaseClient
      .from('user_purchases')
      .delete()
      .like('paypal_transaction_id', 'TEST_%');

    if (deleteError) {
      throw new Error(`Failed to delete test purchases: ${deleteError.message}`);
    }

    console.log('Cleanup completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: `Cleaned up ${testPurchases.length} test purchases and reversed all income updates`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Cleanup error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
