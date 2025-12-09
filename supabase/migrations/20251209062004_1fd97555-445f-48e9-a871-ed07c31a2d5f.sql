-- Add RLS policy to allow recipients to update their received messages (mark as read)
CREATE POLICY "Recipients can update their received messages"
ON public.messages
FOR UPDATE
USING (auth.uid() = recipient_id)
WITH CHECK (auth.uid() = recipient_id);