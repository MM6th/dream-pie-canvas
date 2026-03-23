UPDATE storage.buckets
SET allowed_mime_types = array_cat(allowed_mime_types, ARRAY['image/jpeg', 'image/png', 'video/mp4'])
WHERE id = 'user-media';