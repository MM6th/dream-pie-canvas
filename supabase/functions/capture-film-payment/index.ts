import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PAYPAL_CLIENT_ID = Deno.env.get("PAYPAL_CLIENT_ID");
const PAYPAL_CLIENT_SECRET = Deno.env.get("PAYPAL_CLIENT_SECRET");
const PAYPAL_API_BASE = "https://api-m.paypal.com";

async function getPayPalAccessToken() {
  const auth = btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`);
  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = await response.json();
  return data.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, filmId, userId } = await req.json();
    console.log("Capturing film payment:", { orderId, filmId, userId });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get film details
    const { data: film, error: filmError } = await supabase
      .from("film_products")
      .select("*")
      .eq("id", filmId)
      .single();

    if (filmError || !film) {
      console.error("Film not found:", filmError);
      return new Response(
        JSON.stringify({ error: "Film not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get PayPal access token
    const accessToken = await getPayPalAccessToken();

    // Capture the payment
    const captureResponse = await fetch(
      `${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const captureData = await captureResponse.json();
    console.log("PayPal capture response:", captureData.status);

    if (captureData.status !== "COMPLETED") {
      console.error("Payment not completed:", captureData);
      return new Response(
        JSON.stringify({ error: "Payment not completed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const transactionId = captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id;
    const amountPaid = parseFloat(
      captureData.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value || film.price
    );

    // Create film purchase record (this triggers the increment_film_sales function)
    const { data: purchase, error: purchaseError } = await supabase
      .from("film_purchases")
      .insert({
        user_id: userId,
        film_product_id: filmId,
        amount_paid: amountPaid,
        paypal_transaction_id: transactionId,
      })
      .select()
      .single();

    if (purchaseError) {
      console.error("Error creating purchase:", purchaseError);
      return new Response(
        JSON.stringify({ error: "Failed to record purchase" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Film purchase recorded:", purchase.id);

    // Create notification for merchant
    const { error: notifError } = await supabase
      .from("notifications")
      .insert({
        user_id: film.merchant_id,
        type: "film_sale",
        title: "Film Sold!",
        message: `Your film "${film.title}" was purchased for $${amountPaid.toFixed(2)}!`,
      });

    if (notifError) {
      console.error("Error creating notification:", notifError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        purchaseId: purchase.id,
        transactionId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error capturing film payment:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
