
-- Create the fashion-images storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'fashion-images',
  'fashion-images', 
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
);

-- Create storage policies for fashion-images bucket
CREATE POLICY "Anyone can view fashion images" ON storage.objects
  FOR SELECT USING (bucket_id = 'fashion-images');

CREATE POLICY "Authenticated users can upload fashion images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'fashion-images' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update their own fashion images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'fashion-images' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can delete their own fashion images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'fashion-images' 
    AND auth.role() = 'authenticated'
  );
