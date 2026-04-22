import { useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

/**
 * For invited spectators: checks if they have accepted contest invitations
 * for contests whose scheduled_at has arrived (or whose session is live), and
 * auto-redirects them. Triggers on scheduled_at — same anchor as participants —
 * so champion/challenger/spectator land in the room within ~5 seconds of each other.
 */
export const useContestInviteRedirect = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectedRef = useRef<Set<string>>(new Set());

  const checkInvites = useCallback(async () => {
    if (!user?.id) return;

    // Don't redirect if already on a contest page
    if (location.pathname.startsWith("/contest/")) return;

    const { data: invitations } = await supabase
      .from("contest_invitations")
      .select("id, bulletin_post_id")
      .eq("invitee_id", user.id)
      .eq("status", "accepted");

    if (!invitations?.length) return;

    const nowIso = new Date().toISOString();

    for (const inv of invitations) {
      if (redirectedRef.current.has(inv.bulletin_post_id)) continue;

      // Skip if this client already ended the contest
      if (sessionStorage.getItem(`contest_ended_${inv.bulletin_post_id}`)) continue;

      // Trigger #1: scheduled_at has arrived and the post is not ended.
      const { data: post } = await supabase
        .from("bulletin_posts")
        .select("scheduled_at, session_ended_at")
        .eq("id", inv.bulletin_post_id)
        .maybeSingle();

      const scheduledReached =
        post?.scheduled_at &&
        !post.session_ended_at &&
        post.scheduled_at <= nowIso;

      // Trigger #2 (fallback): a live session row exists in DB.
      let sessionLive = false;
      if (!scheduledReached) {
        const { data: session } = await supabase
          .from("contest_sessions")
          .select("status")
          .eq("bulletin_post_id", inv.bulletin_post_id)
          .eq("status", "live")
          .maybeSingle();
        sessionLive = !!session;
      }

      if (scheduledReached || sessionLive) {
        redirectedRef.current.add(inv.bulletin_post_id);
        navigate(`/contest/${inv.bulletin_post_id}`);
        return;
      }
    }
  }, [user?.id, navigate, location.pathname]);

  useEffect(() => {
    if (!user?.id) return;
    checkInvites();
    // 5-second cadence keeps the gap between contestant and spectator launches
    // well under 10 seconds (was 15s before).
    const interval = setInterval(checkInvites, 5000);
    return () => clearInterval(interval);
  }, [checkInvites, user?.id]);
};
