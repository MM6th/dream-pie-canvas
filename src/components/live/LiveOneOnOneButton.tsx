import React, { useEffect, useMemo, useState } from "react";
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

const TEST_MODE_ENABLED = true;

const LiveOneOnOneButton = ({ hostId, streamId }: LiveOneOnOneButtonProps) => {
  const { user } = useAuth();
  const [creditsPerMessage, setCreditsPerMessage] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<string | null>(null);
  const [requestStatus, setRequestStatus] = useState<string | null>(null);

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

  useEffect(() => {
    if (!user) return;

    const checkExisting = async () => {
      const { data, error } = await (supabase.from("one_on_one_requests" as any) as any)
        .select("id, status")
        .eq("viewer_id", user.id)
        .eq("stream_id", streamId)
        .in("status", ["pending", "accepted"])
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) {
        console.error("Error checking existing 1-on-1 request:", error);
        return;
      }

      if (data?.length) {
        setPendingRequest(data[0].id);
        setRequestStatus(data[0].status);
      } else {
        setPendingRequest(null);
        setRequestStatus(null);
      }
    };

    checkExisting();
    const interval = window.setInterval(checkExisting, 3000);
    return () => window.clearInterval(interval);
  }, [user, streamId]);

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
              title: "Request accepted",
              description: "The host accepted your 1-on-1 request.",
              duration: 6000,
            });
          } else if (newStatus === "declined") {
            toast({
              title: "Request declined",
              description: "The host declined your 1-on-1 request.",
              variant: "destructive",
              duration: 6000,
            });
            setPendingRequest(null);
            setRequestStatus(null);
          } else if (newStatus === "expired") {
            toast({
              title: "Request expired",
              description: "Your 1-on-1 request expired.",
              duration: 6000,
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
      toast({
        title: "Please sign in",
        description: "You must be signed in to request a 1-on-1 session.",
        variant: "destructive",
        duration: 5000,
      });
      return;
    }

    if (!creditsPerMessage) return;
    if (pendingRequest && requestStatus === "pending") return;

    setRequesting(true);
    try {
      const creditsCharged = TEST_MODE_ENABLED ? 0 : creditsPerMessage;

      if (!TEST_MODE_ENABLED) {
        const { data: credits, error: creditsError } = await supabase
          .from("messaging_credits")
          .select("balance")
          .eq("user_id", user.id)
          .single();

        if (creditsError || !credits || credits.balance < creditsPerMessage) {
          toast({
            title: "Insufficient credits",
            description: `You need ${creditsPerMessage} credit(s) to request a 1-on-1 session.`,
            variant: "destructive",
            duration: 7000,
          });
          return;
        }
      }

      const { data, error } = await (supabase.from("one_on_one_requests" as any) as any)
        .insert({
          stream_id: streamId,
          viewer_id: user.id,
          host_id: hostId,
          credits_charged: creditsCharged,
          status: "pending",
        })
        .select("id, status")
        .single();

      if (error) throw error;

      setPendingRequest(data.id);
      setRequestStatus(data.status);
      toast({
        title: "Request sent",
        description: TEST_MODE_ENABLED
          ? "Test mode is on — the host will receive your 1-on-1 request now."
          : "Waiting for the host to accept your 1-on-1 request...",
        duration: 6000,
      });
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

  const usdCost = useMemo(() => ((creditsPerMessage ?? 0) * 0.1).toFixed(2), [creditsPerMessage]);
  const isPending = requestStatus === "pending";
  const isAccepted = requestStatus === "accepted";

  if (loading || creditsPerMessage === null) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          className={`border-primary/50 gap-2 ${
            isPending
              ? "border-primary/50 text-primary"
              : isAccepted
                ? "border-primary/50 text-primary"
                : "text-primary hover:bg-primary/10"
          }`}
          onClick={handleRequest}
          disabled={requesting || isPending || isAccepted}
        >
          {requesting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isAccepted ? (
            <Check className="h-4 w-4" />
          ) : (
            <Video className="h-4 w-4" />
          )}
          {isPending ? "Pending..." : isAccepted ? "Accepted" : "1 on 1"}
          {!isPending && !isAccepted && (
            <span className="text-xs opacity-80">{TEST_MODE_ENABLED ? "Test mode" : `$${usdCost}`}</span>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {isPending ? (
          <p>Waiting for the host to respond.</p>
        ) : isAccepted ? (
          <p>Your request was accepted.</p>
        ) : TEST_MODE_ENABLED ? (
          <p>Testing mode is active — send a 1-on-1 request without credits.</p>
        ) : (
          <p>Request a private 1-on-1 session — {creditsPerMessage} credit{creditsPerMessage !== 1 ? "s" : ""} (${usdCost})</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
};

export default LiveOneOnOneButton;
