-- Create trigger function to automatically update audio product access level when contract is approved
CREATE OR REPLACE FUNCTION public.update_audio_product_on_contract_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed when status changes to 'approved' from another status
  IF NEW.status = 'approved' AND OLD.status != 'approved' AND NEW.cover_submission_id IS NOT NULL THEN
    -- Get the audio product ID from the cover submission
    UPDATE public.audio_products 
    SET access_level = CASE 
      WHEN is_free = true THEN 'public'::access_level
      ELSE 'paid'::access_level
    END,
    updated_at = NOW()
    WHERE id = (
      SELECT audio_product_id 
      FROM public.song_cover_submissions 
      WHERE id = NEW.cover_submission_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically update audio product access level when contract is approved
CREATE TRIGGER update_audio_product_on_approval
  AFTER UPDATE ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_audio_product_on_contract_approval();