-- Update the increment_film_sales trigger to only count PAID purchases
CREATE OR REPLACE FUNCTION public.increment_film_sales()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_merchant_id UUID;
  v_current_sales INTEGER;
  v_is_free BOOLEAN;
BEGIN
  -- Check if this was a free film (amount_paid = 0 or very small)
  IF NEW.amount_paid <= 0 THEN
    -- Free download - don't count toward transit meter, but still update quarterly income if any
    SELECT merchant_id INTO v_merchant_id
    FROM film_products 
    WHERE id = NEW.film_product_id;
    
    RETURN NEW;
  END IF;

  -- PAID purchase - increment sales_count and transit meter
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
  
  -- Update quarterly income for the merchant (90% of paid amount)
  PERFORM update_quarterly_income(v_merchant_id, 'film_revenue', NEW.amount_paid * 0.9);
  
  RETURN NEW;
END;
$function$;

-- Reset the incorrectly counted free film
UPDATE film_products 
SET sales_count = 0 
WHERE id = '815b0917-9029-4766-8ed2-e102396b3417';

UPDATE profiles 
SET current_film_sales = 0 
WHERE id = 'cedd3262-be80-4af4-9675-c081107cecb5';