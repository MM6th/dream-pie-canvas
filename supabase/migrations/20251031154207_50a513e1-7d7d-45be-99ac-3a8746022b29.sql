-- Add privacy column to profiles
ALTER TABLE profiles ADD COLUMN is_private BOOLEAN DEFAULT false;

-- Create follow requests table
CREATE TABLE profile_follow_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_merchant_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  intent_message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(requester_id, target_merchant_id)
);

-- Create followers table
CREATE TABLE profile_followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  merchant_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  followed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(follower_id, merchant_id)
);

-- Enable RLS
ALTER TABLE profile_follow_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_followers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profile_follow_requests
CREATE POLICY "Users can send follow requests"
  ON profile_follow_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can view their sent requests"
  ON profile_follow_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = requester_id);

CREATE POLICY "Merchants can view received requests"
  ON profile_follow_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = target_merchant_id);

CREATE POLICY "Merchants can update received requests"
  ON profile_follow_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = target_merchant_id);

-- RLS Policies for profile_followers
CREATE POLICY "Anyone can view followers"
  ON profile_followers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can create follower relationships"
  ON profile_followers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Merchants can remove followers"
  ON profile_followers FOR DELETE
  TO authenticated
  USING (auth.uid() = merchant_id);

-- Privacy check function
CREATE OR REPLACE FUNCTION can_view_private_profile(viewer_id UUID, profile_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF viewer_id = profile_id THEN
    RETURN TRUE;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM profile_followers
    WHERE follower_id = viewer_id AND merchant_id = profile_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger function to create follower relationship when request approved
CREATE OR REPLACE FUNCTION handle_follow_request_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    INSERT INTO profile_followers (follower_id, merchant_id)
    VALUES (NEW.requester_id, NEW.target_merchant_id)
    ON CONFLICT (follower_id, merchant_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger
CREATE TRIGGER on_follow_request_approved
  AFTER UPDATE ON profile_follow_requests
  FOR EACH ROW
  EXECUTE FUNCTION handle_follow_request_approval();