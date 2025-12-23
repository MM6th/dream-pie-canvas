import React, { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mic, Square, Pause, Play, Save, Trash2, Download } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AudioLevelMeter } from "./AudioLevelMeter";

interface PodcastRecordingStudioProps {
  onRecordingSaved?: () => void;
}

export const PodcastRecordingStudio = ({ onRecordingSaved }: PodcastRecordingStudioProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      setStream(mediaStream);
      
      // Find best supported format
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';
      
      const mediaRecorder = new MediaRecorder(mediaStream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        
        // Stop all tracks
        mediaStream.getTracks().forEach(track => track.stop());
        setStream(null);
      };
      
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      toast({
        title: "Recording Started",
        description: "Your microphone is now recording.",
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Microphone Error",
        description: "Could not access your microphone. Please check permissions.",
        variant: "destructive"
      });
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        timerRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
      } else {
        mediaRecorderRef.current.pause();
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      }
      setIsPaused(!isPaused);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      toast({
        title: "Recording Stopped",
        description: "Review your recording below.",
      });
    }
  };

  const discardRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setTitle("");
    setDescription("");
    chunksRef.current = [];
  };

  const saveRecording = async () => {
    if (!audioBlob || !user || !title.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a title for your recording.",
        variant: "destructive"
      });
      return;
    }
    
    setIsSaving(true);
    
    try {
      const timestamp = Date.now();
      const fileName = `podcast-recordings/${user.id}/${timestamp}.webm`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('audio-files')
        .upload(fileName, audioBlob, {
          contentType: 'audio/webm',
          upsert: false
        });
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('audio-files')
        .getPublicUrl(fileName);
      
      // Save metadata to database
      const { error: dbError } = await supabase
        .from('podcast_recordings')
        .insert({
          merchant_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          audio_url: publicUrl,
          duration_seconds: recordingTime,
          file_size_bytes: audioBlob.size,
          status: 'draft'
        });
      
      if (dbError) throw dbError;
      
      toast({
        title: "Recording Saved",
        description: "Your podcast recording has been saved successfully.",
      });
      
      discardRecording();
      onRecordingSaved?.();
    } catch (error) {
      console.error('Error saving recording:', error);
      toast({
        title: "Save Failed",
        description: "Could not save your recording. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const downloadRecording = () => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title || 'recording'}-${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <Card className="bg-card/50 border-border backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Mic className="w-5 h-5" />
          Voice Drop Recording Studio
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Audio Level Meter */}
        <AudioLevelMeter stream={stream} isRecording={isRecording && !isPaused} />
        
        {/* Recording Timer */}
        <div className="text-center">
          <div className="text-4xl font-mono font-bold text-foreground">
            {formatTime(recordingTime)}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {isRecording ? (isPaused ? 'Paused' : 'Recording...') : 'Ready to record'}
          </p>
        </div>
        
        {/* Recording Controls */}
        <div className="flex justify-center gap-4">
          {!isRecording && !audioBlob && (
            <Button 
              onClick={startRecording} 
              size="lg" 
              className="gap-2"
            >
              <Mic className="w-5 h-5" />
              Start Recording
            </Button>
          )}
          
          {isRecording && (
            <>
              <Button 
                onClick={pauseRecording} 
                variant="outline" 
                size="lg"
                className="gap-2"
              >
                {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                {isPaused ? 'Resume' : 'Pause'}
              </Button>
              <Button 
                onClick={stopRecording} 
                variant="destructive" 
                size="lg"
                className="gap-2"
              >
                <Square className="w-5 h-5" />
                Stop
              </Button>
            </>
          )}
        </div>
        
        {/* Preview and Save Section */}
        {audioUrl && !isRecording && (
          <div className="space-y-4 pt-4 border-t border-border">
            <div className="space-y-2">
              <Label htmlFor="preview">Preview Recording</Label>
              <audio 
                id="preview"
                src={audioUrl} 
                controls 
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a title for your recording"
                className="bg-background"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description (optional)"
                className="bg-background"
                rows={3}
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={saveRecording} 
                disabled={isSaving || !title.trim()}
                className="gap-2"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save Recording'}
              </Button>
              <Button 
                onClick={downloadRecording}
                variant="outline"
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </Button>
              <Button 
                onClick={discardRecording}
                variant="destructive"
                className="gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Discard
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PodcastRecordingStudio;
