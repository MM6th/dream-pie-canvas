import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Video, Square, Play, Upload, X, Camera, Save, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface VideoRecorderProps {
  onVideoRecorded: (data: VideoSegment[] | Blob, isDraft: boolean, attachment?: File) => void;
  onCancel: () => void;
  onClearDraft?: () => Promise<void>;
  onAutoSaveSegment?: (segment: Blob, index: number, duration: number, segmentId: string) => Promise<void>;
  onUpdateSegmentDurations?: (segments: Array<{ id: string; url: string; duration: number; order: number }>) => Promise<void>;
  onDeleteSegment?: (segmentId: string, segmentUrl: string) => Promise<void>;
  isUploading?: boolean;
  existingSegments?: Array<{ id: string; url: string; duration: number; order: number }>;
  existingAttachment?: { url: string; filename: string };
}

interface VideoSegment {
  id: string;
  blob?: Blob;      // Only for newly recorded segments
  url?: string;     // For segments loaded from cloud
  duration: number;
}

export const VideoRecorder = ({ onVideoRecorded, onCancel, onClearDraft, onAutoSaveSegment, onUpdateSegmentDurations, onDeleteSegment, isUploading = false, existingSegments = [] }: VideoRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasCamera, setHasCamera] = useState(false);
  const [segments, setSegments] = useState<VideoSegment[]>([]);
  const [playingSegmentId, setPlayingSegmentId] = useState<string | null>(null);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [isSavingSegment, setIsSavingSegment] = useState(false);
  const [estimatedSize, setEstimatedSize] = useState(0);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [isLoadingSegments, setIsLoadingSegments] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingTimeRef = useRef<number>(0);
  const segmentStartTimeRef = useRef<number>(0);

  useEffect(() => {
    // Load existing segments from URLs (streaming, no download)
    const loadExistingSegments = async () => {
      if (existingSegments.length > 0) {
        setIsLoadingSegments(true);
        toast.loading(`Loading ${existingSegments.length} saved segment${existingSegments.length !== 1 ? 's' : ''}...`, { id: 'load-segments' });
        
        const loadedSegments: VideoSegment[] = [];
        
        // Helper to get duration from video URL using metadata with robust timeout
        const getDurationFromUrl = (url: string): Promise<number> => {
          return new Promise((resolve) => {
            const video = document.createElement('video');
            video.preload = 'metadata';
            
            const timeout = setTimeout(() => {
              console.warn('⚠️ Timeout getting duration for:', url.slice(-30));
              video.remove();
              resolve(0); // Fallback to 0 rather than reject
            }, 15000); // 15 second timeout for network loading
            
            video.onloadedmetadata = () => {
              clearTimeout(timeout);
              const duration = video.duration;
              console.log('✓ Duration from URL:', url.slice(-30), '=', duration);
              video.remove();
              resolve(isFinite(duration) && duration > 0 ? duration : 0);
            };
            
            video.onerror = () => {
              clearTimeout(timeout);
              console.error('❌ Error loading video for duration:', url.slice(-30));
              video.remove();
              resolve(0); // Fallback to 0 on error
            };
            
            video.src = url;
            video.load(); // Explicitly trigger loading
          });
        };
        
        for (const seg of existingSegments) {
          try {
            // Get actual duration from video metadata
            const duration = await getDurationFromUrl(seg.url);
            loadedSegments.push({
              id: seg.id,
              url: seg.url,
              duration: duration,
            });
          } catch (error) {
            console.error("Failed to load segment metadata:", seg.id, error);
            // Use stored duration as fallback
            loadedSegments.push({
              id: seg.id,
              url: seg.url,
              duration: seg.duration || 0,
            });
          }
        }
        
        setSegments(loadedSegments);
        setIsLoadingSegments(false);
        
        if (loadedSegments.length > 0) {
          const totalDuration = loadedSegments.reduce((acc, seg) => acc + seg.duration, 0);
          console.log('📊 Total duration of all segments:', totalDuration);
          setRecordingTime(totalDuration);
          recordingTimeRef.current = totalDuration;
          setCurrentSegmentIndex(0);
          setIsPreviewing(true);
          
          // Check if any durations were successfully fetched and differ from stored values
          // This backfills durations that were stored as 0
          const needsUpdate = loadedSegments.some((seg, idx) => {
            const storedDuration = existingSegments[idx]?.duration || 0;
            return seg.duration > 0 && seg.duration !== storedDuration;
          });
          
          if (needsUpdate && onUpdateSegmentDurations) {
            console.log('🔄 Updating segment durations in database...');
            const segmentsToUpdate = loadedSegments.map((seg, idx) => ({
              id: existingSegments[idx].id,
              url: seg.url!,
              duration: seg.duration,
              order: existingSegments[idx].order,
            }));
            onUpdateSegmentDurations(segmentsToUpdate).catch(err => {
              console.error('Failed to update segment durations:', err);
            });
          }
          
          // Load first segment into player ready to play (but don't auto-play)
          setTimeout(() => {
            if (videoRef.current && loadedSegments[0]) {
              const firstSegment = loadedSegments[0];
              videoRef.current.srcObject = null;
              if (firstSegment.url) {
                videoRef.current.src = firstSegment.url;
              } else if (firstSegment.blob) {
                videoRef.current.src = URL.createObjectURL(firstSegment.blob);
              }
              videoRef.current.muted = false;
              videoRef.current.load();
              // Don't auto-play, let user click play when ready
              setPlayingSegmentId(firstSegment.id);
            }
          }, 100);
          
          toast.success(`${loadedSegments.length} segment${loadedSegments.length !== 1 ? 's' : ''} ready to play`, { id: 'load-segments' });
        }
      }
    };
    
    loadExistingSegments();
    
    return () => {
      stopCamera();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [existingSegments]);

  const startCamera = async () => {
    try {
      console.log("=== CAMERA ACCESS ATTEMPT ===");
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera not supported on this browser");
      }

      if ('permissions' in navigator) {
        try {
          const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
          const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          console.log("Camera permission state:", cameraPermission.state);
          console.log("Microphone permission state:", micPermission.state);
        } catch (e) {
          console.log("Permission API not fully supported, proceeding with getUserMedia");
        }
      }

      let stream;
      try {
        console.log("Requesting camera with ideal constraints...");
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: true,
        });
      } catch (e) {
        console.log("Trying basic camera constraints...", e);
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
      }

      console.log("Camera access successful!", stream.getTracks().map(t => t.kind));
      streamRef.current = stream;
      setHasCamera(true);

      if (videoRef.current) {
        videoRef.current.src = '';
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        try {
          await videoRef.current.play();
        } catch (e) {
          console.log('Camera auto-play prevented by browser:', e);
        }
      }
    } catch (error: any) {
      console.error("=== CAMERA ACCESS FAILED ===");
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Full error:", error);
      
      let errorMessage = "";
      if (error.name === "NotAllowedError") {
        errorMessage = "Camera blocked. Try: 1) Tap the lock/info icon in address bar 2) Reset camera permission 3) Reload page 4) Click camera button again";
      } else if (error.name === "NotFoundError") {
        errorMessage = "No camera detected on this device";
      } else if (error.name === "NotReadableError") {
        errorMessage = "Camera is in use by another app. Close other apps using the camera and try again";
      } else if (error.name === "OverconstrainedError") {
        errorMessage = "Camera doesn't support the requested settings. Try a different device";
      } else {
        errorMessage = `Camera error (${error.name}): ${error.message}`;
      }
      
      toast.error(errorMessage, { duration: 8000 });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setHasCamera(false);
  };

  const startRecording = () => {
    if (!streamRef.current) return;

    try {
      setRecordingError(null);
      chunksRef.current = [];
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: "video/webm",
      });

      let accumulatedSize = 0;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          accumulatedSize += event.data.size;
          setEstimatedSize(accumulatedSize);
          
          // Warn if approaching 100MB
          if (accumulatedSize > 100 * 1024 * 1024 && accumulatedSize < 105 * 1024 * 1024) {
            toast.warning("Recording is over 100MB. Consider stopping soon to avoid memory issues.", {
              duration: 5000,
            });
          }
        }
      };

      mediaRecorder.onerror = (event: any) => {
        console.error('MediaRecorder error:', event);
        setRecordingError('Recording failed. Please try again.');
        toast.error("Recording error occurred. Your previous segments are safe.", {
          duration: 5000,
        });
        setIsRecording(false);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const segmentDuration = recordingTimeRef.current - segmentStartTimeRef.current;
        console.log(`✓ Segment ${segments.length + 1} duration tracked: ${segmentDuration.toFixed(2)}s`);
        
        const segmentId = Date.now().toString();
        
        const newSegment: VideoSegment = {
          id: segmentId,
          blob: blob,
          duration: segmentDuration,
        };
        
        setEstimatedSize(0);
        
        // Auto-save segment immediately with duration
        if (onAutoSaveSegment) {
          setIsSavingSegment(true);
          try {
            const segmentIndex = segments.length;
            await onAutoSaveSegment(blob, segmentIndex, segmentDuration, segmentId);
            const updatedSegments = [...segments, newSegment];
            setSegments(updatedSegments);
            setIsPreviewing(true);
            playSegmentByIndex(updatedSegments.length - 1, updatedSegments);
            toast.success(`Segment ${segmentIndex + 1} saved to cloud storage`, {
              duration: 3000,
            });
          } catch (error) {
            console.error('Error auto-saving segment:', error);
            toast.error("Auto-save failed. Segment will be saved when you submit. Please save draft manually.", {
              duration: 5000,
            });
            // Still add to local state so user can manually save
            const updatedSegments = [...segments, newSegment];
            setSegments(updatedSegments);
            setIsPreviewing(true);
            playSegmentByIndex(updatedSegments.length - 1, updatedSegments);
          } finally {
            setIsSavingSegment(false);
          }
        } else {
          // Fallback if no auto-save handler
          const updatedSegments = [...segments, newSegment];
          setSegments(updatedSegments);
          setIsPreviewing(true);
          playSegmentByIndex(updatedSegments.length - 1, updatedSegments);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Collect data every second for size estimation
      setIsRecording(true);
      // Record when this segment started (for calculating segment duration)
      segmentStartTimeRef.current = recordingTimeRef.current;

      timerRef.current = setInterval(() => {
        recordingTimeRef.current += 1;
        setRecordingTime(recordingTimeRef.current);
      }, 1000);
    } catch (error: any) {
      console.error('Error starting recording:', error);
      setRecordingError('Failed to start recording');
      toast.error("Could not start recording. Please check camera permissions.", {
        duration: 5000,
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      stopCamera();
    }
  };

  const playSegmentByIndex = (index: number, segmentList = segments) => {
    if (index < 0 || index >= segmentList.length) return;
    
    const segment = segmentList[index];
    setCurrentSegmentIndex(index);
    setPlayingSegmentId(segment.id);
    
    if (videoRef.current) {
      try {
        videoRef.current.srcObject = null;
        
        // If segment has URL (from cloud), stream it directly
        if (segment.url) {
          videoRef.current.src = segment.url;
        } else if (segment.blob) {
          // If segment has blob (newly recorded), use object URL
          const url = URL.createObjectURL(segment.blob);
          videoRef.current.src = url;
        }
        
        videoRef.current.muted = false;
        videoRef.current.load();
        videoRef.current.play().catch((err) => {
          console.error("Error playing segment:", err);
          toast.error("Could not play this segment");
        });
      } catch (error) {
        console.error("Error setting up video playback:", error);
        toast.error("Error loading video segment");
      }
    }
  };

  const handleVideoEnded = () => {
    // Auto-play next segment if available
    if (currentSegmentIndex < segments.length - 1) {
      playSegmentByIndex(currentSegmentIndex + 1);
    }
  };

  const deleteSegment = async (segmentId: string) => {
    const segmentToDelete = segments.find(s => s.id === segmentId);
    
    // Call parent handler to delete from database and storage
    if (segmentToDelete?.url && onDeleteSegment) {
      try {
        await onDeleteSegment(segmentId, segmentToDelete.url);
      } catch (error) {
        console.error('Failed to delete segment from database:', error);
        toast.error('Failed to delete segment');
        return; // Don't update local state if database delete failed
      }
    }
    
    const newSegments = segments.filter(s => s.id !== segmentId);
    setSegments(newSegments);
    
    // Recalculate total time from remaining segments
    const totalDuration = newSegments.reduce((acc, seg) => acc + seg.duration, 0);
    setRecordingTime(totalDuration);
    recordingTimeRef.current = totalDuration;
    
    if (newSegments.length === 0) {
      setRecordedBlob(null);
      setIsPreviewing(false);
      setCurrentSegmentIndex(0);
    } else {
      // If we were previewing the deleted segment, stop preview
      if (isPreviewing && currentSegmentIndex !== null) {
        const deletedIndex = segments.findIndex(s => s.id === segmentId);
        if (deletedIndex === currentSegmentIndex) {
          setIsPreviewing(false);
          setCurrentSegmentIndex(null);
          if (videoRef.current) {
            videoRef.current.srcObject = streamRef.current;
          }
        } else {
          // Play first segment after deletion
          playSegmentByIndex(0, newSegments);
        }
      } else {
        // Play first segment after deletion
        playSegmentByIndex(0, newSegments);
      }
    }
  };

  const handleRetake = async () => {
    // Clear draft from database if exists
    if (onClearDraft) {
      await onClearDraft();
    }
    
    setRecordedBlob(null);
    setIsPreviewing(false);
    setRecordingTime(0);
    recordingTimeRef.current = 0;
    setSegments([]);
    setPlayingSegmentId(null);
    setCurrentSegmentIndex(0);
    startCamera();
  };

  const handleAddSegment = async () => {
    setIsPreviewing(false);
    
    // Clear the video element properly before starting camera
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = '';
      videoRef.current.srcObject = null;
      videoRef.current.load();
    }
    
    await startCamera();
  };

  const handleSubmit = async (isDraft: boolean) => {
    if (segments.length === 0) return;
    
    // Pass all segments and optional attachment to parent
    onVideoRecorded(segments, isDraft, attachmentFile || undefined);
  };

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type (images only)
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      setAttachmentFile(file);
      toast.success('Attachment added');
    }
  };

  const handleRemoveAttachment = () => {
    setAttachmentFile(null);
    toast.success('Attachment removed');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getTotalDuration = () => {
    return segments.reduce((acc, seg) => acc + seg.duration, 0);
  };

  const playSegment = (segment: VideoSegment) => {
    const index = segments.findIndex(s => s.id === segment.id);
    if (index !== -1) {
      playSegmentByIndex(index);
    }
  };

  return (
    <Card className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base sm:text-lg font-semibold">Record Astrology Reading</h3>
          {segments.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {segments.length} segment{segments.length !== 1 ? 's' : ''} · {formatTime(getTotalDuration())} total
              {onAutoSaveSegment && <span className="ml-2 text-green-600 dark:text-green-400">• Auto-saved to cloud</span>}
            </p>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {isLoadingSegments && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
          <span className="text-sm text-blue-700 dark:text-blue-300">Loading saved segments from cloud...</span>
        </div>
      )}

      {isSavingSegment && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
          <span className="text-sm text-blue-700 dark:text-blue-300">Saving segment to cloud storage...</span>
        </div>
      )}

      {recordingError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <span className="text-sm text-red-700 dark:text-red-300">{recordingError}</span>
        </div>
      )}

      {segments.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Recorded Segments:</p>
          <div className="space-y-2">
            {segments.map((segment, index) => (
              <div 
                key={segment.id} 
                className={`flex items-center justify-between p-2 rounded-lg ${
                  playingSegmentId === segment.id ? 'bg-primary/20 border border-primary' : 'bg-muted'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Segment {index + 1}</Badge>
                  <span className="text-sm text-muted-foreground">{formatTime(segment.duration)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => playSegment(segment)}
                    title="Play segment"
                  >
                    <Play className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteSegment(segment.id)}
                    title="Delete segment"
                    disabled={isSavingSegment}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
            <video
              ref={videoRef}
              playsInline
              autoPlay={hasCamera && isRecording}
              muted={isRecording}
              controls={!isRecording}
              onEnded={handleVideoEnded}
              className="w-full h-full object-contain"
            />
        
        {isRecording && (
          <div className="absolute top-4 left-4 space-y-2">
            <div className="flex items-center gap-2 bg-red-500 text-white px-3 py-1.5 rounded-full">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
              <span className="font-mono text-sm sm:text-base font-semibold">{formatTime(recordingTime)}</span>
            </div>
            {estimatedSize > 0 && (
              <div className="bg-black/70 text-white px-3 py-1 rounded-full text-xs">
                ~{(estimatedSize / (1024 * 1024)).toFixed(1)}MB
              </div>
            )}
          </div>
        )}

        {!hasCamera && !isPreviewing && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/80">
            <div className="text-center space-y-4 p-4">
              <Camera className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-muted-foreground" />
              <p className="text-sm sm:text-base text-muted-foreground">Camera preview will appear here</p>
            </div>
          </div>
        )}
      </div>

      {/* Photo Attachment Section - Only show when at least one segment exists */}
      {segments.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Attach Photo Document (Optional)
          </label>
          <p className="text-xs text-muted-foreground">
            Add a clarification document for the client
          </p>
          {attachmentFile ? (
            <div className="flex items-center gap-2 p-3 bg-secondary rounded-lg">
              <div className="flex-1">
                <p className="text-sm font-medium">{attachmentFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(attachmentFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                onClick={handleRemoveAttachment}
                variant="ghost"
                size="sm"
              >
                Remove
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="file"
                id="attachment-upload"
                accept="image/*"
                onChange={handleAttachmentChange}
                className="hidden"
              />
              <Button
                onClick={() => document.getElementById('attachment-upload')?.click()}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <Upload className="w-4 h-4 mr-2" />
                Choose File
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {!hasCamera && !isPreviewing && (
          <Button onClick={startCamera} size="lg" className="w-full">
            <Camera className="w-4 h-4 mr-2" />
            Start Camera
          </Button>
        )}

        {hasCamera && !isRecording && !isPreviewing && (
          <>
            <Button onClick={startRecording} size="lg" variant="destructive" className="w-full" disabled={isSavingSegment}>
              <Video className="w-4 h-4 mr-2" />
              {segments.length > 0 ? "Record Next Segment" : "Start Recording"}
            </Button>
            {segments.length > 0 && (
              <Button onClick={() => { playSegmentByIndex(0); setIsPreviewing(true); }} size="lg" className="w-full">
                Preview All Segments
              </Button>
            )}
            <Button onClick={onCancel} variant="outline" size="lg" className="w-full">
              Cancel
            </Button>
          </>
        )}

        {isRecording && (
          <Button onClick={stopRecording} size="lg" variant="destructive" className="w-full">
            <Square className="w-4 h-4 mr-2" />
            Stop Recording
          </Button>
        )}

        {isPreviewing && (
          <>
            {segments.length > 1 && (
              <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
                <Button
                  onClick={() => playSegmentByIndex(currentSegmentIndex - 1)}
                  disabled={currentSegmentIndex === 0}
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  Segment {currentSegmentIndex + 1} of {segments.length}
                </span>
                <Button
                  onClick={() => playSegmentByIndex(currentSegmentIndex + 1)}
                  disabled={currentSegmentIndex === segments.length - 1}
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  Next
                </Button>
              </div>
            )}
            <Button onClick={handleAddSegment} variant="outline" size="lg" className="w-full">
              <Video className="w-4 h-4 mr-2" />
              Add Segment
            </Button>
            <Button onClick={handleRetake} variant="outline" size="lg" className="w-full">
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All
            </Button>
            <Button onClick={() => handleSubmit(true)} variant="secondary" size="lg" disabled={isUploading} className="w-full">
              <Save className="w-4 h-4 mr-2" />
              {isUploading ? "Saving..." : "Save Draft"}
            </Button>
            <Button onClick={() => handleSubmit(false)} size="lg" disabled={isUploading} className="w-full">
              <Upload className="w-4 h-4 mr-2" />
              {isUploading ? "Uploading..." : "Submit to Buyer"}
            </Button>
          </>
        )}
      </div>

      {isPreviewing && (
        <p className="text-xs sm:text-sm text-center text-muted-foreground px-2">
          Save as draft to review later, or submit directly to the buyer.
        </p>
      )}
    </Card>
  );
};