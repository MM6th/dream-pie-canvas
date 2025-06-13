
-- Create storage bucket for user media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-media',
  'user-media',
  true,
  52428800, -- 50MB per file limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime']
);

-- Create storage policies for user media bucket
CREATE POLICY "Users can upload their own media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'user-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own media"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own media"
ON storage.objects FOR UPDATE
USING (bucket_id = 'user-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own media"
ON storage.objects FOR DELETE
USING (bucket_id = 'user-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create table to track user uploads and storage usage
CREATE TABLE public.user_uploads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  storage_bucket TEXT DEFAULT 'user-media',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on user_uploads
ALTER TABLE public.user_uploads ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_uploads
CREATE POLICY "Users can view their own uploads"
ON public.user_uploads FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own uploads"
ON public.user_uploads FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own uploads"
ON public.user_uploads FOR DELETE
USING (auth.uid() = user_id);

-- Create function to calculate total storage used by a user
CREATE OR REPLACE FUNCTION public.get_user_storage_usage(user_uuid UUID)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(file_size) FROM public.user_uploads WHERE user_id = user_uuid),
    0
  );
END;
$$;

-- Create function to check if user can upload (under 2GB limit)
CREATE OR REPLACE FUNCTION public.can_user_upload(user_uuid UUID, new_file_size BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_usage BIGINT;
  max_storage BIGINT := 2147483648; -- 2GB in bytes
BEGIN
  current_usage := public.get_user_storage_usage(user_uuid);
  RETURN (current_usage + new_file_size) <= max_storage;
END;
$$;
