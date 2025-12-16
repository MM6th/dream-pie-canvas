-- Create food_products table
CREATE TABLE public.food_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL CHECK (price >= 20),
  status TEXT NOT NULL DEFAULT 'published',
  is_adult_content BOOLEAN DEFAULT false,
  access_level public.access_level DEFAULT 'public'::access_level,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create food_product_images table
CREATE TABLE public.food_product_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  food_product_id UUID NOT NULL REFERENCES public.food_products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  media_type TEXT DEFAULT 'image',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create storage bucket for food images
INSERT INTO storage.buckets (id, name, public)
VALUES ('food-images', 'food-images', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on food_products
ALTER TABLE public.food_products ENABLE ROW LEVEL SECURITY;

-- Enable RLS on food_product_images
ALTER TABLE public.food_product_images ENABLE ROW LEVEL SECURITY;

-- RLS policies for food_products
CREATE POLICY "Anyone can view published food products"
ON public.food_products
FOR SELECT
USING (status = 'published');

CREATE POLICY "Merchants can create their own food products"
ON public.food_products
FOR INSERT
WITH CHECK (auth.uid() = merchant_id);

CREATE POLICY "Merchants can update their own food products"
ON public.food_products
FOR UPDATE
USING (auth.uid() = merchant_id);

CREATE POLICY "Merchants can delete their own food products"
ON public.food_products
FOR DELETE
USING (auth.uid() = merchant_id);

CREATE POLICY "Merchants can view their own food products"
ON public.food_products
FOR SELECT
USING (auth.uid() = merchant_id);

-- RLS policies for food_product_images
CREATE POLICY "Anyone can view food product images"
ON public.food_product_images
FOR SELECT
USING (true);

CREATE POLICY "Merchants can manage their own food product images"
ON public.food_product_images
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.food_products
    WHERE food_products.id = food_product_images.food_product_id
    AND food_products.merchant_id = auth.uid()
  )
);

-- Storage policies for food-images bucket
CREATE POLICY "Anyone can view food images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'food-images');

CREATE POLICY "Authenticated users can upload food images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'food-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own food images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'food-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own food images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'food-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_food_products_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_food_products_updated_at
BEFORE UPDATE ON public.food_products
FOR EACH ROW
EXECUTE FUNCTION public.update_food_products_timestamp();