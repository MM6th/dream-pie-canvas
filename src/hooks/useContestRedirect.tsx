import { useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

/**
 * Polls for upcoming contest challenges where the current user is a champion or challenger.
 * When the scheduled time arrives, auto-navigates to /contest/:postId.
 */
export const useContestRedirect = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const redirectedRef = useRef<Set<string>>(new Set());

  const checkContests = useCallback(async () => {
    if (!user?.id) return;

    const now = new Date().toISOString();

    // Find challenge posts where:
    // 1. User is the champion OR an accepted challenger
    // 2. scheduled_at has passed (or is within 60 seconds)
    // 3. session_ended_at is null (not yet ended)
    // 4. post_type is 'announcement' with a challenge_type
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

      const isChampion = post.champion_user_id === user.id;

      // Check if user is an accepted challenger
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
        redirectedRef.current.add(post.id);
        navigate(`/contest/${post.id}`);
        return; // Only redirect to one contest at a time
      }
    }
  }, [user?.id, navigate]);

  useEffect(() => {
    if (!user?.id) return;

    // Check immediately
    checkContests();

    // Poll every 15 seconds
    const interval = setInterval(checkContests, 15000);
    return () => clearInterval(interval);
  }, [checkContests, user?.id]);
};
