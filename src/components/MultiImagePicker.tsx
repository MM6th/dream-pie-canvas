
import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, X, Image, Plus, FolderOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface MultiImagePickerProps {
  selectedImages: File[];
  onImagesChange: (images: File[]) => void;
  maxImages: number;
}

interface UserUpload {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
}

const MultiImagePicker = ({ selectedImages, onImagesChange, maxImages }: MultiImagePickerProps) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [galleryModalOpen, setGalleryModalOpen] = useState(false);
  const [galleryImages, setGalleryImages] = useState<UserUpload[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);

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

  const fetchGalleryImages = async () => {
    if (!user) return;

    setGalleryLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_uploads')
        .select('id, file_name, file_path, file_type')
        .eq('user_id', user.id)
        .like('file_type', 'image%')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching gallery images:', error);
        toast({
          title: "Error",
          description: "Failed to load gallery images",
          variant: "destructive"
        });
        return;
      }

      setGalleryImages(data || []);
    } catch (error) {
      console.error('Error fetching gallery images:', error);
      toast({
        title: "Error",
        description: "Failed to load gallery images",
        variant: "destructive"
      });
    } finally {
      setGalleryLoading(false);
    }
  };

  const handleGalleryOpen = () => {
    setGalleryModalOpen(true);
    fetchGalleryImages();
  };

  const getImageUrl = (filePath: string) => {
    const { data } = supabase.storage
      .from('user-media')
      .getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleGalleryImageSelect = async (upload: UserUpload) => {
    try {
      const imageUrl = getImageUrl(upload.file_path);
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const file = new File([blob], upload.file_name, { type: upload.file_type });
      
      const remainingSlots = maxImages - selectedImages.length;
      if (remainingSlots > 0) {
        onImagesChange([...selectedImages, file]);
        setGalleryModalOpen(false);
        toast({
          title: "Success",
          description: "Image added from gallery",
        });
      } else {
        toast({
          title: "No space available",
          description: "Please remove an image first",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error loading image from gallery:', error);
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
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <FolderOpen className="w-4 h-4 mr-2" />
          Choose from Computer
        </Button>
        
        <Button
          type="button"
          onClick={handleGalleryOpen}
          disabled={uploading || remainingSlots === 0}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <Image className="w-4 h-4 mr-2" />
          Choose from Gallery
        </Button>
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
                    className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white rounded-full w-6 h-6 p-0"
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

      {/* Gallery Modal */}
      <Dialog open={galleryModalOpen} onOpenChange={setGalleryModalOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select from Your Gallery</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {galleryLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-400">Loading your photos...</p>
              </div>
            ) : galleryImages.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 mb-4">No photos in your gallery yet.</p>
                <p className="text-gray-500 text-sm">Upload some photos first to use them in your products.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                {galleryImages.map((upload) => {
                  const imageUrl = getImageUrl(upload.file_path);
                  return (
                    <div
                      key={upload.id}
                      className="relative aspect-square cursor-pointer rounded-lg overflow-hidden border-2 border-transparent hover:border-blue-400 transition-colors"
                      onClick={() => handleGalleryImageSelect(upload)}
                    >
                      <img
                        src={imageUrl}
                        alt={upload.file_name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-1 left-1 right-1">
                        <p className="text-xs text-white bg-black/50 px-2 py-1 rounded truncate">
                          {upload.file_name}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MultiImagePicker;
