import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { purchaseId, productId, buyerId, adminId } = await req.json();

    // Get product details to calculate delivery deadline
    const { data: product, error: productError } = await supabase
      .from("astrology_products")
      .select("delivery_type, hours_selected")
      .eq("id", productId)
      .single();

    if (productError) throw productError;

    // Calculate delivery deadline (3 days from now)
    const deliveryDeadline = new Date();
    deliveryDeadline.setDate(deliveryDeadline.getDate() + 3);

    // Create delivery record
    const { data: delivery, error: deliveryError } = await supabase
      .from("astrology_deliveries")
      .insert({
        astrology_product_id: productId,
        buyer_id: buyerId,
        admin_id: adminId,
        purchase_id: purchaseId,
        delivery_deadline: deliveryDeadline.toISOString(),
        status: "pending",
      })
      .select()
      .single();

    if (deliveryError) throw deliveryError;

    // Create notification for admin
    const { error: notificationError } = await supabase
      .from("notifications")
      .insert({
        user_id: adminId,
        title: "New Astrology Reading Purchase",
        message: "A new astrology reading has been purchased. Please deliver within 3 days.",
        type: "purchase",
        related_delivery_id: delivery.id,
      });

    if (notificationError) throw notificationError;

    // Create notification for buyer
    const { error: buyerNotificationError } = await supabase
      .from("notifications")
      .insert({
        user_id: buyerId,
        title: "Astrology Reading Ordered",
        message: "Your astrology reading has been ordered. It will be delivered within 3 days. Please submit your birth information.",
        type: "purchase",
        related_delivery_id: delivery.id,
      });

    if (buyerNotificationError) throw buyerNotificationError;

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
