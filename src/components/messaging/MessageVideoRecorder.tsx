import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Video, Square, Play, Pause, Trash2, Loader2, Upload } from 'lucide-react';
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
  const [showOptions, setShowOptions] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const livePreviewRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const MAX_DURATION = 60;

  useEffect(() => {
    if (isRecording && livePreviewRef.current && streamRef.current) {
      livePreviewRef.current.srcObject = streamRef.current;
      livePreviewRef.current.play().catch(() => {});
    }
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const uploadBlob = useCallback(async (blob: Blob, mimeType: string) => {
    if (!user) return;
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
      toast({ title: 'Video Ready', description: 'Your video message is ready to send.' });
    } catch (err: any) {
      console.error('Video upload error:', err);
      toast({ title: 'Upload Failed', description: err.message || 'Could not upload video.', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  }, [user, onVideoRecorded, toast]);

  const startRecording = useCallback(async () => {
    if (!user) return;
    setShowOptions(false);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1080 },
          height: { ideal: 1920 },
          aspectRatio: { ideal: 9 / 16 },
        },
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
        await uploadBlob(blob, mimeType);
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
  }, [user, uploadBlob, toast]);

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

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setShowOptions(false);

    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
      toast({ title: 'File Too Large', description: 'Video must be under 500MB.', variant: 'destructive' });
      return;
    }

    if (!file.type.startsWith('video/')) {
      toast({ title: 'Invalid File', description: 'Please select a video file.', variant: 'destructive' });
      return;
    }

    await uploadBlob(file, file.type);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [user, uploadBlob, toast]);

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
    if (videoPreviewRef.current) videoPreviewRef.current.pause();
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
          className="w-full rounded-lg max-h-48 object-contain bg-black"
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
        <div className="w-full flex justify-center bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '9/16', maxHeight: '280px' }}>
          <video
            ref={livePreviewRef}
            className="h-full object-cover"
            muted
            playsInline
            style={{ transform: 'scaleX(-1)' }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleFileUpload}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setShowOptions(!showOptions)}
        disabled={disabled}
        title="Video Message"
        className="h-9 w-9"
      >
        <Video className="w-5 h-5" />
      </Button>
      {showOptions && (
        <div className="absolute bottom-full left-0 mb-1 bg-popover border rounded-lg shadow-lg p-1 z-50 min-w-[160px]">
          <button
            onClick={startRecording}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-accent text-left"
          >
            <Video className="w-4 h-4" />
            Record Video
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-accent text-left"
          >
            <Upload className="w-4 h-4" />
            Upload Video
          </button>
        </div>
      )}
    </div>
  );
};
