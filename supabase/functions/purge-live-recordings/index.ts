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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const BUCKET = 'user-media';
    let totalDeleted = 0;
    let errors: string[] = [];

    // List all top-level folders (user IDs)
    const { data: topFolders, error: topErr } = await supabase.storage
      .from(BUCKET)
      .list('', { limit: 1000 });

    if (topErr) throw topErr;

    for (const folder of (topFolders || [])) {
      if (!folder.id) continue; // skip files, only process folders

      // List inside each user folder for a live-recordings subfolder
      const { data: subFolders } = await supabase.storage
        .from(BUCKET)
        .list(folder.name, { limit: 1000 });

      const recordingFolder = (subFolders || []).find(
        (f) => f.name === 'live-recordings' && !f.id
      );

      if (!recordingFolder) continue;

      const folderPath = `${folder.name}/live-recordings`;

      // List all files inside the live-recordings folder
      const { data: files, error: listErr } = await supabase.storage
        .from(BUCKET)
        .list(folderPath, { limit: 1000 });

      if (listErr) {
        errors.push(`list ${folderPath}: ${listErr.message}`);
        continue;
      }

      if (!files || files.length === 0) continue;

      const paths = files.map((f) => `${folderPath}/${f.name}`);
      const { error: delErr } = await supabase.storage.from(BUCKET).remove(paths);

      if (delErr) {
        errors.push(`delete ${folderPath}: ${delErr.message}`);
      } else {
        totalDeleted += paths.length;
        console.log(`Deleted ${paths.length} files from ${folderPath}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, totalDeleted, errors }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
