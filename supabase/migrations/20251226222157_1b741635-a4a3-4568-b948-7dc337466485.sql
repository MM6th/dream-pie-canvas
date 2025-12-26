-- Create film_purchases table to track film purchases
CREATE TABLE public.film_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  film_product_id UUID NOT NULL REFERENCES public.film_products(id) ON DELETE CASCADE,
  amount_paid NUMERIC NOT NULL,
  paypal_transaction_id TEXT,
  purchase_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create film_reviews table for film-specific reviews
CREATE TABLE public.film_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  film_product_id UUID NOT NULL REFERENCES public.film_products(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, film_product_id)
);

-- Add transit meter tracking columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS free_films_published INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_film_sales INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_film_id UUID REFERENCES public.film_products(id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS can_publish_film BOOLEAN DEFAULT true;

-- Add sales count columns to film_products
ALTER TABLE public.film_products ADD COLUMN IF NOT EXISTS sales_count INTEGER DEFAULT 0;
ALTER TABLE public.film_products ADD COLUMN IF NOT EXISTS meter_reset_count INTEGER DEFAULT 0;

-- Enable RLS on new tables
ALTER TABLE public.film_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.film_reviews ENABLE ROW LEVEL SECURITY;

-- RLS policies for film_purchases
CREATE POLICY "Users can view their own film purchases" 
ON public.film_purchases FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all film purchases" 
ON public.film_purchases FOR SELECT 
USING (is_admin(auth.uid()));

CREATE POLICY "Users can create their own film purchases" 
ON public.film_purchases FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Merchants can view purchases of their films" 
ON public.film_purchases FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM film_products 
  WHERE film_products.id = film_purchases.film_product_id 
  AND film_products.merchant_id = auth.uid()
));

-- RLS policies for film_reviews
CREATE POLICY "Anyone can view film reviews" 
ON public.film_reviews FOR SELECT 
USING (true);

CREATE POLICY "Users can create reviews for purchased films" 
ON public.film_reviews FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM film_purchases 
    WHERE film_purchases.user_id = auth.uid() 
    AND film_purchases.film_product_id = film_reviews.film_product_id
  )
);

CREATE POLICY "Users can update their own reviews" 
ON public.film_reviews FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews" 
ON public.film_reviews FOR DELETE 
USING (auth.uid() = user_id);

-- Function to increment film sales and update transit meter
CREATE OR REPLACE FUNCTION public.increment_film_sales()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_merchant_id UUID;
  v_current_sales INTEGER;
BEGIN
  -- Get the merchant_id and increment sales_count on the film
  UPDATE film_products 
  SET sales_count = sales_count + 1
  WHERE id = NEW.film_product_id
  RETURNING merchant_id, sales_count INTO v_merchant_id, v_current_sales;
  
  -- Update the merchant's current_film_sales
  UPDATE profiles 
  SET current_film_sales = current_film_sales + 1
  WHERE id = v_merchant_id;
  
  -- Check if we've reached 30 sales - reset meter and allow new publishing
  IF v_current_sales >= 30 THEN
    -- Increment meter_reset_count on the film
    UPDATE film_products 
    SET meter_reset_count = meter_reset_count + 1, sales_count = 0
    WHERE id = NEW.film_product_id;
    
    -- Reset merchant's current_film_sales and allow publishing
    UPDATE profiles 
    SET current_film_sales = 0, 
        can_publish_film = true,
        active_film_id = NULL
    WHERE id = v_merchant_id;
  END IF;
  
  -- Update quarterly income for the merchant
  PERFORM update_quarterly_income(v_merchant_id, 'film_revenue', NEW.amount_paid * 0.9);
  
  RETURN NEW;
END;
$$;

-- Trigger to call increment_film_sales on new purchase
CREATE TRIGGER trigger_increment_film_sales
AFTER INSERT ON public.film_purchases
FOR EACH ROW
EXECUTE FUNCTION public.increment_film_sales();

-- Function to validate film publishing
CREATE OR REPLACE FUNCTION public.validate_film_publishing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_free_films INTEGER;
  v_can_publish BOOLEAN;
  v_active_film_id UUID;
  v_active_film_sales INTEGER;
BEGIN
  -- Get merchant's current publishing status
  SELECT free_films_published, can_publish_film, active_film_id 
  INTO v_free_films, v_can_publish, v_active_film_id
  FROM profiles 
  WHERE id = NEW.merchant_id;
  
  -- Check free film limit (only 1 free film allowed)
  IF NEW.is_free = true AND v_free_films >= 1 THEN
    RAISE EXCEPTION 'You can only publish 1 free film. Please set a price for this film.';
  END IF;
  
  -- Check if merchant can publish (must have sold 30 films from previous film)
  IF v_active_film_id IS NOT NULL AND NOT v_can_publish THEN
    SELECT sales_count INTO v_active_film_sales 
    FROM film_products 
    WHERE id = v_active_film_id;
    
    RAISE EXCEPTION 'You must sell 30 copies of your current film before publishing another. Current sales: %/30', COALESCE(v_active_film_sales, 0);
  END IF;
  
  -- If publishing a free film, increment counter
  IF NEW.is_free = true THEN
    UPDATE profiles 
    SET free_films_published = free_films_published + 1
    WHERE id = NEW.merchant_id;
  END IF;
  
  -- Set this as the active film and lock publishing (unless it's a free film)
  IF NEW.is_free = false THEN
    UPDATE profiles 
    SET active_film_id = NEW.id, 
        can_publish_film = false,
        current_film_sales = 0
    WHERE id = NEW.merchant_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to validate before inserting a new film
CREATE TRIGGER trigger_validate_film_publishing
AFTER INSERT ON public.film_products
FOR EACH ROW
WHEN (NEW.status = 'published')
EXECUTE FUNCTION public.validate_film_publishing();