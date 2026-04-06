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
  const championVideoRef = useRef<HTMLVideoElement>(null);
  const challengerVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const roomRef = useRef<Room | null>(null);
  const [connecting, setConnecting] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(durationMinutes * 60);
  const [cameraOn, setCameraOn] = useState(role !== "spectator");
  const [micOn, setMicOn] = useState(role !== "spectator");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [championConnected, setChampionConnected] = useState(false);
  const [challengerConnected, setChallengerConnected] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isParticipant = role === "champion" || role === "challenger";
  const myPartnerId = role === "champion" ? challengerId : championId;

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
  }, [connecting]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const getVideoRefForIdentity = (identity: string) => {
    if (identity === championId) return championVideoRef;
    if (identity === challengerId) return challengerVideoRef;
    return null;
  };

  // Connect to LiveKit
  useEffect(() => {
    if (!user || !roomName) return;
    let cancelled = false;

    const connect = async () => {
      try {
        await new Promise((r) => setTimeout(r, 1000));
        if (cancelled) return;

        const { token, wsUrl } = await getToken(roomName, isParticipant);
        if (cancelled) return;

        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
          videoCaptureDefaults: { resolution: VideoPresets.h720.resolution },
        });

        room.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
          if (cancelled) return;
          const pid = participant.identity;
          if (track.source === Track.Source.Camera) {
            const ref = getVideoRefForIdentity(pid);
            if (ref?.current) {
              track.attach(ref.current);
              safePlay(ref.current);
            }
            if (pid === championId) setChampionConnected(true);
            if (pid === challengerId) setChallengerConnected(true);
          }
          if (track.source === Track.Source.Microphone) {
            let audioEl = remoteAudioRefs.current.get(pid);
            if (!audioEl) {
              audioEl = document.createElement("audio");
              audioEl.autoplay = true;
              document.body.appendChild(audioEl);
              remoteAudioRefs.current.set(pid, audioEl);
            }
            track.attach(audioEl);
          }
        });

        room.on(RoomEvent.TrackUnsubscribed, (track, _pub, participant) => {
          track.detach();
          if (participant.identity === championId) setChampionConnected(false);
          if (participant.identity === challengerId) setChallengerConnected(false);
        });

        room.on(RoomEvent.ParticipantDisconnected, (participant) => {
          if (participant.identity === championId) setChampionConnected(false);
          if (participant.identity === challengerId) setChallengerConnected(false);
        });

        await room.connect(wsUrl, token);
        if (cancelled) { room.disconnect(); return; }
        roomRef.current = room;

        if (isParticipant) {
          await room.localParticipant.enableCameraAndMicrophone();
          if (cancelled) { room.disconnect(); return; }

          // Attach local video to correct ref
          const localRef = role === "champion" ? championVideoRef : challengerVideoRef;
          const tryAttach = (retries: number) => {
            if (cancelled || retries <= 0) return;
            const camPub = room.localParticipant.getTrackPublication(Track.Source.Camera);
            if (camPub?.track && localRef.current) {
              camPub.track.attach(localRef.current);
              localRef.current.muted = true;
              safePlay(localRef.current);
              if (role === "champion") setChampionConnected(true);
              else setChallengerConnected(true);
            } else {
              setTimeout(() => tryAttach(retries - 1), 300);
            }
          };
          tryAttach(15);
        }

        // Attach existing remote tracks
        for (const p of room.remoteParticipants.values()) {
          for (const pub of p.trackPublications.values()) {
            if (pub.isSubscribed && pub.track) {
              if (pub.source === Track.Source.Camera) {
                const ref = getVideoRefForIdentity(p.identity);
                if (ref?.current) {
                  pub.track.attach(ref.current);
                  safePlay(ref.current);
                }
                if (p.identity === championId) setChampionConnected(true);
                if (p.identity === challengerId) setChallengerConnected(true);
              }
            }
          }
        }

        setConnecting(false);
      } catch (err: any) {
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
      for (const el of remoteAudioRefs.current.values()) {
        el.srcObject = null;
        el.remove();
      }
      remoteAudioRefs.current.clear();
    };
  }, [roomName, user?.id]);

  const toggleCamera = async () => {
    const room = roomRef.current;
    if (!room || !isParticipant) return;
    try {
      await room.localParticipant.setCameraEnabled(!cameraOn);
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

  const challengeLabel = challengeType?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "Contest";

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
        {/* Champion side */}
        <div className="isolate relative flex-1 border-b sm:border-b-0 sm:border-r border-white/10 overflow-hidden">
          <div className="absolute inset-0 z-0">
            <video ref={championVideoRef} autoPlay muted={role === "champion"} playsInline className="w-full h-full object-cover" />
          </div>
          {!championConnected && !connecting && (
            <div className="absolute inset-0 flex items-center justify-center bg-black z-5">
              <p className="text-white/60 text-sm">Waiting for Champion...</p>
            </div>
          )}
          <div className="relative z-10 w-full h-full flex flex-col justify-between p-4 pointer-events-none">
            <div className="pointer-events-auto flex items-start justify-between">
              <span className="bg-yellow-600/80 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                <Trophy className="h-3 w-3" /> Champion
              </span>
              {role === "champion" && <OneOnOneTipMeter roomName={roomName} />}
            </div>
            {role === "champion" && (
              <div className="mt-auto pointer-events-auto flex flex-wrap items-center justify-center gap-2">
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

        {/* Challenger side */}
        <div className="isolate relative flex-1 overflow-hidden">
          <div className="absolute inset-0 z-0">
            <video ref={challengerVideoRef} autoPlay muted={role === "challenger"} playsInline className="w-full h-full object-cover" />
          </div>
          {!challengerConnected && !connecting && (
            <div className="absolute inset-0 flex items-center justify-center bg-black z-5">
              <p className="text-white/60 text-sm">Waiting for Challenger...</p>
            </div>
          )}
          <div className="relative z-10 w-full h-full flex flex-col justify-between p-4 pointer-events-none">
            <div className="pointer-events-auto flex justify-end">
              <span className="bg-red-600/80 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                Challenger
              </span>
            </div>
            {role === "challenger" && (
              <div className="mt-auto pointer-events-auto flex flex-wrap items-center justify-center gap-2">
                {championId && (
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
      </div>

      {/* Spectator controls - tip buttons */}
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
