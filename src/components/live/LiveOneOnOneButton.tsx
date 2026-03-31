import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, Check } from "lucide-react";
import payPhoneIcon from "@/assets/pay-phone-1-on-1.png";
import { toast } from "@/hooks/use-toast";
import LiveOneOnOneSession from "@/components/live/LiveOneOnOneSession";

interface LiveOneOnOneButtonProps {
  hostId: string;
  streamId: string;
}

const LiveOneOnOneButton = ({ hostId, streamId }: LiveOneOnOneButtonProps) => {
  const { user } = useAuth();
  const [creditsPerMessage, setCreditsPerMessage] = useState<number | null>(null);
  const [sessionDurationMinutes, setSessionDurationMinutes] = useState<number>(15);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [showWaitingModal, setShowWaitingModal] = useState(false);
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
  const [requestStatus, setRequestStatus] = useState<string | null>(null);
  const [showSession, setShowSession] = useState(false);
  const [roomName, setRoomName] = useState<string | null>(null);

  // Fetch host message rate
  useEffect(() => {
    const fetchRate = async () => {
      try {
        const { data } = await supabase
          .from("message_settings")
          .select("credits_per_message, enabled")
          .eq("merchant_id", hostId)
          .single();

        if (data?.enabled && data.credits_per_message > 0) {
          setCreditsPerMessage(data.credits_per_message);
        }

        const { data: lsData } = await (supabase as any)
          .from("livestream_settings")
          .select("session_duration_minutes")
          .eq("merchant_id", hostId)
          .single();
        if (lsData?.session_duration_minutes) {
          setSessionDurationMinutes(lsData.session_duration_minutes);
        }
      } catch (err) {
        console.error("Error fetching host message rate:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRate();
  }, [hostId]);

  // Check for existing pending/accepted request on mount
  useEffect(() => {
    if (!user) return;
    const checkExisting = async () => {
      const { data } = await (supabase.from("one_on_one_requests" as any) as any)
        .select("id, status, room_name")
        .eq("viewer_id", user.id)
        .eq("stream_id", streamId)
        .in("status", ["pending", "accepted"])
        .order("created_at", { ascending: false })
        .limit(1);

      if (data?.length) {
        const existingRequest = data[0];
        setRequestStatus(existingRequest.status);

        if (existingRequest.status === "pending") {
          setPendingRequestId(existingRequest.id);
          setShowWaitingModal(true);
        }

        if (existingRequest.status === "accepted") {
          setPendingRequestId(null);
          setRoomName(existingRequest.room_name || `1on1_${existingRequest.id}`);
          setShowSession(true);
        }
      }
    };
    checkExisting();
  }, [user, streamId]);

  // Listen for status updates on pending request
  useEffect(() => {
    if (!pendingRequestId || requestStatus === "accepted" || showSession) return;

    let handled = false;

    const handleAccepted = (room_name: string) => {
      if (handled) return;
      handled = true;
      setShowWaitingModal(false);
      setRoomName(room_name || `1on1_${pendingRequestId}`);
      setPendingRequestId(null);
      toast({
        title: "Host accepted!",
        description: "Connecting to your private session...",
        duration: 5000,
      });
      setShowSession(true);
      setRequestStatus("accepted");
    };

    const handleRejected = () => {
      if (handled) return;
      handled = true;
      setShowWaitingModal(false);
      setPendingRequestId(null);
      setRequestStatus(null);
    };

    const channel = supabase
      .channel(`viewer_1on1_${pendingRequestId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "one_on_one_requests",
          filter: `id=eq.${pendingRequestId}`,
        },
        (payload: any) => {
          const newStatus = payload.new.status;
          if (newStatus === "accepted") {
            handleAccepted(payload.new.room_name);
          } else if (newStatus === "declined") {
            toast({
              title: "Request declined",
              description: "The host declined your 1-on-1 request.",
              variant: "destructive",
              duration: 6000,
            });
            handleRejected();
          }
        }
      )
      .subscribe();

    // Polling fallback
    const interval = window.setInterval(async () => {
      if (handled) return;
      const { data } = await (supabase.from("one_on_one_requests" as any) as any)
        .select("status, room_name")
        .eq("id", pendingRequestId)
        .single();

      if (data?.status === "accepted") {
        handleAccepted(data.room_name);
      } else if (data?.status === "declined" || data?.status === "expired") {
        handleRejected();
      }
    }, 3000);

    return () => {
      window.clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [pendingRequestId, requestStatus, showSession]);

  const handleRequest = async () => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You must be signed in to request a 1-on-1 session.",
        variant: "destructive",
        duration: 5000,
      });
      return;
    }
    if (pendingRequestId) return;

    setRequesting(true);
    try {
      const { data, error } = await (supabase.from("one_on_one_requests" as any) as any)
        .insert({
          stream_id: streamId,
          viewer_id: user.id,
          host_id: hostId,
          credits_charged: 0,
          status: "pending",
        })
        .select("id, status")
        .single();

      if (error) throw error;

      setPendingRequestId(data.id);
      setRequestStatus("pending");
      setShowWaitingModal(true);
    } catch (err: any) {
      console.error("Error sending 1-on-1 request:", err);
      toast({
        title: "Request failed",
        description: err.message || "Failed to send request.",
        variant: "destructive",
        duration: 7000,
      });
    } finally {
      setRequesting(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!pendingRequestId) return;
    await (supabase.from("one_on_one_requests" as any) as any)
      .update({ status: "expired" })
      .eq("id", pendingRequestId);
    setShowWaitingModal(false);
    setPendingRequestId(null);
    setRequestStatus(null);
  };

  const usdCost = useMemo(() => ((creditsPerMessage ?? 0) * 0.1).toFixed(2), [creditsPerMessage]);
  const isAccepted = requestStatus === "accepted";

  if (loading || creditsPerMessage === null) return null;

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            className={`border-primary/50 gap-2 ${isAccepted ? "text-primary" : "text-primary hover:bg-primary/10"}`}
            onClick={handleRequest}
            disabled={requesting || !!pendingRequestId}
          >
            {requesting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isAccepted ? (
              <Check className="h-4 w-4" />
            ) : (
              <img src={payPhoneIcon} alt="1-on-1" className="h-5 w-5 object-contain" />
            )}
            1 on 1
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Request a private 1-on-1 session — ${usdCost}</p>
        </TooltipContent>
      </Tooltip>

      {/* Waiting for host modal */}
      <Dialog open={showWaitingModal} onOpenChange={(open) => { if (!open) handleCancelRequest(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              1-on-1 Request Sent
            </DialogTitle>
            <DialogDescription>
              Your session rate: <span className="font-semibold text-foreground">${usdCost}</span> per session
            </DialogDescription>
            <p className="text-xs text-muted-foreground mt-1">
              Session duration: <span className="font-semibold text-foreground">{sessionDurationMinutes} min</span>
            </p>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-6">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-center text-muted-foreground">
              Awaiting host's confirmation...
            </p>
            <p className="text-xs text-muted-foreground text-center">
              The host will be notified of your request. Please wait.
            </p>
          </div>

          <Button variant="outline" onClick={handleCancelRequest} className="w-full">
            Cancel Request
          </Button>
        </DialogContent>
      </Dialog>

      {/* Side-by-side session */}
      {showSession && roomName && (
        <LiveOneOnOneSession
          roomName={roomName}
          isHost={false}
          durationMinutes={sessionDurationMinutes}
          onClose={() => {
            setShowSession(false);
            setPendingRequestId(null);
            setRequestStatus(null);
            setRoomName(null);
          }}
        />
      )}
    </>
  );
};

export default LiveOneOnOneButton;
