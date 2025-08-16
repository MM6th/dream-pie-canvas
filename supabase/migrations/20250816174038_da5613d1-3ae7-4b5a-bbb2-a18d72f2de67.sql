-- Drop all triggers that depend on the video_ad_download contract function
DROP TRIGGER IF EXISTS video_ad_download_contract_trigger ON public.video_ad_downloads;
DROP TRIGGER IF EXISTS trg_create_video_ad_download_contract ON public.video_ad_downloads;

-- Now drop the function
DROP FUNCTION IF EXISTS public.create_video_ad_download_contract() CASCADE;

-- Clean up existing video_ad_download contracts that were incorrectly generated
DELETE FROM public.contracts 
WHERE contract_type = 'video_ad_download';

-- Update video_ad_downloads to remove contract references since they shouldn't have contracts
UPDATE public.video_ad_downloads 
SET contract_id = NULL, contract_generated = false;