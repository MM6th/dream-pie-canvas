-- Add download_count column to film_products for tracking free film downloads
ALTER TABLE public.film_products 
ADD COLUMN IF NOT EXISTS download_count integer DEFAULT 0;

-- Create a table to track individual downloads (prevents duplicate counting)
CREATE TABLE public.film_downloads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  film_product_id uuid NOT NULL REFERENCES public.film_products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  downloaded_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(film_product_id, user_id)
);

-- Enable RLS
ALTER TABLE public.film_downloads ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can create their own film downloads"
ON public.film_downloads
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own film downloads"
ON public.film_downloads
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Merchants can view downloads of their films"
ON public.film_downloads
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM film_products 
  WHERE film_products.id = film_downloads.film_product_id 
  AND film_products.merchant_id = auth.uid()
));

CREATE POLICY "Admins can view all film downloads"
ON public.film_downloads
FOR SELECT
USING (is_admin(auth.uid()));

-- Function to increment download count and notify merchant
CREATE OR REPLACE FUNCTION public.handle_film_download()
RETURNS TRIGGER AS $$
DECLARE
  film_record RECORD;
  downloader_name TEXT;
BEGIN
  -- Get film details
  SELECT fp.*, p.display_name as merchant_name
  INTO film_record
  FROM film_products fp
  JOIN profiles p ON p.id = fp.merchant_id
  WHERE fp.id = NEW.film_product_id;
  
  -- Increment download count
  UPDATE film_products 
  SET download_count = COALESCE(download_count, 0) + 1
  WHERE id = NEW.film_product_id;
  
  -- Get downloader's name
  SELECT display_name INTO downloader_name
  FROM profiles WHERE id = NEW.user_id;
  
  -- Create notification for merchant
  INSERT INTO notifications (user_id, type, title, message)
  VALUES (
    film_record.merchant_id,
    'film_download',
    'Film Downloaded',
    COALESCE(downloader_name, 'Someone') || ' downloaded your film "' || film_record.title || '"'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for film downloads
CREATE TRIGGER on_film_download
AFTER INSERT ON public.film_downloads
FOR EACH ROW
EXECUTE FUNCTION public.handle_film_download();