import React, { useEffect, useRef, useState } from "react";
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
import { PhoneOff, Loader2 } from "lucide-react";
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
}

const LiveOneOnOneSession = ({ roomName, isHost, onClose }: LiveOneOnOneSessionProps) => {
  const { user } = useAuth();
  const { getToken } = useLiveKitToken();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const roomRef = useRef<Room | null>(null);
  const connectingRef = useRef(false);
  const [connecting, setConnecting] = useState(true);
  const [remoteConnected, setRemoteConnected] = useState(false);

  useEffect(() => {
    if (!user || connectingRef.current) return;
    connectingRef.current = true;

    let cancelled = false;

    const attachLocalCamera = (room: Room) => {
      const camPub = room.localParticipant.getTrackPublication(Track.Source.Camera);
      if (camPub?.track && localVideoRef.current) {
        camPub.track.attach(localVideoRef.current);
      }
    };

    const connect = async () => {
      try {
        // Small delay for host to let viewer connect first
        if (isHost) {
          await new Promise((r) => setTimeout(r, 1500));
        }
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
            setRemoteConnected(true);
          }
          if (track.source === Track.Source.Microphone && remoteAudioRef.current) {
            track.attach(remoteAudioRef.current);
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

        await room.localParticipant.enableCameraAndMicrophone();
        if (cancelled) {
          room.disconnect();
          return;
        }

        attachLocalCamera(room);

        // Attach already-published remote tracks
        for (const p of room.remoteParticipants.values()) {
          for (const pub of p.trackPublications.values()) {
            if (pub.isSubscribed && pub.track) {
              if (pub.source === Track.Source.Camera && remoteVideoRef.current) {
                pub.track.attach(remoteVideoRef.current);
                setRemoteConnected(true);
              }
              if (pub.source === Track.Source.Microphone && remoteAudioRef.current) {
                pub.track.attach(remoteAudioRef.current);
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
      connectingRef.current = false;
    };
  }, [roomName, user?.id]);

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
    toast({ title: "Session ended", duration: 4000 });
    onClose();
  };

  return (
    <Dialog open onOpenChange={() => handleEndSession()}>
      <DialogContent className="max-w-4xl w-[95vw] p-0 gap-0 overflow-hidden bg-black border-border">
        <DialogHeader className="sr-only">
          <DialogTitle>1-on-1 Session</DialogTitle>
          <DialogDescription>Private video session</DialogDescription>
        </DialogHeader>
        {connecting ? (
          <div className="flex items-center justify-center h-[70vh]">
            <div className="text-center space-y-3">
              <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
              <p className="text-white text-sm">Connecting to session...</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-[80vh]">
            <div className="flex-1 flex gap-1 p-1">
              <div className="flex-1 relative rounded-lg overflow-hidden bg-muted/20">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                  style={{ aspectRatio: "9/16" }}
                />
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
                {!remoteConnected && (
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
            <div className="flex justify-center py-3">
              <Button
                variant="destructive"
                size="lg"
                onClick={handleEndSession}
                className="rounded-full px-8"
              >
                <PhoneOff className="h-5 w-5 mr-2" />
                End Session
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LiveOneOnOneSession;
