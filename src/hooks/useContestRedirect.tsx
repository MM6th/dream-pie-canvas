import { useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

/**
 * Polls for upcoming contest challenges where the current user is a champion or challenger.
 * When the scheduled time arrives, auto-navigates to /contest/:postId.
 */
export const useContestRedirect = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectedRef = useRef<Set<string>>(new Set());

  const checkContests = useCallback(async () => {
    if (!user?.id) return;

    // Don't redirect if already on a contest page
    if (location.pathname.startsWith("/contest/")) return;

    const now = new Date().toISOString();

    const { data: challengePosts, error } = await supabase
      .from("bulletin_posts")
      .select(`
        id, scheduled_at, challenge_time_limit_minutes, champion_user_id, merchant_id,
        challenge_type, session_ended_at
      `)
      .not("challenge_type", "is", null)
      .not("scheduled_at", "is", null)
      .is("session_ended_at", null)
      .lte("scheduled_at", now);

    if (error || !challengePosts?.length) return;

    for (const post of challengePosts) {
      if (redirectedRef.current.has(post.id)) continue;

      // Check sessionStorage flag — contest was already ended by this client
      if (sessionStorage.getItem(`contest_ended_${post.id}`)) continue;

      // Secondary guard: check if session is ended in DB
      const { data: session } = await supabase
        .from("contest_sessions")
        .select("status")
        .eq("bulletin_post_id", post.id)
        .eq("status", "ended")
        .maybeSingle();

      if (session) continue;

      const isChampion = post.champion_user_id === user.id;

      let isChallenger = false;
      if (!isChampion) {
        const { data: acceptance } = await supabase
          .from("challenge_acceptances")
          .select("id")
          .eq("bulletin_post_id", post.id)
          .eq("user_id", user.id)
          .maybeSingle();

        isChallenger = !!acceptance;
      }

      if (isChampion || isChallenger) {
        // Verify a challenger actually exists before redirecting
        const championId = post.champion_user_id || post.merchant_id;
        const { data: allAcceptances } = await supabase
          .from("challenge_acceptances")
          .select("user_id")
          .eq("bulletin_post_id", post.id);

        const hasChallenger = allAcceptances?.some((a) => a.user_id !== championId);
        if (!hasChallenger) continue;

        redirectedRef.current.add(post.id);
        navigate(`/contest/${post.id}`);
        return;
      }
    }
  }, [user?.id, navigate, location.pathname]);

  useEffect(() => {
    if (!user?.id) return;
    checkContests();
    // 5s cadence so contestant + spectator land within ~5s of scheduled_at.
    const interval = setInterval(checkContests, 5000);
    return () => clearInterval(interval);
  }, [checkContests, user?.id]);
};
