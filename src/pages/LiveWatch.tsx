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
import { useIsMobile } from "@/hooks/use-mobile";

const LiveWatch = () => {
  const { streamId } = useParams<{ streamId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
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
      const { data, error } = await (supabase
        .from("live_streams") as any)
        .select("*")
        .eq("id", streamId)
        .single();

      if (error || !data) {
        console.error("Stream fetch error:", error);
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

  // WebRTC connection to broadcaster via Supabase Broadcast
  useEffect(() => {
    if (!stream || !user || !streamId) return;

    let cancelled = false;
    const iceCandidateQueue: RTCIceCandidateInit[] = [];
    let remoteDescriptionSet = false;

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
      ],
    });
    pcRef.current = pc;

    pc.ontrack = (event) => {
      console.log("Viewer: ontrack fired, streams:", event.streams.length);
      if (videoRef.current && event.streams[0]) {
        videoRef.current.srcObject = event.streams[0];
        setConnected(true);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("Viewer ICE state:", pc.iceConnectionState);
      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        setConnected(true);
      }
      if (pc.iceConnectionState === "failed") {
        console.error("Viewer: ICE connection FAILED - may need TURN server");
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("Viewer connection state:", pc.connectionState);
    };

    pc.onsignalingstatechange = () => {
      console.log("Viewer signaling state:", pc.signalingState);
    };

    // Flush queued ICE candidates after remote description is set
    const flushIceCandidateQueue = async () => {
      while (iceCandidateQueue.length > 0) {
        const candidate = iceCandidateQueue.shift()!;
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn("Viewer: failed to add queued ICE candidate", e);
        }
      }
    };

    // Broadcast channel for WebRTC signaling
    const rtcChannel = supabase.channel(`rtc-${streamId}`, { config: { broadcast: { ack: true } } });

    pc.onicecandidate = (event) => {
      if (event.candidate && !cancelled) {
        console.log("Viewer: sending ICE candidate via broadcast");
        rtcChannel.send({
          type: "broadcast",
          event: "signal",
          payload: { type: "ice-candidate", from: user.id, to: stream.merchant_id, data: event.candidate.toJSON() },
        });
      }
    };

    const handleSignal = async (payload: any) => {
      if (cancelled) return;
      if (payload.from === user.id) return;
      if (payload.to && payload.to !== user.id) return;

      if (payload.type === "offer" && payload.data?.sdp) {
        console.log("Viewer: received SDP offer from host via broadcast");
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.data));
          remoteDescriptionSet = true;
          await flushIceCandidateQueue();
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          console.log("Viewer: sending SDP answer via broadcast");
          rtcChannel.send({
            type: "broadcast",
            event: "signal",
            payload: { type: "answer", from: user.id, to: stream.merchant_id, data: answer },
          });
          console.log("Viewer: sent SDP answer to host");
        } catch (e) {
          console.error("Viewer: error handling offer", e);
        }
      } else if (payload.type === "ice-candidate" && payload.data) {
        if (remoteDescriptionSet) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(payload.data));
          } catch (e) {
            console.warn("Viewer: error adding ICE candidate", e);
          }
        } else {
          iceCandidateQueue.push(payload.data);
        }
      }
    };

    rtcChannel
      .on("broadcast", { event: "signal" }, ({ payload }: any) => {
        handleSignal(payload);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED" && !cancelled) {
          console.log("Viewer: broadcast channel ready, sending join request");
          rtcChannel.send({
            type: "broadcast",
            event: "signal",
            payload: { type: "join-request", from: user.id },
          });

          // Retry join request after 3s if not connected
          setTimeout(() => {
            if (!remoteDescriptionSet && !cancelled) {
              console.log("Viewer: retrying join request...");
              rtcChannel.send({
                type: "broadcast",
                event: "signal",
                payload: { type: "join-request", from: user.id },
              });
            }
          }, 3000);

          // Retry again after 7s
          setTimeout(() => {
            if (!remoteDescriptionSet && !cancelled) {
              console.log("Viewer: second retry join request...");
              rtcChannel.send({
                type: "broadcast",
                event: "signal",
                payload: { type: "join-request", from: user.id },
              });
            }
          }, 7000);
        }
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

    // Listen for stream ending via Realtime (no UUID filter, filter in JS)
    const streamChannel = supabase
      .channel(`stream-status-${streamId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "live_streams",
      }, (payload: any) => {
        if (payload.new.id === streamId && payload.new.status === "ended") {
          toast({ title: "Stream ended", description: "The broadcaster has ended the stream." });
          navigate("/live");
        }
      })
      .subscribe();

    // Polling fallback: check stream status every 5 seconds
    const statusPollInterval = window.setInterval(async () => {
      if (cancelled) return;
      const { data: streamData } = await (supabase
        .from("live_streams") as any)
        .select("status")
        .eq("id", streamId)
        .maybeSingle();

      if (streamData?.status === "ended") {
        console.log("Viewer: stream ended detected via polling");
        toast({ title: "Stream ended", description: "The broadcaster has ended the stream." });
        navigate("/live");
      }
    }, 5000);

    return () => {
      cancelled = true;
      pc.close();
      window.clearInterval(statusPollInterval);
      supabase.removeChannel(rtcChannel);
      supabase.removeChannel(presenceChannel);
      supabase.removeChannel(streamChannel);
    };
  }, [stream, user, streamId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
        <AppNavBar />
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-6 text-center">
          <p className="text-muted-foreground">Connecting to stream...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <AppNavBar />
      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-2 sm:py-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/live")} className="mb-2">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Live
        </Button>

        {/* Mobile: stacked column, both visible. Desktop: side-by-side grid */}
        <div className={`flex flex-col lg:grid lg:grid-cols-3 lg:gap-6 ${isMobile ? 'gap-2' : 'gap-4'}`}>
          {/* Video section */}
          <div className="lg:col-span-2 space-y-2">
            <div className={`relative bg-black rounded-xl overflow-hidden ${isMobile ? 'h-[25vh] min-h-[140px]' : 'aspect-video'}`}>
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              {!connected && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                  <div className="text-center">
                    <Radio className="w-8 h-8 sm:w-10 sm:h-10 text-red-500 animate-pulse mx-auto mb-2" />
                    <p className="text-white text-sm sm:text-base">Connecting to stream...</p>
                  </div>
                </div>
              )}
              <div className="absolute top-2 sm:top-4 left-2 sm:left-4 flex gap-2">
                <Badge className="bg-red-600 text-white border-0 animate-pulse text-xs">
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full mr-1 sm:mr-1.5 inline-block" />
                  LIVE
                </Badge>
                <Badge variant="secondary" className="bg-black/60 text-white border-0 text-xs">
                  <Eye className="w-3 h-3 mr-1" /> {viewerCount}
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h1 className={`font-bold truncate ${isMobile ? 'text-base' : 'text-xl'}`}>{stream?.title}</h1>
                {stream?.description && (
                  <p className="text-muted-foreground text-xs sm:text-sm mt-0.5 line-clamp-1">{stream.description}</p>
                )}
              </div>
              {user && stream && user.id !== stream.merchant_id && (
                <LiveTipButton streamId={stream.id} recipientId={stream.merchant_id} />
              )}
            </div>
          </div>

          {/* Chat section — always visible immediately */}
          <div className="w-full flex-1 min-h-0">
            {streamId && <LiveChat streamId={streamId} />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveWatch;
