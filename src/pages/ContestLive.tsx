import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import ContestSession from "@/components/contest/ContestSession";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const ContestLive = () => {
  const { postId } = useParams<{ postId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [contestData, setContestData] = useState<{
    roomName: string;
    role: "champion" | "challenger" | "spectator";
    championId: string;
    challengerId: string;
    durationMinutes: number;
    challengeType: string;
    sessionId: string;
    startedAt: string;
  } | null>(null);

  useEffect(() => {
    if (!user?.id || !postId) return;

    const initContest = async () => {
      try {
        const { data: post, error: postError } = await supabase
          .from("bulletin_posts")
          .select("id, title, challenge_type, challenge_time_limit_minutes, champion_user_id, merchant_id, scheduled_at, session_ended_at")
          .eq("id", postId)
          .single();

        if (postError || !post) {
          toast({ title: "Contest not found", variant: "destructive" });
          navigate("/bulletin");
          return;
        }

        if (post.session_ended_at) {
          toast({ title: "This contest has already ended" });
          navigate("/bulletin");
          return;
        }

        // Block manual entry before scheduled_at — the only path into the room
        // is the auto-redirect at the admin-set scheduled time.
        if (post.scheduled_at) {
          const scheduledMs = Date.parse(post.scheduled_at);
          if (Number.isFinite(scheduledMs) && Date.now() < scheduledMs) {
            const when = new Date(scheduledMs).toLocaleString("en-US", {
              dateStyle: "medium",
              timeStyle: "short",
            });
            toast({
              title: "Contest hasn't started yet",
              description: `You'll be redirected automatically at ${when}.`,
            });
            navigate("/bulletin");
            return;
          }
        }

        const { data: acceptances } = await supabase
          .from("challenge_acceptances")
          .select("user_id")
          .eq("bulletin_post_id", postId);

        const championId = post.champion_user_id || post.merchant_id;
        const challengerId = acceptances?.find((a) => a.user_id !== championId)?.user_id;

        if (!challengerId) {
          // Mark post as ended so redirect hooks stop targeting it
          await supabase
            .from("bulletin_posts")
            .update({ session_ended_at: new Date().toISOString() })
            .eq("id", postId);
          sessionStorage.setItem(`contest_ended_${postId}`, "true");
          toast({ title: "No challenger found for this contest", variant: "destructive" });
          navigate("/bulletin");
          return;
        }

        let role: "champion" | "challenger" | "spectator";
        if (user.id === championId) {
          role = "champion";
        } else if (user.id === challengerId) {
          role = "challenger";
        } else {
          const { data: invite } = await supabase
            .from("contest_invitations")
            .select("id, status")
            .eq("bulletin_post_id", postId)
            .eq("invitee_id", user.id)
            .eq("status", "accepted")
            .maybeSingle();

          if (!invite) {
            toast({ title: "You don't have access to this contest", variant: "destructive" });
            navigate("/bulletin");
            return;
          }

          // Check if either contestant has blocked this spectator (or vice versa)
          const { data: blockedByChampion } = await supabase.rpc("is_blocked", { user_a: user.id, user_b: championId });
          const { data: blockedByChallenger } = await supabase.rpc("is_blocked", { user_a: user.id, user_b: challengerId });

          if (blockedByChampion || blockedByChallenger) {
            toast({ title: "You cannot enter this contest", description: "You are blocked by one of the participants.", variant: "destructive" });
            navigate("/bulletin");
            return;
          }

          role = "spectator";
        }

        const roomName = `contest_${postId}`;
        const durationMinutes = post.challenge_time_limit_minutes || 15;

        // Session creation with retry loop to handle race conditions
        let session: { id: string; status: string; started_at: string | null } | null = null;
        const maxRetries = 5;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
          // Try to fetch existing session first
          const { data: existing } = await supabase
            .from("contest_sessions")
            .select("id, status, started_at")
            .eq("bulletin_post_id", postId)
            .maybeSingle();

          if (existing) {
            session = existing;
            // Backfill started_at if missing (legacy rows) so the clock has an anchor
            if (!existing.started_at) {
              const nowIso = new Date().toISOString();
              const { data: updated } = await supabase
                .from("contest_sessions")
                .update({ started_at: nowIso })
                .eq("id", existing.id)
                .select("id, status, started_at")
                .single();
              if (updated) session = updated;
            }
            break;
          }

          // Only participants can create sessions
          if (role === "champion" || role === "challenger") {
            const { data: newSession, error: sessError } = await supabase
              .from("contest_sessions")
              .insert({
                bulletin_post_id: postId,
                room_name: roomName,
                champion_id: championId,
                challenger_id: challengerId,
                status: "live",
                started_at: new Date().toISOString(),
              })
              .select("id, status, started_at")
              .single();

            if (!sessError && newSession) {
              session = newSession;
              // Link pending invitations
              await supabase
                .from("contest_invitations")
                .update({ contest_session_id: newSession.id })
                .eq("bulletin_post_id", postId)
                .is("contest_session_id", null);
              break;
            }
          }

          // Wait and retry
          if (attempt < maxRetries - 1) {
            await new Promise((r) => setTimeout(r, 2000));
          }
        }

        if (!session) {
          toast({ title: "Contest session not available yet", description: "Please wait for the participants to start." });
          navigate("/bulletin");
          return;
        }

        setContestData({
          roomName,
          role,
          championId,
          challengerId,
          durationMinutes,
          challengeType: post.challenge_type || "contest",
          sessionId: session.id,
          startedAt: session.started_at || new Date().toISOString(),
        });
      } catch (err) {
        console.error("Contest init error:", err);
        toast({ title: "Error loading contest", variant: "destructive" });
        navigate("/bulletin");
      } finally {
        setLoading(false);
      }
    };

    initContest();
  }, [user?.id, postId]);

  const handleEndContest = async () => {
    if (!contestData || !postId) return;
    // Set sessionStorage flag to prevent redirect hooks from looping back
    sessionStorage.setItem(`contest_ended_${postId}`, "true");
    await supabase
      .from("contest_sessions")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", contestData.sessionId);
    await supabase
      .from("bulletin_posts")
      .update({ session_ended_at: new Date().toISOString() })
      .eq("id", postId);
    toast({ title: "Contest ended", duration: 4000 });
    navigate("/bulletin");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading contest...</p>
        </div>
      </div>
    );
  }

  if (!contestData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Contest not available.</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0">
        <ContestSession
          roomName={contestData.roomName}
          role={contestData.role}
          championId={contestData.championId}
          challengerId={contestData.challengerId}
          durationMinutes={contestData.durationMinutes}
          challengeType={contestData.challengeType}
          bulletinPostId={postId!}
          startedAt={contestData.startedAt}
          onEnd={handleEndContest}
        />
      </div>
    </div>
  );
};

export default ContestLive;
