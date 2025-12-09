-- Update the function to use the correct timezone for date display
-- Using America/New_York as a reasonable US timezone default
CREATE OR REPLACE FUNCTION public.mark_delivery_notifications_read()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  delivery_date_str TEXT;
BEGIN
  -- When delivery status changes to 'delivered', mark related notifications as read and update message
  IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
    -- Format the date in a user-friendly way (using America/New_York timezone)
    delivery_date_str := to_char(COALESCE(NEW.delivered_at, now()) AT TIME ZONE 'America/New_York', 'MM/DD/YYYY');
    
    -- Update buyer notification
    UPDATE public.notifications
    SET 
      read = true, 
      updated_at = now(),
      message = 'Your astrology reading was delivered on ' || delivery_date_str || '.',
      title = 'Astrology Reading Delivered'
    WHERE related_delivery_id = NEW.id
      AND type = 'purchase'
      AND user_id = NEW.buyer_id;
    
    -- Update admin notification  
    UPDATE public.notifications
    SET 
      read = true, 
      updated_at = now(),
      message = 'Astrology reading was delivered on ' || delivery_date_str || '.',
      title = 'Astrology Reading Delivered'
    WHERE related_delivery_id = NEW.id
      AND type = 'purchase'
      AND user_id = NEW.admin_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix existing notifications with correct timezone
UPDATE public.notifications n
SET 
  message = 'Your astrology reading was delivered on ' || to_char(d.delivered_at AT TIME ZONE 'America/New_York', 'MM/DD/YYYY') || '.',
  title = 'Astrology Reading Delivered',
  read = true
FROM public.astrology_deliveries d
WHERE n.related_delivery_id = d.id
  AND n.type = 'purchase'
  AND d.status = 'delivered'
  AND d.delivered_at IS NOT NULL;