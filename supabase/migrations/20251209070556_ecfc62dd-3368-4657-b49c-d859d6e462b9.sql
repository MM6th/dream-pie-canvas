-- Create function to notify merchant when their product is added to a playlist/collection
CREATE OR REPLACE FUNCTION public.notify_merchant_playlist_add()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_merchant_id UUID;
  v_product_title TEXT;
  v_buyer_name TEXT;
  v_is_free BOOLEAN;
BEGIN
  -- Get the product details and merchant
  SELECT merchant_id, title, is_free INTO v_merchant_id, v_product_title, v_is_free
  FROM audio_products
  WHERE id = NEW.audio_product_id;

  -- Get buyer display name (anonymous if not available)
  SELECT COALESCE(display_name, 'A user') INTO v_buyer_name
  FROM profiles
  WHERE id = NEW.user_id;

  -- Don't notify if merchant is adding their own product
  IF v_merchant_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Create notification for the merchant
  INSERT INTO notifications (user_id, type, title, message)
  VALUES (
    v_merchant_id,
    'playlist_add',
    'Song Added to Collection',
    v_buyer_name || ' added "' || v_product_title || '" to their collection' || 
    CASE WHEN v_is_free THEN ' (free download)' ELSE '' END || '.'
  );

  RETURN NEW;
END;
$function$;

-- Create trigger on user_purchases table
CREATE TRIGGER notify_merchant_on_playlist_add
AFTER INSERT ON public.user_purchases
FOR EACH ROW
EXECUTE FUNCTION public.notify_merchant_playlist_add();