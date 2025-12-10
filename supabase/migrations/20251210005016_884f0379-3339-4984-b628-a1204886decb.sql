-- Add new columns to bulletin_posts for scheduled livestreams
ALTER TABLE public.bulletin_posts 
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS timezone TEXT,
ADD COLUMN IF NOT EXISTS room_id UUID DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS session_ended_at TIMESTAMPTZ;

-- Create index on room_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_bulletin_posts_room_id ON public.bulletin_posts(room_id) WHERE room_id IS NOT NULL;

-- Create index on scheduled_at for filtering upcoming streams
CREATE INDEX IF NOT EXISTS idx_bulletin_posts_scheduled_at ON public.bulletin_posts(scheduled_at) WHERE scheduled_at IS NOT NULL;