-- Fix RLS policies for contract soft deletion
-- Drop the conflicting update policy
DROP POLICY IF EXISTS "Users can update their own contracts" ON public.contracts;

-- Update the soft delete policy to be more permissive for the specific soft delete operation
DROP POLICY IF EXISTS "Users can soft delete their own contracts" ON public.contracts;

CREATE POLICY "Users can update and soft delete their own contracts" 
ON public.contracts 
FOR UPDATE 
USING (auth.uid() = merchant_id)
WITH CHECK (auth.uid() = merchant_id);