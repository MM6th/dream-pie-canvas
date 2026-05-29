// One-shot admin cleanup: deletes ALL storage files owned by two hardcoded user IDs
// across every bucket, using the Storage API (the only allowed deletion path).
// After running this successfully, the function file can be removed.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const TARGET_USER_IDS = [
  "bb3dbb3c-c939-45f3-834f-b82a7e50dd21", // ratedBenjiman / chaunceymoore9@gmail.com
  "d31a320c-e3bd-4816-b5ea-da1b169e3a93", // Observer / cryptosixth6th@gmail.com
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const summary: Record<string, { deleted: number; bytes: number; errors: string[] }> = {};

  // Find every storage object whose top-level folder matches a target user id
  const { data: objs, error: listErr } = await supabase
    .schema("storage")
    .from("objects")
    .select("bucket_id,name,metadata")
    .or(
      TARGET_USER_IDS.map((id) => `name.like.${id}/%`).join(","),
    )
    .limit(10000);

  if (listErr) {
    return new Response(JSON.stringify({ error: listErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Group by bucket and remove in batches of 200
  const byBucket = new Map<string, { paths: string[]; bytes: number }>();
  for (const o of objs ?? []) {
    const bucket = (o as any).bucket_id as string;
    const size = Number(((o as any).metadata?.size) ?? 0);
    if (!byBucket.has(bucket)) byBucket.set(bucket, { paths: [], bytes: 0 });
    byBucket.get(bucket)!.paths.push((o as any).name);
    byBucket.get(bucket)!.bytes += size;
  }

  for (const [bucket, { paths, bytes }] of byBucket.entries()) {
    summary[bucket] = { deleted: 0, bytes, errors: [] };
    for (let i = 0; i < paths.length; i += 200) {
      const batch = paths.slice(i, i + 200);
      const { data, error } = await supabase.storage.from(bucket).remove(batch);
      if (error) summary[bucket].errors.push(error.message);
      else summary[bucket].deleted += data?.length ?? 0;
    }
  }

  return new Response(JSON.stringify({ ok: true, summary }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
