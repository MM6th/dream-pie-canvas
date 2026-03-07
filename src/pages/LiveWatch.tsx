import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppNavBar from "@/components/AppNavBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Radio, ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import LiveChat from "@/components/live/LiveChat";
import LiveTipButton from "@/components/live/LiveTipButton";

const LiveWatch = () => {
  const { streamId } = useParams<{ streamId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);

  const [stream, setStream] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewerCount, setViewerCount] = useState(0);
  const [connected, setConnected] = useState(false);

  // Fetch stream data
  useEffect(() => {
    if (!streamId) return;

    const fetchStream = async () => {
      const { data, error } = await supabase
        .from("live_streams")
        .select("*")
        .eq("id", streamId)
        .single();

      if (error || !data) {
        toast({ title: "Stream not found", variant: "destructive" });
        navigate("/live");
        return;
      }

      if (data.status === "ended") {
        toast({ title: "This stream has ended" });
        navigate("/live");
        return;
      }

      setStream(data);
      setLoading(false);
    };

    fetchStream();
  }, [streamId, navigate]);

  // WebRTC connection to broadcaster
  useEffect(() => {
    if (!stream || !user || !streamId) return;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }],
    });
    pcRef.current = pc;

    pc.ontrack = (event) => {
      if (videoRef.current && event.streams[0]) {
        videoRef.current.srcObject = event.streams[0];
        setConnected(true);
      }
    };

    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        await (supabase.from("live_stream_signals") as any).insert({
          stream_id: streamId,
          sender_id: user.id,
          signal_type: "ice-candidate",
          signal_data: event.candidate.toJSON(),
          target_id: stream.merchant_id,
        });
      }
    };

    // Listen for signals from broadcaster targeted at us
    const channel = supabase
      .channel(`viewer-signals-${streamId}-${user.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "live_stream_signals",
        filter: `stream_id=eq.${streamId}`,
      }, async (payload: any) => {
        const signal = payload.new;
        if (signal.sender_id === user.id) return;
        if (signal.target_id && signal.target_id !== user.id) return;

        if (signal.signal_type === "offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.signal_data));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await (supabase.from("live_stream_signals") as any).insert({
            stream_id: streamId,
            sender_id: user.id,
            signal_type: "answer",
            signal_data: answer,
            target_id: stream.merchant_id,
          });
        } else if (signal.signal_type === "ice-candidate" && signal.signal_data) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(signal.signal_data));
          } catch (e) {
            // ICE candidate error - can happen during setup
          }
        }
      })
      .subscribe();

    // Send join signal to broadcaster (triggers offer)
    supabase.from("live_stream_signals").insert({
      stream_id: streamId,
      sender_id: user.id,
      signal_type: "offer",
      signal_data: { type: "join-request" },
      target_id: stream.merchant_id,
    });

    // Presence for viewer count
    const presenceChannel = supabase.channel(`presence-${streamId}`);
    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        setViewerCount(Object.keys(state).length - 1);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({ user_id: user.id, role: "viewer" });
        }
      });

    // Listen for stream ending
    const streamChannel = supabase
      .channel(`stream-status-${streamId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "live_streams",
        filter: `id=eq.${streamId}`,
      }, (payload: any) => {
        if (payload.new.status === "ended") {
          toast({ title: "Stream ended", description: "The broadcaster has ended the stream." });
          navigate("/live");
        }
      })
      .subscribe();

    return () => {
      pc.close();
      supabase.removeChannel(channel);
      supabase.removeChannel(presenceChannel);
      supabase.removeChannel(streamChannel);
    };
  }, [stream, user, streamId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <AppNavBar />
        <div className="max-w-7xl mx-auto px-4 py-6 text-center">
          <p className="text-muted-foreground">Connecting to stream...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppNavBar />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/live")} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Live
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video */}
          <div className="lg:col-span-2 space-y-4">
            <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              {!connected && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                  <div className="text-center">
                    <Radio className="w-10 h-10 text-red-500 animate-pulse mx-auto mb-2" />
                    <p className="text-white">Connecting to stream...</p>
                  </div>
                </div>
              )}
              <div className="absolute top-4 left-4 flex gap-2">
                <Badge className="bg-red-600 text-white border-0 animate-pulse">
                  <span className="w-2 h-2 bg-white rounded-full mr-1.5 inline-block" />
                  LIVE
                </Badge>
                <Badge variant="secondary" className="bg-black/60 text-white border-0">
                  <Eye className="w-3 h-3 mr-1" /> {viewerCount}
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold">{stream?.title}</h1>
                {stream?.description && <p className="text-muted-foreground text-sm mt-1">{stream.description}</p>}
              </div>
              {user && stream && user.id !== stream.merchant_id && (
                <LiveTipButton streamId={stream.id} recipientId={stream.merchant_id} />
              )}
            </div>
          </div>

          {/* Chat */}
          <div>
            {streamId && <LiveChat streamId={streamId} />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveWatch;
