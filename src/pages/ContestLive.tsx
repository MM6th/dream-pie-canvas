import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import ContestSession from "@/components/contest/ContestSession";
import { Loader2, Trophy } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import AppNavBar from "@/components/AppNavBar";

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
  } | null>(null);

  useEffect(() => {
    if (!user?.id || !postId) return;

    const initContest = async () => {
      try {
        // Fetch the bulletin post
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

        // Determine the challenger (first accepted user who is not the champion)
        const { data: acceptances } = await supabase
          .from("challenge_acceptances")
          .select("user_id")
          .eq("bulletin_post_id", postId);

        const championId = post.champion_user_id || post.merchant_id;
        const challengerId = acceptances?.find((a) => a.user_id !== championId)?.user_id;

        if (!challengerId) {
          toast({ title: "No challenger found for this contest", variant: "destructive" });
          navigate("/bulletin");
          return;
        }

        // Determine user's role
        let role: "champion" | "challenger" | "spectator";
        if (user.id === championId) {
          role = "champion";
        } else if (user.id === challengerId) {
          role = "challenger";
        } else {
          // Check if user has an accepted invitation
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
          role = "spectator";
        }

        const roomName = `contest_${postId}`;
        const durationMinutes = post.challenge_time_limit_minutes || 15;

        // Create or get contest session
        let { data: session } = await supabase
          .from("contest_sessions")
          .select("id, status")
          .eq("bulletin_post_id", postId)
          .maybeSingle();

        if (!session && (role === "champion" || role === "challenger")) {
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
            .select("id, status")
            .single();

          if (sessError) {
            // Might be a race condition—try fetching again
            const { data: existing } = await supabase
              .from("contest_sessions")
              .select("id, status")
              .eq("bulletin_post_id", postId)
              .maybeSingle();
            session = existing;
          } else {
            session = newSession;
          }

          // Link any pending invitations to this session
          if (session) {
            await supabase
              .from("contest_invitations")
              .update({ contest_session_id: session.id })
              .eq("bulletin_post_id", postId)
              .is("contest_session_id", null);
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

    // Update contest session
    await supabase
      .from("contest_sessions")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", contestData.sessionId);

    // Mark bulletin post as ended
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
    <div className="min-h-screen bg-black flex flex-col">
      <div className="flex-1 min-h-0">
        <ContestSession
          roomName={contestData.roomName}
          role={contestData.role}
          championId={contestData.championId}
          challengerId={contestData.challengerId}
          durationMinutes={contestData.durationMinutes}
          challengeType={contestData.challengeType}
          onEnd={handleEndContest}
        />
      </div>
    </div>
  );
};

export default ContestLive;
