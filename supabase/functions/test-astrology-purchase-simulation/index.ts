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

    const { astrologyProductId } = await req.json();

    if (!astrologyProductId) {
      throw new Error('Astrology product ID is required');
    }

    console.log('Starting test astrology purchase simulation', { astrologyProductId, buyerId: user.id });

    // Get product details
    const { data: product, error: productError } = await supabaseClient
      .from('astrology_products')
      .select('*')
      .eq('id', astrologyProductId)
      .single();

    if (productError || !product) {
      console.error('Product fetch error:', productError);
      throw new Error('Product not found');
    }

    const productPrice = product.total_price || 0;
    
    // Calculate revenue splits (same logic as audio products)
    const paypalFee = productPrice * 0.0349 + 0.49;
    const afterPayPalFee = productPrice - paypalFee;
    const platformFee = afterPayPalFee * 0.10;
    const adminRevenue = afterPayPalFee * 0.90;

    console.log('Revenue breakdown:', {
      productPrice,
      paypalFee,
      platformFee,
      adminRevenue
    });

    // Create test astrology purchase record
    const { data: purchase, error: purchaseError } = await supabaseClient
      .from('astrology_purchases')
      .insert({
        user_id: user.id,
        astrology_product_id: astrologyProductId,
        amount_paid: productPrice,
        paypal_transaction_id: `TEST_ASTRO_${Date.now()}`,
        buyer_email: user.email || 'test@example.com',
        delivery_type: product.delivery_type,
        hours_purchased: product.hours_selected,
        status: 'completed'
      })
      .select()
      .single();

    if (purchaseError) {
      throw new Error(`Failed to create purchase: ${purchaseError.message}`);
    }

    console.log('Test astrology purchase created:', purchase.id);

    // Calculate delivery deadline (3 days from now)
    const deliveryDeadline = new Date();
    deliveryDeadline.setDate(deliveryDeadline.getDate() + 3);

    // Create delivery record
    const { data: delivery, error: deliveryError } = await supabaseClient
      .from('astrology_deliveries')
      .insert({
        astrology_product_id: astrologyProductId,
        buyer_id: user.id,
        admin_id: product.admin_id,
        purchase_id: purchase.id,
        delivery_deadline: deliveryDeadline.toISOString(),
        status: 'pending'
      })
      .select()
      .single();

    if (deliveryError) {
      console.error('Delivery creation error:', deliveryError);
      throw new Error(`Failed to create delivery: ${deliveryError.message}`);
    }

    console.log('Delivery record created:', delivery.id);

    // Create notifications for admin
    const { error: adminNotifError } = await supabaseClient
      .from('notifications')
      .insert({
        user_id: product.admin_id,
        title: '🧪 Test Astrology Purchase',
        message: `New test astrology reading ordered. Please upload video within 3 days. (Test Mode)`,
        type: 'astrology_purchase',
        related_delivery_id: delivery.id
      });

    if (adminNotifError) {
      console.error('Admin notification error:', adminNotifError);
    }

    // Create notification for buyer
    const { error: buyerNotifError } = await supabaseClient
      .from('notifications')
      .insert({
        user_id: user.id,
        title: '🧪 Test Astrology Reading Ordered',
        message: `Your test astrology reading will be delivered within 3 days. (Test Mode)`,
        type: 'astrology_purchase',
        related_delivery_id: delivery.id
      });

    if (buyerNotifError) {
      console.error('Buyer notification error:', buyerNotifError);
    }

    // Update quarterly income for admin
    const { error: adminIncomeError } = await supabaseClient.rpc('update_quarterly_income', {
      p_user_id: product.admin_id,
      p_amount: adminRevenue,
      p_income_type: 'merchant_revenue'
    });

    if (adminIncomeError) {
      console.error('Admin income update error:', adminIncomeError);
    }

    // Record platform fee
    const { error: platformRevenueError } = await supabaseClient
      .from('platform_revenue')
      .insert({
        amount: platformFee,
        revenue_type: 'platform_fee',
        source_transaction_id: purchase.id,
        source_user_id: user.id,
        metadata: { test_astrology_simulation: true }
      });

    if (platformRevenueError) {
      console.error('Platform revenue error:', platformRevenueError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Test astrology purchase simulation completed',
        purchaseId: purchase.id,
        deliveryId: delivery.id,
        breakdown: {
          productPrice,
          paypalFee,
          platformFee,
          adminRevenue,
          deliveryDeadline: deliveryDeadline.toISOString()
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Test astrology simulation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
