import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Play, 
  Pause, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  Library,
  Clock,
  Calendar,
  Upload
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";

interface Recording {
  id: string;
  title: string;
  description: string | null;
  audio_url: string;
  duration_seconds: number | null;
  file_size_bytes: number | null;
  status: string;
  created_at: string;
}

interface PodcastRecordingsLibraryProps {
  refreshTrigger?: number;
}

export const PodcastRecordingsLibrary = ({ refreshTrigger }: PodcastRecordingsLibraryProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  
  const audioRefs = React.useRef<Map<string, HTMLAudioElement>>(new Map());

  const fetchRecordings = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('podcast_recordings')
        .select('*')
        .eq('merchant_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setRecordings(data || []);
    } catch (error) {
      console.error('Error fetching recordings:', error);
      toast({
        title: "Error",
        description: "Could not load your recordings.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecordings();
  }, [user, refreshTrigger]);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const togglePlay = (recordingId: string, audioUrl: string) => {
    const currentAudio = audioRefs.current.get(recordingId);
    
    if (playingId === recordingId && currentAudio) {
      currentAudio.pause();
      setPlayingId(null);
    } else {
      // Pause any currently playing audio
      audioRefs.current.forEach((audio, id) => {
        if (id !== recordingId) {
          audio.pause();
        }
      });
      
      if (!currentAudio) {
        const audio = new Audio(audioUrl);
        audio.onended = () => setPlayingId(null);
        audioRefs.current.set(recordingId, audio);
        audio.play();
      } else {
        currentAudio.play();
      }
      setPlayingId(recordingId);
    }
  };

  const startEditing = (recording: Recording) => {
    setEditingId(recording.id);
    setEditTitle(recording.title);
    setEditDescription(recording.description || "");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditTitle("");
    setEditDescription("");
  };

  const saveEdit = async (recordingId: string) => {
    try {
      const { error } = await supabase
        .from('podcast_recordings')
        .update({
          title: editTitle.trim(),
          description: editDescription.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', recordingId);
      
      if (error) throw error;
      
      setRecordings(prev => prev.map(r => 
        r.id === recordingId 
          ? { ...r, title: editTitle.trim(), description: editDescription.trim() || null }
          : r
      ));
      
      toast({
        title: "Updated",
        description: "Recording details updated successfully.",
      });
      
      cancelEditing();
    } catch (error) {
      console.error('Error updating recording:', error);
      toast({
        title: "Error",
        description: "Could not update recording.",
        variant: "destructive"
      });
    }
  };

  const deleteRecording = async (recordingId: string, audioUrl: string) => {
    try {
      // Extract file path from URL
      const urlParts = audioUrl.split('/audio-files/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from('audio-files').remove([filePath]);
      }
      
      const { error } = await supabase
        .from('podcast_recordings')
        .delete()
        .eq('id', recordingId);
      
      if (error) throw error;
      
      setRecordings(prev => prev.filter(r => r.id !== recordingId));
      
      // Stop playback if this recording was playing
      if (playingId === recordingId) {
        const audio = audioRefs.current.get(recordingId);
        if (audio) audio.pause();
        setPlayingId(null);
      }
      audioRefs.current.delete(recordingId);
      
      toast({
        title: "Deleted",
        description: "Recording deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting recording:', error);
      toast({
        title: "Error",
        description: "Could not delete recording.",
        variant: "destructive"
      });
    }
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      audioRefs.current.forEach(audio => {
        audio.pause();
      });
    };
  }, []);

  if (loading) {
    return (
      <Card className="bg-card/50 border-border backdrop-blur-sm">
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Loading recordings...</p>
        </CardContent>
      </Card>
    );
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('audio/')) {
      toast({
        title: "Invalid File",
        description: "Please select an audio file (MP3, WAV, M4A, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (100MB max)
    if (file.size > 100 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select a file smaller than 100MB.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `podcast-recordings/${user.id}/${timestamp}-uploaded.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('audio-files')
        .upload(fileName, file, {
          contentType: file.type,
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('audio-files')
        .getPublicUrl(fileName);

      // Create audio element to get duration
      const audio = new Audio(URL.createObjectURL(file));
      await new Promise<void>((resolve) => {
        audio.onloadedmetadata = () => resolve();
        audio.onerror = () => resolve();
      });

      const duration = Math.round(audio.duration) || null;

      // Save to database
      const { error: dbError } = await supabase
        .from('podcast_recordings')
        .insert({
          merchant_id: user.id,
          title: file.name.replace(/\.[^/.]+$/, "") || `Uploaded Recording - ${new Date().toLocaleDateString()}`,
          description: 'Uploaded recording',
          audio_url: publicUrl,
          duration_seconds: duration,
          file_size_bytes: file.size,
          status: 'draft'
        });

      if (dbError) throw dbError;

      toast({
        title: "Upload Complete",
        description: "Your recording has been uploaded successfully.",
      });

      fetchRecordings();
    } catch (error) {
      console.error('Error uploading recording:', error);
      toast({
        title: "Upload Failed",
        description: "Could not upload your recording. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      // Reset file input
      e.target.value = '';
    }
  };

  return (
    <Card className="bg-card/50 border-border backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Library className="w-5 h-5" />
            My Recordings
          </CardTitle>
          <div className="relative">
            <input
              type="file"
              accept="audio/*"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={loading}
            />
            <Button variant="outline" size="sm" disabled={loading}>
              <Upload className="w-4 h-4 mr-1" />
              Upload
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {recordings.length === 0 ? (
          <div className="text-center py-8">
            <Library className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No recordings yet.</p>
            <p className="text-sm text-muted-foreground">Use the studio above to create your first recording.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recordings.map((recording) => (
              <div 
                key={recording.id}
                className="p-4 bg-background/50 rounded-lg border border-border"
              >
                {editingId === recording.id ? (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label>Title</Label>
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="bg-background"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Description</Label>
                      <Textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="bg-background"
                        rows={2}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => saveEdit(recording.id)}
                        disabled={!editTitle.trim()}
                        className="gap-1"
                      >
                        <Check className="w-4 h-4" />
                        Save
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={cancelEditing}
                        className="gap-1"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground truncate">
                          {recording.title}
                        </h4>
                        {recording.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {recording.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDuration(recording.duration_seconds)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(recording.created_at), 'MMM d, yyyy')}
                          </span>
                          <span>{formatFileSize(recording.file_size_bytes)}</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => togglePlay(recording.id, recording.audio_url)}
                          className="h-8 w-8"
                        >
                          {playingId === recording.id ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => startEditing(recording)}
                          className="h-8 w-8"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="destructive"
                              className="h-8 w-8"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Recording?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete "{recording.title}". This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => deleteRecording(recording.id, recording.audio_url)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PodcastRecordingsLibrary;
