import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { 
  Play, 
  Pause, 
  Trash2, 
  Edit2, 
  Library,
  Clock,
  Calendar,
  Upload,
  Download,
  CheckCircle,
  X,
  Loader2,
  HardDrive
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

type UploadPhase = 'select' | 'uploading' | 'editing';

export const PodcastRecordingsLibrary = ({ refreshTrigger }: PodcastRecordingsLibraryProps) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loadingRecordings, setLoadingRecordings] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Upload phase management
  const [uploadPhase, setUploadPhase] = useState<UploadPhase>('select');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null);
  const [uploadedFileDuration, setUploadedFileDuration] = useState<number | null>(null);
  const [uploadedFileSize, setUploadedFileSize] = useState<number | null>(null);
  
  // Metadata for saving
  const [recordingTitle, setRecordingTitle] = useState('');
  const [recordingDescription, setRecordingDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const audioRefs = React.useRef<Map<string, HTMLAudioElement>>(new Map());

  const fetchRecordings = async () => {
    if (!user) {
      setRecordings([]);
      setLoadingRecordings(false);
      return;
    }

    setLoadingRecordings(true);
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
      setLoadingRecordings(false);
    }
  };

  useEffect(() => {
    fetchRecordings();
  }, [user, refreshTrigger]);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const resetUploadState = () => {
    setSelectedFile(null);
    setUploadPhase('select');
    setUploadProgress(0);
    setUploadedFileUrl(null);
    setUploadedFilePath(null);
    setUploadedFileDuration(null);
    setUploadedFileSize(null);
    setRecordingTitle('');
    setRecordingDescription('');
    setIsSaving(false);
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

  const sanitizeFilename = (name: string) =>
    name.replace(/[^a-zA-Z0-9-_\s]/g, "").trim() || "recording";

  const getAudioExtensionFromContentType = (contentType: string) => {
    const ct = contentType.toLowerCase();
    if (ct.includes("wav")) return "wav";
    if (ct.includes("mpeg") || ct.includes("mp3")) return "mp3";
    if (ct.includes("m4a") || ct.includes("mp4")) return "m4a";
    if (ct.includes("ogg")) return "ogg";
    if (ct.includes("webm")) return "webm";
    return "audio";
  };

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 150);
  };

  const audioBufferToWavBlob = (audioBuffer: AudioBuffer) => {
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const numFrames = audioBuffer.length;

    const bytesPerSample = 2; // 16-bit PCM
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = numFrames * blockAlign;

    const arrayBuffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(arrayBuffer);

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    // RIFF header
    writeString(0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, "WAVE");

    // fmt chunk
    writeString(12, "fmt ");
    view.setUint32(16, 16, true); // PCM
    view.setUint16(20, 1, true); // Audio format 1 = PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true); // bits per sample

    // data chunk
    writeString(36, "data");
    view.setUint32(40, dataSize, true);

    // Interleave channels
    const channels = Array.from({ length: numChannels }, (_, ch) =>
      audioBuffer.getChannelData(ch)
    );

    let offset = 44;
    for (let i = 0; i < numFrames; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        const sample = Math.max(-1, Math.min(1, channels[ch][i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
        offset += 2;
      }
    }

    return new Blob([arrayBuffer], { type: "audio/wav" });
  };

  const convertWebmToWav = async (webmBlob: Blob) => {
    const arrayBuffer = await webmBlob.arrayBuffer();
    const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextCtor) {
      throw new Error("Audio conversion not supported in this browser");
    }

    const audioCtx = new AudioContextCtor();
    try {
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
      return audioBufferToWavBlob(audioBuffer);
    } finally {
      try {
        await audioCtx.close();
      } catch {
        // ignore
      }
    }
  };

  const downloadRecording = async (recording: Recording) => {
    setDownloadingId(recording.id);

    const sanitizedTitle = sanitizeFilename(recording.title);

    try {
      toast({
        title: "Preparing download...",
        description: "Fetching your audio file.",
      });

      const response = await fetch(recording.audio_url);
      if (!response.ok) throw new Error("Failed to fetch audio file");

      const contentType = response.headers.get("content-type") || "";
      const originalBlob = await response.blob();

      const isWebm =
        contentType.toLowerCase().includes("webm") ||
        recording.audio_url.toLowerCase().includes(".webm");

      if (isWebm) {
        toast({
          title: "Converting to WAV...",
          description: "This may take a moment for longer recordings.",
        });

        try {
          const wavBlob = await convertWebmToWav(originalBlob);
          const filename = `${sanitizedTitle}.wav`;
          triggerDownload(wavBlob, filename);

          toast({
            title: "Download Started",
            description: `Downloading "${filename}"`,
          });
          return;
        } catch (conversionError) {
          console.error("Error converting webm to wav:", conversionError);
          toast({
            title: "WAV Conversion Failed",
            description: "Downloading the original WEBM instead.",
            variant: "destructive",
          });
        }
      }

      // Fallback: download original format
      const extension = getAudioExtensionFromContentType(contentType) || "audio";
      const filename = `${sanitizedTitle}.${extension}`;
      triggerDownload(originalBlob, filename);

      toast({
        title: "Download Started",
        description: `Downloading "${filename}"`,
      });
    } catch (error) {
      console.error("Error downloading recording:", error);
      toast({
        title: "Download Failed",
        description: "Could not download the recording. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
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

  if (loadingRecordings) {
    return (
      <Card className="bg-card/50 border-border backdrop-blur-sm">
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Loading recordings...</p>
        </CardContent>
      </Card>
    );
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    const allowedExts = new Set(["mp3", "wav", "m4a", "aac", "ogg", "webm"]);
    const isAudioMime = (file.type || "").toLowerCase().startsWith("audio/");
    const isAllowedExt = !!ext && allowedExts.has(ext);

    if (!isAudioMime && !isAllowedExt) {
      toast({
        title: "Unsupported file",
        description: "Please select an audio file (MP3, WAV, M4A, AAC, OGG, WEBM).",
        variant: "destructive",
      });
      e.target.value = '';
      setSelectedFile(null);
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select a file smaller than 100MB.",
        variant: "destructive",
      });
      e.target.value = '';
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    // Pre-fill title with filename (without extension)
    const titleFromFile = file.name.replace(/\.[^/.]+$/, '');
    setRecordingTitle(titleFromFile);
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile || !user) {
      toast({
        title: "Error",
        description: "Please select a file to upload.",
        variant: "destructive",
      });
      return;
    }

    setUploadPhase('uploading');
    setUploadProgress(0);

    try {
      const ext = selectedFile.name.split('.').pop()?.toLowerCase();
      const allowedExts = new Set(["mp3", "wav", "m4a", "aac", "ogg", "webm"]);
      const isAllowedExt = !!ext && allowedExts.has(ext);
      
      const timestamp = Date.now();
      const fileExt = isAllowedExt ? ext : "audio";
      const fileName = `podcast-recordings/${user.id}/${timestamp}-uploaded.${fileExt}`;

      // Simulate progress since Supabase SDK doesn't support progress events
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 15;
        });
      }, 200);

      const { error: uploadError } = await supabase.storage
        .from('audio-files')
        .upload(fileName, selectedFile, {
          contentType: selectedFile.type || 'application/octet-stream',
          upsert: false,
        });

      clearInterval(progressInterval);

      if (uploadError) throw uploadError;

      // Complete progress
      setUploadProgress(100);

      const { data: { publicUrl } } = supabase.storage
        .from('audio-files')
        .getPublicUrl(fileName);

      // Get audio duration
      let duration: number | null = null;
      try {
        const audio = new Audio();
        const objectUrl = URL.createObjectURL(selectedFile);
        audio.src = objectUrl;

        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => resolve(), 10000);
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
      } catch (err) {
        console.error('Error getting audio duration:', err);
      }

      // Store upload info for the editing phase
      setUploadedFileUrl(publicUrl);
      setUploadedFilePath(fileName);
      setUploadedFileDuration(duration);
      setUploadedFileSize(selectedFile.size);

      // Show success toast
      toast({
        title: "Upload Complete",
        description: "Your audio file has been uploaded successfully.",
      });

      // Move to editing phase (don't close dialog)
      setUploadPhase('editing');

    } catch (error: any) {
      console.error('Error uploading recording:', error);
      const message = error?.message || "Could not upload your recording. Please try again.";
      toast({
        title: "Upload Failed",
        description: message,
        variant: "destructive",
      });
      setUploadPhase('select');
      setUploadProgress(0);
    }
  };

  const handleSaveRecording = async () => {
    if (!uploadedFileUrl || !user) return;

    try {
      setIsSaving(true);

      const { error } = await supabase
        .from('podcast_recordings')
        .insert({
          merchant_id: user.id,
          title: recordingTitle.trim() || 'Untitled Recording',
          description: recordingDescription.trim() || null,
          audio_url: uploadedFileUrl,
          duration_seconds: uploadedFileDuration,
          file_size_bytes: uploadedFileSize,
          status: 'draft',
        });

      if (error) throw error;

      toast({
        title: "Saved",
        description: "Recording saved to your library.",
      });

      resetUploadState();
      setUploadDialogOpen(false);
      await fetchRecordings();

    } catch (error: any) {
      console.error('Save error:', error);
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save recording",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = async () => {
    // Delete the uploaded file from storage if it exists
    if (uploadedFilePath) {
      try {
        await supabase.storage
          .from('audio-files')
          .remove([uploadedFilePath]);
      } catch (e) {
        console.error('Error deleting uploaded file:', e);
      }
    }

    resetUploadState();
    setUploadDialogOpen(false);
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      // If we're in the editing phase, confirm before closing
      if (uploadPhase === 'editing') {
        handleDiscard();
      } else if (uploadPhase !== 'uploading') {
        resetUploadState();
        setUploadDialogOpen(false);
      }
    } else {
      setUploadDialogOpen(true);
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
            <Dialog 
              open={uploadDialogOpen} 
              onOpenChange={handleDialogClose}
            >
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!user}
                >
                  <Upload className="w-4 h-4 mr-1" />
                  Upload Audio
                </Button>
              </DialogTrigger>
              <DialogContent 
                className="max-w-md bg-card text-foreground"
                onInteractOutside={(e) => {
                  // Prevent closing when uploading or file input is triggered
                  if (uploadPhase === 'uploading') {
                    e.preventDefault();
                    return;
                  }
                  const target = e.target as HTMLElement;
                  if (target.tagName === 'INPUT' && target.getAttribute('type') === 'file') {
                    e.preventDefault();
                  }
                }}
              >
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    {uploadPhase === 'select' && 'Upload Audio File'}
                    {uploadPhase === 'uploading' && 'Uploading...'}
                    {uploadPhase === 'editing' && 'Save Recording'}
                  </DialogTitle>
                  <DialogDescription>
                    {uploadPhase === 'select' && 'Select an audio file to upload to your recordings library.'}
                    {uploadPhase === 'uploading' && 'Please wait while your file is being uploaded.'}
                    {uploadPhase === 'editing' && 'Add a title and description for your recording.'}
                  </DialogDescription>
                </DialogHeader>
                
                {/* Phase 1: File Selection */}
                {uploadPhase === 'select' && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="podcastAudioFile">Audio File *</Label>
                      <Input
                        id="podcastAudioFile"
                        type="file"
                        accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/m4a,audio/mp4,audio/aac,audio/ogg,audio/webm,audio/*"
                        onChange={handleFileSelect}
                        className="bg-background border-border cursor-pointer"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Supported formats: MP3, WAV, M4A, AAC, OGG, WEBM. Max size: 100MB
                      </p>
                    </div>

                    {selectedFile && (
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm font-medium text-foreground truncate">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(selectedFile.size)}
                        </p>
                      </div>
                    )}

                    <DialogFooter className="gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleDialogClose(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        onClick={handleUploadSubmit}
                        disabled={!selectedFile}
                        className="gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        Upload
                      </Button>
                    </DialogFooter>
                  </div>
                )}

                {/* Phase 2: Uploading with Progress */}
                {uploadPhase === 'uploading' && (
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Progress value={uploadProgress} className="h-3" />
                      <p className="text-sm text-center text-muted-foreground">
                        Uploading... {Math.round(uploadProgress)}%
                      </p>
                    </div>
                    {selectedFile && (
                      <p className="text-xs text-center text-muted-foreground truncate">
                        {selectedFile.name}
                      </p>
                    )}
                  </div>
                )}

                {/* Phase 3: Editing Metadata */}
                {uploadPhase === 'editing' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                      <p className="text-sm text-green-400">Upload complete!</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="recording-title">Title</Label>
                      <Input
                        id="recording-title"
                        value={recordingTitle}
                        onChange={(e) => setRecordingTitle(e.target.value)}
                        placeholder="Enter recording title"
                        className="bg-background border-border"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="recording-description">Description (optional)</Label>
                      <Textarea
                        id="recording-description"
                        value={recordingDescription}
                        onChange={(e) => setRecordingDescription(e.target.value)}
                        placeholder="Add a description for this recording"
                        rows={3}
                        className="bg-background border-border"
                      />
                    </div>

                    <div className="text-xs text-muted-foreground space-y-1">
                      {uploadedFileDuration && (
                        <p className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Duration: {formatDuration(uploadedFileDuration)}
                        </p>
                      )}
                      {uploadedFileSize && (
                        <p className="flex items-center gap-1">
                          <HardDrive className="h-3 w-3" />
                          Size: {formatFileSize(uploadedFileSize)}
                        </p>
                      )}
                    </div>

                    <DialogFooter className="gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleDiscard}
                        disabled={isSaving}
                        className="gap-2"
                      >
                        <X className="h-4 w-4" />
                        Discard
                      </Button>
                      <Button
                        type="button"
                        onClick={handleSaveRecording}
                        disabled={isSaving}
                        className="gap-2"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          'Save'
                        )}
                      </Button>
                    </DialogFooter>
                  </div>
                )}
              </DialogContent>
            </Dialog>
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
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={() => downloadRecording(recording)}
                      className="h-8 w-8"
                      title="Download WAV"
                      aria-label="Download recording as WAV"
                      disabled={downloadingId === recording.id}
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
