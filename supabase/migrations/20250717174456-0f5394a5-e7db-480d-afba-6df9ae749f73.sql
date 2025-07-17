-- Fix RLS policy to allow soft delete operations
-- The issue is that the WITH CHECK clause is too restrictive for soft delete updates

DROP POLICY IF EXISTS "Users can update and soft delete their own contracts" ON public.contracts;

-- Create separate policies for regular updates vs soft delete operations
CREATE POLICY "Users can update their own contracts" 
ON public.contracts 
FOR UPDATE 
USING (auth.uid() = merchant_id AND (deleted_by_merchant IS FALSE OR deleted_by_merchant IS NULL))
WITH CHECK (auth.uid() = merchant_id AND (deleted_by_merchant IS FALSE OR deleted_by_merchant IS NULL));

CREATE POLICY "Users can soft delete their own contracts" 
ON public.contracts 
FOR UPDATE 
USING (auth.uid() = merchant_id)
WITH CHECK (
  auth.uid() = merchant_id AND 
  (deleted_by_merchant = true OR deleted_by_merchant IS NULL OR deleted_by_merchant = false)
);