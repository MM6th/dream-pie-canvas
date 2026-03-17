UPDATE storage.buckets 
SET allowed_mime_types = array_cat(
  COALESCE(allowed_mime_types, ARRAY[]::text[]), 
  ARRAY['video/webm', 'video/webm;codecs=vp9,opus', 'video/mp4']
) 
WHERE id = 'user-media' 
AND NOT (allowed_mime_types @> ARRAY['video/webm']);