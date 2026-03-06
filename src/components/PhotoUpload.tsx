
import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, X, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/use-toast";
import { compressImage } from "@/utils/imageOptimization";

interface PhotoUploadProps {
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

const PhotoUpload = ({ onSuccess, trigger }: PhotoUploadProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [storageUsage, setStorageUsage] = useState<number>(0);
  const [maxStorage, setMaxStorage] = useState<number>(2 * 1024 * 1024 * 1024); // Default 2GB

  const checkStorageUsage = async () => {
    if (!user) return;

    try {
      const [usageResult, maxResult] = await Promise.all([
        supabase.rpc('get_user_storage_usage', { user_uuid: user.id }),
        supabase.rpc('get_user_max_storage', { user_uuid: user.id })
      ]);

      if (usageResult.error) {
        console.error('Error checking storage usage:', usageResult.error);
      } else {
        setStorageUsage(usageResult.data || 0);
      }

      if (maxResult.error) {
        console.error('Error checking max storage:', maxResult.error);
      } else {
        setMaxStorage(maxResult.data || 2 * 1024 * 1024 * 1024);
      }
    } catch (error) {
      console.error('Error checking storage:', error);
    }
  };

  React.useEffect(() => {
    if (open && user) {
      checkStorageUsage();
    }
  }, [open, user]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!user || acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    const maxFileSize = 50 * 1024 * 1024; // 50MB

    // Check file size
    if (file.size > maxFileSize) {
      toast({
        title: "File too large",
        description: "Individual files must be smaller than 50MB",
        variant: "destructive"
      });
      return;
    }

    // Check total storage limit
    const { data: canUpload, error: checkError } = await supabase.rpc('can_user_upload', {
      user_uuid: user.id,
      new_file_size: file.size
    });

    if (checkError || !canUpload) {
      const maxStorageGB = Math.round(maxStorage / (1024 * 1024 * 1024));
      toast({
        title: "Storage limit exceeded",
        description: `You've reached your ${maxStorageGB}GB storage limit. Please delete some files first.`,
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Compress image before upload
      const compressedFile = await compressImage(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 2048,
        quality: 0.8,
      });

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      // Upload compressed file to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('user-media')
        .upload(fileName, compressedFile);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (uploadError) throw uploadError;

      // Record upload in database
      const { error: dbError } = await supabase
        .from('user_uploads')
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_path: uploadData.path,
          file_size: compressedFile.size,
          file_type: file.type
        });

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "Photo uploaded successfully!"
      });

      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload photo",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [user, onSuccess]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.gif']
    },
    multiple: false,
    disabled: uploading
  });

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const storagePercentage = (storageUsage / maxStorage) * 100;
  const maxStorageDisplay = maxStorage >= 1024 * 1024 * 1024 
    ? `${Math.round(maxStorage / (1024 * 1024 * 1024))}GB` 
    : `${Math.round(maxStorage / (1024 * 1024))}MB`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Upload className="w-4 h-4 mr-2" />
            Upload Photo
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-gray-800 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle>Upload Photo</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Storage Usage */}
          <div className="bg-gray-700/50 p-3 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-300">Storage Used</span>
              <span className="text-sm text-gray-300">
                {formatBytes(storageUsage)} / {maxStorageDisplay}
              </span>
            </div>
            <Progress value={storagePercentage} className="h-2" />
            {storagePercentage > 90 && (
              <div className="flex items-center gap-2 mt-2 text-amber-400">
                <AlertCircle className="w-4 h-4" />
                <span className="text-xs">Storage nearly full</span>
              </div>
            )}
          </div>

          {/* Upload Area */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-blue-400 bg-blue-400/10'
                : 'border-gray-600 hover:border-gray-500'
            } ${uploading ? 'pointer-events-none opacity-50' : ''}`}
          >
            <input {...getInputProps()} />
            <Upload className="w-8 h-8 mx-auto mb-3 text-gray-400" />
            {uploading ? (
              <div className="space-y-2">
                <p className="text-gray-300">Uploading...</p>
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-sm text-gray-400">{Math.round(uploadProgress)}%</p>
              </div>
            ) : (
              <div>
                <p className="text-gray-300 mb-1">
                  Drop your photo here, or click to select
                </p>
                <p className="text-sm text-gray-400">
                  Supports JPEG, PNG, WebP, GIF (max 50MB)
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PhotoUpload;
