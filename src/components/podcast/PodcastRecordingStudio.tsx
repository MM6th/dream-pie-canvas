import React, { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mic, Square, Pause, Play, Save, Trash2, Download, RefreshCw, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AudioLevelMeter } from "./AudioLevelMeter";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PodcastRecordingStudioProps {
  onRecordingSaved?: () => void;
}

interface RecoveryData {
  sessionId: string;
  segmentUrls: string[];
  totalDuration: number;
  lastSaved: string;
}

const AUTO_SAVE_INTERVAL = 30000; // Save every 30 seconds
const RECOVERY_KEY_PREFIX = 'voice_drop_recovery_';

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
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const [recoveryData, setRecoveryData] = useState<RecoveryData | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);

  // Auto-fill a default title once a recording is ready to be saved
  useEffect(() => {
    if (!audioUrl) return;
    setTitle((prev) => (prev.trim() ? prev : `Voice Drop Recording - ${new Date().toLocaleString()}`));
  }, [audioUrl]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionIdRef = useRef<string>(`session_${Date.now()}`);
  const segmentIndexRef = useRef<number>(0);
  const savedSegmentsRef = useRef<string[]>([]);
  const mimeTypeRef = useRef<string>("audio/webm");
  const recordingTimeRef = useRef<number>(0); // Ref to track current time for auto-save

  // Check for recovery data on mount
  useEffect(() => {
    if (user) {
      checkForRecovery();
    }
  }, [user]);

  const checkForRecovery = async () => {
    if (!user) return;
    
    const recoveryKey = `${RECOVERY_KEY_PREFIX}${user.id}`;
    const stored = localStorage.getItem(recoveryKey);
    
    if (stored) {
      try {
        const data: RecoveryData = JSON.parse(stored);
        // Only show recovery if data is less than 24 hours old
        const savedTime = new Date(data.lastSaved);
        const hoursSinceSave = (Date.now() - savedTime.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceSave < 24 && data.segmentUrls.length > 0) {
          setRecoveryData(data);
          toast({
            title: "Recording Found",
            description: `Found an unsaved recording from ${savedTime.toLocaleString()}. You can recover it below.`,
          });
        } else {
          // Clear old recovery data
          clearRecoveryData();
        }
      } catch (e) {
        console.error('Error parsing recovery data:', e);
        localStorage.removeItem(recoveryKey);
      }
    }
  };

  const clearRecoveryData = () => {
    if (user) {
      const recoveryKey = `${RECOVERY_KEY_PREFIX}${user.id}`;
      localStorage.removeItem(recoveryKey);
    }
    setRecoveryData(null);
  };

  const saveRecoveryData = (segmentUrls: string[], duration: number) => {
    if (!user) return;
    
    const recoveryKey = `${RECOVERY_KEY_PREFIX}${user.id}`;
    const data: RecoveryData = {
      sessionId: sessionIdRef.current,
      segmentUrls,
      totalDuration: duration,
      lastSaved: new Date().toISOString(),
    };
    localStorage.setItem(recoveryKey, JSON.stringify(data));
  };

  const recoverRecording = async () => {
    if (!recoveryData || !user) return;
    
    setIsRecovering(true);
    
    try {
      // Download all segments and combine them
      const blobs: Blob[] = [];
      
      for (const url of recoveryData.segmentUrls) {
        try {
          const response = await fetch(url);
          if (response.ok) {
            const blob = await response.blob();
            blobs.push(blob);
          }
        } catch (e) {
          console.error('Error fetching segment:', e);
        }
      }
      
      if (blobs.length === 0) {
        throw new Error('Could not recover any audio segments');
      }
      
      // Combine all blobs
      const combinedBlob = new Blob(blobs, { type: 'audio/webm' });
      setAudioBlob(combinedBlob);
      setAudioUrl(URL.createObjectURL(combinedBlob));
      setRecordingTime(recoveryData.totalDuration);
      recordingTimeRef.current = recoveryData.totalDuration; // Update ref for accurate save
      
      toast({
        title: "Recording Recovered",
        description: `Successfully recovered ${Math.floor(recoveryData.totalDuration / 60)} minutes of audio. Please save it now.`,
      });
      
      // Keep recovery data until user saves or discards
    } catch (error) {
      console.error('Error recovering recording:', error);
      toast({
        title: "Recovery Failed",
        description: "Could not recover the recording. The audio segments may have been deleted.",
        variant: "destructive"
      });
      clearRecoveryData();
    } finally {
      setIsRecovering(false);
    }
  };

  const discardRecovery = async () => {
    if (!recoveryData || !user) return;
    
    // Delete segments from storage
    for (const url of recoveryData.segmentUrls) {
      try {
        // Extract path from URL
        const urlParts = url.split('/audio-files/');
        if (urlParts[1]) {
          await supabase.storage.from('audio-files').remove([urlParts[1]]);
        }
      } catch (e) {
        console.error('Error deleting recovery segment:', e);
      }
    }
    
    clearRecoveryData();
    toast({
      title: "Recovery Discarded",
      description: "The recovered recording has been permanently deleted.",
    });
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const autoSaveSegment = async () => {
    if (!user || chunksRef.current.length === 0) return;
    
    setIsAutoSaving(true);
    
    try {
      // Create blob from current chunks
      const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
      const segmentIndex = segmentIndexRef.current;
      const fileName = `podcast-recordings/${user.id}/temp/${sessionIdRef.current}/segment_${segmentIndex}.webm`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('audio-files')
        .upload(fileName, blob, {
          contentType: 'audio/webm',
          upsert: true
        });
      
      if (uploadError) {
        console.error('Auto-save upload error:', uploadError);
        return;
      }
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('audio-files')
        .getPublicUrl(fileName);
      
      // Update saved segments
      savedSegmentsRef.current[segmentIndex] = publicUrl;
      segmentIndexRef.current++;
      
      // Clear chunks since they're now saved
      chunksRef.current = [];
      
      // Save recovery data using ref (avoids stale closure)
      saveRecoveryData(savedSegmentsRef.current.filter(Boolean), recordingTimeRef.current);
      
      setLastAutoSave(new Date());
      console.log(`Auto-saved segment ${segmentIndex}, total segments: ${savedSegmentsRef.current.length}`);
    } catch (error) {
      console.error('Error auto-saving segment:', error);
    } finally {
      setIsAutoSaving(false);
    }
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
      
      mimeTypeRef.current = mimeType;
      
      const mediaRecorder = new MediaRecorder(mediaStream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      sessionIdRef.current = `session_${Date.now()}`;
      segmentIndexRef.current = 0;
      savedSegmentsRef.current = [];
      
      // Clear any old recovery data when starting fresh
      clearRecoveryData();
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        // Final save of any remaining chunks
        if (chunksRef.current.length > 0 && user) {
          const blob = new Blob(chunksRef.current, { type: mimeType });
          const segmentIndex = segmentIndexRef.current;
          const fileName = `podcast-recordings/${user.id}/temp/${sessionIdRef.current}/segment_${segmentIndex}.webm`;
          
          try {
            const { error } = await supabase.storage
              .from('audio-files')
              .upload(fileName, blob, {
                contentType: 'audio/webm',
                upsert: true
              });
            
            if (!error) {
              const { data: { publicUrl } } = supabase.storage
                .from('audio-files')
                .getPublicUrl(fileName);
              savedSegmentsRef.current[segmentIndex] = publicUrl;
            }
          } catch (e) {
            console.error('Error saving final segment:', e);
          }
        }
        
        // Combine all saved segments into final blob
        if (savedSegmentsRef.current.length > 0) {
          const blobs: Blob[] = [];
          
          for (const url of savedSegmentsRef.current) {
            if (url) {
              try {
                const response = await fetch(url);
                if (response.ok) {
                  const blob = await response.blob();
                  blobs.push(blob);
                }
              } catch (e) {
                console.error('Error fetching saved segment:', e);
              }
            }
          }
          
          // Also add any unsaved chunks
          if (chunksRef.current.length > 0) {
            blobs.push(new Blob(chunksRef.current, { type: mimeType }));
          }
          
          if (blobs.length > 0) {
            const combinedBlob = new Blob(blobs, { type: mimeType });
            setAudioBlob(combinedBlob);
            setAudioUrl(URL.createObjectURL(combinedBlob));
          }
        } else if (chunksRef.current.length > 0) {
          // Fallback if no auto-saves happened
          const blob = new Blob(chunksRef.current, { type: mimeType });
          setAudioBlob(blob);
          setAudioUrl(URL.createObjectURL(blob));
        }
        
        // Update recovery data with final state
        saveRecoveryData(savedSegmentsRef.current.filter(Boolean), recordingTimeRef.current);
        
        // Stop all tracks
        mediaStream.getTracks().forEach(track => track.stop());
        setStream(null);
      };
      
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);
      recordingTimeRef.current = 0;
      
      // Start timer
      timerRef.current = setInterval(() => {
        recordingTimeRef.current += 1;
        setRecordingTime(recordingTimeRef.current);
      }, 1000);
      
      // Start auto-save timer
      autoSaveTimerRef.current = setInterval(() => {
        autoSaveSegment();
      }, AUTO_SAVE_INTERVAL);
      
      toast({
        title: "Recording Started",
        description: "Your recording is being auto-saved every 30 seconds.",
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
        // Resume auto-save
        autoSaveTimerRef.current = setInterval(() => {
          autoSaveSegment();
        }, AUTO_SAVE_INTERVAL);
      } else {
        mediaRecorderRef.current.pause();
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        // Pause auto-save but save current progress
        if (autoSaveTimerRef.current) {
          clearInterval(autoSaveTimerRef.current);
        }
        autoSaveSegment(); // Save before pausing
      }
      setIsPaused(!isPaused);
    }
  };

  const stopRecording = async () => {
    if (mediaRecorderRef.current && isRecording) {
      // Save any remaining chunks before stopping
      if (chunksRef.current.length > 0) {
        await autoSaveSegment();
      }

      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }

      toast({
        title: "Recording Stopped",
        description: "Preview it below, then click \"Save Recording\" to add it to My Recordings.",
      });
    }
  };

  const discardRecording = async () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    
    // Delete temp segments from storage
    if (user && savedSegmentsRef.current.length > 0) {
      for (const url of savedSegmentsRef.current) {
        if (url) {
          try {
            const urlParts = url.split('/audio-files/');
            if (urlParts[1]) {
              await supabase.storage.from('audio-files').remove([urlParts[1]]);
            }
          } catch (e) {
            console.error('Error deleting temp segment:', e);
          }
        }
      }
    }
    
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setTitle("");
    setDescription("");
    chunksRef.current = [];
    savedSegmentsRef.current = [];
    segmentIndexRef.current = 0;
    clearRecoveryData();
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
      
      // Upload final combined file to storage
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
      
      // Save metadata to database - use ref to ensure accurate duration after recovery
      const { error: dbError } = await supabase
        .from('podcast_recordings')
        .insert({
          merchant_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          audio_url: publicUrl,
          duration_seconds: recordingTimeRef.current || recordingTime,
          file_size_bytes: audioBlob.size,
          status: 'draft'
        });
      
      if (dbError) throw dbError;
      
      // Clean up temp segments
      if (savedSegmentsRef.current.length > 0) {
        for (const url of savedSegmentsRef.current) {
          if (url) {
            try {
              const urlParts = url.split('/audio-files/');
              if (urlParts[1]) {
                await supabase.storage.from('audio-files').remove([urlParts[1]]);
              }
            } catch (e) {
              console.error('Error cleaning up temp segment:', e);
            }
          }
        }
      }
      
      toast({
        title: "Recording Saved",
        description: "Saved to My Recordings below.",
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
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
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
        {/* Recovery Alert */}
        {recoveryData && !audioUrl && (
          <Alert className="border-amber-500/50 bg-amber-500/10">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="flex flex-col gap-2">
              <span className="text-foreground">
                Found an unsaved recording ({Math.floor(recoveryData.totalDuration / 60)} min) from {new Date(recoveryData.lastSaved).toLocaleString()}
              </span>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={recoverRecording}
                  disabled={isRecovering}
                  className="gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${isRecovering ? 'animate-spin' : ''}`} />
                  {isRecovering ? 'Recovering...' : 'Recover'}
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={discardRecovery}
                  disabled={isRecovering}
                >
                  Discard
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

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
          {isRecording && (
            <p className="text-xs text-muted-foreground mt-1">
              {isAutoSaving ? (
                <span className="text-amber-500">Auto-saving...</span>
              ) : lastAutoSave ? (
                <span className="text-green-500">
                  Last saved: {lastAutoSave.toLocaleTimeString()}
                </span>
              ) : (
                <span>Auto-save enabled (every 30s)</span>
              )}
            </p>
          )}
        </div>
        
        {/* Recording Controls */}
        <div className="flex justify-center gap-4">
          {!isRecording && !audioBlob && (
            <Button 
              onClick={startRecording} 
              size="lg" 
              className="gap-2"
              disabled={isRecovering}
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
