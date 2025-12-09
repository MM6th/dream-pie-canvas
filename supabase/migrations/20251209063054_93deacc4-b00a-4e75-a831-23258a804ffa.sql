-- Drop the existing trigger
DROP TRIGGER IF EXISTS on_delivery_completed_mark_notifications_read ON public.astrology_deliveries;

-- Update the function to also update the notification message with delivery date
CREATE OR REPLACE FUNCTION public.mark_delivery_notifications_read()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When delivery status changes to 'delivered', mark related notifications as read and update message
  IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
    -- Update buyer notification
    UPDATE public.notifications
    SET 
      read = true, 
      updated_at = now(),
      message = 'Your astrology reading was delivered on ' || to_char(COALESCE(NEW.delivered_at, now()), 'MM/DD/YYYY') || '.',
      title = 'Astrology Reading Delivered'
    WHERE related_delivery_id = NEW.id
      AND type = 'purchase'
      AND user_id = NEW.buyer_id;
    
    -- Update admin notification  
    UPDATE public.notifications
    SET 
      read = true, 
      updated_at = now(),
      message = 'Astrology reading was delivered on ' || to_char(COALESCE(NEW.delivered_at, now()), 'MM/DD/YYYY') || '.',
      title = 'Astrology Reading Delivered'
    WHERE related_delivery_id = NEW.id
      AND type = 'purchase'
      AND user_id = NEW.admin_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_delivery_completed_mark_notifications_read
  AFTER UPDATE ON public.astrology_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION public.mark_delivery_notifications_read();

-- Fix existing notifications that are already delivered but still have old message
UPDATE public.notifications n
SET 
  message = 'Your astrology reading was delivered on ' || to_char(d.delivered_at, 'MM/DD/YYYY') || '.',
  title = 'Astrology Reading Delivered',
  read = true
FROM public.astrology_deliveries d
WHERE n.related_delivery_id = d.id
  AND n.type = 'purchase'
  AND d.status = 'delivered'
  AND d.delivered_at IS NOT NULL;