-- Fix the contracts table RLS policy for merchant updates
-- The issue is that the WITH CHECK clause might be too restrictive for soft deletes

-- Drop the existing policy that might be causing issues
DROP POLICY IF EXISTS "Users can update and soft delete their own contracts" ON public.contracts;

-- Create a new policy that allows merchants to update their own contracts including soft delete
CREATE POLICY "Merchants can update their own contracts" 
ON public.contracts 
FOR UPDATE 
USING (auth.uid() = merchant_id)
WITH CHECK (auth.uid() = merchant_id);

-- Also ensure the policy for viewing contracts is correct
DROP POLICY IF EXISTS "Users can view their own non-deleted contracts" ON public.contracts;

CREATE POLICY "Merchants can view their own contracts" 
ON public.contracts 
FOR SELECT 
USING (
  (auth.uid() = merchant_id AND (deleted_by_merchant IS FALSE OR deleted_by_merchant IS NULL))
  OR 
  is_admin(auth.uid())
);