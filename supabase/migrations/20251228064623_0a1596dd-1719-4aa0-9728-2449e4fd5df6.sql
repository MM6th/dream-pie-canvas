-- Drop and recreate the view with SECURITY INVOKER (default, safer)
DROP VIEW IF EXISTS public.public_film_playlist_items;

CREATE VIEW public.public_film_playlist_items 
WITH (security_invoker = true) AS
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

-- Grant read access
GRANT SELECT ON public.public_film_playlist_items TO anon, authenticated;