-- Update the contract to trigger the function by changing status temporarily and back
-- This will simulate the trigger firing for existing approved contracts

-- First, update all approved contracts with cover_submission_id back to signed
UPDATE public.contracts 
SET status = 'signed', updated_at = NOW()
WHERE status = 'approved' AND cover_submission_id IS NOT NULL;

-- Then update them back to approved to trigger the function
UPDATE public.contracts 
SET status = 'approved', updated_at = NOW()
WHERE status = 'signed' AND cover_submission_id IS NOT NULL;