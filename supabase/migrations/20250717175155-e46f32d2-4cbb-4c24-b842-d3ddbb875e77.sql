-- Fix RLS policy conflict for contract soft deletion
-- The issue is having two conflicting UPDATE policies

-- Drop all existing UPDATE policies for contracts
DROP POLICY IF EXISTS "Users can update their own contracts" ON public.contracts;
DROP POLICY IF EXISTS "Users can soft delete their own contracts" ON public.contracts;

-- Create a single comprehensive UPDATE policy that handles both regular updates and soft deletion
CREATE POLICY "Users can update and soft delete their own contracts" 
ON public.contracts 
FOR UPDATE 
USING (auth.uid() = merchant_id)
WITH CHECK (auth.uid() = merchant_id);