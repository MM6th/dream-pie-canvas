-- Update the contracts table constraint to include podcast_opportunity
ALTER TABLE public.contracts 
DROP CONSTRAINT IF EXISTS contracts_contract_type_check;

-- Add updated constraint with podcast_opportunity included
ALTER TABLE public.contracts 
ADD CONSTRAINT contracts_contract_type_check 
CHECK (contract_type IN ('cover_submission', 'modeling_application', 'audio', 'asmr', 'modeling', 'podcast', 'film', 'video', 'regular', 'podcast_opportunity'));