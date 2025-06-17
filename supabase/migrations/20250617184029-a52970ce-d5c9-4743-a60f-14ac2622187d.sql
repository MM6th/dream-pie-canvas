
-- Create enum for astrology product types
CREATE TYPE public.astrology_product_type AS ENUM (
  'natal_chart_reading',
  'solar_return_reading', 
  'north_node_reading',
  'career_path_reading'
);

-- Create enum for delivery types
CREATE TYPE public.delivery_type AS ENUM (
  'telephone',
  'audio_file',
  'video_file'
);

-- Create astrology_products table
CREATE TABLE public.astrology_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL,
  product_type astrology_product_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  delivery_type delivery_type NOT NULL,
  base_price NUMERIC NOT NULL,
  hours_selected INTEGER DEFAULT 1, -- For telephone consultations
  total_price NUMERIC NOT NULL,
  buyer_email TEXT, -- For telephone consultations
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.astrology_products ENABLE ROW LEVEL SECURITY;

-- Create policies - only admins can manage astrology products
CREATE POLICY "Admins can view all astrology products" 
  ON public.astrology_products 
  FOR SELECT 
  USING (public.is_admin(auth.uid()) OR true); -- Everyone can view for store

CREATE POLICY "Admins can create astrology products" 
  ON public.astrology_products 
  FOR INSERT 
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update astrology products" 
  ON public.astrology_products 
  FOR UPDATE 
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete astrology products" 
  ON public.astrology_products 
  FOR DELETE 
  USING (public.is_admin(auth.uid()));

-- Create astrology_purchases table for tracking purchases
CREATE TABLE public.astrology_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  astrology_product_id UUID NOT NULL REFERENCES public.astrology_products(id) ON DELETE CASCADE,
  buyer_email TEXT NOT NULL,
  purchase_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  amount_paid NUMERIC NOT NULL,
  paypal_transaction_id TEXT,
  delivery_type delivery_type NOT NULL,
  hours_purchased INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for purchases
ALTER TABLE public.astrology_purchases ENABLE ROW LEVEL SECURITY;

-- Create policies for purchases
CREATE POLICY "Users can view their own astrology purchases" 
  ON public.astrology_purchases 
  FOR SELECT 
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Users can create their own astrology purchases" 
  ON public.astrology_purchases 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all astrology purchases" 
  ON public.astrology_purchases 
  FOR SELECT 
  USING (public.is_admin(auth.uid()));
