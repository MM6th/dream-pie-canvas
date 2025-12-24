-- Create a function to check if a user has an active subscription to a merchant
CREATE OR REPLACE FUNCTION public.has_active_podcast_subscription(p_user_id uuid, p_merchant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM podcast_subscriptions
    WHERE subscriber_id = p_user_id
      AND merchant_id = p_merchant_id
      AND status = 'active'
      AND (next_billing_date IS NULL OR next_billing_date > now())
      AND cancelled_at IS NULL
  );
END;
$$;

-- Create a function to notify all active subscribers when a new podcast is published
CREATE OR REPLACE FUNCTION public.notify_podcast_subscribers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  subscriber_record RECORD;
  podcast_title TEXT;
  merchant_name TEXT;
BEGIN
  -- Only trigger on status change to 'published'
  IF NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status != 'published') THEN
    -- Get the podcast title from audio_products if available, otherwise use recording title
    podcast_title := NEW.title;
    
    -- Get merchant display name
    SELECT COALESCE(display_name, business_name, email) INTO merchant_name
    FROM profiles
    WHERE id = NEW.merchant_id;
    
    -- Find all active subscribers of this merchant
    FOR subscriber_record IN
      SELECT DISTINCT subscriber_id
      FROM podcast_subscriptions
      WHERE merchant_id = NEW.merchant_id
        AND status = 'active'
        AND (next_billing_date IS NULL OR next_billing_date > now())
        AND cancelled_at IS NULL
    LOOP
      -- Insert notification for each subscriber
      INSERT INTO notifications (user_id, type, title, message)
      VALUES (
        subscriber_record.subscriber_id,
        'new_podcast',
        'New Podcast Available!',
        merchant_name || ' just published a new podcast: "' || podcast_title || '". Check it out now!'
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for podcast_recordings publish notifications
DROP TRIGGER IF EXISTS notify_subscribers_on_podcast_publish ON podcast_recordings;
CREATE TRIGGER notify_subscribers_on_podcast_publish
  AFTER UPDATE ON podcast_recordings
  FOR EACH ROW
  EXECUTE FUNCTION notify_podcast_subscribers();

-- Also handle INSERT case (in case status is set to published on insert)
DROP TRIGGER IF EXISTS notify_subscribers_on_podcast_insert ON podcast_recordings;
CREATE TRIGGER notify_subscribers_on_podcast_insert
  AFTER INSERT ON podcast_recordings
  FOR EACH ROW
  WHEN (NEW.status = 'published')
  EXECUTE FUNCTION notify_podcast_subscribers();