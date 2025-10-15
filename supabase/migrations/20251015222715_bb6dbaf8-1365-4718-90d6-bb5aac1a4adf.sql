-- Add preview columns to audio_products table
ALTER TABLE audio_products 
ADD COLUMN preview_start_time numeric DEFAULT 0,
ADD COLUMN preview_duration numeric DEFAULT 30,
ADD COLUMN preview_url text;

-- Set default preview values for all existing music products
UPDATE audio_products 
SET preview_start_time = 0, 
    preview_duration = 30
WHERE audio_type = 'music' AND preview_start_time IS NULL;