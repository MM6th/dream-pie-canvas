
-- Create storage bucket for background music files
INSERT INTO storage.buckets (id, name, public)
VALUES ('background-music', 'background-music', true);

-- Create RLS policies for background music bucket
CREATE POLICY "Users can upload background music" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'background-music' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view background music" ON storage.objects
FOR SELECT USING (bucket_id = 'background-music');

CREATE POLICY "Users can update their background music" ON storage.objects
FOR UPDATE USING (bucket_id = 'background-music' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their background music" ON storage.objects
FOR DELETE USING (bucket_id = 'background-music' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add background_music_url column to video_products table
ALTER TABLE video_products ADD COLUMN background_music_url TEXT;
