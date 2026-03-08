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
  const viewerIceQueuesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const viewerRemoteDescSetRef = useRef<Map<string, boolean>>(new Map());
  const pollIntervalRef = useRef<number | null>(null);
  const heartbeatIntervalRef = useRef<number | null>(null);

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

    // Cleanup on unmount: end stream in DB if still live
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (heartbeatIntervalRef.current) {
        window.clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      if (pollIntervalRef.current) {
        window.clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [startPreview]);

  // Keep stream alive while broadcaster is connected
  const startHeartbeat = useCallback((sid: string) => {
    if (heartbeatIntervalRef.current) {
      window.clearInterval(heartbeatIntervalRef.current);
    }

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

  // Ref flag: when true, onstop handler should upload the recording
  const shouldUploadRef = useRef(false);
  const endStreamIdRef = useRef<string | null>(null);
  const broadcastChannelRef = useRef<any>(null);

  // Auto-start recording helper with MIME fallbacks
  const autoStartRecording = useCallback(() => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mimeTypes = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
    let selectedMime = "";
    for (const mime of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mime)) { selectedMime = mime; break; }
    }
    if (!selectedMime) { console.error("No supported MIME type for MediaRecorder"); return; }
    console.log("Recording: using MIME type:", selectedMime);
    const mr = new MediaRecorder(streamRef.current, { mimeType: selectedMime });
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      console.log("Recording onstop: blob size:", blob.size, "shouldUpload:", shouldUploadRef.current);
      setRecordedBlob(blob);

      if (shouldUploadRef.current && blob.size > 0 && user) {
        const sid = endStreamIdRef.current;
        if (!sid) {
          console.error("Recording onstop: no stream ID for upload");
          setSaving(false);
          return;
        }
        try {
          const fileName = `${user.id}/live-recordings/${sid}-${Date.now()}.webm`;
          console.log("Recording onstop: uploading to", fileName);
          const { error: uploadError } = await supabase.storage
            .from("user-media")
            .upload(fileName, blob, { contentType: "video/webm" });

          if (uploadError) {
            console.error("Recording onstop: upload FAILED:", uploadError);
            toast({ title: "Stream ended", description: "Recording upload failed: " + uploadError.message, variant: "destructive" });
          } else {
            const { data: urlData } = supabase.storage.from("user-media").getPublicUrl(fileName);
            console.log("Recording onstop: upload success, updating stream with URL");
            await (supabase.from("live_streams") as any).update({ recording_url: urlData.publicUrl }).eq("id", sid);
            toast({ title: "Stream ended & recording saved!" });
            setRecordedBlob(null);
          }
        } catch (e) {
          console.error("Recording onstop: unexpected error during upload:", e);
          toast({ title: "Stream ended", description: "Recording save error", variant: "destructive" });
        }
        setSaving(false);
        shouldUploadRef.current = false;
        // Stop camera/mic tracks after save
        streamRef.current?.getTracks().forEach((t) => t.stop());
        navigate("/live");
      }
    };
    mr.start(1000);
    mediaRecorderRef.current = mr;
    setIsRecording(true);
  }, [user, navigate]);

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
    startHeartbeat(data.id);

    // Set up Broadcast channel for WebRTC signaling FIRST (before recording)
    const rtcChannel = supabase.channel(`rtc-${data.id}`);
    broadcastChannelRef.current = rtcChannel;

    rtcChannel
      .on("broadcast", { event: "signal" }, async ({ payload }: any) => {
        if (!payload || payload.from === user.id) return;

        console.log("Host: broadcast signal received:", payload.type, "from:", payload.from);

        if (payload.type === "join-request") {
          if (!peerConnectionsRef.current.has(payload.from)) {
            try {
              await createPeerConnectionForViewer(payload.from, data.id);
            } catch (e) {
              console.error("Host: error creating peer connection for viewer", payload.from, e);
            }
          }
        } else if (payload.type === "answer") {
          const pc = peerConnectionsRef.current.get(payload.from);
          if (pc) {
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(payload.data));
              viewerRemoteDescSetRef.current.set(payload.from, true);
              console.log("Host: set remote description from viewer answer, flushing ICE queue");
              // Flush queued ICE candidates from this viewer
              const queue = viewerIceQueuesRef.current.get(payload.from) || [];
              for (const candidate of queue) {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (e) {
                  console.warn("Host: error adding queued ICE candidate", e);
                }
              }
              viewerIceQueuesRef.current.set(payload.from, []);
            } catch (e) {
              console.error("Host: error setting remote description", e);
            }
          }
        } else if (payload.type === "ice-candidate") {
          const pc = peerConnectionsRef.current.get(payload.from);
          if (pc && payload.data) {
            if (viewerRemoteDescSetRef.current.get(payload.from)) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(payload.data));
                console.log("Host: added ICE candidate from viewer", payload.from);
              } catch (e) {
                console.warn("Host: error adding ICE candidate", e);
              }
            } else {
              console.log("Host: queuing ICE candidate from viewer", payload.from, "(remote desc not set yet)");
              const queue = viewerIceQueuesRef.current.get(payload.from) || [];
              queue.push(payload.data);
              viewerIceQueuesRef.current.set(payload.from, queue);
            }
          }
        }
      })
      .subscribe((status) => {
        console.log("Host: broadcast channel status:", status);
      });

    // Auto-start recording AFTER signaling is set up (wrapped in try/catch)
    try {
      autoStartRecording();
    } catch (e) {
      console.error("Host: autoStartRecording failed, stream will continue without recording:", e);
    }

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

    toast({ title: "You're live!", description: "Your stream is being recorded automatically." });
  };

  // Create peer connection for a viewer
  const createPeerConnectionForViewer = async (viewerId: string, sid: string) => {
    console.log("Host: createPeerConnectionForViewer called for viewer:", viewerId, "stream:", sid);
    
    if (!streamRef.current || !user) {
      console.error("Host: CANNOT create peer connection — streamRef.current:", !!streamRef.current, "user:", !!user);
      return;
    }

    try {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:stun2.l.google.com:19302" },
        ],
      });

      peerConnectionsRef.current.set(viewerId, pc);
      viewerIceQueuesRef.current.set(viewerId, []);
      viewerRemoteDescSetRef.current.set(viewerId, false);
      console.log("Host: RTCPeerConnection created for viewer:", viewerId);

      // Add local tracks
      const tracks = streamRef.current.getTracks();
      console.log("Host: adding", tracks.length, "tracks to peer connection");
      tracks.forEach((track) => {
        pc.addTrack(track, streamRef.current!);
      });

      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          console.log("Host: sending ICE candidate to viewer via broadcast");
          broadcastChannelRef.current?.send({
            type: "broadcast",
            event: "signal",
            payload: { type: "ice-candidate", from: user.id, to: viewerId, data: event.candidate.toJSON() },
          });
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log("Host: ICE connection state for viewer", viewerId, ":", pc.iceConnectionState);
        if (pc.iceConnectionState === "failed") {
          console.error("Host: ICE connection FAILED for viewer", viewerId, "- may need TURN server");
        }
      };

      pc.onconnectionstatechange = () => {
        console.log("Host: connection state for viewer", viewerId, ":", pc.connectionState);
      };

      pc.onsignalingstatechange = () => {
        console.log("Host: signaling state for viewer", viewerId, ":", pc.signalingState);
      };

      // Create and send offer via broadcast
      console.log("Host: creating offer for viewer:", viewerId);
      const offer = await pc.createOffer();
      console.log("Host: offer created, setting local description");
      await pc.setLocalDescription(offer);
      console.log("Host: local description set, sending offer via broadcast");
      
      broadcastChannelRef.current?.send({
        type: "broadcast",
        event: "signal",
        payload: { type: "offer", from: user.id, to: viewerId, data: offer },
      });
      
      console.log("Host: offer sent via broadcast for viewer:", viewerId);
    } catch (e) {
      console.error("Host: createPeerConnectionForViewer THREW for viewer:", viewerId, e);
    }
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

    const fileName = `${user.id}/live-recordings/${streamId}-${Date.now()}.webm`;
    const { error: uploadError } = await supabase.storage
      .from("user-media")
      .upload(fileName, recordedBlob, { contentType: "video/webm" });

    if (uploadError) {
      console.error("Recording upload failed:", uploadError);
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("user-media").getPublicUrl(fileName);

    await (supabase.from("live_streams") as any).update({ recording_url: urlData.publicUrl }).eq("id", streamId);

    toast({ title: "Recording saved!" });
    setRecordedBlob(null);
    setSaving(false);
  };

  // End stream - auto-save recording
  const endStream = async () => {
    if (heartbeatIntervalRef.current) {
      window.clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (pollIntervalRef.current) {
      window.clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    const currentStreamId = streamId;

    if (currentStreamId) {
      await (supabase.from("live_streams") as any).update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", currentStreamId);
    }

    // Close peer connections and broadcast channel
    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();
    if (broadcastChannelRef.current) {
      supabase.removeChannel(broadcastChannelRef.current);
      broadcastChannelRef.current = null;
    }
    setIsLive(false);
    setStreamId(null);


    // Stop recording and auto-save using the ref flag pattern
    if (isRecording && mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      setSaving(true);
      shouldUploadRef.current = true;
      endStreamIdRef.current = currentStreamId;
      console.log("endStream: stopping recorder, shouldUpload flag set, streamId:", currentStreamId);
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      // The onstop handler (set in autoStartRecording) will handle upload + navigation
    } else {
      toast({ title: "Stream ended" });
      streamRef.current?.getTracks().forEach((t) => t.stop());
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

              {isLive && (
                <Button onClick={endStream} variant="destructive" size="sm" className="ml-auto" disabled={saving}>
                  {saving ? "Saving Recording..." : "End Stream & Save"}
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
