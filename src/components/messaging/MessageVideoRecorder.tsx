import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Video, Square, Play, Pause, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface MessageVideoRecorderProps {
  onVideoRecorded: (url: string) => void;
  videoUrl: string;
  onVideoRemoved: () => void;
  disabled?: boolean;
}

export const MessageVideoRecorder = ({
  onVideoRecorded,
  videoUrl,
  onVideoRemoved,
  disabled = false,
}: MessageVideoRecorderProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const livePreviewRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const MAX_DURATION = 60; // 1 minute max

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = useCallback(async () => {
    if (!user) return;
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: { echoCancellation: true, noiseSuppression: true },
      });

      streamRef.current = mediaStream;

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm')
          ? 'video/webm'
          : 'video/mp4';

      const mediaRecorder = new MediaRecorder(mediaStream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        mediaStream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        if (chunksRef.current.length === 0) return;

        const blob = new Blob(chunksRef.current, { type: mimeType });
        setIsUploading(true);

        try {
          const ext = mimeType.includes('webm') ? 'webm' : 'mp4';
          const fileName = `${user.id}/message-video/${Date.now()}.${ext}`;

          const { error: uploadError } = await supabase.storage
            .from('user-media')
            .upload(fileName, blob, { contentType: mimeType, upsert: false });

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('user-media')
            .getPublicUrl(fileName);

          onVideoRecorded(publicUrl);
          toast({ title: 'Video Recorded', description: 'Your video message is ready to send.' });
        } catch (err: any) {
          console.error('Video upload error:', err);
          toast({ title: 'Upload Failed', description: err.message || 'Could not upload video.', variant: 'destructive' });
        } finally {
          setIsUploading(false);
        }
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev + 1 >= MAX_DURATION) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error('Camera error:', err);
      toast({ title: 'Camera Access Denied', description: 'Please allow camera access to record video.', variant: 'destructive' });
    }
  }, [user, onVideoRecorded, toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (livePreviewRef.current) {
      livePreviewRef.current.srcObject = null;
    }
    setIsRecording(false);
  }, []);

  const togglePlayback = () => {
    if (!videoUrl || !videoPreviewRef.current) return;
    if (isPlaying) {
      videoPreviewRef.current.pause();
      setIsPlaying(false);
    } else {
      videoPreviewRef.current.play();
      setIsPlaying(true);
    }
  };

  const removeVideo = () => {
    if (videoPreviewRef.current) {
      videoPreviewRef.current.pause();
    }
    setIsPlaying(false);
    setRecordingTime(0);
    onVideoRemoved();
  };

  if (isUploading) {
    return (
      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Uploading video...</span>
      </div>
    );
  }

  if (videoUrl) {
    return (
      <div className="space-y-2 p-3 bg-muted rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button type="button" size="icon" variant="ghost" onClick={togglePlayback} className="h-8 w-8">
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <span className="text-sm font-medium">Video Message</span>
          </div>
          <Button type="button" size="icon" variant="destructive" onClick={removeVideo} className="h-8 w-8">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
        <video
          ref={videoPreviewRef}
          src={videoUrl}
          className="w-full rounded-lg max-h-40 object-cover"
          onEnded={() => setIsPlaying(false)}
        />
      </div>
    );
  }

  if (isRecording) {
    return (
      <div className="space-y-2 p-3 bg-muted rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-red-500">Recording</span>
            <span className="text-sm text-muted-foreground">{formatTime(recordingTime)} / {formatTime(MAX_DURATION)}</span>
          </div>
          <Button type="button" size="sm" variant="destructive" onClick={stopRecording}>
            <Square className="w-3 h-3 mr-1" />
            Stop
          </Button>
        </div>
        <video
          ref={livePreviewRef}
          className="w-full rounded-lg max-h-40 object-cover mirror"
          muted
          playsInline
          style={{ transform: 'scaleX(-1)' }}
        />
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={startRecording}
      disabled={disabled}
      title="Record Video Message"
      className="h-9 w-9"
    >
      <Video className="w-5 h-5" />
    </Button>
  );
};
