import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useLiveKitToken } from "@/hooks/useLiveKitToken";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PhoneOff, Loader2, Clock, Video, VideoOff, Mic, MicOff, User } from "lucide-react";
import OneOnOneChat from "@/components/live/OneOnOneChat";
import OneOnOneTipButton from "@/components/live/OneOnOneTipButton";
import OneOnOneTipMeter from "@/components/live/OneOnOneTipMeter";
import { toast } from "@/hooks/use-toast";
import {
  Room,
  RoomEvent,
  Track,
  VideoPresets,
} from "livekit-client";

interface LiveOneOnOneSessionProps {
  roomName: string;
  isHost: boolean;
  onClose: () => void;
  inline?: boolean;
  durationMinutes?: number;
  otherPartyId?: string;
}

const safePlay = (element: HTMLMediaElement | null) => {
  if (!element) return;
  const playPromise = element.play();
  if (playPromise && typeof playPromise.catch === "function") {
    playPromise.catch((err) => {
      console.warn("Media autoplay deferred:", err);
    });
  }
};

const LiveOneOnOneSession = ({ roomName, isHost, onClose, inline = false, durationMinutes = 15, otherPartyId }: LiveOneOnOneSessionProps) => {
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
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

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

  const toggleCamera = async () => {
    const room = roomRef.current;
    if (!room) return;
    try {
      if (cameraOn) {
        await room.localParticipant.setCameraEnabled(false);
        if (localVideoRef.current) localVideoRef.current.srcObject = null;
      } else {
        await room.localParticipant.setCameraEnabled(true);
        // Re-attach after enabling
        setTimeout(() => attachLocalCamera(room), 300);
      }
      setCameraOn(!cameraOn);
    } catch (err) {
      console.error("Toggle camera error:", err);
    }
  };

  const toggleMic = async () => {
    const room = roomRef.current;
    if (!room) return;
    try {
      await room.localParticipant.setMicrophoneEnabled(!micOn);
      setMicOn(!micOn);
    } catch (err) {
      console.error("Toggle mic error:", err);
    }
  };

  // Start countdown once connected
  useEffect(() => {
    if (connecting) return;

    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          // Time's up — end session
          clearInterval(timerRef.current!);
          toast({ title: "Session time is up", duration: 5000 });
          handleEndSession();
          return 0;
        }
        if (prev === 60) {
          toast({ title: "1 minute remaining", duration: 4000 });
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connecting]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

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

  useEffect(() => {
    if (!user || connectingRef.current) return;
    connectingRef.current = true;

    let cancelled = false;

    const connect = async () => {
      try {
        // Delay to allow camera hardware to be released from the previous stream
        await new Promise((r) => setTimeout(r, isHost ? 2000 : 500));
        if (cancelled) return;

        const { token, wsUrl } = await getToken(roomName, true);
        if (cancelled) return;

        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
          videoCaptureDefaults: {
            resolution: VideoPresets.h720.resolution,
          },
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
          toast({ title: "The other person left the session", duration: 5000 });
        });

        await room.connect(wsUrl, token);
        if (cancelled) {
          room.disconnect();
          return;
        }

        roomRef.current = room;

        console.log(`1-on-1 session: room.state=${room.state}, isHost=${isHost}, roomName=${roomName}`);

        await room.localParticipant.enableCameraAndMicrophone();
        if (cancelled) {
          room.disconnect();
          return;
        }

        console.log(`1-on-1 session: camera+mic enabled, localParticipant tracks:`,
          Array.from(room.localParticipant.trackPublications.values()).map(p => `${p.source}:${p.track?.sid}`));

        // Retry attaching local camera with increasing delays to handle Dialog portal timing
        const tryAttach = (retriesLeft: number) => {
          if (cancelled || retriesLeft <= 0) {
            if (retriesLeft <= 0) {
              console.warn("1-on-1 session: exhausted retries attaching local camera");
            }
            return;
          }
          const attached = attachLocalCamera(room);
          console.log(`1-on-1 session: tryAttach attempt, attached=${attached}, retriesLeft=${retriesLeft}`);
          if (!attached) {
            window.setTimeout(() => tryAttach(retriesLeft - 1), 300);
          }
        };
        tryAttach(15);

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
        if (cancelled) return;
        console.error("1-on-1 session connect error:", err);
        toast({
          title: "Failed to connect",
          description: err.message || "Could not join the session.",
          variant: "destructive",
          duration: 7000,
        });
        onClose();
      }
    };

    connect();

    return () => {
      cancelled = true;
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
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
      connectingRef.current = false;
    };
  }, [attachLocalCamera, roomName, user?.id]);

  const handleEndSession = () => {
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
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    toast({ title: "Session ended", duration: 4000 });
    onClose();
  };

  const sessionContent = (
    <div className="flex flex-col h-full bg-black relative">
      {/* Countdown timer - floating on top */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20">
        <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full ${secondsLeft <= 60 ? 'bg-destructive/80' : 'bg-black/60'} text-white text-sm font-mono`}>
          <Clock className="h-4 w-4" />
          {formatTime(secondsLeft)}
        </div>
      </div>

      {/* Split screen container - takes all available space */}
      <div className="flex flex-col sm:flex-row w-full flex-1 min-h-0 items-stretch">
        {/* LEFT SIDE: You */}
        <div className="isolate relative flex-1 border-b sm:border-b-0 sm:border-r border-white/10 overflow-hidden">
          {/* Video background layer */}
          <div className="absolute inset-0 z-0">
            <video
              ref={setLocalVideoElement}
              autoPlay
              muted
              playsInline
              className={`w-full h-full object-cover ${!cameraOn ? 'hidden' : ''}`}
            />
            {!cameraOn && (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Your avatar" className="w-24 h-24 rounded-full object-cover border-2 border-white/20" />
                ) : (
                  <User className="w-16 h-16 text-muted-foreground" />
                )}
              </div>
            )}
          </div>
          {/* UI wrapper - constrained to this div only */}
          <div className="relative z-10 w-full h-full flex flex-col justify-between p-4">
            {/* Top Section */}
            <div className="w-full flex flex-col items-start gap-1">
              <span className="bg-black/60 text-white text-xs px-2 py-1 rounded">You</span>
              {isHost && <div className="mt-6"><OneOnOneTipMeter roomName={roomName} /></div>}
            </div>
            {/* Bottom Section (Chat & Controls) - desktop only overlay */}
            <div className="mt-auto w-full max-w-full hidden sm:block">
              <div className="bg-black/40 backdrop-blur-md rounded-lg p-2 overflow-y-auto max-h-[30vh]">
                <OneOnOneChat roomName={roomName} />
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                {!isHost && otherPartyId && (
                  <OneOnOneTipButton roomName={roomName} recipientId={otherPartyId} />
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleCamera}
                  className={`rounded-full ${!cameraOn ? 'border-destructive text-destructive' : 'border-white/30 text-white'} bg-black/40 hover:bg-black/60`}
                >
                  {cameraOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleMic}
                  className={`rounded-full ${!micOn ? 'border-destructive text-destructive' : 'border-white/30 text-white'} bg-black/40 hover:bg-black/60`}
                >
                  {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                </Button>
                {isHost && <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleEndSession}
                  className="rounded-full px-4"
                >
                  <PhoneOff className="h-4 w-4 mr-1" />
                  End
                </Button>}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE: Remote */}
        <div className="relative flex-1 overflow-hidden min-h-0">
          {/* Video background layer */}
          <div className="absolute inset-0 z-0">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <audio ref={remoteAudioRef} autoPlay className="hidden" />
          </div>
          {/* UI foreground layer */}
          <div className="relative z-10 h-full flex flex-col justify-between p-2 pointer-events-none">
            <div className="pointer-events-auto flex justify-end">
              <span className="bg-black/60 text-white text-xs px-2 py-1 rounded">
                {isHost ? "Viewer" : "Host"}
              </span>
            </div>
            {!remoteConnected && !connecting && (
              <div className="absolute inset-0 flex items-center justify-center z-0">
                <p className="text-white/60 text-sm">Waiting for the other person...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile-only: Chat & Controls below both video feeds */}
      <div className="sm:hidden w-full bg-black/80 backdrop-blur-md p-3 space-y-2 overflow-y-auto max-h-[35vh]">
        <div className="bg-black/40 rounded-lg p-2 overflow-y-auto max-h-[20vh]">
          <OneOnOneChat roomName={roomName} />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {!isHost && otherPartyId && (
            <OneOnOneTipButton roomName={roomName} recipientId={otherPartyId} />
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleCamera}
            className={`rounded-full ${!cameraOn ? 'border-destructive text-destructive' : 'border-white/30 text-white'} bg-black/40 hover:bg-black/60`}
          >
            {cameraOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleMic}
            className={`rounded-full ${!micOn ? 'border-destructive text-destructive' : 'border-white/30 text-white'} bg-black/40 hover:bg-black/60`}
          >
            {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
          </Button>
          {isHost && <Button
            variant="destructive"
            size="sm"
            onClick={handleEndSession}
            className="rounded-full px-4"
          >
            <PhoneOff className="h-4 w-4 mr-1" />
            End
          </Button>}
        </div>
      </div>

      {connecting && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-30">
          <div className="text-center space-y-3">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            <p className="text-white text-sm">Connecting to session...</p>
          </div>
        </div>
      )}
    </div>
  );

  if (inline) {
    return (
      <div className="relative w-full z-30 bg-black rounded-xl flex flex-col h-[70vh]">
        {sessionContent}
      </div>
    );
  }

  return (
    <Dialog open onOpenChange={() => handleEndSession()}>
      <DialogContent className="max-w-4xl w-[95vw] h-[90vh] p-0 gap-0 overflow-hidden bg-black border-border">
        <DialogHeader className="sr-only">
          <DialogTitle>1-on-1 Session</DialogTitle>
          <DialogDescription>Private video session</DialogDescription>
        </DialogHeader>
        {sessionContent}
      </DialogContent>
    </Dialog>
  );
};

export default LiveOneOnOneSession;
