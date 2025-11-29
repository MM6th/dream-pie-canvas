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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get delivery ID from request or use default for this fix
    const body = await req.json().catch(() => ({}));
    const deliveryId = body.deliveryId || '86358c22-bc4d-4aab-bd89-d6d988004557';

    // Update the delivery to point to original segments
    const videoSegments = [
      {"id": "segment-1", "url": "https://veaupehwfsbagzfuvach.supabase.co/storage/v1/object/public/user-media/86358c22-bc4d-4aab-bd89-d6d988004557/segment-1-1732842370635.webm", "order": 1, "duration": 0},
      {"id": "segment-2", "url": "https://veaupehwfsbagzfuvach.supabase.co/storage/v1/object/public/user-media/86358c22-bc4d-4aab-bd89-d6d988004557/segment-2-1732842414491.webm", "order": 2, "duration": 0},
      {"id": "segment-3", "url": "https://veaupehwfsbagzfuvach.supabase.co/storage/v1/object/public/user-media/86358c22-bc4d-4aab-bd89-d6d988004557/segment-3-1732842455898.webm", "order": 3, "duration": 0},
      {"id": "segment-4", "url": "https://veaupehwfsbagzfuvach.supabase.co/storage/v1/object/public/user-media/86358c22-bc4d-4aab-bd89-d6d988004557/segment-4-1732842503806.webm", "order": 4, "duration": 0},
      {"id": "segment-5", "url": "https://veaupehwfsbagzfuvach.supabase.co/storage/v1/object/public/user-media/86358c22-bc4d-4aab-bd89-d6d988004557/segment-5-1732842550498.webm", "order": 5, "duration": 0},
      {"id": "segment-6", "url": "https://veaupehwfsbagzfuvach.supabase.co/storage/v1/object/public/user-media/86358c22-bc4d-4aab-bd89-d6d988004557/segment-6-1732842593830.webm", "order": 6, "duration": 0},
      {"id": "segment-7", "url": "https://veaupehwfsbagzfuvach.supabase.co/storage/v1/object/public/user-media/86358c22-bc4d-4aab-bd89-d6d988004557/segment-7-1732842636102.webm", "order": 7, "duration": 0},
      {"id": "segment-8", "url": "https://veaupehwfsbagzfuvach.supabase.co/storage/v1/object/public/user-media/86358c22-bc4d-4aab-bd89-d6d988004557/segment-8-1732842677126.webm", "order": 8, "duration": 0},
      {"id": "segment-9", "url": "https://veaupehwfsbagzfuvach.supabase.co/storage/v1/object/public/user-media/86358c22-bc4d-4aab-bd89-d6d988004557/segment-9-1732842723446.webm", "order": 9, "duration": 0},
      {"id": "segment-10", "url": "https://veaupehwfsbagzfuvach.supabase.co/storage/v1/object/public/user-media/86358c22-bc4d-4aab-bd89-d6d988004557/segment-10-1732842767734.webm", "order": 10, "duration": 0},
      {"id": "segment-11", "url": "https://veaupehwfsbagzfuvach.supabase.co/storage/v1/object/public/user-media/86358c22-bc4d-4aab-bd89-d6d988004557/segment-11-1732842819254.webm", "order": 11, "duration": 0},
      {"id": "segment-12", "url": "https://veaupehwfsbagzfuvach.supabase.co/storage/v1/object/public/user-media/86358c22-bc4d-4aab-bd89-d6d988004557/segment-12-1732842866838.webm", "order": 12, "duration": 0},
      {"id": "segment-13", "url": "https://veaupehwfsbagzfuvach.supabase.co/storage/v1/object/public/user-media/86358c22-bc4d-4aab-bd89-d6d988004557/segment-13-1732842910102.webm", "order": 13, "duration": 0},
      {"id": "segment-14", "url": "https://veaupehwfsbagzfuvach.supabase.co/storage/v1/object/public/user-media/86358c22-bc4d-4aab-bd89-d6d988004557/segment-14-1732842952854.webm", "order": 14, "duration": 0},
      {"id": "segment-15", "url": "https://veaupehwfsbagzfuvach.supabase.co/storage/v1/object/public/user-media/86358c22-bc4d-4aab-bd89-d6d988004557/segment-15-1732842994342.webm", "order": 15, "duration": 0}
    ];

    const { data, error } = await supabase
      .from('astrology_deliveries')
      .update({
        video_segments: videoSegments,
        admin_video_url: videoSegments[0].url,
        buyer_video_url: videoSegments[0].url
      })
      .eq('id', deliveryId)
      .select();

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
