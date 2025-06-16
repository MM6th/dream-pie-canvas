
import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, X, Image, Plus, FolderOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import ImagePicker from "./ImagePicker";

interface MultiImagePickerProps {
  selectedImages: File[];
  onImagesChange: (images: File[]) => void;
  maxImages: number;
}

const MultiImagePicker = ({ selectedImages, onImagesChange, maxImages }: MultiImagePickerProps) => {
  const [uploading, setUploading] = useState(false);
  const [galleryModalOpen, setGalleryModalOpen] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const remainingSlots = maxImages - selectedImages.length;
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
    onImagesChange([...selectedImages, ...validFiles].slice(0, maxImages));
  }, [selectedImages, onImagesChange, maxImages]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.gif']
    },
    multiple: true,
    disabled: uploading || selectedImages.length >= maxImages
  });

  const handleFileSelect = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*';
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      onDrop(files);
    };
    input.click();
  };

  const handleGalleryImageSelect = async (imageUrl: string) => {
    try {
      // Convert the gallery image URL to a File object
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const fileName = imageUrl.split('/').pop() || 'gallery-image.jpg';
      const file = new File([blob], fileName, { type: blob.type });
      
      const remainingSlots = maxImages - selectedImages.length;
      if (remainingSlots > 0) {
        onImagesChange([...selectedImages, file]);
        setGalleryModalOpen(false);
      } else {
        toast({
          title: "No space available",
          description: "Please remove an image first",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load image from gallery",
        variant: "destructive"
      });
    }
  };

  const removeFile = (index: number) => {
    onImagesChange(selectedImages.filter((_, i) => i !== index));
  };

  const remainingSlots = maxImages - selectedImages.length;

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-blue-400 bg-blue-400/10'
            : 'border-gray-600'
        } ${uploading || remainingSlots === 0 ? 'pointer-events-none opacity-50' : ''}`}
      >
        <input {...getInputProps()} />
        <Upload className="w-8 h-8 mx-auto mb-3 text-gray-400" />
        <div>
          <p className="text-gray-300 mb-1">
            Drop multiple images here, or click to select
          </p>
          <p className="text-sm text-gray-400">
            Can add up to {remainingSlots} more images (max 50MB each)
          </p>
        </div>
      </div>

      {/* Selection Buttons */}
      <div className="flex gap-2 justify-center">
        <Button
          type="button"
          onClick={handleFileSelect}
          disabled={uploading || remainingSlots === 0}
          className="bg-blue-600 text-white"
        >
          <FolderOpen className="w-4 h-4 mr-2" />
          Choose from Computer
        </Button>
        
        <Dialog open={galleryModalOpen} onOpenChange={setGalleryModalOpen}>
          <DialogTrigger asChild>
            <Button
              type="button"
              disabled={uploading || remainingSlots === 0}
              className="bg-green-600 text-white"
            >
              <Image className="w-4 h-4 mr-2" />
              Choose from Gallery
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle>Select from Your Gallery</DialogTitle>
            </DialogHeader>
            <ImagePicker
              onImageSelect={handleGalleryImageSelect}
              trigger={<div></div>}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Selected Files Preview */}
      {selectedImages.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-300">
            Selected Files ({selectedImages.length})
          </h4>
          <div className="grid grid-cols-3 md:grid-cols-4 gap-3 max-h-48 overflow-y-auto">
            {selectedImages.map((file, index) => {
              const imageUrl = URL.createObjectURL(file);
              return (
                <div key={index} className="relative">
                  <div className="aspect-square bg-gray-700 rounded border border-gray-600 overflow-hidden">
                    <img 
                      src={imageUrl} 
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover"
                      onLoad={() => URL.revokeObjectURL(imageUrl)}
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeFile(index)}
                    className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 p-0"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                  <p className="text-xs text-gray-400 mt-1 truncate">
                    {file.name}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiImagePicker;
