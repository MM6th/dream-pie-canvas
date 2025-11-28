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
  fileSize: number;
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

    // Step 1: Collect all valid files (>10KB) regardless of segment number
    const allValidFiles: SegmentInfo[] = [];
    
    for (const file of (files as StorageFile[]) || []) {
      // Match pattern: segment-{number}-{timestamp}.webm
      const match = file.name.match(/segment-(\d+)-(\d+)\.webm/);
      if (match) {
        const segmentNumber = parseInt(match[1]);
        const timestamp = parseInt(match[2]);
        const fileSize = file.metadata?.size || 0;
        
        const { data: urlData } = supabase.storage
          .from('user-media')
          .getPublicUrl(`${folderPath}/${file.name}`);
        
        // Only include valid files (>10KB)
        if (fileSize > 10000) {
          console.log(`Valid file: ${file.name} (${(fileSize/1024).toFixed(2)} KB)`);
          allValidFiles.push({
            segmentNumber,
            timestamp,
            fileName: file.name,
            url: urlData.publicUrl,
            fileSize
          });
        } else {
          console.log(`Skipping corrupted: ${file.name} (${fileSize} bytes)`);
        }
      }
    }

    console.log(`Total valid files: ${allValidFiles.length}`);

    // Step 2: Deduplicate by file size (files with same size are duplicates)
    const uniqueBySize = new Map<number, SegmentInfo>();

    for (const file of allValidFiles) {
      // Keep file if we haven't seen this size, or if this has earlier timestamp
      if (!uniqueBySize.has(file.fileSize) || 
          file.timestamp < uniqueBySize.get(file.fileSize)!.timestamp) {
        uniqueBySize.set(file.fileSize, file);
      }
    }

    console.log(`Unique files after deduplication: ${uniqueBySize.size}`);

    // Step 3: Sort by timestamp (chronological recording order)
    const chronologicalFiles = Array.from(uniqueBySize.values())
      .sort((a, b) => a.timestamp - b.timestamp);

    // Step 4: Build final segment list (renumbered sequentially)
    const recoveredSegments = chronologicalFiles.map((file, index) => {
      const recordedAt = new Date(file.timestamp).toISOString();
      const fileSizeKB = (file.fileSize / 1024).toFixed(2);
      console.log(`Segment ${index}: ${file.fileName} (recorded ${recordedAt}, ${fileSizeKB} KB)`);
      
      return {
        id: file.timestamp.toString(),
        url: file.url,
        duration: 0 // Will be set when video loads in UI
      };
    });

    console.log(`Recovered ${recoveredSegments.length} segments in chronological order`);

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
