-- Create trigger function to automatically update opportunities_exhausted
CREATE OR REPLACE FUNCTION check_asmr_opportunities_exhausted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE audio_products
  SET opportunities_exhausted = true
  WHERE id = NEW.audio_product_id
  AND audio_type = 'asmr'
  AND access_level = 'merchant_only'
  AND number_of_opportunities IS NOT NULL
  AND (
    SELECT COUNT(*) 
    FROM asmr_downloads 
    WHERE audio_product_id = NEW.audio_product_id
  ) >= number_of_opportunities;
  
  RETURN NEW;
END;
$$;

-- Create trigger on asmr_downloads
CREATE TRIGGER asmr_downloads_check_exhaustion
AFTER INSERT ON asmr_downloads
FOR EACH ROW
EXECUTE FUNCTION check_asmr_opportunities_exhausted();

-- One-time fix for "Debt" product
UPDATE audio_products
SET opportunities_exhausted = true
WHERE id = 'd56dccaf-5bd7-4ae4-bd04-e93aa9c70da9';