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

    // Clean up audio test purchases
    const { data: testPurchases, error: fetchError } = await supabaseClient
      .from('user_purchases')
      .select('id, audio_product_id, amount_paid, referrer_user_id, referrer_commission, merchant_revenue_after_referral')
      .like('paypal_transaction_id', 'TEST_%');

    if (fetchError) {
      throw new Error(`Failed to fetch test purchases: ${fetchError.message}`);
    }

    const audioCount = testPurchases?.length || 0;

    // Clean up astrology test purchases
    const { data: testAstrologyPurchases, error: fetchAstroError } = await supabaseClient
      .from('astrology_purchases')
      .select('id, astrology_product_id, amount_paid')
      .like('paypal_transaction_id', 'TEST_ASTRO_%');

    if (fetchAstroError) {
      throw new Error(`Failed to fetch test astrology purchases: ${fetchAstroError.message}`);
    }

    const astrologyCount = testAstrologyPurchases?.length || 0;

    if (audioCount === 0 && astrologyCount === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No test purchases to clean up' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${audioCount} audio and ${astrologyCount} astrology test purchases to clean up`);

    // Clean up audio purchases
    if (testPurchases && testPurchases.length > 0) {
      for (const purchase of testPurchases) {
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

      // Delete audio platform revenue records
      await supabaseClient
        .from('platform_revenue')
        .delete()
        .in('source_transaction_id', testPurchases.map(p => p.id));

      // Delete audio test purchases
      await supabaseClient
        .from('user_purchases')
        .delete()
        .like('paypal_transaction_id', 'TEST_%');
    }

    // Clean up astrology purchases
    if (testAstrologyPurchases && testAstrologyPurchases.length > 0) {
      for (const purchase of testAstrologyPurchases) {
        const { data: product } = await supabaseClient
          .from('astrology_products')
          .select('admin_id, total_price')
          .eq('id', purchase.astrology_product_id)
          .single();

        if (product) {
          // Calculate what was added to quarterly income
          const paypalFee = product.total_price * 0.0349 + 0.49;
          const afterPayPalFee = product.total_price - paypalFee;
          const adminRevenue = afterPayPalFee * 0.90;

          // Reverse admin revenue
          await supabaseClient.rpc('update_quarterly_income', {
            p_user_id: product.admin_id,
            p_amount: -adminRevenue,
            p_income_type: 'merchant_revenue'
          });
        }

    // Get deliveries with video URLs to delete from storage
    const { data: deliveries } = await supabaseClient
      .from('astrology_deliveries')
      .select('id, admin_video_url, buyer_video_url, draft_video_url')
      .eq('purchase_id', purchase.id);

    if (deliveries && deliveries.length > 0) {
      const deliveryIds = deliveries.map(d => d.id);
      
      // Delete video files from storage
      for (const delivery of deliveries) {
        const videoPaths: string[] = [];
        
        if (delivery.admin_video_url) {
          const path = delivery.admin_video_url.split('/videos/')[1];
          if (path) videoPaths.push(path);
        }
        if (delivery.buyer_video_url) {
          const path = delivery.buyer_video_url.split('/videos/')[1];
          if (path) videoPaths.push(path);
        }
        if (delivery.draft_video_url) {
          const path = delivery.draft_video_url.split('/videos/')[1];
          if (path) videoPaths.push(path);
        }
        
        if (videoPaths.length > 0) {
          await supabaseClient.storage
            .from('videos')
            .remove(videoPaths);
        }
      }
      
      // Delete notifications related to these deliveries
      await supabaseClient
        .from('notifications')
        .delete()
        .in('related_delivery_id', deliveryIds);
    }

    // Delete delivery records
    await supabaseClient
      .from('astrology_deliveries')
      .delete()
      .eq('purchase_id', purchase.id);
      }

      // Delete astrology platform revenue records
      await supabaseClient
        .from('platform_revenue')
        .delete()
        .in('source_transaction_id', testAstrologyPurchases.map(p => p.id));

      // Delete astrology test purchases
      await supabaseClient
        .from('astrology_purchases')
        .delete()
        .like('paypal_transaction_id', 'TEST_ASTRO_%');
    }

    console.log('Cleanup completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: `Cleaned up ${audioCount} audio and ${astrologyCount} astrology test purchases with all related data`
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
