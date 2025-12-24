import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Play, 
  Pause, 
  Trash2, 
  Edit2, 
  Library,
  Clock,
  Calendar,
  Upload,
  Download
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
import { PodcastPublishModal } from "./PodcastPublishModal";

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
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  
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

  const openPublishModal = (recording: Recording) => {
    setSelectedRecording(recording);
    setShowPublishModal(true);
  };

  const deleteRecording = async (recordingId: string, audioUrl: string) => {
    try {
      // First, delete any published audio_product that uses this audio URL
      const { error: productDeleteError } = await supabase
        .from('audio_products')
        .delete()
        .eq('audio_file_url', audioUrl)
        .eq('merchant_id', user?.id);
      
      if (productDeleteError) {
        console.error('Error deleting audio product:', productDeleteError);
      }

      // Extract file path from URL and delete from storage
      const urlParts = audioUrl.split('/audio-files/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from('audio-files').remove([filePath]);
      }
      
      // Delete from podcast_recordings table
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

  const downloadRecording = async (recording: Recording) => {
    try {
      toast({
        title: "Downloading...",
        description: "Preparing your file for download.",
      });

      const response = await fetch(recording.audio_url);
      if (!response.ok) throw new Error('Failed to fetch audio file');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = url;
      // Use recording title for filename, sanitize and add extension
      const sanitizedTitle = recording.title.replace(/[^a-zA-Z0-9-_\s]/g, '').trim() || 'recording';
      const extension = recording.audio_url.split('.').pop()?.split('?')[0] || 'mp3';
      link.download = `${sanitizedTitle}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Download Started",
        description: "Your recording is being downloaded.",
      });
    } catch (error) {
      console.error('Error downloading recording:', error);
      toast({
        title: "Download Failed",
        description: "Could not download the recording. Please try again.",
        variant: "destructive",
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

      // Create audio element to get duration - wait for full metadata load
      let duration: number | null = null;
      try {
        const audio = new Audio();
        const objectUrl = URL.createObjectURL(file);
        audio.src = objectUrl;
        
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            resolve(); // Still proceed even if timeout
          }, 10000); // 10 second timeout
          
          audio.onloadedmetadata = () => {
            clearTimeout(timeout);
            if (isFinite(audio.duration) && audio.duration > 0) {
              duration = Math.round(audio.duration);
            }
            resolve();
          };
          audio.onerror = () => {
            clearTimeout(timeout);
            resolve();
          };
        });
        
        URL.revokeObjectURL(objectUrl);
      } catch (e) {
        console.error('Error getting audio duration:', e);
      }

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
    <>
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
                      onClick={() => downloadRecording(recording)}
                      className="h-8 w-8"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => openPublishModal(recording)}
                      className="h-8 w-8"
                      title="Edit & Publish"
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
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>

    <PodcastPublishModal
      open={showPublishModal}
      onOpenChange={setShowPublishModal}
      recording={selectedRecording}
      onPublished={fetchRecordings}
    />
    </>
  );
};

export default PodcastRecordingsLibrary;
