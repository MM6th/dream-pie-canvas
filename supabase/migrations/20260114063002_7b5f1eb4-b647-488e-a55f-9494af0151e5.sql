-- Speed up podcast publish by making subscriber notifications set-based (no per-row loop)

CREATE OR REPLACE FUNCTION public.notify_podcast_subscribers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  merchant_name TEXT;
  podcast_title TEXT;
BEGIN
  -- Only act when a podcast is published
  IF NEW.status IS DISTINCT FROM 'published' THEN
    RETURN NEW;
  END IF;

  -- On UPDATE, only act on the transition to 'published'
  IF TG_OP = 'UPDATE' AND OLD.status = 'published' THEN
    RETURN NEW;
  END IF;

  podcast_title := COALESCE(NEW.title, 'New episode');

  SELECT COALESCE(display_name, business_name, email)
  INTO merchant_name
  FROM public.profiles
  WHERE id = NEW.merchant_id;

  merchant_name := COALESCE(merchant_name, 'A creator');

  -- Single set-based insert (fast) instead of looping row-by-row
  INSERT INTO public.notifications (user_id, type, title, message)
  SELECT DISTINCT
    ps.subscriber_id,
    'new_podcast',
    'New Podcast Available!',
    merchant_name || ' just published a new podcast: "' || podcast_title || '". Check it out now!'
  FROM public.podcast_subscriptions ps
  WHERE ps.merchant_id = NEW.merchant_id
    AND ps.status = 'active'
    AND (ps.next_billing_date IS NULL OR ps.next_billing_date > now())
    AND ps.cancelled_at IS NULL;

  RETURN NEW;
END;
$$;

-- Ensure triggers only fire when needed
DROP TRIGGER IF EXISTS notify_subscribers_on_podcast_publish ON public.podcast_recordings;
CREATE TRIGGER notify_subscribers_on_podcast_publish
  AFTER UPDATE OF status ON public.podcast_recordings
  FOR EACH ROW
  WHEN (NEW.status = 'published' AND (OLD.status IS DISTINCT FROM 'published'))
  EXECUTE FUNCTION public.notify_podcast_subscribers();

DROP TRIGGER IF EXISTS notify_subscribers_on_podcast_insert ON public.podcast_recordings;
CREATE TRIGGER notify_subscribers_on_podcast_insert
  AFTER INSERT ON public.podcast_recordings
  FOR EACH ROW
  WHEN (NEW.status = 'published')
  EXECUTE FUNCTION public.notify_podcast_subscribers();

-- Optional performance index for subscriber lookup
CREATE INDEX IF NOT EXISTS idx_podcast_subscriptions_active_merchant_billing
  ON public.podcast_subscriptions (merchant_id, next_billing_date)
  WHERE status = 'active' AND cancelled_at IS NULL;