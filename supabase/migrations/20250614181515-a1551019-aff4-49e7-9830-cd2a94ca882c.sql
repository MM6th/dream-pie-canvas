
-- Enable Row Level Security on the audio_products table
ALTER TABLE public.audio_products ENABLE ROW LEVEL SECURITY;

-- Policy for SELECT: Merchants can view their own audio products, while admins can view all.
CREATE POLICY "Allow users to view own or all audio if admin"
ON public.audio_products
FOR SELECT
USING (auth.uid() = merchant_id OR public.is_admin(auth.uid()));

-- Policy for INSERT: Only admins are allowed to create new audio products.
CREATE POLICY "Allow admins to insert audio products"
ON public.audio_products
FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

-- Policy for UPDATE: Merchants can update their own audio products, while admins can update any.
CREATE POLICY "Allow users to update own or all audio if admin"
ON public.audio_products
FOR UPDATE
USING (auth.uid() = merchant_id OR public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()) OR auth.uid() = merchant_id);

-- Policy for DELETE: Merchants can delete their own audio products, while admins can delete any.
CREATE POLICY "Allow users to delete own or all audio if admin"
ON public.audio_products
FOR DELETE
USING (auth.uid() = merchant_id OR public.is_admin(auth.uid()));
