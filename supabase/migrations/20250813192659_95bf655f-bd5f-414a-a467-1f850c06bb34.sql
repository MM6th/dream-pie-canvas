-- Step 1: Remove unwanted audio products created by the trigger for "Dance to Dairy Queen"
DELETE FROM public.user_purchases 
WHERE audio_product_id IN (
  SELECT id FROM public.audio_products 
  WHERE title LIKE '%Dance to Dairy Queen%' 
  AND audio_file_url LIKE '%dance-to-dairy-queen%'
  AND merchant_id != (SELECT admin_id FROM public.video_ad_opportunities WHERE title LIKE '%Dance to Dairy Queen%' LIMIT 1)
);

DELETE FROM public.audio_products 
WHERE title LIKE '%Dance to Dairy Queen%' 
AND audio_file_url LIKE '%dance-to-dairy-queen%'
AND merchant_id != (SELECT admin_id FROM public.video_ad_opportunities WHERE title LIKE '%Dance to Dairy Queen%' LIMIT 1);

-- Step 2: Remove the problematic trigger that creates unwanted audio products
DROP TRIGGER IF EXISTS trg_ensure_video_ad_audio_and_purchase ON public.video_ad_downloads;
DROP FUNCTION IF EXISTS public.ensure_video_ad_audio_and_purchase();

-- Step 3: Fix available spots for the Dairy Queen opportunity
-- First, let's check how many downloads actually exist and correct the count
UPDATE public.video_ad_opportunities 
SET available_spots = GREATEST(
  (SELECT COALESCE(MAX(available_spots), 2) FROM public.video_ad_opportunities WHERE id = 'f7049328-a6d6-43a1-af5c-9996d778404c') - 
  (SELECT COUNT(*) FROM public.video_ad_downloads WHERE video_ad_opportunity_id = 'f7049328-a6d6-43a1-af5c-9996d778404c'),
  0
),
updated_at = NOW()
WHERE id = 'f7049328-a6d6-43a1-af5c-9996d778404c';

-- Step 4: Ensure the decrement trigger is working properly
-- Recreate the trigger to ensure it's functioning correctly
DROP TRIGGER IF EXISTS trg_decrement_video_ad_spots ON public.video_ad_downloads;

CREATE OR REPLACE FUNCTION public.decrement_video_ad_available_spots()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.video_ad_opportunities
  SET available_spots = GREATEST(available_spots - 1, 0),
      updated_at = NOW()
  WHERE id = NEW.video_ad_opportunity_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_decrement_video_ad_spots
  AFTER INSERT ON public.video_ad_downloads
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_video_ad_available_spots();

-- Step 5: Clean up any other potential duplicate audio products
-- Remove any audio products that match video ad opportunity audio URLs but aren't owned by the admin
DELETE FROM public.user_purchases 
WHERE audio_product_id IN (
  SELECT ap.id 
  FROM public.audio_products ap
  JOIN public.video_ad_opportunities vao ON ap.audio_file_url = vao.audio_file_url
  WHERE ap.merchant_id != vao.admin_id
);

DELETE FROM public.audio_products 
WHERE id IN (
  SELECT ap.id 
  FROM public.audio_products ap
  JOIN public.video_ad_opportunities vao ON ap.audio_file_url = vao.audio_file_url
  WHERE ap.merchant_id != vao.admin_id
);