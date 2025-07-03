-- Fix the contracts table status constraint to allow 'approved' status
ALTER TABLE public.contracts 
DROP CONSTRAINT IF EXISTS contracts_status_check;

-- Add updated constraint with all valid statuses
ALTER TABLE public.contracts 
ADD CONSTRAINT contracts_status_check 
CHECK (status IN ('pending', 'signed', 'approved', 'completed'));