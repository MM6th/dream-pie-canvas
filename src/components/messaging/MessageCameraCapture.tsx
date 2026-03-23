import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Loader2, RotateCcw, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface MessageCameraCaptureProps {
  onPhotoCaptured: (url: string) => void;
  disabled?: boolean;
}

export const MessageCameraCapture = ({
  onPhotoCaptured,
  disabled = false,
}: MessageCameraCaptureProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const openCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1080 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      setIsCameraOpen(true);

      // Wait for DOM to render the video element
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      });
    } catch {
      toast({ title: 'Camera Access Denied', description: 'Please allow camera access to take a photo.', variant: 'destructive' });
    }
  }, [toast]);

  const closeCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setIsCameraOpen(false);
    setCapturedImage(null);
  }, []);

  const takePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Mirror for selfie
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImage(dataUrl);
  }, []);

  const retake = useCallback(() => {
    setCapturedImage(null);
  }, []);

  const confirmPhoto = useCallback(async () => {
    if (!capturedImage || !user) return;
    setIsUploading(true);
    try {
      const res = await fetch(capturedImage);
      const blob = await res.blob();
      const fileName = `${user.id}/message-photo/${Date.now()}.jpg`;

      const { error } = await supabase.storage
        .from('user-media')
        .upload(fileName, blob, { contentType: 'image/jpeg', upsert: false });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('user-media')
        .getPublicUrl(fileName);

      onPhotoCaptured(publicUrl);
      toast({ title: 'Photo Captured', description: 'Your photo is ready to send.' });
      closeCamera();
    } catch (err: any) {
      toast({ title: 'Upload Failed', description: err.message || 'Could not upload photo.', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  }, [capturedImage, user, onPhotoCaptured, toast, closeCamera]);

  if (isUploading) {
    return (
      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Uploading photo...</span>
      </div>
    );
  }

  if (isCameraOpen) {
    return (
      <div className="space-y-2 p-3 bg-muted rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Camera</span>
          <Button type="button" size="icon" variant="ghost" onClick={closeCamera} className="h-7 w-7">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <canvas ref={canvasRef} className="hidden" />

        {capturedImage ? (
          <>
            <img src={capturedImage} alt="Captured" className="w-full rounded-lg max-h-48 object-contain bg-black" />
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" onClick={retake} className="flex-1">
                <RotateCcw className="w-3 h-3 mr-1" /> Retake
              </Button>
              <Button type="button" size="sm" onClick={confirmPhoto} className="flex-1">
                <Check className="w-3 h-3 mr-1" /> Use Photo
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="w-full flex justify-center bg-black rounded-lg overflow-hidden max-h-48">
              <video
                ref={videoRef}
                className="h-full max-h-48 object-cover"
                muted
                playsInline
                style={{ transform: 'scaleX(-1)' }}
              />
            </div>
            <Button type="button" size="sm" onClick={takePhoto} className="w-full">
              <Camera className="w-4 h-4 mr-1" /> Take Photo
            </Button>
          </>
        )}
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={openCamera}
      disabled={disabled}
      title="Take Photo"
      className="h-9 w-9"
    >
      <Camera className="w-5 h-5" />
    </Button>
  );
};
