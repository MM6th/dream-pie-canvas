-- Remove the trigger that creates video_ad_download contracts
DROP TRIGGER IF EXISTS create_video_ad_download_contract_trigger ON public.video_ad_downloads;

-- Drop the function that creates video_ad_download contracts
DROP FUNCTION IF EXISTS public.create_video_ad_download_contract();

-- Clean up existing video_ad_download contracts that were incorrectly generated
DELETE FROM public.contracts 
WHERE contract_type = 'video_ad_download';

-- Update video_ad_downloads to remove contract references since they shouldn't have contracts
UPDATE public.video_ad_downloads 
SET contract_id = NULL, contract_generated = false;