import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLiveKitToken } from "@/hooks/useLiveKitToken";
import AppNavBar from "@/components/AppNavBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Radio, ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import LiveChat from "@/components/live/LiveChat";
import LiveTipButton from "@/components/live/LiveTipButton";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Room,
  RoomEvent,
  Track,
  RemoteTrackPublication,
} from "livekit-client";

const LiveWatch = () => {
  const { streamId } = useParams<{ streamId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getToken } = useLiveKitToken();
  const isMobile = useIsMobile();
  const videoRef = useRef<HTMLVideoElement>(null);
  const roomRef = useRef<Room | null>(null);

  const [stream, setStream] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewerCount, setViewerCount] = useState(0);
  const [connected, setConnected] = useState(false);
  const [needsTapToPlay, setNeedsTapToPlay] = useState(false);

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

  // Attach a remote track to the video element
  const attachTrack = async (publication: RemoteTrackPublication) => {
    if (!publication.track || !videoRef.current) return;
    if (publication.source === Track.Source.Camera || publication.source === Track.Source.Microphone) {
      publication.track.attach(videoRef.current);
      try {
        await videoRef.current.play();
      } catch {
        setNeedsTapToPlay(true);
      }
      if (publication.source === Track.Source.Camera) {
        setConnected(true);
      }
    }
  };

  // Connect to LiveKit room as viewer
  useEffect(() => {
    if (!stream || !user || !streamId) return;

    let cancelled = false;

    const connectToRoom = async () => {
      try {
        const { token, wsUrl } = await getToken(`stream-${streamId}`, false);

        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
        });
        roomRef.current = room;

        // When a new track is subscribed
        room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
          if (cancelled) return;
          console.log("LiveKit viewer: track subscribed", track.source);
          if (videoRef.current) {
            track.attach(videoRef.current);
            if (track.source === Track.Source.Camera) {
              setConnected(true);
            }
          }
        });

        room.on(RoomEvent.TrackUnsubscribed, (track) => {
          track.detach();
        });

        // Participant count
        room.on(RoomEvent.ParticipantConnected, () => {
          setViewerCount(room.remoteParticipants.size);
        });
        room.on(RoomEvent.ParticipantDisconnected, () => {
          setViewerCount(room.remoteParticipants.size);
        });

        room.on(RoomEvent.Disconnected, () => {
          if (!cancelled) {
            toast({ title: "Disconnected from stream" });
          }
        });

        await room.connect(wsUrl, token);
        console.log("LiveKit viewer: connected to room");

        // Attach any already-published tracks from the broadcaster
        for (const participant of room.remoteParticipants.values()) {
          for (const pub of participant.trackPublications.values()) {
            if (pub.isSubscribed && pub.track) {
              attachTrack(pub as RemoteTrackPublication);
            }
          }
        }

        setViewerCount(room.remoteParticipants.size);
      } catch (err: any) {
        console.error("LiveKit viewer connection error:", err);
        if (!cancelled) {
          toast({ title: "Failed to connect", description: err.message, variant: "destructive" });
        }
      }
    };

    connectToRoom();

    // Listen for stream ending via DB
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

    // Polling fallback
    const statusPollInterval = window.setInterval(async () => {
      if (cancelled) return;
      const { data: streamData } = await (supabase
        .from("live_streams") as any)
        .select("status")
        .eq("id", streamId)
        .maybeSingle();

      if (streamData?.status === "ended") {
        toast({ title: "Stream ended", description: "The broadcaster has ended the stream." });
        navigate("/live");
      }
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(statusPollInterval);
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
      supabase.removeChannel(streamChannel);
    };
  }, [stream, user, streamId, navigate, getToken]);

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

        <div className={`flex flex-col lg:grid lg:grid-cols-3 lg:gap-6 ${isMobile ? 'gap-2' : 'gap-4'}`}>
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

          <div className="w-full flex-1 min-h-0">
            {streamId && <LiveChat streamId={streamId} />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveWatch;
