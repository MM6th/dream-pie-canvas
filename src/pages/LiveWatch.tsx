import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLiveKitToken } from "@/hooks/useLiveKitToken";
import AppNavBar from "@/components/AppNavBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Radio, ArrowLeft, LogOut, Volume2, VolumeX, VideoOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import LiveChat from "@/components/live/LiveChat";
import LiveTipButton from "@/components/live/LiveTipButton";
import LiveOneOnOneButton from "@/components/live/LiveOneOnOneButton";

import { useIsMobile } from "@/hooks/use-mobile";
import {
  Room,
  RoomEvent,
  Track,
  RemoteTrackPublication,
} from "livekit-client";

const MAX_TOKEN_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Count only unique viewer users (exclude host/publishers and duplicate reconnect sessions) */
/** Count unique viewer users from remote participants (excludes host/publishers) */
const countRemoteViewers = (room: Room): number => {
  const viewerUserIds = new Set<string>();
  for (const p of room.remoteParticipants.values()) {
    const hasPublishedTrack = Array.from(p.trackPublications.values()).some(
      (pub) => pub.source === Track.Source.Camera || pub.source === Track.Source.Microphone
    );
    if (hasPublishedTrack) continue;
    const baseUserId = (p.identity || "").split(":")[0] || p.identity;
    if (baseUserId) viewerUserIds.add(baseUserId);
  }
  return viewerUserIds.size;
};

const LiveWatch = () => {
  const { streamId } = useParams<{ streamId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { getToken } = useLiveKitToken();
  const isMobile = useIsMobile();
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const roomRef = useRef<Room | null>(null);

  const [stream, setStream] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewerCount, setViewerCount] = useState(0);
  const [connected, setConnected] = useState(false);
  const [streamReady, setStreamReady] = useState(false);
  const [muted, setMuted] = useState(false);
  const [hostCameraOff, setHostCameraOff] = useState(false);
  const [hostAvatarUrl, setHostAvatarUrl] = useState<string | null>(null);
  const inOneOnOneRef = useRef(false);
  const userRef = useRef(user);
  userRef.current = user;

  // Fetch stream data — only depends on streamId (runs once)
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

      // If the current user is the host, redirect them to the Go Live controls
      if (userRef.current && data.merchant_id === userRef.current.id) {
        toast({ title: "Redirecting to your stream controls" });
        navigate("/go-live", { replace: true });
        return;
      }

      setStream(data);
      setStreamReady(true);
      setLoading(false);

      // Fetch host avatar
      const { data: profile } = await (supabase.from("profiles") as any)
        .select("avatar_url")
        .eq("id", data.merchant_id)
        .single();
      if (profile?.avatar_url) setHostAvatarUrl(profile.avatar_url);
    };

    fetchStream();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamId, navigate]);

  // Attach remote tracks separately: camera -> video, microphone -> hidden audio
  const attachTrack = async (publication: RemoteTrackPublication) => {
    if (!publication.track) return;

    if (publication.source === Track.Source.Camera && videoRef.current) {
      // Keep video autoplay muted and inline to avoid browser playback overlays
      videoRef.current.muted = true;
      videoRef.current.playsInline = true;
      videoRef.current.autoplay = true;
      publication.track.detach();
      publication.track.attach(videoRef.current);
      setConnected(true);
      return;
    }

    if (publication.source === Track.Source.Microphone && audioRef.current) {
      // Attach only to controlled audio element; rely on element autoplay behavior
      publication.track.detach();
      audioRef.current.muted = false;
      audioRef.current.autoplay = true;
      publication.track.attach(audioRef.current);
    }
  };

  // Connect to LiveKit room as viewer — only runs once when streamReady flips to true
  useEffect(() => {
    if (!streamReady || !streamId || authLoading) return;

    let cancelled = false;

    const connectToRoom = async () => {
      let lastError: any = null;

      for (let attempt = 1; attempt <= MAX_TOKEN_RETRIES; attempt++) {
        if (cancelled) return;

        try {
          console.log(`LiveKit viewer: token attempt ${attempt}/${MAX_TOKEN_RETRIES}`);

          // Wait for a valid auth session before requesting token
          const { data: sessionData } = await supabase.auth.getSession();
          if (!sessionData?.session) {
            console.warn("LiveKit viewer: no session yet, waiting...");
            await sleep(RETRY_DELAY_MS);
            continue;
          }

          const { token, wsUrl } = await getToken(`stream-${streamId}`, false);
          console.log("LiveKit viewer: token obtained, connecting to room");

          const room = new Room({
            adaptiveStream: true,
            dynacast: true,
          });
          roomRef.current = room;

          room.on(RoomEvent.TrackSubscribed, async (track, publication) => {
            if (cancelled) return;
            console.log("LiveKit viewer: track subscribed", track.source);
            if (track.source === Track.Source.Camera) setHostCameraOff(false);
            await attachTrack(publication as RemoteTrackPublication);
          });

          room.on(RoomEvent.TrackUnsubscribed, (track) => {
            if (track.source === Track.Source.Camera) setHostCameraOff(true);
            track.detach();
          });

          room.on(RoomEvent.TrackMuted, (publication) => {
            if (publication.source === Track.Source.Camera) setHostCameraOff(true);
          });
          room.on(RoomEvent.TrackUnmuted, (publication) => {
            if (publication.source === Track.Source.Camera) setHostCameraOff(false);
          });

          room.on(RoomEvent.ParticipantConnected, () => {
            setViewerCount(countRemoteViewers(room) + 1); // +1 for self
          });
          room.on(RoomEvent.ParticipantDisconnected, () => {
            setViewerCount(countRemoteViewers(room) + 1); // +1 for self
          });

          room.on(RoomEvent.Disconnected, () => {
            if (cancelled) return;
            // Transient network disconnects can happen; do not treat as stream ended here.
            // Stream-end navigation is handled by realtime + polling on live_streams.status.
            setConnected(false);
            console.warn("LiveKit viewer: disconnected from room, waiting for stream status sync");
          });

          await room.connect(wsUrl, token);
          console.log("LiveKit viewer: connected to room");

          // Attach any already-published tracks from the broadcaster
          for (const participant of room.remoteParticipants.values()) {
            for (const pub of participant.trackPublications.values()) {
              if (pub.isSubscribed && pub.track) {
                await attachTrack(pub as RemoteTrackPublication);
              }
            }
          }

          setViewerCount(countRemoteViewers(room) + 1); // +1 for self
          // Success — exit retry loop
          return;
        } catch (err: any) {
          lastError = err;
          console.error(`LiveKit viewer: attempt ${attempt} failed:`, err);
          if (attempt < MAX_TOKEN_RETRIES) {
            await sleep(RETRY_DELAY_MS);
          }
        }
      }

      // All retries exhausted
      if (!cancelled && lastError) {
        toast({ title: "Failed to connect", description: lastError.message, variant: "destructive" });
      }
    };

    connectToRoom();

    // Listen for THIS stream ending via DB (filtered to this specific row)
    const streamChannel = supabase
      .channel(`stream-status-${streamId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "live_streams",
        filter: `id=eq.${streamId}`,
      }, (payload: any) => {
        if (cancelled) return;
        if (payload.new.status === "ended") {
          toast({ title: "Stream ended", description: "The broadcaster has ended the stream." });
          navigate("/live");
        }
        if (payload.new.status === "in_session" && !inOneOnOneRef.current) {
          toast({ title: "Host is in a private session", description: "The stream will resume after the session ends." });
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

      if (cancelled) return;
      if (streamData?.status === "ended") {
        toast({ title: "Stream ended", description: "The broadcaster has ended the stream." });
        navigate("/live");
      }
      if (streamData?.status === "in_session" && !inOneOnOneRef.current) {
        toast({ title: "Host is in a private session", description: "The stream will resume after the session ends." });
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamReady, streamId, authLoading]);

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
        <div className="flex items-center gap-2 mb-2">
          <Button variant="ghost" size="sm" onClick={() => {
            if (roomRef.current) { roomRef.current.disconnect(); roomRef.current = null; }
            navigate("/live");
          }}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Live
          </Button>
          <Button variant="destructive" size="sm" onClick={() => {
            if (roomRef.current) { roomRef.current.disconnect(); roomRef.current = null; }
            toast({ title: "You left the stream" });
            navigate("/live");
          }}>
            <LogOut className="w-4 h-4 mr-1" /> Leave Stream
          </Button>
        </div>

        <div className={`flex flex-col lg:grid lg:grid-cols-3 lg:gap-6 ${isMobile ? 'gap-2' : 'gap-4'}`}>
          <div className="lg:col-span-2 space-y-2">
            <div className={`relative bg-black rounded-xl overflow-hidden ${isMobile ? 'h-[25vh] min-h-[140px]' : 'aspect-video'}`}>
              <video ref={videoRef} playsInline muted autoPlay className={`w-full h-full object-cover ${hostCameraOff ? 'invisible' : ''}`} />
              <audio ref={audioRef} autoPlay muted={muted} className="hidden" />
              {hostCameraOff && connected && (
                <div className="absolute inset-0 flex items-center justify-center bg-black">
                  {hostAvatarUrl ? (
                    <img src={hostAvatarUrl} alt="Host" className="w-20 h-20 sm:w-28 sm:h-28 rounded-full object-cover border-2 border-muted" />
                  ) : (
                    <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-muted flex items-center justify-center">
                      <VideoOff className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
              )}
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
                  <Eye className="w-3 h-3 mr-1" /> {connected ? Math.max(viewerCount, 1) : viewerCount}
                </Badge>
              </div>
              <div className="absolute top-2 sm:top-4 right-2 sm:right-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-black/60 hover:bg-black/80 text-white rounded-full w-8 h-8 sm:w-9 sm:h-9"
                  onClick={() => setMuted((prev) => !prev)}
                >
                  {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </Button>
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
                <div className="flex items-center gap-2">
                  <LiveOneOnOneButton hostId={stream.merchant_id} streamId={stream.id} onSessionActive={(active) => { inOneOnOneRef.current = active; }} />
                  <LiveTipButton streamId={stream.id} recipientId={stream.merchant_id} />
                </div>
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
