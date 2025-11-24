-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Public read access to astrology videos" ON storage.objects;

-- Create updated policy that allows anyone to view astrology delivery videos
CREATE POLICY "Public read access to astrology videos"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'user-media' 
  AND (
    name LIKE 'astrology-deliveries/%'
  )
);