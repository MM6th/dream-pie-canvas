-- Create a table for WebRTC signaling messages
CREATE TABLE public.webrtc_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id TEXT NOT NULL,
  from_user_id UUID NOT NULL,
  to_user_id UUID,
  signal_type TEXT NOT NULL,
  signal_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.webrtc_signals ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert signals
CREATE POLICY "Authenticated users can insert signals"
ON public.webrtc_signals
FOR INSERT
WITH CHECK (auth.uid() = from_user_id);

-- Allow users to read signals for their room (broadcast) or targeted to them
CREATE POLICY "Users can read signals in their room"
ON public.webrtc_signals
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Allow users to delete their own signals
CREATE POLICY "Users can delete their own signals"
ON public.webrtc_signals
FOR DELETE
USING (auth.uid() = from_user_id);

-- Create index for faster room queries
CREATE INDEX idx_webrtc_signals_room_id ON public.webrtc_signals(room_id);

-- Create index for cleanup of old signals
CREATE INDEX idx_webrtc_signals_created_at ON public.webrtc_signals(created_at);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.webrtc_signals;