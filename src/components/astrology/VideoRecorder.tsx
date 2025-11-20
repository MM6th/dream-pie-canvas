import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Video, Square, Play, Upload, X, Camera } from "lucide-react";

interface VideoRecorderProps {
  onVideoRecorded: (blob: Blob) => void;
  onCancel: () => void;
  isUploading?: boolean;
}

export const VideoRecorder = ({ onVideoRecorded, onCancel, isUploading = false }: VideoRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasCamera, setHasCamera] = useState(false);

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
      
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera not supported on this browser");
      }

      // Check permission state if available
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

      // Try with flexible constraints first (better for mobile)
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
        // Fallback to basic constraints if ideal fails
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
      setRecordedBlob(blob);
      setIsPreviewing(true);

      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = URL.createObjectURL(blob);
        videoRef.current.muted = false;
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

  const handleRetake = () => {
    setRecordedBlob(null);
    setIsPreviewing(false);
    setRecordingTime(0);
    startCamera();
  };

  const handleSubmit = () => {
    if (recordedBlob) {
      onVideoRecorded(recordedBlob);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Record Astrology Reading</h3>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </div>

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
            <span className="font-mono font-semibold">{formatTime(recordingTime)}</span>
          </div>
        )}

        {!hasCamera && !isPreviewing && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/80">
            <div className="text-center space-y-4">
              <Camera className="w-16 h-16 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">Camera preview will appear here</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-3">
        {!hasCamera && !isPreviewing && (
          <Button onClick={startCamera} size="lg">
            <Camera className="w-4 h-4 mr-2" />
            Start Camera
          </Button>
        )}

        {hasCamera && !isRecording && !isPreviewing && (
          <>
            <Button onClick={startRecording} size="lg" variant="destructive">
              <Video className="w-4 h-4 mr-2" />
              Start Recording
            </Button>
            <Button onClick={onCancel} variant="outline" size="lg">
              Cancel
            </Button>
          </>
        )}

        {isRecording && (
          <Button onClick={stopRecording} size="lg" variant="destructive">
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
            >
              <Play className="w-4 h-4 mr-2" />
              Play/Pause
            </Button>
            <Button onClick={handleRetake} variant="outline" size="lg">
              <Video className="w-4 h-4 mr-2" />
              Retake
            </Button>
            <Button onClick={handleSubmit} size="lg" disabled={isUploading}>
              <Upload className="w-4 h-4 mr-2" />
              {isUploading ? "Uploading..." : "Submit Reading"}
            </Button>
          </>
        )}
      </div>

      {isPreviewing && (
        <p className="text-sm text-center text-muted-foreground">
          Preview your recording. Click Submit to upload or Retake to record again.
        </p>
      )}
    </Card>
  );
};
