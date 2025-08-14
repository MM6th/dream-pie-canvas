-- Fix contracts table RLS policy by removing WITH CHECK clause that's blocking soft deletes
-- The WITH CHECK clause is preventing the soft delete update

-- Drop the existing policy
DROP POLICY IF EXISTS "Merchants can update their own contracts" ON public.contracts;

-- Create new policy without WITH CHECK clause since we only need to control which rows can be updated
CREATE POLICY "Merchants can update their own contracts" 
ON public.contracts 
FOR UPDATE 
USING (auth.uid() = merchant_id);