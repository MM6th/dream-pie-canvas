
-- Create fashion_products table
CREATE TABLE public.fashion_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  materials TEXT,
  price NUMERIC(10,2) NOT NULL,
  shipping_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5,4) NOT NULL DEFAULT 0.0825,
  admin_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create fashion_product_images table for slideshow
CREATE TABLE public.fashion_product_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fashion_product_id UUID NOT NULL REFERENCES public.fashion_products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create size enum
CREATE TYPE public.fashion_size AS ENUM ('XS', 'S', 'M', 'L', 'XL', '2XL');

-- Create color enum  
CREATE TYPE public.fashion_color AS ENUM ('black', 'white', 'nude', 'red', 'blue', 'pink', 'green');

-- Create fashion_product_variants table for size/color/stock combinations
CREATE TABLE public.fashion_product_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fashion_product_id UUID NOT NULL REFERENCES public.fashion_products(id) ON DELETE CASCADE,
  size fashion_size NOT NULL,
  color fashion_color NOT NULL,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(fashion_product_id, size, color)
);

-- Create fashion_purchases table for PayPal transactions
CREATE TABLE public.fashion_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  fashion_product_id UUID NOT NULL REFERENCES public.fashion_products(id),
  variant_id UUID NOT NULL REFERENCES public.fashion_product_variants(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL,
  shipping_cost NUMERIC(10,2) NOT NULL,
  tax_amount NUMERIC(10,2) NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL,
  paypal_transaction_id TEXT,
  purchase_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.fashion_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fashion_product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fashion_product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fashion_purchases ENABLE ROW LEVEL SECURITY;

-- RLS Policies for fashion_products
CREATE POLICY "Anyone can view fashion products" 
  ON public.fashion_products 
  FOR SELECT 
  USING (true);

CREATE POLICY "Only admins can create fashion products" 
  ON public.fashion_products 
  FOR INSERT 
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can update fashion products" 
  ON public.fashion_products 
  FOR UPDATE 
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can delete fashion products" 
  ON public.fashion_products 
  FOR DELETE 
  USING (public.is_admin(auth.uid()));

-- RLS Policies for fashion_product_images
CREATE POLICY "Anyone can view fashion product images" 
  ON public.fashion_product_images 
  FOR SELECT 
  USING (true);

CREATE POLICY "Only admins can manage fashion product images" 
  ON public.fashion_product_images 
  FOR ALL 
  USING (public.is_admin(auth.uid()));

-- RLS Policies for fashion_product_variants
CREATE POLICY "Anyone can view fashion product variants" 
  ON public.fashion_product_variants 
  FOR SELECT 
  USING (true);

CREATE POLICY "Only admins can manage fashion product variants" 
  ON public.fashion_product_variants 
  FOR ALL 
  USING (public.is_admin(auth.uid()));

-- RLS Policies for fashion_purchases
CREATE POLICY "Users can view their own fashion purchases" 
  ON public.fashion_purchases 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own fashion purchases" 
  ON public.fashion_purchases 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all fashion purchases" 
  ON public.fashion_purchases 
  FOR SELECT 
  USING (public.is_admin(auth.uid()));
