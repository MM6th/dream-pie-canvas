import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLiveKitToken } from "@/hooks/useLiveKitToken";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PhoneOff, Loader2, Clock, Video, VideoOff, Mic, MicOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  Room,
  RoomEvent,
  Track,
  VideoPresets,
} from "livekit-client";
import { useIsMobile } from "@/hooks/use-mobile";
import LiveChat from "@/components/live/LiveChat";

interface LiveOneOnOneSessionProps {
  roomName: string;
  isHost: boolean;
  onClose: () => void;
  inline?: boolean;
  durationMinutes?: number;
  streamId?: string;
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

const LiveOneOnOneSession = ({ roomName, isHost, onClose, inline = false, durationMinutes = 15, streamId }: LiveOneOnOneSessionProps) => {
  console.log(`[1on1-session] MOUNT: roomName=${roomName}, isHost=${isHost}, inline=${inline}, streamId=${streamId}`);
  const isMobile = useIsMobile();
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
    <div className={`flex flex-col bg-black relative ${isMobile ? 'min-h-full' : 'h-full'}`}>
      {/* Countdown timer */}
      <div className="flex justify-center py-2">
        <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full ${secondsLeft <= 60 ? 'bg-destructive/80' : 'bg-black/60'} text-white text-sm font-mono`}>
          <Clock className="h-4 w-4" />
          {formatTime(secondsLeft)}
        </div>
      </div>
      <div className={`flex flex-col sm:flex-row gap-1 p-1 ${isMobile ? 'h-[35vh] min-h-[180px]' : 'flex-1 min-h-[300px]'}`}>
        <div className="flex-1 relative rounded-lg overflow-hidden bg-muted/20">
          <video
            ref={setLocalVideoElement}
            autoPlay
            muted
            playsInline
            className={`w-full h-full object-cover ${!cameraOn ? 'hidden' : ''}`}
            style={{ aspectRatio: "9/16" }}
          />
          {!cameraOn && (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <VideoOff className="w-10 h-10 text-muted-foreground" />
            </div>
          )}
          <div className="absolute bottom-2 left-2">
            <span className="bg-black/60 text-white text-xs px-2 py-1 rounded">You</span>
          </div>
        </div>
        <div className="flex-1 relative rounded-lg overflow-hidden bg-muted/20">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
            style={{ aspectRatio: "9/16" }}
          />
          <audio ref={remoteAudioRef} autoPlay className="hidden" />
          {!remoteConnected && !connecting && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-white/60 text-sm">Waiting for the other person...</p>
            </div>
          )}
          <div className="absolute bottom-2 left-2">
            <span className="bg-black/60 text-white text-xs px-2 py-1 rounded">
              {isHost ? "Viewer" : "Host"}
            </span>
          </div>
        </div>
      </div>

      {connecting && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
          <div className="text-center space-y-3">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            <p className="text-white text-sm">Connecting to session...</p>
          </div>
        </div>
      )}

      <div className="flex justify-center items-center gap-3 py-3">
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
        <Button
          variant="destructive"
          size="lg"
          onClick={handleEndSession}
          className="rounded-full px-8"
        >
          <PhoneOff className="h-5 w-5 mr-2" />
          End Stream
        </Button>
      </div>

      {/* Chat inside session on mobile */}
      {isMobile && streamId && (
        <div className="px-2 pb-2">
          <LiveChat streamId={streamId} />
        </div>
      )}
    </div>
  );

  if (inline) {
    return <div className={`absolute inset-0 z-30 bg-black rounded-xl ${isMobile ? 'overflow-y-auto' : 'overflow-hidden'}`}>{sessionContent}</div>;
  }

  return (
    <Dialog open onOpenChange={() => handleEndSession()}>
      <DialogContent className={`max-w-4xl w-[95vw] p-0 gap-0 bg-black border-border ${isMobile ? 'max-h-[95vh] overflow-y-auto' : 'overflow-hidden'}`}>
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
