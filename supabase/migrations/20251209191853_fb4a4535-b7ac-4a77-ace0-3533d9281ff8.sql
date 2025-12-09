-- Add is_live_stream_artist to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_live_stream_artist boolean DEFAULT false;

-- Create livestream_settings table
CREATE TABLE public.livestream_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  enabled BOOLEAN DEFAULT true,
  credits_per_minute INTEGER DEFAULT 5,
  session_duration_minutes INTEGER DEFAULT 20,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.livestream_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for livestream_settings
CREATE POLICY "Anyone can view livestream settings"
ON public.livestream_settings FOR SELECT USING (true);

CREATE POLICY "Merchants can insert their own settings"
ON public.livestream_settings FOR INSERT WITH CHECK (auth.uid() = merchant_id);

CREATE POLICY "Merchants can update their own settings"
ON public.livestream_settings FOR UPDATE USING (auth.uid() = merchant_id);

-- Create livestream_entries table
CREATE TABLE public.livestream_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bulletin_post_id UUID REFERENCES public.bulletin_posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  credits_spent INTEGER NOT NULL,
  entered_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(bulletin_post_id, user_id)
);

-- Enable RLS
ALTER TABLE public.livestream_entries ENABLE ROW LEVEL SECURITY;

-- RLS policies for livestream_entries
CREATE POLICY "Users can view their own entries"
ON public.livestream_entries FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create entries"
ON public.livestream_entries FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all entries"
ON public.livestream_entries FOR SELECT USING (is_admin(auth.uid()));

-- Add livestream fields to bulletin_posts
ALTER TABLE public.bulletin_posts
ADD COLUMN IF NOT EXISTS is_paid_livestream BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS livestream_credits_per_minute INTEGER;

-- Create trigger for livestream_settings updated_at
CREATE OR REPLACE FUNCTION public.update_livestream_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_livestream_settings_updated_at
BEFORE UPDATE ON public.livestream_settings
FOR EACH ROW EXECUTE FUNCTION public.update_livestream_settings_timestamp();