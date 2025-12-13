-- Create support_tickets table
CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create ticket_replies table
CREATE TABLE public.ticket_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES public.profiles(id),
  reply_text TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_replies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for support_tickets
CREATE POLICY "Users can create their own tickets"
ON public.support_tickets
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own tickets"
ON public.support_tickets
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all tickets"
ON public.support_tickets
FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update all tickets"
ON public.support_tickets
FOR UPDATE
USING (is_admin(auth.uid()));

-- RLS Policies for ticket_replies
CREATE POLICY "Users can view replies on their tickets"
ON public.ticket_replies
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.support_tickets
  WHERE support_tickets.id = ticket_replies.ticket_id
  AND support_tickets.user_id = auth.uid()
));

CREATE POLICY "Admins can view all replies"
ON public.ticket_replies
FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can create replies"
ON public.ticket_replies
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can update read status on their ticket replies"
ON public.ticket_replies
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.support_tickets
  WHERE support_tickets.id = ticket_replies.ticket_id
  AND support_tickets.user_id = auth.uid()
));

-- Trigger to update support_tickets.updated_at
CREATE OR REPLACE FUNCTION public.update_support_tickets_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_support_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_support_tickets_timestamp();

-- Trigger to mark ticket as replied when admin replies
CREATE OR REPLACE FUNCTION public.mark_ticket_replied()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.support_tickets
  SET status = 'replied', updated_at = now()
  WHERE id = NEW.ticket_id AND status = 'pending';
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_ticket_reply_mark_replied
AFTER INSERT ON public.ticket_replies
FOR EACH ROW
EXECUTE FUNCTION public.mark_ticket_replied();