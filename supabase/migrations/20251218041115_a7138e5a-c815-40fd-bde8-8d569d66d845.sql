-- Create film_products table
CREATE TABLE public.film_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  stars TEXT[] DEFAULT '{}',
  genres TEXT[] DEFAULT '{}',
  price NUMERIC,
  is_free BOOLEAN NOT NULL DEFAULT false,
  thumbnail_url TEXT,
  cover_photo_url TEXT,
  trailer_url TEXT,
  full_video_url TEXT,
  ownership_confirmed BOOLEAN NOT NULL DEFAULT false,
  is_adult_content BOOLEAN DEFAULT false,
  access_level public.access_level DEFAULT 'public'::public.access_level,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create film_scripts table
CREATE TABLE public.film_scripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  script_content TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create script_invitations table
CREATE TABLE public.script_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  script_id UUID NOT NULL REFERENCES public.film_scripts(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invitee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  credits_spent INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on all tables
ALTER TABLE public.film_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.film_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.script_invitations ENABLE ROW LEVEL SECURITY;

-- RLS policies for film_products
CREATE POLICY "Anyone can view published films" ON public.film_products
  FOR SELECT USING (status = 'published');

CREATE POLICY "Merchants can view their own films" ON public.film_products
  FOR SELECT USING (auth.uid() = merchant_id);

CREATE POLICY "Merchants can create their own films" ON public.film_products
  FOR INSERT WITH CHECK (auth.uid() = merchant_id);

CREATE POLICY "Merchants can update their own films" ON public.film_products
  FOR UPDATE USING (auth.uid() = merchant_id);

CREATE POLICY "Merchants can delete their own films" ON public.film_products
  FOR DELETE USING (auth.uid() = merchant_id);

CREATE POLICY "Admins can view all films" ON public.film_products
  FOR SELECT USING (is_admin(auth.uid()));

-- RLS policies for film_scripts
CREATE POLICY "Merchants can view their own scripts" ON public.film_scripts
  FOR SELECT USING (auth.uid() = merchant_id);

CREATE POLICY "Merchants can create their own scripts" ON public.film_scripts
  FOR INSERT WITH CHECK (auth.uid() = merchant_id);

CREATE POLICY "Merchants can update their own scripts" ON public.film_scripts
  FOR UPDATE USING (auth.uid() = merchant_id);

CREATE POLICY "Merchants can delete their own scripts" ON public.film_scripts
  FOR DELETE USING (auth.uid() = merchant_id);

CREATE POLICY "Invitees can view scripts they are invited to" ON public.film_scripts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.script_invitations
      WHERE script_id = film_scripts.id 
      AND invitee_id = auth.uid()
      AND status = 'accepted'
    )
  );

-- RLS policies for script_invitations
CREATE POLICY "Inviters can view their invitations" ON public.script_invitations
  FOR SELECT USING (auth.uid() = inviter_id);

CREATE POLICY "Invitees can view invitations to them" ON public.script_invitations
  FOR SELECT USING (auth.uid() = invitee_id);

CREATE POLICY "Merchants can create invitations" ON public.script_invitations
  FOR INSERT WITH CHECK (auth.uid() = inviter_id);

CREATE POLICY "Invitees can update invitation status" ON public.script_invitations
  FOR UPDATE USING (auth.uid() = invitee_id);

-- Timestamp triggers
CREATE TRIGGER update_film_products_timestamp
  BEFORE UPDATE ON public.film_products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_dance_products_timestamp();

CREATE TRIGGER update_film_scripts_timestamp
  BEFORE UPDATE ON public.film_scripts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_dance_products_timestamp();

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('film-videos', 'film-videos', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('film-trailers', 'film-trailers', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('film-thumbnails', 'film-thumbnails', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('film-covers', 'film-covers', true);

-- Storage policies for film-videos
CREATE POLICY "Anyone can view film videos" ON storage.objects
  FOR SELECT USING (bucket_id = 'film-videos');

CREATE POLICY "Authenticated users can upload film videos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'film-videos' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own film videos" ON storage.objects
  FOR UPDATE USING (bucket_id = 'film-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own film videos" ON storage.objects
  FOR DELETE USING (bucket_id = 'film-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for film-trailers
CREATE POLICY "Anyone can view film trailers" ON storage.objects
  FOR SELECT USING (bucket_id = 'film-trailers');

CREATE POLICY "Authenticated users can upload film trailers" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'film-trailers' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own film trailers" ON storage.objects
  FOR UPDATE USING (bucket_id = 'film-trailers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own film trailers" ON storage.objects
  FOR DELETE USING (bucket_id = 'film-trailers' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for film-thumbnails
CREATE POLICY "Anyone can view film thumbnails" ON storage.objects
  FOR SELECT USING (bucket_id = 'film-thumbnails');

CREATE POLICY "Authenticated users can upload film thumbnails" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'film-thumbnails' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own film thumbnails" ON storage.objects
  FOR UPDATE USING (bucket_id = 'film-thumbnails' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own film thumbnails" ON storage.objects
  FOR DELETE USING (bucket_id = 'film-thumbnails' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for film-covers
CREATE POLICY "Anyone can view film covers" ON storage.objects
  FOR SELECT USING (bucket_id = 'film-covers');

CREATE POLICY "Authenticated users can upload film covers" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'film-covers' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own film covers" ON storage.objects
  FOR UPDATE USING (bucket_id = 'film-covers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own film covers" ON storage.objects
  FOR DELETE USING (bucket_id = 'film-covers' AND auth.uid()::text = (storage.foldername(name))[1]);