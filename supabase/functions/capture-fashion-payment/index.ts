
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Define validation schemas
const captureRequestSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID is required').max(100, 'Payment ID too long')
});

const customIdSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  fashionProductId: z.string().uuid('Invalid product ID format'),
  variantId: z.string().uuid('Invalid variant ID format'),
  quantity: z.number().int('Quantity must be an integer').positive('Quantity must be positive').max(1000, 'Quantity exceeds maximum')
});

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const paypalClientId = Deno.env.get('PAYPAL_CLIENT_ID')!;
    const paypalClientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    const requestBody = await req.json();
    
    // Validate request body
    const validationResult = captureRequestSchema.safeParse(requestBody);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request', 
          details: validationResult.error.errors 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const { paymentId } = validationResult.data;

    console.log('Capturing PayPal fashion payment:', paymentId);

    // Get PayPal access token - USING LIVE ENDPOINTS
    const paypalAuth = btoa(`${paypalClientId}:${paypalClientSecret}`);
    const tokenResponse = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${paypalAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials'
    });

    const tokenData = await tokenResponse.json();
    
    if (!tokenResponse.ok) {
      console.error('PayPal token error:', tokenData);
      throw new Error('Failed to get PayPal access token');
    }

    // Capture the payment - USING LIVE ENDPOINTS
    const captureResponse = await fetch(`https://api-m.paypal.com/v2/checkout/orders/${paymentId}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      }
    });

    const captureResult = await captureResponse.json();
    
    if (!captureResponse.ok) {
      console.error('PayPal capture error:', captureResult);
      throw new Error('Failed to capture PayPal payment');
    }

    console.log('PayPal payment captured successfully:', captureResult);

    // Parse custom_id to get purchase details
    // Validate and parse custom_id
    const customIdString = captureResult.purchase_units?.[0]?.custom_id;
    if (!customIdString || typeof customIdString !== 'string') {
      throw new Error('Invalid or missing custom_id in PayPal response');
    }

    const parts = customIdString.split('_');
    if (parts.length !== 4) {
      throw new Error(`Invalid custom_id format: expected 4 parts, got ${parts.length}`);
    }

    const [userId, fashionProductId, variantId, quantityStr] = parts;
    
    // Validate parsed values
    const customIdValidation = customIdSchema.safeParse({
      userId,
      fashionProductId,
      variantId,
      quantity: parseInt(quantityStr, 10)
    });
    
    if (!customIdValidation.success) {
      throw new Error(`Invalid custom_id data: ${customIdValidation.error.message}`);
    }

    const validated = customIdValidation.data;

    // Security check: ensure the purchase belongs to the authenticated user
    if (validated.userId !== user.id) {
      throw new Error('Unauthorized: user ID mismatch');
    }

    const purchaseQuantity = validated.quantity;
    const unitPrice = parseFloat(captureResult.purchase_units[0].amount.breakdown.item_total.value) / purchaseQuantity;
    const shippingCost = parseFloat(captureResult.purchase_units[0].amount.breakdown.shipping.value);
    const taxAmount = parseFloat(captureResult.purchase_units[0].amount.breakdown.tax_total.value);
    const totalAmount = parseFloat(captureResult.purchase_units[0].amount.value);

    // Record the purchase
    const { error: purchaseError } = await supabase
      .from('fashion_purchases')
      .insert({
        user_id: user.id,
        fashion_product_id: validated.fashionProductId,
        variant_id: validated.variantId,
        quantity: purchaseQuantity,
        unit_price: unitPrice,
        shipping_cost: shippingCost,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        paypal_transaction_id: captureResult.id
      });

    if (purchaseError) {
      console.error('Error recording fashion purchase:', purchaseError);
      throw new Error('Failed to record purchase');
    }

    // Update stock quantity
    const { data: variant, error: variantError } = await supabase
      .from('fashion_product_variants')
      .select('stock_quantity')
      .eq('id', validated.variantId)
      .single();

    if (variantError) {
      console.error('Error fetching variant:', variantError);
      throw new Error('Failed to fetch variant');
    }

    const newStock = variant.stock_quantity - purchaseQuantity;
    
    const { error: stockError } = await supabase
      .from('fashion_product_variants')
      .update({ 
        stock_quantity: Math.max(0, newStock),
        updated_at: new Date().toISOString()
      })
      .eq('id', validated.variantId);

    if (stockError) {
      console.error('Error updating stock:', stockError);
      // Don't throw here as payment was successful
    }

    // Get fashion product to find admin_id
    const { data: fashionProduct } = await supabase
      .from('fashion_products')
      .select('admin_id')
      .eq('id', validated.fashionProductId)
      .single();

    if (fashionProduct) {
      // Calculate revenue splits
      const paypalFee = (totalAmount * 0.0349) + 0.49;
      const netRevenue = totalAmount - paypalFee;
      const platformFee = netRevenue * 0.10;
      const adminRevenue = netRevenue * 0.90;

      // Track company revenue for admin
      await supabase.rpc('update_quarterly_income', {
        p_user_id: fashionProduct.admin_id,
        p_income_type: 'company_revenue',
        p_amount: adminRevenue,
        p_is_test_data: false
      });

      // Record platform operational cost
      await supabase
        .from('platform_revenue')
        .insert({
          amount: platformFee,
          revenue_type: 'platform_operational_cost',
          source_transaction_id: captureResult.id,
          source_user_id: user.id,
          metadata: { 
            product_type: 'fashion',
            fashion_product_id: validated.fashionProductId 
          }
        });
    }

    console.log('Fashion purchase recorded successfully');

    return new Response(JSON.stringify({
      success: true,
      purchaseId: captureResult.id,
      message: 'Fashion item purchased successfully!'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error('Error in capture-fashion-payment function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);
