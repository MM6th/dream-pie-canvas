import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, X, Loader2, Image, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import SixthPriceTag from "./SixthPriceTag";

interface DanceProductImage {
  id: string;
  image_url: string;
  media_type: string;
  display_order: number;
  is_blurred?: boolean;
}

interface DanceProduct {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  is_free: boolean;
  status: string;
  dance_product_images: DanceProductImage[];
}

interface EditDanceProductModalProps {
  product: DanceProduct;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface GalleryUpload {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
}

const EditDanceProductModal = ({ product, open, onOpenChange, onSuccess }: EditDanceProductModalProps) => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState(product.title);
  const [description, setDescription] = useState(product.description || "");
  const [price, setPrice] = useState(product.price?.toString() || "");
  const [isFree, setIsFree] = useState(product.is_free);
  const [existingImages, setExistingImages] = useState<DanceProductImage[]>(product.dance_product_images);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);
  const [blurredNewIndexes, setBlurredNewIndexes] = useState<number[]>([]);
  const [blurredGalleryIndexes, setBlurredGalleryIndexes] = useState<number[]>([]);
  
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryUploads, setGalleryUploads] = useState<GalleryUpload[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<{ url: string; type: string }[]>([]);

  useEffect(() => {
    setTitle(product.title);
    setDescription(product.description || "");
    setPrice(product.price?.toString() || "");
    setIsFree(product.is_free);
    setExistingImages(product.dance_product_images);
    setNewFiles([]);
    setNewPreviews([]);
    setImagesToDelete([]);
    setGalleryPreviews([]);
    setBlurredNewIndexes([]);
    setBlurredGalleryIndexes([]);
  }, [product]);

  useEffect(() => {
    if (galleryOpen && user) {
      fetchGalleryUploads();
    }
  }, [galleryOpen, user]);

  const fetchGalleryUploads = async () => {
    if (!user) return;
    setGalleryLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_uploads")
        .select("id, file_name, file_path, file_type")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      const onlyMedia = (data || []).filter((u) => u.file_type?.startsWith("image/") || u.file_type?.startsWith("video/"));
      setGalleryUploads(onlyMedia);
    } catch (err) {
      console.error("Error fetching gallery uploads:", err);
    } finally {
      setGalleryLoading(false);
    }
  };

  const getUserMediaUrl = (filePath: string) => {
    const { data } = supabase.storage.from("user-media").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleGallerySelect = (upload: GalleryUpload) => {
    const url = getUserMediaUrl(upload.file_path);
    const type = upload.file_type.startsWith("video/") ? "video" : "image";
    setGalleryPreviews((prev) => [...prev, { url, type }]);
    setGalleryOpen(false);
    toast({ title: "Media added from gallery" });
  };

  const removeGalleryPreview = (index: number) => {
    setGalleryPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      return isImage || isVideo;
    });

    const newPreviewUrls = validFiles.map(file => URL.createObjectURL(file));
    
    setNewFiles(prev => [...prev, ...validFiles]);
    setNewPreviews(prev => [...prev, ...newPreviewUrls]);
  };

  const removeExistingImage = (imageId: string) => {
    setImagesToDelete(prev => [...prev, imageId]);
    setExistingImages(prev => prev.filter(img => img.id !== imageId));
  };

  const removeNewFile = (index: number) => {
    URL.revokeObjectURL(newPreviews[index]);
    setNewFiles(prev => prev.filter((_, i) => i !== index));
    setNewPreviews(prev => prev.filter((_, i) => i !== index));
    setBlurredNewIndexes(prev => prev.filter(i => i !== index).map(i => i > index ? i - 1 : i));
  };

  const toggleExistingBlur = async (imageId: string, currentBlur: boolean) => {
    try {
      await supabase
        .from('dance_product_images')
        .update({ is_blurred: !currentBlur })
        .eq('id', imageId);
      
      setExistingImages(prev => 
        prev.map(img => img.id === imageId ? { ...img, is_blurred: !currentBlur } : img)
      );
    } catch (error) {
      console.error('Error updating blur status:', error);
    }
  };

  const toggleNewBlur = (index: number) => {
    setBlurredNewIndexes(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const toggleGalleryBlur = (index: number) => {
    setBlurredGalleryIndexes(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const handleSubmit = async () => {
    if (!user) return;

    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a title",
        variant: "destructive"
      });
      return;
    }

    if (!isFree) {
      const numPrice = parseFloat(price);
      if (!price || isNaN(numPrice) || numPrice < 2) {
        toast({
          title: "Error",
          description: "Minimum price is $2.00",
          variant: "destructive"
        });
        return;
      }
    }

    if (existingImages.length + newFiles.length + galleryPreviews.length === 0) {
      toast({
        title: "Error",
        description: "Please have at least one photo or video",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const numPrice = isFree ? null : parseFloat(price);

      // Update product details
      const { error: updateError } = await supabase
        .from('dance_products')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          price: numPrice,
          is_free: isFree
        })
        .eq('id', product.id)
        .eq('merchant_id', user.id);

      if (updateError) throw updateError;

      // Delete removed images from storage and database
      for (const imageId of imagesToDelete) {
        const imageToDelete = product.dance_product_images.find(img => img.id === imageId);
        if (imageToDelete) {
          const urlParts = imageToDelete.image_url.split('/dance-images/');
          if (urlParts[1]) {
            await supabase.storage.from('dance-images').remove([urlParts[1]]);
          }
        }
        await supabase.from('dance_product_images').delete().eq('id', imageId);
      }

      const maxOrder = existingImages.length > 0 ? Math.max(...existingImages.map(img => img.display_order), -1) : -1;
      let orderCounter = maxOrder + 1;

      // Upload new files from device
      for (let i = 0; i < newFiles.length; i++) {
        const file = newFiles[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${product.id}/${Date.now()}-${i}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('dance-images')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('dance-images')
          .getPublicUrl(fileName);

        await supabase.from('dance_product_images').insert({
          dance_product_id: product.id,
          image_url: publicUrl,
          media_type: file.type.startsWith('video/') ? 'video' : 'image',
          display_order: orderCounter++,
          is_blurred: blurredNewIndexes.includes(i)
        });
      }

      // Add gallery selections
      for (let i = 0; i < galleryPreviews.length; i++) {
        const { url, type } = galleryPreviews[i];
        await supabase.from('dance_product_images').insert({
          dance_product_id: product.id,
          image_url: url,
          media_type: type,
          display_order: orderCounter++,
          is_blurred: blurredGalleryIndexes.includes(i)
        });
      }

      toast({
        title: "Success",
        description: "Content updated successfully"
      });

      newPreviews.forEach(url => URL.revokeObjectURL(url));
      onSuccess();

    } catch (error: any) {
      console.error('Error updating product:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update content",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Edit Dance Content</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title *</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>

          {/* Free/Paid Toggle */}
          <div className="flex items-center space-x-3">
            <Switch
              id="edit-is-free"
              checked={isFree}
              onCheckedChange={(checked) => {
                setIsFree(checked);
                if (checked) setPrice("");
              }}
            />
            <Label htmlFor="edit-is-free" className="text-white">
              This content is free
            </Label>
          </div>

          {/* Price */}
          {!isFree && (
            <div className="space-y-2">
              <Label htmlFor="edit-price">Price *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <Input
                  id="edit-price"
                  type="number"
                  min="2.00"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="2.00"
                  className="bg-gray-700 border-gray-600 text-white pl-7"
                />
              </div>
              {price && parseFloat(price) > 0 && (
                <SixthPriceTag usdPrice={parseFloat(price)} size="md" />
              )}
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white min-h-[100px]"
            />
          </div>

          {/* Existing Images */}
          <div className="space-y-2">
            <Label>Current Photos / Videos</Label>
            {existingImages.length > 0 ? (
              <div className="grid grid-cols-3 gap-3">
                {existingImages.map((image) => {
                  const isVideo = image.media_type === 'video';
                  const isBlurred = image.is_blurred || false;
                  
                  return (
                    <div key={image.id} className="relative group">
                      {isVideo ? (
                        <video src={image.image_url} className="w-full h-24 object-cover rounded-lg" />
                      ) : (
                        <img 
                          src={image.image_url} 
                          alt="Content" 
                          className={`w-full h-24 object-cover rounded-lg ${isBlurred ? 'blur-md' : ''}`} 
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => removeExistingImage(image.id)}
                        className="absolute top-1 right-1 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                      
                      {/* Blur checkbox for images only */}
                      {!isVideo && (
                        <div className="mt-1 flex items-center space-x-2">
                          <Checkbox
                            id={`blur-existing-${image.id}`}
                            checked={isBlurred}
                            onCheckedChange={() => toggleExistingBlur(image.id, isBlurred)}
                          />
                          <Label htmlFor={`blur-existing-${image.id}`} className="text-xs text-gray-300 cursor-pointer">
                            Blur
                          </Label>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No images remaining</p>
            )}
          </div>

          {/* Add New Media */}
          <div className="space-y-2">
            <Label>Add New Photos / Videos</Label>
            <div className="border-2 border-dashed border-gray-600 rounded-lg p-4">
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="edit-media-upload"
              />

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => setGalleryOpen(true)}
                  className="cursor-pointer flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  <Image className="w-5 h-5 text-pink-400" />
                  <span className="text-gray-200">Choose from In‑App Gallery</span>
                </button>

                <label
                  htmlFor="edit-media-upload"
                  className="cursor-pointer flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  <Upload className="w-5 h-5 text-pink-400" />
                  <span className="text-gray-200">Upload from Device</span>
                </label>
              </div>
            </div>

            {/* Gallery Previews */}
            {galleryPreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mt-3">
                {galleryPreviews.map((preview, index) => {
                  const isVideo = preview.type === 'video';
                  const isBlurred = blurredGalleryIndexes.includes(index);
                  
                  return (
                    <div key={`gallery-${index}`} className="relative group">
                      {isVideo ? (
                        <video src={preview.url} className="w-full h-24 object-cover rounded-lg" />
                      ) : (
                        <img 
                          src={preview.url} 
                          alt={`Gallery ${index + 1}`} 
                          className={`w-full h-24 object-cover rounded-lg ${isBlurred ? 'blur-md' : ''}`} 
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => removeGalleryPreview(index)}
                        className="absolute top-1 right-1 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                      
                      {!isVideo && (
                        <div className="mt-1 flex items-center space-x-2">
                          <Checkbox
                            id={`blur-gallery-${index}`}
                            checked={isBlurred}
                            onCheckedChange={() => toggleGalleryBlur(index)}
                          />
                          <Label htmlFor={`blur-gallery-${index}`} className="text-xs text-gray-300 cursor-pointer">
                            Blur
                          </Label>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {newPreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mt-3">
                {newPreviews.map((preview, index) => {
                  const isVideo = newFiles[index]?.type.startsWith('video/');
                  const isBlurred = blurredNewIndexes.includes(index);
                  
                  return (
                    <div key={index} className="relative group">
                      {isVideo ? (
                        <video src={preview} className="w-full h-24 object-cover rounded-lg" />
                      ) : (
                        <img 
                          src={preview} 
                          alt={`New ${index + 1}`} 
                          className={`w-full h-24 object-cover rounded-lg ${isBlurred ? 'blur-md' : ''}`} 
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => removeNewFile(index)}
                        className="absolute top-1 right-1 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                      
                      {!isVideo && (
                        <div className="mt-1 flex items-center space-x-2">
                          <Checkbox
                            id={`blur-new-${index}`}
                            checked={isBlurred}
                            onCheckedChange={() => toggleNewBlur(index)}
                          />
                          <Label htmlFor={`blur-new-${index}`} className="text-xs text-gray-300 cursor-pointer">
                            Blur
                          </Label>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Gallery Modal */}
          <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
            <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-3xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Select from your in-app gallery</DialogTitle>
              </DialogHeader>

              {galleryLoading ? (
                <div className="py-10 text-center text-gray-400">Loading your gallery...</div>
              ) : galleryUploads.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-gray-300">Your in-app gallery is empty.</p>
                  <p className="text-gray-500 text-sm mt-2">
                    Upload photos/videos in your Content Gallery first, then come back here to select them.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {galleryUploads.map((upload) => {
                    const isImage = upload.file_type.startsWith("image/");
                    const isVideo = upload.file_type.startsWith("video/");
                    const url = getUserMediaUrl(upload.file_path);

                    return (
                      <button
                        key={upload.id}
                        type="button"
                        onClick={() => handleGallerySelect(upload)}
                        className="text-left bg-gray-700 hover:bg-gray-600 rounded-lg overflow-hidden border border-gray-600 transition-colors"
                      >
                        <div className="aspect-video">
                          {isImage ? (
                            <img
                              src={url}
                              alt={`Gallery media: ${upload.file_name}`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : isVideo ? (
                            <div className="w-full h-full flex items-center justify-center bg-gray-700">
                              <Video className="w-10 h-10 text-gray-400" />
                            </div>
                          ) : null}
                        </div>
                        <div className="p-2">
                          <p className="text-sm text-gray-200 truncate">{upload.file_name}</p>
                          <p className="text-xs text-gray-400">Tap to add</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full bg-pink-600 hover:bg-pink-700 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              "Update Content"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditDanceProductModal;
