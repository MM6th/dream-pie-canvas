import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLiveKitToken } from "@/hooks/useLiveKitToken";
import AppNavBar from "@/components/AppNavBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Video, VideoOff, Mic, MicOff, Radio, Eye, MessageSquare } from "lucide-react";
import LiveChat from "@/components/live/LiveChat";
import LiveTipDisplay from "@/components/live/LiveTipDisplay";
import LiveOneOnOneRequests from "@/components/live/LiveOneOnOneRequests";
import {
  Room,
  RoomEvent,
  Track,
  VideoPresets,
} from "livekit-client";

const GoLive = () => {
  /** Count unique viewer users from remote participants (excludes self/host and other publishers) */
  const countViewers = (room: Room): number => {
    const viewerUserIds = new Set<string>();
    const myIdentity = room.localParticipant?.identity || "";
    const myBaseId = myIdentity.split(":")[0];
    for (const p of room.remoteParticipants.values()) {
      const hasPublishedTrack = Array.from(p.trackPublications.values()).some(
        (pub) => pub.source === Track.Source.Camera || pub.source === Track.Source.Microphone
      );
      if (hasPublishedTrack) continue;
      const baseUserId = (p.identity || "").split(":")[0] || p.identity;
      // Skip if this is somehow the host's own ghost session
      if (baseUserId === myBaseId) continue;
      if (baseUserId) viewerUserIds.add(baseUserId);
    }
    return viewerUserIds.size;
  };
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getToken } = useLiveKitToken();
  const videoRef = useRef<HTMLVideoElement>(null);
  const roomRef = useRef<Room | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const heartbeatIntervalRef = useRef<number | null>(null);
  const streamIdRef = useRef<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [streamId, setStreamId] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [viewerCount, setViewerCount] = useState(0);
  const [setupPhase, setSetupPhase] = useState(true);
  const [reconnecting, setReconnecting] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [privateSessionActive, setPrivateSessionActive] = useState(false);
  const reconnectAttemptedRef = useRef(false);

  // Fetch host avatar
  useEffect(() => {
    if (!user?.id) return;
    const fetchAvatar = async () => {
      const { data, error } = await (supabase.from("profiles") as any)
        .select("avatar_url")
        .eq("id", user.id)
        .single();
      console.log("GoLive avatar fetch:", { data, error, userId: user.id });
      if (data?.avatar_url) {
        setAvatarUrl(data.avatar_url);
      }
    };
    fetchAvatar();
  }, [user?.id]);

  // Start camera preview (before going live)
  const startPreview = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      toast({ title: "Camera access denied", description: "Please allow camera and microphone access.", variant: "destructive" });
    }
  }, []);

  // Keep stream alive in DB
  const startHeartbeat = useCallback((sid: string) => {
    if (heartbeatIntervalRef.current) window.clearInterval(heartbeatIntervalRef.current);
    const heartbeat = async () => {
      await (supabase.from("live_streams") as any)
        .update({ status: "live", updated_at: new Date().toISOString() })
        .eq("id", sid)
        .eq("merchant_id", user?.id);
    };
    heartbeat();
    heartbeatIntervalRef.current = window.setInterval(heartbeat, 15000);
  }, [user?.id]);

  // Start recording from LiveKit room's local tracks



  // Reconnect to an existing live stream after page refresh
  const reconnectToStream = useCallback(async (existingStream: any) => {
    setReconnecting(true);
    const sid = existingStream.id;
    setStreamId(sid);
    setTitle(existingStream.title || "");
    setDescription(existingStream.description || "");
    setIsLive(true);
    setSetupPhase(false);
    startHeartbeat(sid);

    // Stop any preview stream
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;

    try {
      const { token, wsUrl } = await getToken(`stream-${sid}`, true);

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: {
          resolution: VideoPresets.h720.resolution,
        },
      });
      roomRef.current = room;

      room.on(RoomEvent.ParticipantConnected, () => {
        setViewerCount(countViewers(room));
      });
      room.on(RoomEvent.ParticipantDisconnected, () => {
        setViewerCount(countViewers(room));
      });

      await room.connect(wsUrl, token);
      console.log("LiveKit: reconnected to room as publisher");

      await room.localParticipant.enableCameraAndMicrophone();
      console.log("LiveKit: camera and mic re-published");

      const camPub = room.localParticipant.getTrackPublication(Track.Source.Camera);
      if (camPub?.track && videoRef.current) {
        camPub.track.attach(videoRef.current);
      }




      setViewerCount(countViewers(room));
      toast({ title: "Reconnected to your live stream!" });
    } catch (err: any) {
      console.error("LiveKit reconnect error:", err);
      toast({ title: "Failed to reconnect", description: err.message, variant: "destructive" });
      setIsLive(false);
      setStreamId(null);
      setSetupPhase(true);
      startPreview();
    } finally {
      setReconnecting(false);
    }
  }, [getToken, startPreview, startHeartbeat]);

  const pauseLiveBroadcastForSession = useCallback(async () => {
    setPrivateSessionActive(true);

    if (roomRef.current) {
      for (const pub of roomRef.current.localParticipant.trackPublications.values()) {
        if (pub.track) {
          pub.track.stop();
          pub.track.detach();
        }
      }

      roomRef.current.disconnect();
      roomRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setViewerCount(0);
  }, []);

  const resumeLiveBroadcastAfterSession = useCallback(async () => {
    setPrivateSessionActive(false);

    if (!streamIdRef.current || roomRef.current) return;

    await reconnectToStream({
      id: streamIdRef.current,
      title,
      description,
    });
  }, [description, reconnectToStream, title]);

  // On mount: check for existing active stream, otherwise show preview
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      if (!user || reconnectAttemptedRef.current) {
        if (!reconnectAttemptedRef.current) startPreview();
        return;
      }
      reconnectAttemptedRef.current = true;

      const { data: activeStream } = await (supabase
        .from("live_streams") as any)
        .select("*")
        .eq("merchant_id", user.id)
        .eq("status", "live")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (cancelled) return;

      if (activeStream) {
        console.log("Found active stream, reconnecting:", activeStream.id);
        reconnectToStream(activeStream);
      } else {
        startPreview();
      }
    };

    init();

    return () => {
      cancelled = true;
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      if (heartbeatIntervalRef.current) window.clearInterval(heartbeatIntervalRef.current);
    };
  }, [user, startPreview, reconnectToStream]);

  // Auto-end stream if host navigates away or logs out while live
  streamIdRef.current = streamId;

  useEffect(() => {
    const autoEndStream = async () => {
      const sid = streamIdRef.current;
      if (!sid) return;
      try {
        await (supabase.from("live_streams") as any)
          .update({ status: "ended", ended_at: new Date().toISOString() })
          .eq("id", sid);
        console.log("Auto-ended stream on unmount:", sid);
      } catch (e) {
        console.error("Failed to auto-end stream:", e);
      }
    };

    // Handle tab close / browser close
    const handleBeforeUnload = () => {
      const sid = streamIdRef.current;
      if (!sid || !user?.id) return;
      // Use sendBeacon with Supabase REST API for tab-close reliability
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/live_streams?id=eq.${sid}&merchant_id=eq.${user.id}`;
      const body = JSON.stringify({ status: "ended", ended_at: new Date().toISOString() });
      const blob = new Blob([body], { type: "application/json" });
      // sendBeacon only supports POST, but we can use fetch with keepalive as fallback
      fetch(url, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          "Prefer": "return=minimal",
        },
        body,
        keepalive: true,
      }).catch(() => {});
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // Component unmount (navigation, logout) — end the stream
      autoEndStream();
    };
  }, [user?.id]);

  // Toggle camera
  const toggleCamera = async () => {
    const newState = !cameraOn;
    setCameraOn(newState);

    if (roomRef.current) {
      try {
        await roomRef.current.localParticipant.setCameraEnabled(newState);
        // Re-attach local preview when re-enabling
        if (newState) {
          const camPub = roomRef.current.localParticipant.getTrackPublication(Track.Source.Camera);
          if (camPub?.track && videoRef.current) {
            camPub.track.attach(videoRef.current);
          }
        }
      } catch (err) {
        console.error("Toggle camera error:", err);
      }
    } else {
      const videoTrack = localStreamRef.current?.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = newState;
      }
    }
  };

  // Toggle mic
  const toggleMic = () => {
    if (roomRef.current) {
      const localParticipant = roomRef.current.localParticipant;
      if (micOn) {
        localParticipant.setMicrophoneEnabled(false);
      } else {
        localParticipant.setMicrophoneEnabled(true);
      }
      setMicOn(!micOn);
    } else {
      const audioTrack = localStreamRef.current?.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicOn(audioTrack.enabled);
      }
    }
  };

  // Go Live
  const handleGoLive = async () => {
    if (!user || !title.trim()) {
      toast({ title: "Enter a title", variant: "destructive" });
      return;
    }

    // 1. Close any stale/previous live rows for this host
    await (supabase
      .from("live_streams") as any)
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("merchant_id", user.id)
      .eq("status", "live");

    // 2. Create stream record in DB
    const { data, error } = await (supabase
      .from("live_streams") as any)
      .insert({
        merchant_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        status: "live",
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Failed to start stream", description: error.message, variant: "destructive" });
      return;
    }

    const sid = data.id;
    setStreamId(sid);
    setIsLive(true);
    setSetupPhase(false);
    startHeartbeat(sid);

    // 2. Stop preview stream
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;

    // 3. Get LiveKit token (publisher)
    try {
      const { token, wsUrl } = await getToken(`stream-${sid}`, true);

      // 4. Connect to LiveKit room
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: {
          resolution: VideoPresets.h720.resolution,
        },
      });
      roomRef.current = room;

      // Track viewer count
      room.on(RoomEvent.ParticipantConnected, () => {
        setViewerCount(countViewers(room));
      });
      room.on(RoomEvent.ParticipantDisconnected, () => {
        setViewerCount(countViewers(room));
      });

      await room.connect(wsUrl, token);
      console.log("LiveKit: connected to room as publisher");

      // 5. Publish camera + mic
      await room.localParticipant.enableCameraAndMicrophone();
      console.log("LiveKit: camera and mic published");

      // 6. Attach local video to preview
      const camPub = room.localParticipant.getTrackPublication(Track.Source.Camera);
      if (camPub?.track && videoRef.current) {
        camPub.track.attach(videoRef.current);
      }




      toast({ title: "You're live!", description: "Viewers can now join your stream." });
    } catch (err: any) {
      console.error("LiveKit connection error:", err);
      toast({ title: "Failed to start live stream", description: err.message, variant: "destructive" });
      // Clean up DB record
      await (supabase.from("live_streams") as any)
        .update({ status: "ended", ended_at: new Date().toISOString() })
        .eq("id", sid);
      setIsLive(false);
      setStreamId(null);
      startPreview();
    }
  };

  // End stream
  const endStream = async () => {
    if (heartbeatIntervalRef.current) {
      window.clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    const currentStreamId = streamId;

    // Mark stream as ended in DB
    if (currentStreamId) {
      await (supabase.from("live_streams") as any)
        .update({ status: "ended", ended_at: new Date().toISOString() })
        .eq("id", currentStreamId);
    }

    // Disconnect from LiveKit and stop all local media tracks
    if (roomRef.current) {
      // Stop all local tracks to release camera/mic hardware
      for (const pub of roomRef.current.localParticipant.trackPublications.values()) {
        if (pub.track) {
          pub.track.stop();
          pub.track.detach();
        }
      }
      roomRef.current.disconnect();
      roomRef.current = null;
    }

    // Also stop any lingering preview media stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    setIsLive(false);
    setStreamId(null);

    toast({ title: "Stream ended" });
    navigate("/live");
  };

  if (!user) {
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <AppNavBar />
      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video + Controls */}
          <div className="lg:col-span-2 space-y-4">
            <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
              <video ref={videoRef} autoPlay muted playsInline className={`w-full h-full object-cover ${!cameraOn || privateSessionActive ? 'hidden' : ''}`} />
              {!cameraOn && !privateSessionActive && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Host avatar" className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover border-2 border-muted" />
                  ) : (
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-muted flex items-center justify-center">
                      <VideoOff className="w-10 h-10 text-muted-foreground" />
                    </div>
                  )}
                </div>
              )}
              {privateSessionActive && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-background">
                  <div className="text-center space-y-3 px-6">
                    <Video className="w-10 h-10 text-primary mx-auto" />
                    <p className="text-lg font-semibold text-foreground">Private 1-on-1 session in progress</p>
                    <p className="text-sm text-muted-foreground">Your live stream view is temporarily replaced while the private session is active.</p>
                  </div>
                </div>
              )}
              {reconnecting && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                  <div className="text-center text-white">
                    <Radio className="w-8 h-8 mx-auto mb-2 animate-pulse" />
                    <p className="text-lg font-semibold">Reconnecting to stream...</p>
                  </div>
                </div>
              )}
              {isLive && (
                <div className="absolute top-4 left-4 flex gap-2">
                  <Badge className="bg-red-600 text-white border-0 animate-pulse">
                    <span className="w-2 h-2 bg-white rounded-full mr-1.5 inline-block" />
                    LIVE
                  </Badge>
                  <Badge variant="secondary" className="bg-black/60 text-white border-0">
                    <Eye className="w-3 h-3 mr-1" /> {viewerCount}
                  </Badge>
                </div>
              )}


            </div>

            <div className="flex flex-wrap gap-3 items-center">
              <Button variant="outline" size="sm" onClick={toggleCamera} className={!cameraOn ? "border-destructive text-destructive" : ""}>
                {cameraOn ? <Video className="w-4 h-4 mr-1" /> : <VideoOff className="w-4 h-4 mr-1" />}
                {cameraOn ? "Camera" : "Camera Off"}
              </Button>
              <Button variant="outline" size="sm" onClick={toggleMic} className={!micOn ? "border-destructive text-destructive" : ""}>
                {micOn ? <Mic className="w-4 h-4 mr-1" /> : <MicOff className="w-4 h-4 mr-1" />}
                {micOn ? "Mic" : "Muted"}
              </Button>
              {isLive && (
                <Button onClick={endStream} variant="destructive" size="sm" className="ml-auto">
                  End Stream
                </Button>
              )}
            </div>

            {setupPhase && (
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg">Stream Setup</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Title *</label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What's this stream about?" />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Description</label>
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description..." rows={2} />
                  </div>
                  <Button onClick={handleGoLive} className="w-full bg-red-600 hover:bg-red-700 text-white py-6 text-lg font-semibold" disabled={!title.trim()}>
                    <Radio className="w-5 h-5 mr-2" />
                    Go Live
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Chat sidebar */}
          <div className="space-y-4">
            {isLive && streamId ? (
              <>
                <LiveOneOnOneRequests
                  streamId={streamId}
                  onSessionStart={pauseLiveBroadcastForSession}
                  onSessionEnd={resumeLiveBroadcastAfterSession}
                />
                <LiveChat streamId={streamId} />
                <LiveTipDisplay streamId={streamId} merchantId={user.id} />
              </>
            ) : (
              <Card className="bg-card border-border">
                <CardContent className="p-6 text-center">
                  <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">Chat will appear here once you go live</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoLive;
