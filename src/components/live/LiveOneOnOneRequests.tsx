import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

  // Fetch pending requests
  const fetchRequests = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("one_on_one_requests" as any)
      .select("*")
      .eq("stream_id", streamId)
      .eq("host_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (data) {
      // Fetch viewer names
      const viewerIds = (data as any[]).map((r) => r.viewer_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", viewerIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p.display_name]) || []);

      setRequests(
        (data as any[]).map((r) => ({
          ...r,
          viewer_name: profileMap.get(r.viewer_id) || "Viewer",
        }))
      );
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [user, streamId]);

  // Subscribe to new requests via realtime
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`host_one_on_one_${streamId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "one_on_one_requests",
          filter: `host_id=eq.${user.id}`,
        },
        (payload: any) => {
          console.log("Host received 1-on-1 request via realtime:", payload);
          fetchRequests();
          toast({ title: "🎥 New 1-on-1 Request!", description: "A viewer wants a private session with you.", duration: 10000 });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, streamId]);

  const handleRespond = async (requestId: string, action: "accepted" | "declined") => {
    try {
      const { error } = await supabase
        .from("one_on_one_requests" as any)
        .update({
          status: action,
          responded_at: new Date().toISOString(),
          ...(action === "accepted" ? { room_name: `1on1_${requestId}` } : {}),
        } as any)
        .eq("id", requestId);

      if (error) throw error;

      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      toast({
        title: action === "accepted" ? "Request Accepted" : "Request Declined",
        description: action === "accepted" ? "Private session starting..." : "Request has been declined.",
      });
    } catch (err: any) {
      console.error("Error responding to request:", err);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (requests.length === 0) return null;

  return (
    <div className="space-y-2">
      {requests.map((req) => (
        <Card key={req.id} className="p-3 border-primary/30 bg-primary/5 animate-pulse-slow">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Video className="w-4 h-4 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{req.viewer_name}</p>
                <p className="text-xs text-muted-foreground">
                  1-on-1 request • {req.credits_charged} credit{req.credits_charged !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                size="sm"
                variant="default"
                className="h-7 px-2 bg-green-600 hover:bg-green-700"
                onClick={() => handleRespond(req.id, "accepted")}
              >
                <Check className="w-3 h-3 mr-1" /> Accept
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="h-7 px-2"
                onClick={() => handleRespond(req.id, "declined")}
              >
                <X className="w-3 h-3 mr-1" /> Decline
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default LiveOneOnOneRequests;
