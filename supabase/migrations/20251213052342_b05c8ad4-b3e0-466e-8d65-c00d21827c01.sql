-- Create podcast_recordings table for Audio Podcaster dashboard
CREATE TABLE public.podcast_recordings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  audio_url TEXT NOT NULL,
  duration_seconds INTEGER,
  file_size_bytes BIGINT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.podcast_recordings ENABLE ROW LEVEL SECURITY;

-- Create policies for podcast_recordings
CREATE POLICY "Merchants can view their own recordings" 
ON public.podcast_recordings 
FOR SELECT 
USING (auth.uid() = merchant_id);

CREATE POLICY "Merchants can create their own recordings" 
ON public.podcast_recordings 
FOR INSERT 
WITH CHECK (auth.uid() = merchant_id);

CREATE POLICY "Merchants can update their own recordings" 
ON public.podcast_recordings 
FOR UPDATE 
USING (auth.uid() = merchant_id);

CREATE POLICY "Merchants can delete their own recordings" 
ON public.podcast_recordings 
FOR DELETE 
USING (auth.uid() = merchant_id);

CREATE POLICY "Admins can view all recordings" 
ON public.podcast_recordings 
FOR SELECT 
USING (is_admin(auth.uid()));