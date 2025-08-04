-- Fix the contracts status check constraint to include all existing statuses
-- First, drop the existing constraint
ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_status_check;

-- Add the updated constraint that includes all valid statuses including 'available' and 'approved'
ALTER TABLE public.contracts ADD CONSTRAINT contracts_status_check 
CHECK (status IN ('pending', 'signed', 'rejected', 'available', 'approved'));