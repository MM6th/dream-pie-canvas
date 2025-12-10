-- Add DELETE policy for message_settings
CREATE POLICY "Merchants can delete their own settings"
ON public.message_settings
FOR DELETE
USING (auth.uid() = merchant_id);

-- Add DELETE policy for livestream_settings
CREATE POLICY "Merchants can delete their own settings"
ON public.livestream_settings
FOR DELETE
USING (auth.uid() = merchant_id);