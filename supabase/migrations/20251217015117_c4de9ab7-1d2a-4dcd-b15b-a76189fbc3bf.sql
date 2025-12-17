-- Create dance_products table
CREATE TABLE public.dance_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.profiles(id),
  title text NOT NULL,
  description text,
  price numeric,
  is_free boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'published',
  is_adult_content boolean DEFAULT false,
  access_level public.access_level DEFAULT 'public'::public.access_level,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create dance_product_images table
CREATE TABLE public.dance_product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dance_product_id uuid NOT NULL REFERENCES public.dance_products(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  media_type text DEFAULT 'image',
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.dance_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dance_product_images ENABLE ROW LEVEL SECURITY;

-- RLS policies for dance_products
CREATE POLICY "Anyone can view published dance products"
ON public.dance_products FOR SELECT
USING (status = 'published');

CREATE POLICY "Merchants can view their own dance products"
ON public.dance_products FOR SELECT
USING (auth.uid() = merchant_id);

CREATE POLICY "Merchants can create their own dance products"
ON public.dance_products FOR INSERT
WITH CHECK (auth.uid() = merchant_id);

CREATE POLICY "Merchants can update their own dance products"
ON public.dance_products FOR UPDATE
USING (auth.uid() = merchant_id);

CREATE POLICY "Merchants can delete their own dance products"
ON public.dance_products FOR DELETE
USING (auth.uid() = merchant_id);

-- RLS policies for dance_product_images
CREATE POLICY "Anyone can view dance product images"
ON public.dance_product_images FOR SELECT
USING (true);

CREATE POLICY "Merchants can manage their dance product images"
ON public.dance_product_images FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.dance_products
    WHERE dance_products.id = dance_product_images.dance_product_id
    AND dance_products.merchant_id = auth.uid()
  )
);

-- Create update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_dance_products_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_dance_products_updated_at
BEFORE UPDATE ON public.dance_products
FOR EACH ROW
EXECUTE FUNCTION public.update_dance_products_timestamp();

-- Create dance-images storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('dance-images', 'dance-images', true);

-- Storage policies for dance-images bucket
CREATE POLICY "Anyone can view dance images"
ON storage.objects FOR SELECT
USING (bucket_id = 'dance-images');

CREATE POLICY "Authenticated users can upload dance images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'dance-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own dance images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'dance-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own dance images"
ON storage.objects FOR DELETE
USING (bucket_id = 'dance-images' AND auth.uid()::text = (storage.foldername(name))[1]);