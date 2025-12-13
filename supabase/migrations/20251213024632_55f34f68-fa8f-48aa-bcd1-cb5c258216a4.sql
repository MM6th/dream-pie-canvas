-- Allow users to delete their own tickets
CREATE POLICY "Users can delete their own tickets" 
ON public.support_tickets 
FOR DELETE 
USING (auth.uid() = user_id);

-- Allow admins to delete any ticket
CREATE POLICY "Admins can delete any ticket" 
ON public.support_tickets 
FOR DELETE 
USING (is_admin(auth.uid()));

-- Allow admins to delete ticket replies when ticket is deleted
CREATE POLICY "Admins can delete ticket replies" 
ON public.ticket_replies 
FOR DELETE 
USING (is_admin(auth.uid()));

-- Allow users to delete replies on their tickets (for cascade)
CREATE POLICY "Users can delete replies on their tickets" 
ON public.ticket_replies 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM support_tickets 
  WHERE support_tickets.id = ticket_replies.ticket_id 
  AND support_tickets.user_id = auth.uid()
));