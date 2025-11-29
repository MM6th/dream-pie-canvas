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

    const body = await req.json().catch(() => ({}));
    const path = body.path || '86358c22-bc4d-4aab-bd89-d6d988004557';

    console.log('Listing files in path:', path);

    // List all files in the delivery folder
    const { data: files, error } = await supabase.storage
      .from('user-media')
      .list(path, {
        limit: 100,
        sortBy: { column: 'name', order: 'asc' }
      });

    if (error) {
      console.error('Storage list error:', error);
      throw error;
    }

    console.log('Found files:', files?.length || 0);

    // Get file details including size
    const fileDetails = files?.map(file => ({
      name: file.name,
      size: file.metadata?.size || 0,
      created: file.created_at,
      url: `${supabaseUrl}/storage/v1/object/public/user-media/${path}/${file.name}`
    })) || [];

    return new Response(JSON.stringify({ 
      success: true, 
      path,
      fileCount: fileDetails.length,
      files: fileDetails 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
