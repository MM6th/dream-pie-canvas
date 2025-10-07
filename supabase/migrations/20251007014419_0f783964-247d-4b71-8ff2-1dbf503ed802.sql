-- Create function to track when podcast contracts are signed and approved
CREATE OR REPLACE FUNCTION public.check_podcast_contract_signed()
RETURNS TRIGGER AS $$
DECLARE
  contract_status TEXT;
  contract_signed_at TIMESTAMPTZ;
BEGIN
  -- Only proceed if a contract_id was added or changed
  IF NEW.contract_id IS NOT NULL AND (OLD.contract_id IS NULL OR NEW.contract_id != OLD.contract_id) THEN
    -- Get the contract status and signed_at timestamp
    SELECT status, signed_at INTO contract_status, contract_signed_at
    FROM public.contracts
    WHERE id = NEW.contract_id;
    
    -- If contract is approved and signed, mark the audio product
    IF contract_status = 'approved' AND contract_signed_at IS NOT NULL THEN
      UPDATE public.audio_products
      SET podcast_contract_generated = true,
          updated_at = NOW()
      WHERE id = NEW.audio_product_id
      AND audio_type = 'podcast';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on podcast_downloads table
CREATE TRIGGER podcast_downloads_contract_check
AFTER UPDATE ON public.podcast_downloads
FOR EACH ROW
EXECUTE FUNCTION public.check_podcast_contract_signed();

-- One-time data sync: Update existing podcast products with signed, approved contracts
UPDATE public.audio_products
SET podcast_contract_generated = true,
    updated_at = NOW()
WHERE id IN (
  SELECT DISTINCT pd.audio_product_id
  FROM public.podcast_downloads pd
  INNER JOIN public.contracts c ON pd.contract_id = c.id
  WHERE pd.contract_id IS NOT NULL
  AND c.status = 'approved'
  AND c.signed_at IS NOT NULL
)
AND audio_type = 'podcast'
AND (podcast_contract_generated IS NULL OR podcast_contract_generated = false);