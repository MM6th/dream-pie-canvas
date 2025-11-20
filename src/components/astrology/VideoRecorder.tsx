import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Video, Square, Play, Upload, X, Camera, Save, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface VideoRecorderProps {
  onVideoRecorded: (blob: Blob, isDraft: boolean) => void;
  onCancel: () => void;
  isUploading?: boolean;
}

interface VideoSegment {
  id: string;
  blob: Blob;
  duration: number;
}

export const VideoRecorder = ({ onVideoRecorded, onCancel, isUploading = false }: VideoRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasCamera, setHasCamera] = useState(false);
  const [segments, setSegments] = useState<VideoSegment[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      stopCamera();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startCamera = async () => {
    try {
      console.log("=== CAMERA ACCESS ATTEMPT ===");
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera not supported on this browser");
      }

      if ('permissions' in navigator) {
        try {
          const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
          const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          console.log("Camera permission state:", cameraPermission.state);
          console.log("Microphone permission state:", micPermission.state);
        } catch (e) {
          console.log("Permission API not fully supported, proceeding with getUserMedia");
        }
      }

      let stream;
      try {
        console.log("Requesting camera with ideal constraints...");
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: true,
        });
      } catch (e) {
        console.log("Trying basic camera constraints...", e);
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
      }

      console.log("Camera access successful!", stream.getTracks().map(t => t.kind));
      streamRef.current = stream;
      setHasCamera(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
      }
    } catch (error: any) {
      console.error("=== CAMERA ACCESS FAILED ===");
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Full error:", error);
      
      let errorMessage = "";
      if (error.name === "NotAllowedError") {
        errorMessage = "Camera blocked. Try: 1) Tap the lock/info icon in address bar 2) Reset camera permission 3) Reload page 4) Click camera button again";
      } else if (error.name === "NotFoundError") {
        errorMessage = "No camera detected on this device";
      } else if (error.name === "NotReadableError") {
        errorMessage = "Camera is in use by another app. Close other apps using the camera and try again";
      } else if (error.name === "OverconstrainedError") {
        errorMessage = "Camera doesn't support the requested settings. Try a different device";
      } else {
        errorMessage = `Camera error (${error.name}): ${error.message}`;
      }
      
      toast.error(errorMessage, { duration: 8000 });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setHasCamera(false);
  };

  const startRecording = () => {
    if (!streamRef.current) return;

    chunksRef.current = [];
    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType: "video/webm",
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const newSegment: VideoSegment = {
        id: Date.now().toString(),
        blob: blob,
        duration: recordingTime,
      };
      
      setSegments(prev => [...prev, newSegment]);
      
      // If first segment, show preview
      if (segments.length === 0) {
        setRecordedBlob(blob);
        setIsPreviewing(true);
        if (videoRef.current) {
          videoRef.current.srcObject = null;
          videoRef.current.src = URL.createObjectURL(blob);
          videoRef.current.muted = false;
        }
      } else {
        // Merge all segments for preview
        mergeSegments([...segments, newSegment]);
      }
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setIsRecording(true);
    setRecordingTime(0);

    timerRef.current = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      stopCamera();
    }
  };

  const mergeSegments = async (segmentsToMerge: VideoSegment[]) => {
    if (segmentsToMerge.length === 0) return;
    
    if (segmentsToMerge.length === 1) {
      setRecordedBlob(segmentsToMerge[0].blob);
      if (videoRef.current) {
        videoRef.current.src = URL.createObjectURL(segmentsToMerge[0].blob);
      }
      return;
    }

    // Create a merged blob from all segments
    const mergedBlob = new Blob(
      segmentsToMerge.map(s => s.blob),
      { type: "video/webm" }
    );
    
    setRecordedBlob(mergedBlob);
    if (videoRef.current) {
      videoRef.current.src = URL.createObjectURL(mergedBlob);
    }
  };

  const deleteSegment = (segmentId: string) => {
    const newSegments = segments.filter(s => s.id !== segmentId);
    setSegments(newSegments);
    
    if (newSegments.length === 0) {
      setRecordedBlob(null);
      setIsPreviewing(false);
    } else {
      mergeSegments(newSegments);
    }
  };

  const handleRetake = () => {
    setRecordedBlob(null);
    setIsPreviewing(false);
    setRecordingTime(0);
    setSegments([]);
    startCamera();
  };

  const handleAddSegment = () => {
    setIsPreviewing(false);
    startCamera();
  };

  const handleSubmit = (isDraft: boolean) => {
    if (recordedBlob) {
      onVideoRecorded(recordedBlob, isDraft);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getTotalDuration = () => {
    return segments.reduce((acc, seg) => acc + seg.duration, 0);
  };

  return (
    <Card className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base sm:text-lg font-semibold">Record Astrology Reading</h3>
          {segments.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {segments.length} segment{segments.length !== 1 ? 's' : ''} · {formatTime(getTotalDuration())} total
            </p>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {segments.length > 0 && !isPreviewing && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Recorded Segments:</p>
          <div className="space-y-2">
            {segments.map((segment, index) => (
              <div key={segment.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Segment {index + 1}</Badge>
                  <span className="text-sm text-muted-foreground">{formatTime(segment.duration)}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteSegment(segment.id)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-contain"
        />
        
        {isRecording && (
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500 text-white px-3 py-1.5 rounded-full">
            <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
            <span className="font-mono text-sm sm:text-base font-semibold">{formatTime(recordingTime)}</span>
          </div>
        )}

        {!hasCamera && !isPreviewing && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/80">
            <div className="text-center space-y-4 p-4">
              <Camera className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-muted-foreground" />
              <p className="text-sm sm:text-base text-muted-foreground">Camera preview will appear here</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 sm:gap-3">
        {!hasCamera && !isPreviewing && (
          <Button onClick={startCamera} size="lg" className="w-full sm:w-auto">
            <Camera className="w-4 h-4 mr-2" />
            Start Camera
          </Button>
        )}

        {hasCamera && !isRecording && !isPreviewing && (
          <>
            <Button onClick={startRecording} size="lg" variant="destructive" className="w-full sm:w-auto">
              <Video className="w-4 h-4 mr-2" />
              {segments.length > 0 ? "Record Next Segment" : "Start Recording"}
            </Button>
            {segments.length > 0 && (
              <Button onClick={() => { mergeSegments(segments); setIsPreviewing(true); }} size="lg" className="w-full sm:w-auto">
                Preview All Segments
              </Button>
            )}
            <Button onClick={onCancel} variant="outline" size="lg" className="w-full sm:w-auto">
              Cancel
            </Button>
          </>
        )}

        {isRecording && (
          <Button onClick={stopRecording} size="lg" variant="destructive" className="w-full sm:w-auto">
            <Square className="w-4 h-4 mr-2" />
            Stop Recording
          </Button>
        )}

        {isPreviewing && (
          <>
            <Button
              onClick={() => {
                if (videoRef.current) {
                  if (videoRef.current.paused) {
                    videoRef.current.play();
                  } else {
                    videoRef.current.pause();
                  }
                }
              }}
              variant="outline"
              size="lg"
              className="w-full sm:w-auto"
            >
              <Play className="w-4 h-4 mr-2" />
              Play/Pause
            </Button>
            <Button onClick={handleAddSegment} variant="outline" size="lg" className="w-full sm:w-auto">
              <Video className="w-4 h-4 mr-2" />
              Add Segment
            </Button>
            <Button onClick={handleRetake} variant="outline" size="lg" className="w-full sm:w-auto">
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All
            </Button>
            <Button onClick={() => handleSubmit(true)} variant="secondary" size="lg" disabled={isUploading} className="w-full sm:w-auto">
              <Save className="w-4 h-4 mr-2" />
              {isUploading ? "Saving..." : "Save Draft"}
            </Button>
            <Button onClick={() => handleSubmit(false)} size="lg" disabled={isUploading} className="w-full sm:w-auto">
              <Upload className="w-4 h-4 mr-2" />
              {isUploading ? "Uploading..." : "Submit to Buyer"}
            </Button>
          </>
        )}
      </div>

      {isPreviewing && (
        <p className="text-xs sm:text-sm text-center text-muted-foreground px-2">
          Save as draft to review later, or submit directly to the buyer.
        </p>
      )}
    </Card>
  );
};