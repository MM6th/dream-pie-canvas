-- Create user playlists table for profile showcases
CREATE TABLE public.user_playlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  audio_product_id UUID NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, audio_product_id),
  CONSTRAINT user_playlists_display_order_check CHECK (display_order >= 1 AND display_order <= 5)
);

-- Enable RLS
ALTER TABLE public.user_playlists ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user playlists
CREATE POLICY "Users can view all playlists" 
ON public.user_playlists 
FOR SELECT 
USING (true);

CREATE POLICY "Users can manage their own playlists" 
ON public.user_playlists 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_user_playlists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_playlists_updated_at
BEFORE UPDATE ON public.user_playlists
FOR EACH ROW
EXECUTE FUNCTION public.update_user_playlists_updated_at();