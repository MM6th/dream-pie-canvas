
-- Create a chat table for 1-on-1 sessions (no foreign key to live_streams)
CREATE TABLE public.one_on_one_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast lookups by room
CREATE INDEX idx_one_on_one_chat_room ON public.one_on_one_chat_messages(room_name, created_at);

-- Enable RLS
ALTER TABLE public.one_on_one_chat_messages ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read messages in any room they're in
CREATE POLICY "Authenticated users can read 1-on-1 chat"
  ON public.one_on_one_chat_messages FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert their own messages
CREATE POLICY "Authenticated users can send 1-on-1 chat"
  ON public.one_on_one_chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.one_on_one_chat_messages;
