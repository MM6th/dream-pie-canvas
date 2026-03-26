import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Video, Loader2, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface LiveOneOnOneButtonProps {
  hostId: string;
  streamId: string;
}

const LiveOneOnOneButton = ({ hostId, streamId }: LiveOneOnOneButtonProps) => {
  const { user } = useAuth();
  const [creditsPerMessage, setCreditsPerMessage] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<string | null>(null);
  const [requestStatus, setRequestStatus] = useState<string | null>(null);

  // Fetch host's message rate
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

  // Check for existing pending request
  useEffect(() => {
    if (!user) return;

    const checkExisting = async () => {
      const { data } = await supabase
        .from("one_on_one_requests" as any)
        .select("id, status")
        .eq("viewer_id", user.id)
        .eq("stream_id", streamId)
        .in("status", ["pending", "accepted"])
        .order("created_at", { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        setPendingRequest((data[0] as any).id);
        setRequestStatus((data[0] as any).status);
      }
    };

    checkExisting();
  }, [user, streamId]);

  // Subscribe to request status changes via realtime
  useEffect(() => {
    if (!pendingRequest) return;

    const channel = supabase
      .channel(`one_on_one_${pendingRequest}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "one_on_one_requests",
          filter: `id=eq.${pendingRequest}`,
        },
        (payload: any) => {
          const newStatus = payload.new.status;
          setRequestStatus(newStatus);

          if (newStatus === "accepted") {
            toast({
              title: "Request Accepted!",
              description: "The host accepted your 1-on-1 request. Connecting...",
            });
            // TODO: Navigate to private room
          } else if (newStatus === "declined") {
            toast({
              title: "Request Declined",
              description: "The host declined your 1-on-1 request.",
              variant: "destructive",
            });
            setPendingRequest(null);
            setRequestStatus(null);
          } else if (newStatus === "expired") {
            toast({
              title: "Request Expired",
              description: "Your 1-on-1 request has expired.",
            });
            setPendingRequest(null);
            setRequestStatus(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pendingRequest]);

  const handleRequest = async () => {
    if (!user) {
      toast({ title: "Please sign in", description: "You must be signed in to request a 1-on-1 session.", variant: "destructive" });
      return;
    }

    if (!creditsPerMessage) return;

    // Check credits
    const { data: credits } = await supabase
      .from("messaging_credits")
      .select("balance")
      .eq("user_id", user.id)
      .single();

    if (!credits || credits.balance < creditsPerMessage) {
      toast({
        title: "Insufficient Credits",
        description: `You need ${creditsPerMessage} credit(s) ($${(creditsPerMessage * 0.10).toFixed(2)}) to request a 1-on-1 session. Please purchase credits first.`,
        variant: "destructive",
      });
      return;
    }

    setRequesting(true);
    try {
      const { data, error } = await supabase
        .from("one_on_one_requests" as any)
        .insert({
          stream_id: streamId,
          viewer_id: user.id,
          host_id: hostId,
          credits_charged: creditsPerMessage,
          status: "pending",
        } as any)
        .select()
        .single();

      if (error) throw error;

      setPendingRequest((data as any).id);
      setRequestStatus("pending");
      toast({
        title: "Request Sent!",
        description: "Waiting for the host to accept your 1-on-1 request...",
      });
    } catch (err: any) {
      console.error("Error sending request:", err);
      toast({ title: "Error", description: err.message || "Failed to send request", variant: "destructive" });
    } finally {
      setRequesting(false);
    }
  };

  if (loading || creditsPerMessage === null) return null;

  const usdCost = (creditsPerMessage * 0.10).toFixed(2);
  const isPending = requestStatus === "pending";
  const isAccepted = requestStatus === "accepted";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          className={`border-primary/50 gap-2 ${
            isPending
              ? "text-yellow-500 border-yellow-500/50"
              : isAccepted
              ? "text-green-500 border-green-500/50"
              : "text-primary hover:bg-primary/10"
          }`}
          onClick={handleRequest}
          disabled={requesting || isPending || isAccepted}
        >
          {requesting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isAccepted ? (
            <Check className="w-4 h-4" />
          ) : (
            <Video className="w-4 h-4" />
          )}
          {isPending ? "Pending..." : isAccepted ? "Accepted" : "1 on 1"}
          {!isPending && !isAccepted && (
            <span className="text-xs opacity-80">${usdCost}</span>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {isPending ? (
          <p>Waiting for host to accept...</p>
        ) : isAccepted ? (
          <p>Connecting to private session...</p>
        ) : (
          <p>Request a private 1-on-1 session — {creditsPerMessage} credit{creditsPerMessage !== 1 ? "s" : ""} (${usdCost})</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
};

export default LiveOneOnOneButton;
