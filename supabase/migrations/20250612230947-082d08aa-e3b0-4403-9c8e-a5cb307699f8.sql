
-- Add new columns to the profiles table for merchant profile data
ALTER TABLE public.profiles 
ADD COLUMN display_name text,
ADD COLUMN avatar_url text,
ADD COLUMN facebook_url text,
ADD COLUMN instagram_url text,
ADD COLUMN youtube_url text,
ADD COLUMN snapchat_url text,
ADD COLUMN pinterest_url text,
ADD COLUMN onlyfans_url text,
ADD COLUMN paypal_email text;

-- Create storage bucket for profile avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

-- Create RLS policies for the avatars bucket
CREATE POLICY "Users can view avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatars" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatars" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatars" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);
