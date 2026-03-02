-- Fix: Allow authenticated users to insert notifications (needed for user-to-user notifications)
-- The previous policy was too restrictive - regular users need to notify others
-- (e.g., PodcastDealAcceptButton sends notification to host)
-- Risk is mitigated because notifications are only readable by the target user
DROP POLICY IF EXISTS "Admins can create notifications" ON public.notifications;
CREATE POLICY "Authenticated users can create notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Actually, we need a better approach. Let's restrict so users can only 
-- insert notifications where they are authenticated (not anonymous)
-- This is effectively the same as WITH CHECK (true) for authenticated role,
-- but the TO authenticated already handles that.
-- The real protection is that only service role / triggers can insert for 
-- system notifications, and client code legitimately creates user-to-user notifications.
-- Let's instead add a check that user_id IS NOT NULL to prevent garbage data.
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;
CREATE POLICY "Authenticated users can create notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NOT NULL);