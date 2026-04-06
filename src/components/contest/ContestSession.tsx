import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useLiveKitToken } from "@/hooks/useLiveKitToken";
import { Button } from "@/components/ui/button";
import { Clock, Loader2, Video, VideoOff, Mic, MicOff, User, Trophy } from "lucide-react";
import OneOnOneTipButton from "@/components/live/OneOnOneTipButton";
import OneOnOneTipMeter from "@/components/live/OneOnOneTipMeter";
import { toast } from "@/hooks/use-toast";
import { Room, RoomEvent, Track, VideoPresets } from "livekit-client";

interface ContestSessionProps {
  roomName: string;
  role: "champion" | "challenger" | "spectator";
  championId: string;
  challengerId: string;
  durationMinutes: number;
  challengeType: string;
  onEnd: () => void;
}

const safePlay = (el: HTMLMediaElement | null) => {
  if (!el) return;
  el.play().catch(() => {});
};

const ContestSession = ({
  roomName,
  role,
  championId,
  challengerId,
  durationMinutes,
  challengeType,
  onEnd,
}: ContestSessionProps) => {
  const { user } = useAuth();
  const { getToken } = useLiveKitToken();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const roomRef = useRef<Room | null>(null);
  const connectingRef = useRef(false);
  const [connecting, setConnecting] = useState(true);
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(durationMinutes * 60);
  const [cameraOn, setCameraOn] = useState(role !== "spectator");
  const [micOn, setMicOn] = useState(role !== "spectator");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isParticipant = role === "champion" || role === "challenger";

  // Fetch avatar
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.avatar_url) setAvatarUrl(data.avatar_url);
      });
  }, [user?.id]);

  // Timer
  useEffect(() => {
    if (connecting) return;
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          toast({ title: "Contest time is up!", duration: 5000 });
          onEnd();
          return 0;
        }
        if (prev === 60) toast({ title: "1 minute remaining", duration: 4000 });
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connecting]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // --- Proven patterns from LiveOneOnOneSession ---

  const attachLocalCamera = useCallback((room: Room | null, element: HTMLVideoElement | null = localVideoRef.current) => {
    if (!room || !element) return false;
    const camPub = room.localParticipant.getTrackPublication(Track.Source.Camera);
    if (!camPub?.track) return false;

    const mediaTrack = (camPub.track as { mediaStreamTrack?: MediaStreamTrack }).mediaStreamTrack;
    if (mediaTrack) {
      camPub.track.detach();
      element.srcObject = new MediaStream([mediaTrack]);
    } else {
      camPub.track.detach();
      camPub.track.attach(element);
    }
    element.muted = true;
    element.autoplay = true;
    element.playsInline = true;
    safePlay(element);
    return true;
  }, []);

  const setLocalVideoElement = useCallback((node: HTMLVideoElement | null) => {
    localVideoRef.current = node;
    if (!node || !roomRef.current) return;
    attachLocalCamera(roomRef.current, node);
  }, [attachLocalCamera]);

  const toggleCamera = async () => {
    const room = roomRef.current;
    if (!room || !isParticipant) return;
    try {
      if (cameraOn) {
        await room.localParticipant.setCameraEnabled(false);
        if (localVideoRef.current) localVideoRef.current.srcObject = null;
      } else {
        await room.localParticipant.setCameraEnabled(true);
        setTimeout(() => attachLocalCamera(room), 300);
      }
      setCameraOn(!cameraOn);
    } catch (err) { console.error("Toggle camera error:", err); }
  };

  const toggleMic = async () => {
    const room = roomRef.current;
    if (!room || !isParticipant) return;
    try {
      await room.localParticipant.setMicrophoneEnabled(!micOn);
      setMicOn(!micOn);
    } catch (err) { console.error("Toggle mic error:", err); }
  };

  // Connect to LiveKit — mirrors LiveOneOnOneSession exactly
  useEffect(() => {
    console.log("Contest session effect: user=", user?.id, "roomName=", roomName);
    if (!user || !roomName) return;

    let cancelled = false;
    connectingRef.current = false;

    const getTokenWithRetry = async (retries = 3, delayMs = 1500): Promise<{ token: string; wsUrl: string }> => {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          console.log(`Contest session: token attempt ${attempt}/${retries} for room`, roomName);
          const result = await getToken(roomName, isParticipant);
          console.log("Contest session: got token, wsUrl=", result.wsUrl?.substring(0, 30));
          return result;
        } catch (err: any) {
          console.warn(`Contest session: token attempt ${attempt} failed:`, err.message);
          if (attempt === retries) throw err;
          await new Promise((r) => setTimeout(r, delayMs));
          if (cancelled) throw new Error("Cancelled");
        }
      }
      throw new Error("Failed to get token");
    };

    const connect = async () => {
      if (connectingRef.current) {
        console.warn("Contest session: already connecting, skipping");
        return;
      }
      connectingRef.current = true;

      try {
        // Hardware release delay — same as 1-on-1
        const delay = role === "champion" ? 2500 : 800;
        console.log(`Contest session: waiting ${delay}ms for hardware release`);
        await new Promise((r) => setTimeout(r, delay));
        if (cancelled) return;

        const { token, wsUrl } = await getTokenWithRetry();
        if (cancelled) return;

        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
          videoCaptureDefaults: { resolution: VideoPresets.h720.resolution },
        });

        room.on(RoomEvent.TrackSubscribed, (track) => {
          if (cancelled) return;
          if (track.source === Track.Source.Camera && remoteVideoRef.current) {
            track.attach(remoteVideoRef.current);
            safePlay(remoteVideoRef.current);
            setRemoteConnected(true);
          }
          if (track.source === Track.Source.Microphone && remoteAudioRef.current) {
            track.attach(remoteAudioRef.current);
            safePlay(remoteAudioRef.current);
          }
        });

        room.on(RoomEvent.LocalTrackPublished, () => {
          if (cancelled) return;
          attachLocalCamera(room);
        });

        room.on(RoomEvent.TrackUnsubscribed, (track) => {
          track.detach();
          if (track.source === Track.Source.Camera) setRemoteConnected(false);
        });

        room.on(RoomEvent.ParticipantDisconnected, () => {
          setRemoteConnected(false);
        });

        await room.connect(wsUrl, token);
        if (cancelled) { room.disconnect(); return; }
        roomRef.current = room;

        if (isParticipant) {
          await room.localParticipant.enableCameraAndMicrophone();
          if (cancelled) { room.disconnect(); return; }

          // Retry attaching local camera
          const tryAttach = (retriesLeft: number) => {
            if (cancelled || retriesLeft <= 0) return;
            const attached = attachLocalCamera(room);
            if (!attached) {
              window.setTimeout(() => tryAttach(retriesLeft - 1), 300);
            }
          };
          tryAttach(15);
        }

        // Attach already-published remote tracks
        for (const p of room.remoteParticipants.values()) {
          for (const pub of p.trackPublications.values()) {
            if (pub.isSubscribed && pub.track) {
              if (pub.source === Track.Source.Camera && remoteVideoRef.current) {
                pub.track.attach(remoteVideoRef.current);
                safePlay(remoteVideoRef.current);
                setRemoteConnected(true);
              }
              if (pub.source === Track.Source.Microphone && remoteAudioRef.current) {
                pub.track.attach(remoteAudioRef.current);
                safePlay(remoteAudioRef.current);
              }
            }
          }
        }

        setConnecting(false);
      } catch (err: any) {
        connectingRef.current = false;
        if (cancelled) return;
        console.error("Contest connect error:", err);
        toast({ title: "Failed to connect", description: err.message, variant: "destructive" });
        setTimeout(() => { if (!cancelled) onEnd(); }, 3000);
      }
    };

    connect();

    return () => {
      cancelled = true;
      if (roomRef.current) {
        for (const pub of roomRef.current.localParticipant.trackPublications.values()) {
          if (pub.track) { pub.track.stop(); pub.track.detach(); }
        }
        roomRef.current.disconnect();
        roomRef.current = null;
      }
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
      connectingRef.current = false;
    };
  }, [attachLocalCamera, roomName, user?.id]);

  const challengeLabel = challengeType?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "Contest";

  const myLabel = role === "champion" ? "Champion" : role === "challenger" ? "Challenger" : "Spectator";
  const remoteLabel = role === "champion" ? "Challenger" : "Champion";

  return (
    <div className="flex flex-col h-full bg-black relative">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/80 border-b border-white/10 z-20">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-400" />
          <span className="text-white font-bold text-sm">{challengeLabel}</span>
        </div>
        <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full ${secondsLeft <= 60 ? "bg-destructive/80" : "bg-black/60"} text-white text-sm font-mono`}>
          <Clock className="h-4 w-4" />
          {formatTime(secondsLeft)}
        </div>
        {role === "champion" && (
          <Button variant="destructive" size="sm" onClick={onEnd} className="rounded-full px-4">
            End Contest
          </Button>
        )}
        {role !== "champion" && <div />}
      </div>

      {/* Split screen */}
      <div className="flex flex-col sm:flex-row w-full flex-1 min-h-0 items-stretch">
        {/* LEFT: Your feed */}
        <div className="isolate relative flex-1 min-h-[30vh] sm:min-h-0 border-b sm:border-b-0 sm:border-r border-white/10 overflow-hidden">
          <div className="absolute inset-0 z-0">
            <video
              ref={isParticipant ? setLocalVideoElement : undefined}
              autoPlay
              muted
              playsInline
              className={`w-full h-full object-cover ${!cameraOn && isParticipant ? 'hidden' : ''}`}
            />
            {!cameraOn && isParticipant && (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Your avatar" className="w-24 h-24 rounded-full object-cover border-2 border-white/20" />
                ) : (
                  <User className="w-16 h-16 text-muted-foreground" />
                )}
              </div>
            )}
          </div>
          <div className="relative z-10 w-full h-full flex flex-col justify-between p-4 pointer-events-none">
            <div className="pointer-events-auto flex items-start justify-between">
              <span className={`${role === "champion" ? "bg-yellow-600/80" : "bg-red-600/80"} text-white text-xs px-2 py-1 rounded flex items-center gap-1`}>
                {role === "champion" && <Trophy className="h-3 w-3" />} {myLabel}
              </span>
              {role === "champion" && <OneOnOneTipMeter roomName={roomName} />}
            </div>
            {isParticipant && (
              <div className="mt-auto pointer-events-auto flex flex-wrap items-center justify-center gap-2">
                {role === "challenger" && championId && (
                  <OneOnOneTipButton roomName={roomName} recipientId={championId} />
                )}
                <Button variant="outline" size="sm" onClick={toggleCamera}
                  className={`rounded-full ${!cameraOn ? "border-destructive text-destructive" : "border-white/30 text-white"} bg-black/40 hover:bg-black/60`}>
                  {cameraOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                </Button>
                <Button variant="outline" size="sm" onClick={toggleMic}
                  className={`rounded-full ${!micOn ? "border-destructive text-destructive" : "border-white/30 text-white"} bg-black/40 hover:bg-black/60`}>
                  {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Remote feed */}
        <div className="isolate relative flex-1 min-h-[30vh] sm:min-h-0 overflow-hidden">
          <div className="absolute inset-0 z-0">
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <audio ref={remoteAudioRef} autoPlay className="hidden" />
          </div>
          {!remoteConnected && !connecting && (
            <div className="absolute inset-0 flex items-center justify-center bg-black z-[5]">
              <p className="text-white/60 text-sm">Waiting for {remoteLabel}...</p>
            </div>
          )}
          <div className="relative z-10 h-full flex flex-col justify-between p-2 pointer-events-none">
            <div className="pointer-events-auto flex justify-end">
              <span className={`${role === "champion" ? "bg-red-600/80" : "bg-yellow-600/80"} text-white text-xs px-2 py-1 rounded flex items-center gap-1`}>
                {role !== "champion" && <Trophy className="h-3 w-3" />} {remoteLabel}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Spectator controls */}
      {role === "spectator" && (
        <div className="flex items-center justify-center gap-4 p-3 bg-black/80 border-t border-white/10">
          <OneOnOneTipButton roomName={roomName} recipientId={championId} />
          <span className="text-white/40 text-xs">Tip Champion</span>
          <span className="text-white/20">|</span>
          <OneOnOneTipButton roomName={roomName} recipientId={challengerId} />
          <span className="text-white/40 text-xs">Tip Challenger</span>
        </div>
      )}

      {connecting && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-30">
          <div className="text-center space-y-3">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            <p className="text-white text-sm">Connecting to contest...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContestSession;
