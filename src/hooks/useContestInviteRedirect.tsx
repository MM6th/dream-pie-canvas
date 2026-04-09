import { useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

/**
 * For invited spectators: checks if they have accepted contest invitations
 * for contests that are now live, and auto-redirects them.
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
      .select("id, bulletin_post_id, contest_session_id")
      .eq("invitee_id", user.id)
      .eq("status", "accepted");

    if (!invitations?.length) return;

    for (const inv of invitations) {
      if (redirectedRef.current.has(inv.bulletin_post_id)) continue;

      // Check sessionStorage flag
      if (sessionStorage.getItem(`contest_ended_${inv.bulletin_post_id}`)) continue;

      // Check if there's a live session for this bulletin post
      const { data: session } = await supabase
        .from("contest_sessions")
        .select("status")
        .eq("bulletin_post_id", inv.bulletin_post_id)
        .eq("status", "live")
        .maybeSingle();

      if (session) {
        redirectedRef.current.add(inv.bulletin_post_id);
        navigate(`/contest/${inv.bulletin_post_id}`);
        return;
      }
    }
  }, [user?.id, navigate, location.pathname]);

  useEffect(() => {
    if (!user?.id) return;
    checkInvites();
    const interval = setInterval(checkInvites, 15000);
    return () => clearInterval(interval);
  }, [checkInvites, user?.id]);
};
