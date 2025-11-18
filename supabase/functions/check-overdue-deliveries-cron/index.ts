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

    // Get all overdue deliveries that haven't been marked
    const { data: overdueDeliveries, error: deliveriesError } = await supabase
      .from("astrology_deliveries")
      .select("*")
      .eq("status", "pending")
      .lt("delivery_deadline", new Date().toISOString())
      .eq("is_overdue", false);

    if (deliveriesError) throw deliveriesError;

    // Mark deliveries as overdue and send notifications
    for (const delivery of overdueDeliveries || []) {
      // Update delivery status
      await supabase
        .from("astrology_deliveries")
        .update({ is_overdue: true })
        .eq("id", delivery.id);

      // Check if overdue message was already sent
      if (!delivery.overdue_message_sent) {
        // Create notification for buyer
        await supabase
          .from("notifications")
          .insert({
            user_id: delivery.buyer_id,
            title: "Astrology Reading Delayed",
            message: "Your astrology reading is taking a bit longer than expected. The admin is still working on your personalized reading.",
            type: "overdue",
            related_delivery_id: delivery.id,
          });

        // Create notification for admin
        await supabase
          .from("notifications")
          .insert({
            user_id: delivery.admin_id,
            title: "Overdue Delivery Reminder",
            message: "You have an overdue astrology reading delivery. Please complete it as soon as possible.",
            type: "overdue",
            related_delivery_id: delivery.id,
          });

        // Mark message as sent
        await supabase
          .from("astrology_deliveries")
          .update({ overdue_message_sent: true })
          .eq("id", delivery.id);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processedCount: overdueDeliveries?.length || 0 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error checking overdue deliveries:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
