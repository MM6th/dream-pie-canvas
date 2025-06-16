
-- Remove the access_level column from fashion_products table
ALTER TABLE public.fashion_products DROP COLUMN IF EXISTS access_level;

-- Drop the modeling_applications table since it was created specifically for merchant-only products
DROP TABLE IF EXISTS public.modeling_applications;
