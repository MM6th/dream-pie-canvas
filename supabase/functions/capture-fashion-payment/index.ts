
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CaptureRequest {
  paymentId: string;
}

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

    const { paymentId }: CaptureRequest = await req.json();

    console.log('Capturing PayPal fashion payment:', paymentId);

    // Get PayPal access token
    const paypalAuth = btoa(`${paypalClientId}:${paypalClientSecret}`);
    const tokenResponse = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
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

    // Capture the payment
    const captureResponse = await fetch(`https://api-m.sandbox.paypal.com/v2/checkout/orders/${paymentId}/capture`, {
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
    const customId = captureResult.purchase_units[0].custom_id;
    const [userId, fashionProductId, variantId, quantity] = customId.split('_');
    
    if (userId !== user.id) {
      throw new Error('User ID mismatch');
    }

    const purchaseQuantity = parseInt(quantity);
    const unitPrice = parseFloat(captureResult.purchase_units[0].amount.breakdown.item_total.value) / purchaseQuantity;
    const shippingCost = parseFloat(captureResult.purchase_units[0].amount.breakdown.shipping.value);
    const taxAmount = parseFloat(captureResult.purchase_units[0].amount.breakdown.tax_total.value);
    const totalAmount = parseFloat(captureResult.purchase_units[0].amount.value);

    // Record the purchase
    const { error: purchaseError } = await supabase
      .from('fashion_purchases')
      .insert({
        user_id: user.id,
        fashion_product_id: fashionProductId,
        variant_id: variantId,
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
      .eq('id', variantId)
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
      .eq('id', variantId);

    if (stockError) {
      console.error('Error updating stock:', stockError);
      // Don't throw here as payment was successful
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
