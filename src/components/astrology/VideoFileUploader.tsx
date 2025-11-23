import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, X, Save, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const [isAdmin, setIsAdmin] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  }, []);

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

  const handleDraftSave = async () => {
    if (!selectedFile) return;

    try {
      // Convert File to Blob and pass to parent handler
      const blob = new Blob([selectedFile], { type: selectedFile.type });
      await onDraftSave(blob);
      
      // Cleanup
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (error) {
      console.error("Error saving draft:", error);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;

    try {
      // Convert File to Blob and pass to parent handler
      const blob = new Blob([selectedFile], { type: selectedFile.type });
      await onSubmit(blob);
      
      // Cleanup
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (error) {
      console.error("Error submitting video:", error);
    }
  };

  const handleCancelUpload = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    onCancel();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
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

        {isUploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Uploading...</span>
              <span className="font-medium">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleDraftSave}
            variant="outline"
            className="flex-1"
            disabled={isUploading}
          >
            <Save className="h-4 w-4 mr-2" />
            Save as Draft
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1"
            disabled={isUploading}
          >
            <Send className="h-4 w-4 mr-2" />
            Submit to Buyer
          </Button>
        </div>
      </div>
    </Card>
  );
};
