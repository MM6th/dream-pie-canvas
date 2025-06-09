
-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own purchases" ON public.user_purchases;
DROP POLICY IF EXISTS "Users can insert their own purchases" ON public.user_purchases;
DROP POLICY IF EXISTS "Users can update their own purchases" ON public.user_purchases;

-- Add the missing is_free_download column to user_purchases table
ALTER TABLE public.user_purchases 
ADD COLUMN IF NOT EXISTS is_free_download BOOLEAN DEFAULT FALSE;

-- Re-create RLS policies to allow users to view their own purchases
CREATE POLICY "Users can view their own purchases" 
  ON public.user_purchases 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Policy to allow inserting purchases (both free and paid)
CREATE POLICY "Users can insert their own purchases" 
  ON public.user_purchases 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Policy to allow updating purchases (for payment capture)
CREATE POLICY "Users can update their own purchases" 
  ON public.user_purchases 
  FOR UPDATE 
  USING (auth.uid() = user_id);
