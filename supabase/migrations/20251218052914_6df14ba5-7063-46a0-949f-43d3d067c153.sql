-- Create table for tracking podcast invitations
CREATE TABLE public.podcast_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  host_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  guest_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_title TEXT NOT NULL,
  message_id UUID REFERENCES public.messages(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  contract_id UUID REFERENCES public.contracts(id),
  accepted_at TIMESTAMP WITH TIME ZONE,
  declined_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.podcast_invitations ENABLE ROW LEVEL SECURITY;

-- Policies for podcast_invitations
CREATE POLICY "Users can view their own invitations as host or guest"
ON public.podcast_invitations
FOR SELECT
USING (auth.uid() = host_user_id OR auth.uid() = guest_user_id);

CREATE POLICY "Hosts can create invitations"
ON public.podcast_invitations
FOR INSERT
WITH CHECK (auth.uid() = host_user_id);

CREATE POLICY "Guests can update invitation status"
ON public.podcast_invitations
FOR UPDATE
USING (auth.uid() = guest_user_id OR auth.uid() = host_user_id);

CREATE POLICY "Admins can view all invitations"
ON public.podcast_invitations
FOR SELECT
USING (is_admin(auth.uid()));