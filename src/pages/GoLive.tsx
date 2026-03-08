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
import {
  Room,
  RoomEvent,
  LocalParticipant,
  createLocalTracks,
  Track,
  VideoPresets,
} from "livekit-client";

const GoLive = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getToken } = useLiveKitToken();
  const videoRef = useRef<HTMLVideoElement>(null);
  const roomRef = useRef<Room | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const localStreamRef = useRef<MediaStream | null>(null);
  const heartbeatIntervalRef = useRef<number | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [streamId, setStreamId] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [viewerCount, setViewerCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [setupPhase, setSetupPhase] = useState(true);

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

  useEffect(() => {
    startPreview();
    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      if (heartbeatIntervalRef.current) window.clearInterval(heartbeatIntervalRef.current);
    };
  }, [startPreview]);

  // Keep stream alive in DB
  const startHeartbeat = useCallback((sid: string) => {
    if (heartbeatIntervalRef.current) window.clearInterval(heartbeatIntervalRef.current);
    const heartbeat = async () => {
      await (supabase.from("live_streams") as any)
        .update({ status: "live" })
        .eq("id", sid)
        .eq("merchant_id", user?.id);
    };
    heartbeat();
    heartbeatIntervalRef.current = window.setInterval(heartbeat, 15000);
  }, [user?.id]);

  // Toggle camera
  const toggleCamera = () => {
    if (roomRef.current) {
      const localParticipant = roomRef.current.localParticipant;
      const camTrack = localParticipant.getTrackPublication(Track.Source.Camera);
      if (camTrack?.track) {
        if (cameraOn) {
          localParticipant.setCameraEnabled(false);
        } else {
          localParticipant.setCameraEnabled(true);
        }
        setCameraOn(!cameraOn);
      }
    } else {
      // Pre-live preview toggle
      const videoTrack = localStreamRef.current?.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCameraOn(videoTrack.enabled);
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

  // Start recording from LiveKit room's local tracks
  const startRecordingFromRoom = useCallback((room: Room) => {
    const localParticipant = room.localParticipant;
    const tracks: MediaStreamTrack[] = [];

    for (const pub of localParticipant.trackPublications.values()) {
      if (pub.track?.mediaStreamTrack) {
        tracks.push(pub.track.mediaStreamTrack);
      }
    }

    if (tracks.length === 0) {
      console.warn("No local tracks available for recording");
      return;
    }

    const stream = new MediaStream(tracks);
    chunksRef.current = [];

    const mimeTypes = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
    let selectedMime = "";
    for (const mime of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mime)) { selectedMime = mime; break; }
    }
    if (!selectedMime) { console.error("No supported MIME type"); return; }

    const mr = new MediaRecorder(stream, { mimeType: selectedMime });
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.start(1000);
    mediaRecorderRef.current = mr;
    setIsRecording(true);
    console.log("Recording started with MIME:", selectedMime);
  }, []);

  // Go Live
  const handleGoLive = async () => {
    if (!user || !title.trim()) {
      toast({ title: "Enter a title", variant: "destructive" });
      return;
    }

    // 1. Create stream record in DB
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
        setViewerCount(room.remoteParticipants.size);
      });
      room.on(RoomEvent.ParticipantDisconnected, () => {
        setViewerCount(room.remoteParticipants.size);
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

      // 7. Start recording
      // Small delay to ensure tracks are fully published
      setTimeout(() => {
        if (roomRef.current) {
          startRecordingFromRoom(roomRef.current);
        }
      }, 1000);

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

    // Disconnect from LiveKit
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }

    setIsLive(false);
    setStreamId(null);

    // Stop recording and auto-save
    if (isRecording && mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      setSaving(true);
      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        if (blob.size > 0 && user && currentStreamId) {
          try {
            const fileName = `${user.id}/live-recordings/${currentStreamId}-${Date.now()}.webm`;
            const { error: uploadError } = await supabase.storage
              .from("user-media")
              .upload(fileName, blob, { contentType: "video/webm" });

            if (uploadError) {
              toast({ title: "Recording upload failed", description: uploadError.message, variant: "destructive" });
            } else {
              const { data: urlData } = supabase.storage.from("user-media").getPublicUrl(fileName);
              await (supabase.from("live_streams") as any)
                .update({ recording_url: urlData.publicUrl })
                .eq("id", currentStreamId);
              toast({ title: "Stream ended & recording saved!" });
            }
          } catch (e) {
            console.error("Recording save error:", e);
            toast({ title: "Recording save error", variant: "destructive" });
          }
        } else {
          toast({ title: "Stream ended" });
        }
        setSaving(false);
        navigate("/live");
      };
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    } else {
      toast({ title: "Stream ended" });
      navigate("/live");
    }
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
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
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
              {isRecording && (
                <div className="absolute top-4 right-4">
                  <Badge className="bg-red-800 text-white border-0 animate-pulse">
                    <span className="w-2 h-2 bg-red-400 rounded-full mr-1.5 inline-block" />
                    REC
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
                <Button onClick={endStream} variant="destructive" size="sm" className="ml-auto" disabled={saving}>
                  {saving ? "Saving Recording..." : "End Stream & Save"}
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
