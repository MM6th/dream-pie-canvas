-- Add sale_end_date column to astrology_products table
ALTER TABLE astrology_products 
ADD COLUMN sale_end_date timestamp with time zone;

COMMENT ON COLUMN astrology_products.sale_end_date IS 'Date when the sale discount expires';
