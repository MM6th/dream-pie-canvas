
-- Create user_blocks table
CREATE TABLE public.user_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id)
);

-- Prevent self-blocking via trigger
CREATE OR REPLACE FUNCTION public.prevent_self_block()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.blocker_id = NEW.blocked_id THEN
    RAISE EXCEPTION 'Users cannot block themselves';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_self_block
  BEFORE INSERT ON public.user_blocks
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_self_block();

-- Helper function: check if either user blocked the other
CREATE OR REPLACE FUNCTION public.is_blocked(user_a UUID, user_b UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_blocks
    WHERE (blocker_id = user_a AND blocked_id = user_b)
       OR (blocker_id = user_b AND blocked_id = user_a)
  )
$$;

-- Enable RLS
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

-- Users can view their own blocks
CREATE POLICY "Users can view own blocks"
  ON public.user_blocks FOR SELECT
  TO authenticated
  USING (blocker_id = auth.uid());

-- Users can create blocks
CREATE POLICY "Users can block others"
  ON public.user_blocks FOR INSERT
  TO authenticated
  WITH CHECK (blocker_id = auth.uid());

-- Users can unblock
CREATE POLICY "Users can unblock"
  ON public.user_blocks FOR DELETE
  TO authenticated
  USING (blocker_id = auth.uid());

-- When someone is blocked, auto-reject pending follow requests between them
CREATE OR REPLACE FUNCTION public.handle_block_cleanup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Reject pending follow requests in both directions
  UPDATE public.follow_requests
  SET status = 'rejected', updated_at = now()
  WHERE status = 'pending'
    AND (
      (requester_id = NEW.blocker_id AND target_merchant_id = NEW.blocked_id)
      OR (requester_id = NEW.blocked_id AND target_merchant_id = NEW.blocker_id)
    );
  
  -- Remove from followers in both directions
  DELETE FROM public.profile_followers
  WHERE (follower_id = NEW.blocker_id AND merchant_id = NEW.blocked_id)
     OR (follower_id = NEW.blocked_id AND merchant_id = NEW.blocker_id);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_user_blocked
  AFTER INSERT ON public.user_blocks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_block_cleanup();
