
-- Create the one_on_one_requests table
CREATE TABLE public.one_on_one_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id UUID NOT NULL,
  viewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'completed')),
  credits_charged INTEGER NOT NULL DEFAULT 0,
  room_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '2 minutes')
);

-- Enable RLS
ALTER TABLE public.one_on_one_requests ENABLE ROW LEVEL SECURITY;

-- Viewers can insert their own requests
CREATE POLICY "Users can create their own requests"
  ON public.one_on_one_requests FOR INSERT TO authenticated
  WITH CHECK (viewer_id = auth.uid());

-- Both viewer and host can read their own requests
CREATE POLICY "Users can view their own requests"
  ON public.one_on_one_requests FOR SELECT TO authenticated
  USING (viewer_id = auth.uid() OR host_id = auth.uid());

-- Host can update (accept/decline) requests directed at them
CREATE POLICY "Hosts can update requests directed at them"
  ON public.one_on_one_requests FOR UPDATE TO authenticated
  USING (host_id = auth.uid());

-- Timestamp trigger
CREATE TRIGGER update_one_on_one_requests_timestamp
  BEFORE UPDATE ON public.one_on_one_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_deliveries_timestamp();

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.one_on_one_requests;
