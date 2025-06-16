
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PaymentRequest {
  fashionProductId: string;
  variantId: string;
  quantity: number;
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

    const { fashionProductId, variantId, quantity = 1 }: PaymentRequest = await req.json();

    // Get fashion product details
    const { data: product, error: productError } = await supabase
      .from('fashion_products')
      .select('*, fashion_product_variants(*)')
      .eq('id', fashionProductId)
      .single();

    if (productError || !product) {
      throw new Error('Product not found');
    }

    // Get specific variant
    const variant = product.fashion_product_variants.find((v: any) => v.id === variantId);
    if (!variant) {
      throw new Error('Variant not found');
    }

    if (variant.stock_quantity < quantity) {
      throw new Error('Insufficient stock');
    }

    // Calculate total with tax (NY rate: 8.25%)
    const unitPrice = product.price;
    const shippingCost = product.shipping_cost;
    const subtotal = unitPrice * quantity;
    const taxAmount = subtotal * product.tax_rate;
    const total = subtotal + shippingCost + taxAmount;

    console.log('Creating PayPal payment for fashion product:', {
      productId: fashionProductId,
      variantId,
      quantity,
      unitPrice,
      shippingCost,
      taxAmount,
      total
    });

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

    // Create PayPal payment
    const paymentData = {
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: `fashion_${fashionProductId}_${variantId}`,
        amount: {
          currency_code: 'USD',
          value: total.toFixed(2),
          breakdown: {
            item_total: {
              currency_code: 'USD',
              value: subtotal.toFixed(2)
            },
            shipping: {
              currency_code: 'USD',
              value: shippingCost.toFixed(2)
            },
            tax_total: {
              currency_code: 'USD',
              value: taxAmount.toFixed(2)
            }
          }
        },
        items: [{
          name: `${product.title} - ${variant.size} ${variant.color}`,
          unit_amount: {
            currency_code: 'USD',
            value: unitPrice.toFixed(2)
          },
          quantity: quantity.toString(),
          category: 'PHYSICAL_GOODS'
        }],
        description: `Fashion item: ${product.title}`,
        custom_id: `${user.id}_${fashionProductId}_${variantId}_${quantity}`
      }],
      application_context: {
        return_url: `${req.headers.get('origin')}/payment-success?type=fashion`,
        cancel_url: `${req.headers.get('origin')}/payment-cancelled`,
        brand_name: 'Fashion Store',
        user_action: 'PAY_NOW'
      }
    };

    const paymentResponse = await fetch('https://api-m.sandbox.paypal.com/v2/checkout/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData)
    });

    const paymentResult = await paymentResponse.json();
    
    if (!paymentResponse.ok) {
      console.error('PayPal payment creation error:', paymentResult);
      throw new Error('Failed to create PayPal payment');
    }

    console.log('PayPal payment created successfully:', paymentResult.id);

    const approvalUrl = paymentResult.links.find((link: any) => link.rel === 'approve')?.href;

    return new Response(JSON.stringify({
      paymentId: paymentResult.id,
      approvalUrl,
      total: total.toFixed(2)
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error('Error in create-fashion-payment function:', error);
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
