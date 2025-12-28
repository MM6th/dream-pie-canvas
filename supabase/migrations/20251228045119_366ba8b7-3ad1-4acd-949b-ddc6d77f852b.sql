-- Add bypass flag for testing
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS disable_film_publish_lock boolean DEFAULT false;

-- Update user to bypass film publishing lock
UPDATE profiles 
SET disable_film_publish_lock = true
WHERE id = 'cedd3262-be80-4af4-9675-c081107cecb5';

-- Update the validate_film_publishing function to respect the bypass flag
CREATE OR REPLACE FUNCTION public.validate_film_publishing()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_free_films INTEGER;
  v_can_publish BOOLEAN;
  v_active_film_id UUID;
  v_active_film_sales INTEGER;
  v_bypass_lock BOOLEAN;
BEGIN
  -- Get merchant's current publishing status including bypass flag
  SELECT free_films_published, can_publish_film, active_film_id, COALESCE(disable_film_publish_lock, false)
  INTO v_free_films, v_can_publish, v_active_film_id, v_bypass_lock
  FROM profiles 
  WHERE id = NEW.merchant_id;
  
  -- If bypass is enabled, skip all restrictions
  IF v_bypass_lock THEN
    RETURN NEW;
  END IF;
  
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
$function$;