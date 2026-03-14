import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Play, Pause, Trash2, Loader2 } from 'lucide-react';
import { AudioLevelMeter } from '@/components/podcast/AudioLevelMeter';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface MessageAudioRecorderProps {
  onAudioRecorded: (url: string) => void;
  audioUrl: string;
  onAudioRemoved: () => void;
  disabled?: boolean;
}

export const MessageAudioRecorder = ({
  onAudioRecorded,
  audioUrl,
  onAudioRemoved,
  disabled = false,
}: MessageAudioRecorderProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const MAX_DURATION = 120; // 2 minutes max

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = useCallback(async () => {
    if (!user) return;
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });

      setStream(mediaStream);

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(mediaStream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        mediaStream.getTracks().forEach((t) => t.stop());
        setStream(null);

        if (chunksRef.current.length === 0) return;

        const blob = new Blob(chunksRef.current, { type: mimeType });
        setIsUploading(true);

        try {
          const ext = mimeType.includes('webm') ? 'webm' : 'm4a';
          const fileName = `${user.id}/message-audio/${Date.now()}.${ext}`;

          const { error: uploadError } = await supabase.storage
            .from('user-media')
            .upload(fileName, blob, { contentType: mimeType, upsert: false });

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('user-media')
            .getPublicUrl(fileName);

          onAudioRecorded(publicUrl);
          toast({ title: 'Audio Recorded', description: 'Your voice message is ready to send.' });
        } catch (err: any) {
          console.error('Audio upload error:', err);
          toast({ title: 'Upload Failed', description: err.message || 'Could not upload audio.', variant: 'destructive' });
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
      console.error('Microphone error:', err);
      toast({ title: 'Microphone Access Denied', description: 'Please allow microphone access to record audio.', variant: 'destructive' });
    }
  }, [user, onAudioRecorded, toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const togglePlayback = () => {
    if (!audioUrl) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => setIsPlaying(false);
    }
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const removeAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
    setRecordingTime(0);
    onAudioRemoved();
  };

  if (isUploading) {
    return (
      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Uploading audio...</span>
      </div>
    );
  }

  if (audioUrl) {
    return (
      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
        <Button type="button" size="icon" variant="ghost" onClick={togglePlayback} className="h-8 w-8">
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>
        <div className="flex-1">
          <span className="text-sm font-medium">Voice Message</span>
          <span className="text-xs text-muted-foreground ml-2">{formatTime(recordingTime)}</span>
        </div>
        <Button type="button" size="icon" variant="destructive" onClick={removeAudio} className="h-8 w-8">
          <Trash2 className="w-4 h-4" />
        </Button>
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
        <AudioLevelMeter stream={stream} isRecording={isRecording} />
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={startRecording}
      disabled={disabled}
    >
      <Mic className="w-4 h-4 mr-2" />
      Record Voice Message
    </Button>
  );
};
