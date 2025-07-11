-- Update the contracts table constraint to allow all contract types used by announcements
ALTER TABLE public.contracts 
DROP CONSTRAINT IF EXISTS contracts_contract_type_check;

-- Add updated constraint with all valid contract types
ALTER TABLE public.contracts 
ADD CONSTRAINT contracts_contract_type_check 
CHECK (contract_type IN ('cover_submission', 'modeling_application', 'audio', 'asmr', 'modeling', 'podcast', 'film', 'video', 'regular'));