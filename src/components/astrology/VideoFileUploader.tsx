import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload, X, Save, Send, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import * as tus from "tus-js-client";

interface VideoFileUploaderProps {
  deliveryId: string;
  onDraftSave: (blob: Blob) => Promise<void>;
  onSubmit: (blob: Blob) => Promise<void>;
  onCancel: () => void;
  isUploading: boolean;
}

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ACCEPTED_FORMATS = {
  'video/mp4': ['.mp4'],
  'video/webm': ['.webm'],
  'video/quicktime': ['.mov'],
  'video/x-msvideo': ['.avi']
};

export const VideoFileUploader = ({
  deliveryId,
  onDraftSave,
  onSubmit,
  onCancel,
  isUploading
}: VideoFileUploaderProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [bytesUploaded, setBytesUploaded] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const startTimeRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const checkAdminStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();
        setIsAdmin(profile?.is_admin || false);
      }
    };
    checkAdminStatus();

    // Warn user before closing/navigating during upload
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (uploading) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [uploading]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!Object.keys(ACCEPTED_FORMATS).includes(file.type)) {
      toast.error("Please select a valid video file (MP4, WebM, MOV, or AVI)");
      return;
    }

    // For non-admins, validate file size and check storage quota
    if (!isAdmin) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to upload videos");
        return;
      }

      const { data: canUpload } = await supabase.rpc('can_user_upload', {
        user_uuid: user.id,
        new_file_size: file.size
      });

      if (!canUpload) {
        toast.error("Storage quota exceeded. Please delete some files to free up space.");
        return;
      }
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const uploadWithProgress = async (file: File, isDraft: boolean) => {
    setUploading(true);
    setUploadProgress(0);
    setBytesUploaded(0);
    setUploadSpeed(0);
    setTimeElapsed(0);
    startTimeRef.current = Date.now();

    // Start timer
    intervalRef.current = setInterval(() => {
      setTimeElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("User not authenticated");

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      const fileName = isDraft 
        ? `draft-${deliveryId}-${Date.now()}.${file.name.split('.').pop()}`
        : `${deliveryId}-${Date.now()}.${file.name.split('.').pop()}`;
      
      const filePath = isDraft
        ? `astrology-deliveries/drafts/${fileName}`
        : `astrology-deliveries/${fileName}`;

      toast.loading(isDraft ? "Uploading draft..." : "Uploading video...", { id: "upload" });

      const projectId = "veaupehwfsbagzfuvach";
      const bucketName = "user-media";
      
      // Use TUS for resumable upload with progress tracking
      await new Promise<void>((resolve, reject) => {
        const upload = new tus.Upload(file, {
          endpoint: `https://${projectId}.supabase.co/storage/v1/upload/resumable`,
          retryDelays: [0, 3000, 5000, 10000, 20000],
          headers: {
            authorization: `Bearer ${session.access_token}`,
            'x-upsert': 'false',
          },
          uploadDataDuringCreation: true,
          removeFingerprintOnSuccess: true,
          metadata: {
            bucketName: bucketName,
            objectName: filePath,
            contentType: file.type,
            cacheControl: '3600',
          },
          chunkSize: 6 * 1024 * 1024, // 6MB chunks
          onError: (error) => {
            console.error('TUS upload error:', error);
            reject(error);
          },
          onProgress: (bytesUploaded, bytesTotal) => {
            const progress = Math.round((bytesUploaded / bytesTotal) * 100);
            setUploadProgress(progress);
            setBytesUploaded(bytesUploaded);
            
            const elapsed = (Date.now() - startTimeRef.current) / 1000;
            const speed = bytesUploaded / elapsed;
            setUploadSpeed(speed);
            
            const remaining = (bytesTotal - bytesUploaded) / speed;
            setEstimatedTimeRemaining(Math.round(remaining));
          },
          onSuccess: () => {
            console.log('Upload completed successfully');
            resolve();
          },
        });

        // Store upload instance for cancellation
        abortControllerRef.current = { abort: () => upload.abort() } as any;

        // Start the upload
        upload.findPreviousUploads().then((previousUploads) => {
          if (previousUploads.length) {
            upload.resumeFromPreviousUpload(previousUploads[0]);
          }
          upload.start();
        });
      });

      const { data: { publicUrl } } = supabase.storage
        .from("user-media")
        .getPublicUrl(filePath);

      // Update database
      const updateData = isDraft
        ? {
            draft_video_url: publicUrl,
            draft_saved_at: new Date().toISOString(),
          }
        : {
            admin_video_url: publicUrl,
            status: "delivered",
            delivered_at: new Date().toISOString(),
            draft_video_url: null,
          };

      const { error: updateError } = await supabase
        .from("astrology_deliveries")
        .update(updateData)
        .eq("id", deliveryId);

      if (updateError) throw updateError;

      toast.success(isDraft ? "Draft saved successfully!" : "Video delivered successfully!", { id: "upload" });

      // Cleanup
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setSelectedFile(null);
      setPreviewUrl(null);
      resetUploadState();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Upload failed", { id: "upload" });
    } finally {
      setUploading(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  };

  const resetUploadState = () => {
    setUploadProgress(0);
    setBytesUploaded(0);
    setUploadSpeed(0);
    setTimeElapsed(0);
    setEstimatedTimeRemaining(0);
  };

  const handleCancelUpload = () => {
    if (uploading && abortControllerRef.current) {
      abortControllerRef.current.abort();
      toast.info("Upload cancelled");
    }
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    resetUploadState();
    setUploading(false);
    onCancel();
  };

  const handleDraftSave = async () => {
    if (!selectedFile) return;
    await uploadWithProgress(selectedFile, true);
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;
    await uploadWithProgress(selectedFile, false);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSecond: number) => {
    if (bytesPerSecond === 0) return '0 KB/s';
    const k = 1024;
    const speeds = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
    return Math.round(bytesPerSecond / Math.pow(k, i) * 100) / 100 + ' ' + speeds[i];
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (minutes < 60) return `${minutes}m ${secs}s`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (!selectedFile) {
    return (
      <div className="flex flex-col items-center gap-4 p-6 border-2 border-dashed rounded-lg border-border/50 hover:border-primary/50 transition-colors">
        <input
          ref={fileInputRef}
          type="file"
          accept={Object.values(ACCEPTED_FORMATS).flat().join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />
        <Upload className="h-12 w-12 text-muted-foreground" />
        <div className="text-center">
          <p className="text-sm font-medium mb-1">Upload a video from your device</p>
          <p className="text-xs text-muted-foreground">
            MP4, WebM, MOV, or AVI {isAdmin ? '(unlimited size)' : '(max 100MB)'}
          </p>
        </div>
        <Button
          onClick={() => fileInputRef.current?.click()}
          variant="outline"
          disabled={isUploading}
        >
          <Upload className="h-4 w-4 mr-2" />
          Select Video File
        </Button>
      </div>
    );
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-sm">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancelUpload}
            disabled={isUploading}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {previewUrl && (
          <video
            src={previewUrl}
            controls
            className="w-full rounded-md bg-black"
            style={{ maxHeight: '300px' }}
          />
        )}

        {uploading && (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Important:</strong> Keep this page open until upload completes. Closing or navigating away will cancel the upload.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </span>
                <span className="font-medium">{uploadProgress}%</span>
              </div>
              
              <Progress value={uploadProgress} className="h-2" />
              
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>
                  <span className="font-medium">Speed:</span> {formatSpeed(uploadSpeed)}
                </div>
                <div>
                  <span className="font-medium">Elapsed:</span> {formatTime(timeElapsed)}
                </div>
                <div>
                  <span className="font-medium">Uploaded:</span> {formatFileSize(bytesUploaded)} / {formatFileSize(selectedFile.size)}
                </div>
                <div>
                  <span className="font-medium">Remaining:</span> {estimatedTimeRemaining > 0 ? formatTime(estimatedTimeRemaining) : 'Calculating...'}
                </div>
              </div>

              <Button
                onClick={handleCancelUpload}
                variant="destructive"
                size="sm"
                className="w-full"
              >
                Cancel Upload
              </Button>
            </div>
          </div>
        )}

        {!uploading && (
          <div className="flex gap-2">
            <Button
              onClick={handleDraftSave}
              variant="outline"
              className="flex-1"
              disabled={uploading}
            >
              <Save className="h-4 w-4 mr-2" />
              Save as Draft
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1"
              disabled={uploading}
            >
              <Send className="h-4 w-4 mr-2" />
              Submit to Buyer
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};
