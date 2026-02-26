import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload, X, Save, Send, AlertCircle, Loader2, Music, Paperclip, FileText, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import * as tus from "tus-js-client";

interface AudioFileUploaderProps {
  deliveryId: string;
  onDraftSave: (blob: Blob, attachment?: File) => Promise<void>;
  onSubmit: (blob: Blob, attachment?: File) => Promise<void>;
  onCancel: () => void;
  isUploading: boolean;
}

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ACCEPTED_AUDIO_FORMATS: Record<string, string[]> = {
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
  'audio/x-wav': ['.wav'],
  'audio/x-m4a': ['.m4a'],
  'audio/mp4': ['.m4a'],
  'audio/ogg': ['.ogg'],
  'audio/aac': ['.aac'],
};

const ACCEPTED_ATTACHMENT_FORMATS = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.txt';

export const AudioFileUploader = ({
  deliveryId,
  onDraftSave,
  onSubmit,
  onCancel,
  isUploading
}: AudioFileUploaderProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [bytesUploaded, setBytesUploaded] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const startTimeRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isCancelledRef = useRef<boolean>(false);

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

    if (!Object.keys(ACCEPTED_AUDIO_FORMATS).includes(file.type)) {
      toast.error("Please select a valid audio file (MP3, WAV, M4A, OGG, or AAC)");
      return;
    }

    if (!isAdmin) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to upload audio");
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

  const handleAttachmentSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Attachment must be less than 10MB");
      return;
    }

    setAttachmentFile(file);
    toast.success(`Attachment added: ${file.name}`);
  };

  const handleRemoveAttachment = () => {
    setAttachmentFile(null);
    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = '';
    }
  };

  const uploadWithProgress = async (file: File, isDraft: boolean) => {
    setUploading(true);
    setUploadProgress(0);
    setBytesUploaded(0);
    setUploadSpeed(0);
    setTimeElapsed(0);
    startTimeRef.current = Date.now();
    isCancelledRef.current = false;

    intervalRef.current = setInterval(() => {
      setTimeElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("User not authenticated");

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      const ext = file.name.split('.').pop() || 'mp3';
      const fileName = isDraft
        ? `draft-${deliveryId}-${Date.now()}.${ext}`
        : `${deliveryId}-${Date.now()}.${ext}`;

      const filePath = isDraft
        ? `astrology-deliveries/drafts/${fileName}`
        : `astrology-deliveries/${fileName}`;

      toast.loading(isDraft ? "Uploading draft..." : "Uploading audio...", { id: "upload" });

      const projectId = "veaupehwfsbagzfuvach";
      const bucketName = "user-media";

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
            bucketName,
            objectName: filePath,
            contentType: file.type,
            cacheControl: '3600',
          },
          chunkSize: 6 * 1024 * 1024,
          onError: (error) => {
            console.error('TUS upload error:', error);
            const errorMsg = error?.message || String(error);
            if (errorMsg.includes('413') || errorMsg.includes('Maximum size exceeded')) {
              reject(new Error(`File too large for storage. Please use a smaller file or compress your audio. Server limit may be lower than expected.`));
            } else {
              reject(error);
            }
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
            console.log('Audio upload completed successfully');
            resolve();
          },
        });

        abortControllerRef.current = { abort: () => upload.abort() } as any;

        upload.findPreviousUploads().then((previousUploads) => {
          if (previousUploads.length) {
            upload.resumeFromPreviousUpload(previousUploads[0]);
          }
          upload.start();
        });
      });

      if (isCancelledRef.current) return;

      const { data: { publicUrl } } = supabase.storage
        .from("user-media")
        .getPublicUrl(filePath);

      // Handle attachment upload
      let attachmentUrl: string | null = null;
      let attachmentFilename: string | null = null;

      if (attachmentFile) {
        const attachmentPath = `astrology-deliveries/attachment-${deliveryId}-${Date.now()}-${attachmentFile.name}`;
        const { error: attachmentError } = await supabase.storage
          .from("user-media")
          .upload(attachmentPath, attachmentFile);

        if (attachmentError) {
          console.error("Attachment upload error:", attachmentError);
          toast.error("Audio uploaded but attachment failed. You can re-upload the attachment later.");
        } else {
          const { data: { publicUrl: attachmentPublicUrl } } = supabase.storage
            .from("user-media")
            .getPublicUrl(attachmentPath);
          attachmentUrl = attachmentPublicUrl;
          attachmentFilename = attachmentFile.name;
        }
      }

      const updateData = isDraft
        ? {
            draft_video_url: publicUrl,
            draft_saved_at: new Date().toISOString(),
            ...(attachmentUrl && { attachment_url: attachmentUrl, attachment_filename: attachmentFilename }),
          }
        : {
            admin_video_url: publicUrl,
            buyer_video_url: publicUrl,
            status: "delivered",
            delivered_at: new Date().toISOString(),
            draft_video_url: null,
            ...(attachmentUrl && { attachment_url: attachmentUrl, attachment_filename: attachmentFilename }),
          };

      const { error: updateError } = await supabase
        .from("astrology_deliveries")
        .update(updateData)
        .eq("id", deliveryId);

      if (updateError) throw updateError;

      // Send notification to buyer when submitting (not draft)
      if (!isDraft) {
        const { data: delivery } = await supabase
          .from("astrology_deliveries")
          .select("buyer_id")
          .eq("id", deliveryId)
          .single();

        if (delivery) {
          await supabase.from("notifications").insert({
            user_id: delivery.buyer_id,
            title: "Astrology Reading Ready",
            message: "Your personalized astrology audio reading is ready! You can now listen to and download it.",
            type: "ready",
            related_delivery_id: deliveryId,
          });
        }
      }

      toast.success(isDraft ? "Draft saved successfully!" : "Audio delivered successfully!", { id: "upload" });

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setSelectedFile(null);
      setPreviewUrl(null);
      setAttachmentFile(null);
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
      isCancelledRef.current = true;
      abortControllerRef.current.abort();
      setUploading(false);
      resetUploadState();

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      toast.dismiss("upload");
      toast.info("Upload cancelled");
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setAttachmentFile(null);
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
    if (bytesPerSecond === 0) return '0 Mbps';
    const mbps = (bytesPerSecond * 8) / 1000000;
    return mbps.toFixed(2) + ' Mbps';
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
          accept={Object.values(ACCEPTED_AUDIO_FORMATS).flat().join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />
        <Music className="h-12 w-12 text-muted-foreground" />
        <div className="text-center">
          <p className="text-sm font-medium mb-1">Upload an audio file from your device</p>
          <p className="text-xs text-muted-foreground">
            Accepted formats: <span className="font-medium">MP3, WAV, M4A, OGG, AAC</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {isAdmin ? 'Unlimited file size' : 'Max file size: 100MB'}
          </p>
        </div>
        <Button
          onClick={() => fileInputRef.current?.click()}
          variant="outline"
          disabled={isUploading}
        >
          <Upload className="h-4 w-4 mr-2" />
          Select Audio File
        </Button>
        <Button
          onClick={onCancel}
          variant="ghost"
          className="text-muted-foreground"
        >
          <X className="h-4 w-4 mr-2" />
          Cancel
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
          <audio
            src={previewUrl}
            controls
            className="w-full"
          />
        )}

        {/* Attachment Section */}
        <div className="border border-border/50 rounded-lg p-3 space-y-2">
          <input
            ref={attachmentInputRef}
            type="file"
            accept={ACCEPTED_ATTACHMENT_FORMATS}
            onChange={handleAttachmentSelect}
            className="hidden"
          />
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Paperclip className="h-4 w-4" />
              Attachment (optional)
            </p>
            {!attachmentFile && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => attachmentInputRef.current?.click()}
                disabled={uploading}
              >
                <Paperclip className="h-3.5 w-3.5 mr-1.5" />
                Add File
              </Button>
            )}
          </div>
          {attachmentFile ? (
            <div className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2">
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-primary" />
                <span className="truncate max-w-[200px]">{attachmentFile.name}</span>
                <span className="text-xs text-muted-foreground">({formatFileSize(attachmentFile.size)})</span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleRemoveAttachment} disabled={uploading}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              PDF, DOC, DOCX, JPG, PNG, or TXT (max 10MB)
            </p>
          )}
        </div>

        {uploading && (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Important:</strong> Keep this page open until upload completes.
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
                <div><span className="font-medium">Speed:</span> {formatSpeed(uploadSpeed)}</div>
                <div><span className="font-medium">Elapsed:</span> {formatTime(timeElapsed)}</div>
                <div><span className="font-medium">Uploaded:</span> {formatFileSize(bytesUploaded)} / {formatFileSize(selectedFile.size)}</div>
                <div><span className="font-medium">Remaining:</span> {estimatedTimeRemaining > 0 ? formatTime(estimatedTimeRemaining) : 'Calculating...'}</div>
              </div>

              <Button onClick={handleCancelUpload} variant="destructive" size="sm" className="w-full">
                Cancel Upload
              </Button>
            </div>
          </div>
        )}

        {!uploading && (
          <div className="flex gap-2">
            <Button onClick={handleDraftSave} variant="outline" className="flex-1" disabled={uploading}>
              <Save className="h-4 w-4 mr-2" />
              Save as Draft
            </Button>
            <Button onClick={handleSubmit} className="flex-1" disabled={uploading}>
              <Send className="h-4 w-4 mr-2" />
              Submit to Buyer
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};
