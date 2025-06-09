
-- Create video_products table similar to audio_products
CREATE TABLE public.video_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  video_type TEXT NOT NULL,
  video_file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  is_free BOOLEAN NOT NULL DEFAULT true,
  price NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security (RLS)
ALTER TABLE public.video_products ENABLE ROW LEVEL SECURITY;

-- Create policies for video_products
CREATE POLICY "Users can view all video products" 
  ON public.video_products 
  FOR SELECT 
  USING (true);

CREATE POLICY "Merchants can manage their own video products" 
  ON public.video_products 
  FOR ALL 
  USING (auth.uid() = merchant_id);

-- Create storage buckets for videos if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('videos', 'videos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for videos bucket (drop if exists first to avoid conflicts)
DROP POLICY IF EXISTS "Anyone can view videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload videos" ON storage.objects;

CREATE POLICY "Anyone can view videos" 
  ON storage.objects 
  FOR SELECT 
  USING (bucket_id = 'videos');

CREATE POLICY "Authenticated users can upload videos" 
  ON storage.objects 
  FOR INSERT 
  WITH CHECK (bucket_id = 'videos' AND auth.role() = 'authenticated');
