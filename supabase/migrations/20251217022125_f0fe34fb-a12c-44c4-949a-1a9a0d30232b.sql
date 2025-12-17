-- Add is_blurred column to dance_product_images table
ALTER TABLE public.dance_product_images
ADD COLUMN is_blurred BOOLEAN DEFAULT false;