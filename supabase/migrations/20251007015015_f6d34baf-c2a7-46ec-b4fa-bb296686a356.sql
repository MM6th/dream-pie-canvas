-- Add foreign key constraint for podcast_downloads
ALTER TABLE public.podcast_downloads
ADD CONSTRAINT podcast_downloads_contract_id_fkey 
FOREIGN KEY (contract_id) 
REFERENCES public.contracts(id) 
ON DELETE SET NULL;

-- Add foreign key constraint for asmr_downloads
ALTER TABLE public.asmr_downloads
ADD CONSTRAINT asmr_downloads_contract_id_fkey 
FOREIGN KEY (contract_id) 
REFERENCES public.contracts(id) 
ON DELETE SET NULL;

-- Add foreign key constraint for video_ad_downloads
ALTER TABLE public.video_ad_downloads
ADD CONSTRAINT video_ad_downloads_contract_id_fkey 
FOREIGN KEY (contract_id) 
REFERENCES public.contracts(id) 
ON DELETE SET NULL;