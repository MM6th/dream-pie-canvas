-- Create podcast_settings table for per-merchant podcast defaults
CREATE TABLE public.podcast_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  default_thumbnail_url TEXT,
  moon_tier_description TEXT,
  venus_tier_description TEXT,
  jupiter_tier_description TEXT,
  default_tier TEXT DEFAULT 'moon',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.podcast_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own podcast settings"
ON public.podcast_settings
FOR SELECT
USING (auth.uid() = merchant_id);

CREATE POLICY "Users can insert their own podcast settings"
ON public.podcast_settings
FOR INSERT
WITH CHECK (auth.uid() = merchant_id);

CREATE POLICY "Users can update their own podcast settings"
ON public.podcast_settings
FOR UPDATE
USING (auth.uid() = merchant_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_podcast_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_podcast_settings_updated_at
BEFORE UPDATE ON public.podcast_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_podcast_settings_timestamp();

-- Update the Venus tier podcast for chaunceymoore9@gmail.com
UPDATE podcast_recordings 
SET tier_description = 'Benjiman interviews people on the website, and invites co-hosts for discussions'
WHERE id = '7de1624e-9aa1-46ea-ad7d-9ac7a5cc12af';