-- Fix the contracts status check constraint to include 'available' status
-- First, drop the existing constraint
ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_status_check;

-- Add the updated constraint that includes 'available' status
ALTER TABLE public.contracts ADD CONSTRAINT contracts_status_check 
CHECK (status IN ('pending', 'signed', 'rejected', 'available'));