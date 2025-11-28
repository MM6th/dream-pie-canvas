import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StorageFile {
  name: string;
  id: string;
  updated_at: string;
  created_at: string;
  last_accessed_at: string;
  metadata: {
    size: number;
  };
}

interface SegmentInfo {
  segmentNumber: number;
  timestamp: number;
  fileName: string;
  url: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { deliveryId } = await req.json();

    if (!deliveryId) {
      throw new Error('Delivery ID is required');
    }

    console.log('Recovering segments for delivery:', deliveryId);

    // Get the delivery to find the folder path
    const { data: delivery, error: deliveryError } = await supabase
      .from('astrology_deliveries')
      .select('*')
      .eq('id', deliveryId)
      .single();

    if (deliveryError) throw deliveryError;

    // Files are saved in the admin's folder
    const adminId = delivery.admin_id;
    const folderPath = `${adminId}/${deliveryId}`;
    console.log('Recovering segments for admin:', adminId);
    console.log('Looking in folder:', folderPath);
    
    const { data: files, error: listError } = await supabase.storage
      .from('user-media')
      .list(folderPath);

    if (listError) {
      console.error('List error:', listError);
      throw listError;
    }

    console.log('Found files:', files?.length || 0);

    // Parse segment files and group by segment number
    const segmentMap = new Map<number, SegmentInfo[]>();
    
    for (const file of (files as StorageFile[]) || []) {
      // Match pattern: segment-{number}-{timestamp}.webm
      const match = file.name.match(/segment-(\d+)-(\d+)\.webm/);
      if (match) {
        const segmentNumber = parseInt(match[1]);
        const timestamp = parseInt(match[2]);
        
        const { data: urlData } = supabase.storage
          .from('user-media')
          .getPublicUrl(`${folderPath}/${file.name}`);
        
        if (!segmentMap.has(segmentNumber)) {
          segmentMap.set(segmentNumber, []);
        }
        
        segmentMap.get(segmentNumber)!.push({
          segmentNumber,
          timestamp,
          fileName: file.name,
          url: urlData.publicUrl
        });
      }
    }

    console.log('Segment groups found:', segmentMap.size);

    // For each segment number, select the EARLIEST timestamp (original auto-save)
    const recoveredSegments: any[] = [];
    
    for (const [segmentNumber, segments] of segmentMap.entries()) {
      // Sort by timestamp descending (LATEST first) - gets most recent state
      segments.sort((a, b) => b.timestamp - a.timestamp);
      const latestSegment = segments[0]; // Use the LATEST one
      
      console.log(`Segment ${segmentNumber}: Using ${latestSegment.fileName} (latest of ${segments.length} files)`);
      
      recoveredSegments.push({
        id: latestSegment.timestamp.toString(),
        url: latestSegment.url,
        duration: 0 // Will be set when video loads in UI
      });
    }

    // Sort by segment number (0-indexed in storage becomes 1-indexed in DB)
    recoveredSegments.sort((a, b) => {
      const aMatch = a.url.match(/segment-(\d+)-/);
      const bMatch = b.url.match(/segment-(\d+)-/);
      const aNum = aMatch ? parseInt(aMatch[1]) : 0;
      const bNum = bMatch ? parseInt(bMatch[1]) : 0;
      return aNum - bNum;
    });

    console.log('Recovered segments:', recoveredSegments.length);

    // Safety check: don't update if no segments were found
    if (recoveredSegments.length === 0) {
      throw new Error('No segment files found in storage. Check that files exist at path: ' + folderPath);
    }

    // Update the delivery with recovered segments
    const { error: updateError } = await supabase
      .from('astrology_deliveries')
      .update({
        video_segments: recoveredSegments,
        updated_at: new Date().toISOString()
      })
      .eq('id', deliveryId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully recovered ${recoveredSegments.length} segments`,
        segments: recoveredSegments
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Recovery error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
