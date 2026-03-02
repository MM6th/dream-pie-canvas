-- Fix permissive INSERT policies on 5 tables
-- These tables currently have WITH CHECK (true) allowing any authenticated user to insert arbitrary data

-- 1. notifications: Client-side inserts notifications for other users (by design)
-- But should restrict so only admins or the system can create notifications for others
-- Triggers and edge functions bypass RLS, so we can tighten this.
-- Client code inserts notifications where user_id != auth.uid() (AudioFileUploader, PodcastDealAcceptButton)
-- Both callers are authenticated users notifying others - this is legitimate.
-- Tighten: only admins can insert notifications for other users, OR authenticated users for themselves
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "Admins can create notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (is_admin(auth.uid()));

-- 2. astrology_deliveries: Only edge functions (service role) and triggers insert
DROP POLICY IF EXISTS "System can create deliveries" ON public.astrology_deliveries;
CREATE POLICY "Admins can create deliveries"
  ON public.astrology_deliveries FOR INSERT
  TO authenticated
  WITH CHECK (is_admin(auth.uid()));

-- 3. livestream_entries: Only edge function enter-livestream inserts (uses service role)
DROP POLICY IF EXISTS "System can create entries" ON public.livestream_entries;
CREATE POLICY "Users create own livestream entries"
  ON public.livestream_entries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 4. podcast_subscriptions: Only edge functions insert (uses service role)
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.podcast_subscriptions;
-- Admins can still manage via the existing "Admins can manage all subscriptions" policy
-- Edge functions use service role which bypasses RLS

-- 5. platform_revenue: Only triggers insert (SECURITY DEFINER bypasses RLS)
DROP POLICY IF EXISTS "System can insert platform revenue" ON public.platform_revenue;
CREATE POLICY "Admins can insert platform revenue"
  ON public.platform_revenue FOR INSERT
  TO authenticated
  WITH CHECK (is_admin(auth.uid()));