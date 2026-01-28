-- Add new fields to song_cover_submissions for enhanced cover application process
ALTER TABLE public.song_cover_submissions 
ADD COLUMN IF NOT EXISTS cover_photos text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS requested_advance_price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS negotiation_text text;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_song_cover_submissions_merchant_audio 
ON public.song_cover_submissions(merchant_id, audio_product_id);

-- Create a notification function for new cover submissions
CREATE OR REPLACE FUNCTION public.notify_admin_cover_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_merchant_name TEXT;
  v_audio_title TEXT;
BEGIN
  -- Get admin ID
  SELECT id INTO v_admin_id
  FROM profiles
  WHERE is_admin = true
  LIMIT 1;

  -- Get merchant name
  SELECT COALESCE(display_name, business_name, email) INTO v_merchant_name
  FROM profiles
  WHERE id = NEW.merchant_id;

  -- Get audio product title
  SELECT title INTO v_audio_title
  FROM audio_products
  WHERE id = NEW.audio_product_id;

  -- Create notification for admin
  IF v_admin_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message)
    VALUES (
      v_admin_id,
      'cover_application',
      'New Cover Application',
      COALESCE(v_merchant_name, 'A merchant') || ' has applied to create a cover for "' || COALESCE(v_audio_title, 'Unknown') || '". Requested advance: $' || COALESCE(NEW.requested_advance_price, 0)::text
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for new cover submissions
DROP TRIGGER IF EXISTS notify_admin_on_cover_submission ON public.song_cover_submissions;
CREATE TRIGGER notify_admin_on_cover_submission
AFTER INSERT ON public.song_cover_submissions
FOR EACH ROW
EXECUTE FUNCTION public.notify_admin_cover_submission();