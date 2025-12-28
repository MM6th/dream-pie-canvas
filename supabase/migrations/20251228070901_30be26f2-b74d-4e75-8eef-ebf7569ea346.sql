-- Update validate_film_publishing to lock publishing even for free films
-- But the transit meter/sales still only count for paid films
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
  
  -- Set this as the active film and lock publishing for ALL films (free and paid)
  UPDATE profiles 
  SET active_film_id = NEW.id, 
      can_publish_film = false,
      current_film_sales = 0
  WHERE id = NEW.merchant_id;
  
  RETURN NEW;
END;
$function$;

-- Update increment_film_sales to work with free films too
-- The meter tracks based on the ACTIVE film, not the purchased film
CREATE OR REPLACE FUNCTION public.increment_film_sales()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_merchant_id UUID;
  v_current_sales INTEGER;
  v_active_film_id UUID;
BEGIN
  -- Check if this was a free film (amount_paid = 0 or very small)
  IF NEW.amount_paid <= 0 THEN
    -- Free download - don't count toward transit meter
    RETURN NEW;
  END IF;

  -- PAID purchase - get the film's merchant
  SELECT merchant_id INTO v_merchant_id
  FROM film_products 
  WHERE id = NEW.film_product_id;

  -- Increment sales_count on the purchased film
  UPDATE film_products 
  SET sales_count = sales_count + 1
  WHERE id = NEW.film_product_id
  RETURNING sales_count INTO v_current_sales;
  
  -- Update the merchant's current_film_sales
  UPDATE profiles 
  SET current_film_sales = current_film_sales + 1
  WHERE id = v_merchant_id;
  
  -- Get the merchant's active film
  SELECT active_film_id INTO v_active_film_id
  FROM profiles
  WHERE id = v_merchant_id;
  
  -- Check if we've reached 30 sales on the ACTIVE film - reset meter and allow new publishing
  -- Get the active film's current sales
  SELECT sales_count INTO v_current_sales
  FROM film_products 
  WHERE id = v_active_film_id;
  
  IF v_current_sales >= 30 THEN
    -- Increment meter_reset_count on the active film
    UPDATE film_products 
    SET meter_reset_count = meter_reset_count + 1, sales_count = 0
    WHERE id = v_active_film_id;
    
    -- Reset merchant's current_film_sales and allow publishing
    UPDATE profiles 
    SET current_film_sales = 0, 
        can_publish_film = true,
        active_film_id = NULL
    WHERE id = v_merchant_id;
  END IF;
  
  -- Update quarterly income for the merchant (90% of paid amount)
  PERFORM update_quarterly_income(v_merchant_id, 'film_revenue', NEW.amount_paid * 0.9);
  
  RETURN NEW;
END;
$function$;