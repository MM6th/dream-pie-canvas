-- Add missing contract types to the check constraint
ALTER TABLE public.contracts 
DROP CONSTRAINT contracts_contract_type_check;

ALTER TABLE public.contracts 
ADD CONSTRAINT contracts_contract_type_check 
CHECK (contract_type = ANY (ARRAY[
  'cover_submission'::text, 
  'modeling_application'::text, 
  'audio'::text, 
  'asmr'::text, 
  'modeling'::text, 
  'podcast'::text, 
  'film'::text, 
  'video'::text, 
  'regular'::text, 
  'podcast_opportunity'::text,
  'video_ad_download'::text,
  'video_ad_opportunity'::text,
  'asmr_opportunity'::text,
  'asmr_submission'::text
]));