-- Add soft delete fields to contracts table for merchant-initiated deletions
ALTER TABLE public.contracts 
ADD COLUMN deleted_by_merchant BOOLEAN DEFAULT FALSE,
ADD COLUMN merchant_deletion_date TIMESTAMP WITH TIME ZONE;

-- Update RLS policies to handle soft deleted contracts
-- Merchants can't see contracts they've soft deleted, but admins can see everything
DROP POLICY IF EXISTS "Users can view their own contracts" ON public.contracts;

CREATE POLICY "Users can view their own non-deleted contracts" 
ON public.contracts 
FOR SELECT 
USING (
  auth.uid() = merchant_id 
  AND (deleted_by_merchant IS FALSE OR deleted_by_merchant IS NULL)
);

-- Add policy for soft delete updates by merchants
CREATE POLICY "Users can soft delete their own contracts" 
ON public.contracts 
FOR UPDATE 
USING (auth.uid() = merchant_id)
WITH CHECK (auth.uid() = merchant_id);