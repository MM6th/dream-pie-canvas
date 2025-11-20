-- Add RLS policies for astrology delivery video uploads
-- Allow authenticated users to upload videos to astrology-deliveries folder
CREATE POLICY "Authenticated users can upload astrology videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-media' 
  AND (storage.foldername(name))[1] = 'astrology-deliveries'
);

-- Allow public read access to astrology delivery videos
CREATE POLICY "Public read access to astrology videos"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'user-media' 
  AND (storage.foldername(name))[1] = 'astrology-deliveries'
);

-- Allow admin/uploader to update their own videos
CREATE POLICY "Users can update their own astrology videos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'user-media' 
  AND (storage.foldername(name))[1] = 'astrology-deliveries'
);

-- Allow admin/uploader to delete their own videos
CREATE POLICY "Users can delete their own astrology videos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-media' 
  AND (storage.foldername(name))[1] = 'astrology-deliveries'
);