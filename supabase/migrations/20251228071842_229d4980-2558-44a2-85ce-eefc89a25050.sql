-- Backfill existing free film purchases into film_downloads table
INSERT INTO public.film_downloads (film_product_id, user_id, downloaded_at)
SELECT fpu.film_product_id, fpu.user_id, fpu.purchase_date
FROM film_purchases fpu
INNER JOIN film_products fp ON fp.id = fpu.film_product_id
WHERE fp.is_free = true AND fpu.amount_paid = 0
ON CONFLICT (film_product_id, user_id) DO NOTHING;

-- Update download_count on film_products to match actual downloads
UPDATE film_products fp
SET download_count = (
  SELECT COUNT(*) FROM film_downloads fd WHERE fd.film_product_id = fp.id
)
WHERE fp.is_free = true;