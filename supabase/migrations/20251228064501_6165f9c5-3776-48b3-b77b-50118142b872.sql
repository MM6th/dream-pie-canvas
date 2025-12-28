-- Create a secure view for public film playlists that only exposes trailer URLs
-- This ensures full movie URLs are never exposed through public playlist features

CREATE VIEW public.public_film_playlist_items AS
SELECT 
  fp.user_id,
  fp.film_product_id,
  fp.purchase_date,
  f.title,
  f.description,
  f.thumbnail_url,
  f.cover_photo_url,
  f.trailer_url,  -- Only trailer, NEVER full_video_url
  f.genres,
  f.stars,
  f.price,
  f.is_free,
  f.merchant_id,
  f.status
FROM film_purchases fp
JOIN film_products f ON f.id = fp.film_product_id
JOIN profiles p ON p.id = fp.user_id
WHERE p.playlist_public = true
  AND f.status = 'published';

-- Add comment explaining the security purpose
COMMENT ON VIEW public.public_film_playlist_items IS 'Secure view for public film playlists - only exposes trailer_url, never full_video_url to protect purchased content';

-- Enable RLS-like access control through the view
-- Anyone can read from this view since it only contains public playlist data
GRANT SELECT ON public.public_film_playlist_items TO anon, authenticated;