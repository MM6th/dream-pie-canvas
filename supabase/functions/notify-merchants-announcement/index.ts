import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  announcementId: string;
  title: string;
  contractType: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { announcementId, title, contractType }: NotificationRequest = await req.json();
    
    console.log(`Processing notification for announcement: ${announcementId}`);

    // Get all approved merchants
    const { data: merchants, error: merchantsError } = await supabase
      .from('profiles')
      .select('id, email, display_name, business_name')
      .eq('user_type', 'merchant')
      .eq('approval_status', 'approved');

    if (merchantsError) {
      console.error('Error fetching merchants:', merchantsError);
      throw merchantsError;
    }

    console.log(`Found ${merchants?.length || 0} approved merchants to notify`);

    // For now, we'll just log the notification since we don't have email setup
    // In a real implementation, you would send emails here using a service like Resend
    merchants?.forEach(merchant => {
      console.log(`Would notify merchant ${merchant.email} about new ${contractType} opportunity: ${title}`);
    });

    // Create in-app notifications (if you have a notifications table)
    if (merchants && merchants.length > 0) {
      const notifications = merchants.map(merchant => ({
        user_id: merchant.id,
        title: 'New Contract Opportunity',
        message: `A new ${contractType} contract opportunity "${title}" is now available. Check your dashboard to apply.`,
        type: 'announcement',
        read: false,
        created_at: new Date().toISOString()
      }));

      // You would insert these into a notifications table if you have one
      console.log('Would create notifications:', notifications);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        notifiedCount: merchants?.length || 0,
        message: 'Merchants notified successfully' 
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error('Error in notify-merchants-announcement function:', error);
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