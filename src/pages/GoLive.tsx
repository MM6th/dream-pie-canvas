import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppNavBar from "@/components/AppNavBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Video, VideoOff, Mic, MicOff, Radio, Square, Save, Eye, MessageSquare } from "lucide-react";
import LiveChat from "@/components/live/LiveChat";
import LiveTipDisplay from "@/components/live/LiveTipDisplay";
import sixthCoinLogo from "@/assets/sixth-coin-logo.jpg";

const GoLive = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [streamId, setStreamId] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [viewerCount, setViewerCount] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [saving, setSaving] = useState(false);
  const [setupPhase, setSetupPhase] = useState(true);

  // Start camera preview
  const startPreview = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      toast({ title: "Camera access denied", description: "Please allow camera and microphone access.", variant: "destructive" });
    }
  }, []);

  useEffect(() => {
    startPreview();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      peerConnectionsRef.current.forEach((pc) => pc.close());
    };
  }, [startPreview]);

  // Toggle camera
  const toggleCamera = () => {
    const videoTrack = streamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setCameraOn(videoTrack.enabled);
    }
  };

  // Toggle mic
  const toggleMic = () => {
    const audioTrack = streamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setMicOn(audioTrack.enabled);
    }
  };

  // Go Live
  const handleGoLive = async () => {
    if (!user || !title.trim()) {
      toast({ title: "Enter a title", variant: "destructive" });
      return;
    }

    const { data, error } = await (supabase
      .from("live_streams") as any)
      .insert({ merchant_id: user.id, title: title.trim(), description: description.trim() || null, status: "live", started_at: new Date().toISOString() })
      .select()
      .single();

    if (error) {
      toast({ title: "Failed to start stream", description: error.message, variant: "destructive" });
      return;
    }

    setStreamId(data.id);
    setIsLive(true);
    setSetupPhase(false);

    // Listen for incoming WebRTC signals (viewer answers and ICE candidates)
    supabase
      .channel(`signals-${data.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "live_stream_signals",
        filter: `stream_id=eq.${data.id}`,
      }, async (payload: any) => {
        const signal = payload.new;
        if (signal.sender_id === user.id) return; // Skip own signals

        if (signal.signal_type === "answer") {
          const pc = peerConnectionsRef.current.get(signal.sender_id);
          if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.signal_data));
          }
        } else if (signal.signal_type === "ice-candidate") {
          const pc = peerConnectionsRef.current.get(signal.sender_id);
          if (pc && signal.signal_data) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.signal_data));
          }
        } else if (signal.signal_type === "offer") {
          // Viewer requesting stream - create peer connection and send offer
          await createPeerConnectionForViewer(signal.sender_id, data.id);
        }
      })
      .subscribe();

    // Track viewer count via realtime presence
    const presenceChannel = supabase.channel(`presence-${data.id}`);
    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        setViewerCount(Object.keys(state).length - 1); // minus broadcaster
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({ user_id: user.id, role: "broadcaster" });
        }
      });

    toast({ title: "You're live!", description: "Your stream has started." });
  };

  // Create peer connection for a viewer
  const createPeerConnectionForViewer = async (viewerId: string, sid: string) => {
    if (!streamRef.current || !user) return;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }],
    });

    peerConnectionsRef.current.set(viewerId, pc);

    // Add local tracks
    streamRef.current.getTracks().forEach((track) => {
      pc.addTrack(track, streamRef.current!);
    });

    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        await (supabase.from("live_stream_signals") as any).insert({
          stream_id: sid,
          sender_id: user.id,
          signal_type: "ice-candidate",
          signal_data: event.candidate.toJSON(),
          target_id: viewerId,
        });
      }
    };

    // Create and send offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await (supabase.from("live_stream_signals") as any).insert({
      stream_id: sid,
      sender_id: user.id,
      signal_type: "offer",
      signal_data: offer,
      target_id: viewerId,
    });
  };

  // Start recording
  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mr = new MediaRecorder(streamRef.current, { mimeType: "video/webm;codecs=vp9,opus" });
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      setRecordedBlob(blob);
    };
    mr.start(1000);
    mediaRecorderRef.current = mr;
    setIsRecording(true);
    toast({ title: "Recording started" });
  };

  // Stop recording
  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    toast({ title: "Recording stopped", description: "You can now save the recording." });
  };

  // Save recording
  const saveRecording = async () => {
    if (!recordedBlob || !user || !streamId) return;
    setSaving(true);

    const fileName = `live-recordings/${user.id}/${streamId}-${Date.now()}.webm`;
    const { error: uploadError } = await supabase.storage
      .from("user-media")
      .upload(fileName, recordedBlob, { contentType: "video/webm" });

    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("user-media").getPublicUrl(fileName);

    await supabase.from("live_streams").update({ recording_url: urlData.publicUrl }).eq("id", streamId);

    toast({ title: "Recording saved!" });
    setRecordedBlob(null);
    setSaving(false);
  };

  // End stream
  const endStream = async () => {
    if (isRecording) stopRecording();

    if (streamId) {
      await supabase.from("live_streams").update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", streamId);
    }

    streamRef.current?.getTracks().forEach((t) => t.stop());
    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();
    setIsLive(false);
    toast({ title: "Stream ended" });
    navigate("/live");
  };

  if (!user) {
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppNavBar />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video + Controls */}
          <div className="lg:col-span-2 space-y-4">
            {/* Video preview */}
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

            {/* Controls */}
            <div className="flex flex-wrap gap-3 items-center">
              <Button variant="outline" size="sm" onClick={toggleCamera} className={!cameraOn ? "border-destructive text-destructive" : ""}>
                {cameraOn ? <Video className="w-4 h-4 mr-1" /> : <VideoOff className="w-4 h-4 mr-1" />}
                {cameraOn ? "Camera" : "Camera Off"}
              </Button>
              <Button variant="outline" size="sm" onClick={toggleMic} className={!micOn ? "border-destructive text-destructive" : ""}>
                {micOn ? <Mic className="w-4 h-4 mr-1" /> : <MicOff className="w-4 h-4 mr-1" />}
                {micOn ? "Mic" : "Muted"}
              </Button>

              {isLive && !isRecording && (
                <Button onClick={startRecording} variant="outline" size="sm" className="border-red-600 text-red-400 hover:bg-red-600/10">
                  <span className="w-3 h-3 bg-red-500 rounded-full mr-2" />
                  Record
                </Button>
              )}
              {isRecording && (
                <Button onClick={stopRecording} variant="outline" size="sm" className="border-red-600 text-red-400">
                  <Square className="w-3 h-3 mr-2 fill-red-500" />
                  Stop Recording
                </Button>
              )}
              {recordedBlob && (
                <Button onClick={saveRecording} disabled={saving} size="sm" className="bg-primary text-primary-foreground">
                  <Save className="w-4 h-4 mr-1" />
                  {saving ? "Saving..." : "Save Recording"}
                </Button>
              )}

              {isLive && (
                <Button onClick={endStream} variant="destructive" size="sm" className="ml-auto">
                  End Stream
                </Button>
              )}
            </div>

            {/* Setup phase: title + description */}
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

          {/* Chat sidebar (visible when live) */}
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
