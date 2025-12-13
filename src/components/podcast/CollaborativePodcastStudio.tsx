import React, { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Mic, MicOff, Square, Play, Save, Trash2, Download, 
  Users, Copy, Link, UserPlus, Radio, Clock
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePodcastSession } from "@/hooks/usePodcastSession";
import { AudioLevelMeter } from "./AudioLevelMeter";
import { PodcastInviteModal } from "./PodcastInviteModal";

interface CollaborativePodcastStudioProps {
  onRecordingSaved?: () => void;
}

export const CollaborativePodcastStudio = ({ onRecordingSaved }: CollaborativePodcastStudioProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionTitle, setSessionTitle] = useState("");
  const [sessionDescription, setSessionDescription] = useState("");
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Use podcast session hook
  const {
    localStream,
    mixedAudioStream,
    participants,
    isConnected,
    isMuted,
    joinSession,
    leaveSession,
    toggleMute,
  } = usePodcastSession(sessionId || '', user?.id || '', true);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Create new session
  const createSession = async () => {
    if (!user || !sessionTitle.trim()) {
      toast({
        title: "Missing Title",
        description: "Please enter a session title.",
        variant: "destructive"
      });
      return;
    }

    setIsCreatingSession(true);
    try {
      const { data, error } = await supabase
        .from('podcast_sessions')
        .insert({
          host_id: user.id,
          title: sessionTitle.trim(),
          description: sessionDescription.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;

      setSessionId(data.id);
      setInviteToken(data.invite_token);
      
      // Join the session with the new session ID
      await joinSession(data.id);

      toast({
        title: "Session Created",
        description: "Your podcast session is ready. Invite guests to join!",
      });
    } catch (error) {
      console.error('Error creating session:', error);
      toast({
        title: "Error",
        description: "Failed to create session. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCreatingSession(false);
    }
  };

  // Start recording (host only)
  const startRecording = useCallback(() => {
    if (!mixedAudioStream) {
      toast({
        title: "Not Ready",
        description: "Please wait for the audio to initialize.",
        variant: "destructive"
      });
      return;
    }

    try {
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(mixedAudioStream, { mimeType });
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
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);

      // Update session status
      supabase
        .from('podcast_sessions')
        .update({ status: 'recording', started_at: new Date().toISOString() })
        .eq('id', sessionId);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      toast({
        title: "Recording Started",
        description: "All participants are now being recorded.",
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Recording Error",
        description: "Could not start recording.",
        variant: "destructive"
      });
    }
  }, [mixedAudioStream, sessionId, toast]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      // Update session status
      supabase
        .from('podcast_sessions')
        .update({ status: 'completed', ended_at: new Date().toISOString() })
        .eq('id', sessionId);

      toast({
        title: "Recording Stopped",
        description: "Review your recording below.",
      });
    }
  }, [isRecording, sessionId, toast]);

  // Save recording
  const saveRecording = async () => {
    if (!audioBlob || !user || !sessionTitle.trim()) {
      toast({
        title: "Missing Information",
        description: "Please ensure there is a recording to save.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const timestamp = Date.now();
      const fileName = `podcast-recordings/${user.id}/${timestamp}-collaborative.webm`;

      const { error: uploadError } = await supabase.storage
        .from('audio-files')
        .upload(fileName, audioBlob, {
          contentType: 'audio/webm',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('audio-files')
        .getPublicUrl(fileName);

      const participantNames = participants.map(p => p.displayName).join(', ');

      const { error: dbError } = await supabase
        .from('podcast_recordings')
        .insert({
          merchant_id: user.id,
          title: sessionTitle.trim(),
          description: `Collaborative recording with: ${participantNames}. ${sessionDescription}`.trim(),
          audio_url: publicUrl,
          duration_seconds: recordingTime,
          file_size_bytes: audioBlob.size,
          status: 'draft'
        });

      if (dbError) throw dbError;

      toast({
        title: "Recording Saved",
        description: "Your collaborative podcast recording has been saved.",
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

  // Discard recording
  const discardRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    chunksRef.current = [];
  };

  // Download recording
  const downloadRecording = () => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${sessionTitle || 'recording'}-${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // End session
  const endSession = async () => {
    if (isRecording) {
      stopRecording();
    }
    await leaveSession();
    setSessionId(null);
    setInviteToken(null);
  };

  // Copy invite link
  const copyInviteLink = () => {
    if (inviteToken) {
      const link = `${window.location.origin}/podcast-session/${inviteToken}`;
      navigator.clipboard.writeText(link);
      toast({
        title: "Link Copied",
        description: "Invite link copied to clipboard.",
      });
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, []);

  // Pre-session setup UI
  if (!sessionId) {
    return (
      <Card className="bg-card/50 border-border backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Users className="w-5 h-5" />
            Collaborative Podcast Studio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="session-title">Session Title *</Label>
            <Input
              id="session-title"
              value={sessionTitle}
              onChange={(e) => setSessionTitle(e.target.value)}
              placeholder="Enter your podcast session title"
              className="bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="session-description">Description</Label>
            <Textarea
              id="session-description"
              value={sessionDescription}
              onChange={(e) => setSessionDescription(e.target.value)}
              placeholder="Add a description (optional)"
              className="bg-background"
              rows={3}
            />
          </div>

          <Button 
            onClick={createSession}
            disabled={isCreatingSession || !sessionTitle.trim()}
            className="w-full gap-2"
          >
            <Radio className="w-4 h-4" />
            {isCreatingSession ? 'Creating Session...' : 'Start Collaborative Session'}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Create a session to record with other users. You'll be able to invite guests via messaging.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Active session UI
  return (
    <Card className="bg-card/50 border-border backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Radio className="w-5 h-5 text-primary animate-pulse" />
            {sessionTitle}
          </CardTitle>
          <Badge variant={isRecording ? "destructive" : isConnected ? "default" : "secondary"}>
            {isRecording ? 'Recording' : isConnected ? 'Live' : 'Connecting...'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Participants */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Participants ({participants.length})
            </Label>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowInviteModal(true)}
              className="gap-1"
            >
              <UserPlus className="w-3 h-3" />
              Invite
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {participants.map((participant) => (
              <Badge 
                key={participant.id} 
                variant={participant.isConnected ? "default" : "secondary"}
                className="flex items-center gap-1"
              >
                {participant.isMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                {participant.displayName}
                {participant.role === 'host' && ' (Host)'}
              </Badge>
            ))}
          </div>
        </div>

        {/* Invite Link */}
        {inviteToken && (
          <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
            <Link className="w-4 h-4 text-muted-foreground" />
            <code className="text-xs flex-1 truncate">
              {window.location.origin}/podcast-session/{inviteToken}
            </code>
            <Button variant="ghost" size="sm" onClick={copyInviteLink}>
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Audio Level Meter */}
        <AudioLevelMeter stream={localStream} isRecording={!isMuted && isConnected} />

        {/* Recording Timer */}
        <div className="text-center">
          <div className="text-4xl font-mono font-bold text-foreground flex items-center justify-center gap-2">
            <Clock className="w-6 h-6" />
            {formatTime(recordingTime)}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {isRecording ? 'Recording all participants...' : 'Ready to record'}
          </p>
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-4">
          {/* Mute Toggle */}
          <Button 
            onClick={toggleMute}
            variant={isMuted ? "destructive" : "outline"}
            size="lg"
            className="gap-2"
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            {isMuted ? 'Unmute' : 'Mute'}
          </Button>

          {/* Recording Controls */}
          {!isRecording && !audioBlob && (
            <Button 
              onClick={startRecording}
              size="lg"
              disabled={participants.length < 1}
              className="gap-2"
            >
              <Play className="w-5 h-5" />
              Start Recording
            </Button>
          )}

          {isRecording && (
            <Button 
              onClick={stopRecording}
              variant="destructive"
              size="lg"
              className="gap-2"
            >
              <Square className="w-5 h-5" />
              Stop Recording
            </Button>
          )}

          {/* End Session */}
          <Button 
            onClick={endSession}
            variant="outline"
            size="lg"
          >
            End Session
          </Button>
        </div>

        {/* Preview and Save */}
        {audioUrl && !isRecording && (
          <div className="space-y-4 pt-4 border-t border-border">
            <div className="space-y-2">
              <Label>Preview Recording</Label>
              <audio src={audioUrl} controls className="w-full" />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={saveRecording}
                disabled={isSaving}
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

      {/* Invite Modal */}
      <PodcastInviteModal
        open={showInviteModal}
        onOpenChange={setShowInviteModal}
        sessionId={sessionId}
        sessionTitle={sessionTitle}
        inviteToken={inviteToken || ''}
      />
    </Card>
  );
};

export default CollaborativePodcastStudio;
