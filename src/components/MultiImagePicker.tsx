
import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, X, Image, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface MultiImagePickerProps {
  onImagesSelected: (urls: string[]) => void;
  maxImages: number;
  currentImageCount: number;
}

const MultiImagePicker = ({ onImagesSelected, maxImages, currentImageCount }: MultiImagePickerProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const remainingSlots = maxImages - currentImageCount;

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const filesToAdd = acceptedFiles.slice(0, remainingSlots);
    
    if (acceptedFiles.length > remainingSlots) {
      toast({
        title: "Too many files",
        description: `Only ${remainingSlots} more images can be added`,
        variant: "destructive"
      });
    }

    // Check file sizes
    const oversizedFiles = filesToAdd.filter(file => file.size > 50 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast({
        title: "Files too large",
        description: "Some files are larger than 50MB and were skipped",
        variant: "destructive"
      });
    }

    const validFiles = filesToAdd.filter(file => file.size <= 50 * 1024 * 1024);
    setSelectedFiles(prev => [...prev, ...validFiles].slice(0, remainingSlots));
  }, [remainingSlots]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.gif']
    },
    multiple: true,
    disabled: uploading || remainingSlots === 0
  });

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (!user || selectedFiles.length === 0) return;

    setUploading(true);
    setUploadProgress(0);
    const uploadedUrls: string[] = [];

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}_${i}.${fileExt}`;

        // Upload file to storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('user-media')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data } = supabase.storage
          .from('user-media')
          .getPublicUrl(uploadData.path);

        uploadedUrls.push(data.publicUrl);

        // Record upload in database
        await supabase
          .from('user_uploads')
          .insert({
            user_id: user.id,
            file_name: file.name,
            file_path: uploadData.path,
            file_size: file.size,
            file_type: file.type
          });

        // Update progress
        setUploadProgress(((i + 1) / selectedFiles.length) * 100);
      }

      onImagesSelected(uploadedUrls);
      setSelectedFiles([]);
      setOpen(false);

      toast({
        title: "Success",
        description: `${uploadedUrls.length} images uploaded successfully!`
      });

    } catch (error: any) {
      console.error('Error uploading files:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload images",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full border-gray-600 text-white bg-gray-700"
          disabled={remainingSlots === 0}
        >
          <Upload className="w-4 h-4 mr-2" />
          {remainingSlots === 0 ? "Image limit reached" : `Add Images (${remainingSlots} remaining)`}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl bg-gray-800 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle>Upload Multiple Images</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Drop Zone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-blue-400 bg-blue-400/10'
                : 'border-gray-600 hover:border-gray-500'
            } ${uploading || remainingSlots === 0 ? 'pointer-events-none opacity-50' : ''}`}
          >
            <input {...getInputProps()} />
            <Upload className="w-8 h-8 mx-auto mb-3 text-gray-400" />
            {uploading ? (
              <div className="space-y-2">
                <p className="text-gray-300">Uploading {selectedFiles.length} images...</p>
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-sm text-gray-400">{Math.round(uploadProgress)}%</p>
              </div>
            ) : (
              <div>
                <p className="text-gray-300 mb-1">
                  Drop multiple images here, or click to select
                </p>
                <p className="text-sm text-gray-400">
                  Can add up to {remainingSlots} more images (max 50MB each)
                </p>
              </div>
            )}
          </div>

          {/* Selected Files Preview */}
          {selectedFiles.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-300">
                Selected Files ({selectedFiles.length})
              </h4>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-3 max-h-48 overflow-y-auto">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="relative">
                    <div className="aspect-square bg-gray-700 rounded border border-gray-600 flex items-center justify-center">
                      <Image className="w-6 h-6 text-gray-400" />
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFile(index)}
                      className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white rounded-full w-6 h-6 p-0"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                    <p className="text-xs text-gray-400 mt-1 truncate">
                      {file.name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedFiles([]);
                setOpen(false);
              }}
              className="flex-1 border-gray-600 text-white bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={uploadFiles}
              disabled={selectedFiles.length === 0 || uploading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {uploading ? "Uploading..." : `Upload ${selectedFiles.length} Images`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MultiImagePicker;
