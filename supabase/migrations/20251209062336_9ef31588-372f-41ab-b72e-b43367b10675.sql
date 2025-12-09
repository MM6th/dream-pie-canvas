-- Create a function to mark related notifications as read when delivery is completed
CREATE OR REPLACE FUNCTION public.mark_delivery_notifications_read()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When delivery status changes to 'delivered', mark related notifications as read
  IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
    UPDATE public.notifications
    SET read = true, updated_at = now()
    WHERE related_delivery_id = NEW.id
      AND read = false;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to call the function when delivery status changes
CREATE TRIGGER on_delivery_completed_mark_notifications_read
  AFTER UPDATE ON public.astrology_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION public.mark_delivery_notifications_read();