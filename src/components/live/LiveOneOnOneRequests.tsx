import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Video, Check, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface OneOnOneRequest {
  id: string;
  viewer_id: string;
  status: string;
  credits_charged: number;
  created_at: string;
  viewer_name?: string;
}

interface LiveOneOnOneRequestsProps {
  streamId: string;
}

const LiveOneOnOneRequests = ({ streamId }: LiveOneOnOneRequestsProps) => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<OneOnOneRequest[]>([]);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const fetchRequests = async () => {
    if (!user) return;

    const { data, error } = await (supabase.from("one_on_one_requests" as any) as any)
      .select("id, viewer_id, status, credits_charged, created_at")
      .eq("stream_id", streamId)
      .eq("host_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching 1-on-1 requests:", error);
      return;
    }

    if (!data?.length) {
      setRequests([]);
      return;
    }

    const viewerIds = data.map((request: OneOnOneRequest) => request.viewer_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", viewerIds);

    const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile.display_name]));

    setRequests(
      data.map((request: OneOnOneRequest) => ({
        ...request,
        viewer_name: profileMap.get(request.viewer_id) || "Viewer",
      }))
    );
  };

  useEffect(() => {
    fetchRequests();
    if (!user) return;

    const channel = supabase
      .channel(`host_one_on_one_${streamId}_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "one_on_one_requests",
          filter: `host_id=eq.${user.id}`,
        },
        () => {
          fetchRequests();
          toast({
            title: "Incoming 1-on-1 request",
            description: "A viewer is requesting a private session.",
            duration: 8000,
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "one_on_one_requests",
          filter: `host_id=eq.${user.id}`,
        },
        fetchRequests
      )
      .subscribe();

    const interval = window.setInterval(fetchRequests, 3000);

    return () => {
      window.clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [streamId, user?.id]);

  const activeRequest = useMemo(() => requests[0] ?? null, [requests]);

  const handleRespond = async (requestId: string, action: "accepted" | "declined") => {
    setRespondingId(requestId);
    try {
      const { error } = await (supabase.from("one_on_one_requests" as any) as any)
        .update({
          status: action,
          responded_at: new Date().toISOString(),
          ...(action === "accepted" ? { room_name: `1on1_${requestId}` } : {}),
        })
        .eq("id", requestId)
        .eq("host_id", user?.id);

      if (error) throw error;

      setRequests((previous) => previous.filter((request) => request.id !== requestId));
      toast({
        title: action === "accepted" ? "Request accepted" : "Request declined",
        description: action === "accepted" ? "The viewer has been notified." : "The request was declined.",
        duration: 6000,
      });
    } catch (err: any) {
      console.error("Error responding to request:", err);
      toast({
        title: "Response failed",
        description: err.message || "Unable to respond to the request.",
        variant: "destructive",
        duration: 7000,
      });
    } finally {
      setRespondingId(null);
    }
  };

  return (
    <Dialog open={!!activeRequest}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            New 1-on-1 request
          </DialogTitle>
          <DialogDescription>
            {activeRequest
              ? `${activeRequest.viewer_name} wants to start a private 1-on-1 session.`
              : "Waiting for requests."}
          </DialogDescription>
        </DialogHeader>

        {activeRequest && (
          <div className="space-y-4 rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-foreground">{activeRequest.viewer_name}</p>
                <p className="text-sm text-muted-foreground">Requested just now during your live.</p>
              </div>
              <Badge variant="outline">
                {activeRequest.credits_charged > 0 ? `${activeRequest.credits_charged} credits` : "Test mode"}
              </Badge>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => activeRequest && handleRespond(activeRequest.id, "declined")}
            disabled={!activeRequest || respondingId === activeRequest?.id}
          >
            <X className="mr-2 h-4 w-4" />
            Decline
          </Button>
          <Button
            onClick={() => activeRequest && handleRespond(activeRequest.id, "accepted")}
            disabled={!activeRequest || respondingId === activeRequest?.id}
          >
            <Check className="mr-2 h-4 w-4" />
            Accept
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LiveOneOnOneRequests;
