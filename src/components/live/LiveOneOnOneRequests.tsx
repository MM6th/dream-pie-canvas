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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Video, Check, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";


interface OneOnOneRequest {
  id: string;
  viewer_id: string;
  status: string;
  credits_charged: number;
  created_at: string;
  viewer_name?: string;
  viewer_avatar?: string | null;
}

interface LiveOneOnOneRequestsProps {
  streamId: string;
  onSessionStart?: (roomName: string) => Promise<void> | void;
  onSessionEnd?: () => Promise<void> | void;
}

const LiveOneOnOneRequests = ({ streamId, onSessionStart, onSessionEnd }: LiveOneOnOneRequestsProps) => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<OneOnOneRequest[]>([]);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [hostRate, setHostRate] = useState<number>(0);
  const [sessionDurationMinutes, setSessionDurationMinutes] = useState<number>(15);
  const [activeSessionRoom, setActiveSessionRoom] = useState<string | null>(null); // kept for modal close logic

  // Fetch host rate
  useEffect(() => {
    if (!user) return;
    const fetchRate = async () => {
      const { data } = await supabase
        .from("message_settings")
        .select("credits_per_message")
        .eq("merchant_id", user.id)
        .single();
      if (data) setHostRate(data.credits_per_message ?? 0);

      const { data: lsData } = await (supabase as any)
        .from("livestream_settings")
        .select("session_duration_minutes")
        .eq("merchant_id", user.id)
        .single();
      if (lsData?.session_duration_minutes) {
        setSessionDurationMinutes(lsData.session_duration_minutes);
      }
    };
    fetchRate();
  }, [user]);

  const fetchRequests = async () => {
    if (!user) return;

    const { data, error } = await (supabase.from("one_on_one_requests" as any) as any)
      .select("id, viewer_id, status, credits_charged, created_at")
      .eq("stream_id", streamId)
      .eq("host_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (error || !data?.length) {
      setRequests([]);
      return;
    }

    const viewerIds = data.map((r: any) => r.viewer_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", viewerIds);

    const profileMap = new Map(
      (profiles ?? []).map((p) => [p.id, { name: p.display_name, avatar: p.avatar_url }])
    );

    setRequests(
      data.map((r: any) => ({
        ...r,
        viewer_name: profileMap.get(r.viewer_id)?.name || "Viewer",
        viewer_avatar: profileMap.get(r.viewer_id)?.avatar || null,
      }))
    );
  };

  useEffect(() => {
    fetchRequests();
    if (!user) return;

    const channel = supabase
      .channel(`host_1on1_${streamId}_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "one_on_one_requests",
          filter: `host_id=eq.${user.id}`,
        },
        () => fetchRequests()
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "one_on_one_requests",
          filter: `host_id=eq.${user.id}`,
        },
        () => fetchRequests()
      )
      .subscribe();

    const interval = window.setInterval(fetchRequests, 3000);

    return () => {
      window.clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [streamId, user?.id]);

  const activeRequest = useMemo(() => requests[0] ?? null, [requests]);

  const usdCost = (hostRate * 0.1).toFixed(2);

  const handleRespond = async (requestId: string, action: "accepted" | "declined") => {
    setRespondingId(requestId);
    try {
      const roomName = `1on1_${requestId}`;

      if (action === "accepted") {
        await onSessionStart?.(roomName);
      }

      const { error } = await (supabase.from("one_on_one_requests" as any) as any)
        .update({
          status: action,
          responded_at: new Date().toISOString(),
          ...(action === "accepted" ? { room_name: roomName } : {}),
        })
        .eq("id", requestId)
        .eq("host_id", user?.id);

      if (error) throw error;

      setRequests((prev) => prev.filter((r) => r.id !== requestId));

      if (action === "accepted") {
        setActiveSessionRoom(roomName);
      } else {
        toast({
          title: "Request declined",
          description: "The viewer has been notified.",
          duration: 5000,
        });
      }
    } catch (err: any) {
      console.error("Error responding to request:", err);
      toast({
        title: "Response failed",
        description: err.message || "Unable to respond.",
        variant: "destructive",
        duration: 7000,
      });
    } finally {
      setRespondingId(null);
    }
  };

  return (
    <>
      {/* Host incoming request modal */}
      <Dialog open={!!activeRequest && !activeSessionRoom}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              1-on-1 Request
            </DialogTitle>
            <DialogDescription>
              A viewer wants to go live with you
            </DialogDescription>
          </DialogHeader>

          {activeRequest && (
            <div className="flex flex-col items-center gap-4 py-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={activeRequest.viewer_avatar || undefined} />
                <AvatarFallback className="text-lg">
                  {(activeRequest.viewer_name || "V").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="text-center space-y-1">
                <p className="font-semibold text-lg text-foreground">{activeRequest.viewer_name}</p>
                <p className="text-sm text-muted-foreground">
                  Wants a private 1-on-1 session for <span className="font-semibold text-foreground">${usdCost}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Session duration: <span className="font-semibold text-foreground">{sessionDurationMinutes} minutes</span>
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => activeRequest && handleRespond(activeRequest.id, "declined")}
              disabled={!activeRequest || respondingId === activeRequest?.id}
            >
              <X className="mr-2 h-4 w-4" />
              Decline
            </Button>
            <Button
              className="flex-1"
              onClick={() => activeRequest && handleRespond(activeRequest.id, "accepted")}
              disabled={!activeRequest || respondingId === activeRequest?.id}
            >
              <Check className="mr-2 h-4 w-4" />
              Accept
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  );
};

export default LiveOneOnOneRequests;
