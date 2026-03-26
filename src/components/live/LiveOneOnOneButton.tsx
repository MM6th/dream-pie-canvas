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
import { Video, Loader2, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import LiveOneOnOneSession from "@/components/live/LiveOneOnOneSession";

interface LiveOneOnOneButtonProps {
  hostId: string;
  streamId: string;
}

const LiveOneOnOneButton = ({ hostId, streamId }: LiveOneOnOneButtonProps) => {
  const { user } = useAuth();
  const [creditsPerMessage, setCreditsPerMessage] = useState<number | null>(null);
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
        setPendingRequestId(data[0].id);
        setRequestStatus(data[0].status);
        if (data[0].status === "pending") setShowWaitingModal(true);
        if (data[0].status === "accepted") {
          setRoomName(data[0].room_name || `1on1_${data[0].id}`);
          setShowSession(true);
        }
      }
    };
    checkExisting();
  }, [user, streamId]);

  // Listen for status updates on pending request
  useEffect(() => {
    if (!pendingRequestId) return;

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
          setRequestStatus(newStatus);

          if (newStatus === "accepted") {
            setShowWaitingModal(false);
            setRoomName(payload.new.room_name || `1on1_${pendingRequestId}`);
            toast({
              title: "Host accepted!",
              description: "Connecting to your private session...",
              duration: 5000,
            });
            setShowSession(true);
          } else if (newStatus === "declined") {
            setShowWaitingModal(false);
            toast({
              title: "Request declined",
              description: "The host declined your 1-on-1 request.",
              variant: "destructive",
              duration: 6000,
            });
            setPendingRequestId(null);
            setRequestStatus(null);
          }
        }
      )
      .subscribe();

    // Polling fallback
    const interval = window.setInterval(async () => {
      const { data } = await (supabase.from("one_on_one_requests" as any) as any)
        .select("status, room_name")
        .eq("id", pendingRequestId)
        .single();

      if (data && data.status !== requestStatus) {
        setRequestStatus(data.status);
        if (data.status === "accepted") {
          setShowWaitingModal(false);
          setRoomName(data.room_name || `1on1_${pendingRequestId}`);
          toast({
            title: "Host accepted!",
            description: "Connecting to your private session...",
            duration: 5000,
          });
          setShowSession(true);
        } else if (data.status === "declined" || data.status === "expired") {
          setShowWaitingModal(false);
          setPendingRequestId(null);
          setRequestStatus(null);
        }
      }
    }, 3000);

    return () => {
      window.clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [pendingRequestId]);

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
              <Video className="h-4 w-4" />
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
