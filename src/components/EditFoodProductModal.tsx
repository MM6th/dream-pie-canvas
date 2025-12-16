import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface FoodProductImage {
  id: string;
  image_url: string;
  media_type: string;
  display_order: number;
}

interface FoodProduct {
  id: string;
  title: string;
  description: string | null;
  price: number;
  status: string;
  food_product_images: FoodProductImage[];
}

interface EditFoodProductModalProps {
  product: FoodProduct;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const EditFoodProductModal = ({ product, open, onOpenChange, onSuccess }: EditFoodProductModalProps) => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState(product.title);
  const [description, setDescription] = useState(product.description || "");
  const [price, setPrice] = useState(product.price.toString());
  const [priceError, setPriceError] = useState("");
  const [existingImages, setExistingImages] = useState<FoodProductImage[]>(product.food_product_images);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);

  useEffect(() => {
    setTitle(product.title);
    setDescription(product.description || "");
    setPrice(product.price.toString());
    setExistingImages(product.food_product_images);
    setNewFiles([]);
    setNewPreviews([]);
    setImagesToDelete([]);
  }, [product]);

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
  };

  const handlePriceChange = (value: string) => {
    setPrice(value);
    const numValue = parseFloat(value);
    if (value && (isNaN(numValue) || numValue < 20)) {
      setPriceError("Price must be at least $20");
    } else {
      setPriceError("");
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a product title",
        variant: "destructive"
      });
      return;
    }

    const numPrice = parseFloat(price);
    if (!price || isNaN(numPrice) || numPrice < 20) {
      toast({
        title: "Error",
        description: "Price must be at least $20",
        variant: "destructive"
      });
      return;
    }

    if (existingImages.length + newFiles.length === 0) {
      toast({
        title: "Error",
        description: "Please have at least one photo or video",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Update product details
      const { error: updateError } = await supabase
        .from('food_products')
        .update({
          title: title.trim(),
          description: description.trim(),
          price: numPrice
        })
        .eq('id', product.id)
        .eq('merchant_id', user.id);

      if (updateError) throw updateError;

      // Delete removed images from storage and database
      for (const imageId of imagesToDelete) {
        const imageToDelete = product.food_product_images.find(img => img.id === imageId);
        if (imageToDelete) {
          const urlParts = imageToDelete.image_url.split('/food-images/');
          if (urlParts[1]) {
            await supabase.storage.from('food-images').remove([urlParts[1]]);
          }
        }
        await supabase.from('food_product_images').delete().eq('id', imageId);
      }

      // Upload new files
      if (newFiles.length > 0) {
        const maxOrder = Math.max(...existingImages.map(img => img.display_order), -1);
        
        for (let i = 0; i < newFiles.length; i++) {
          const file = newFiles[i];
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}/${product.id}/${Date.now()}-${i}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('food-images')
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('food-images')
            .getPublicUrl(fileName);

          await supabase.from('food_product_images').insert({
            food_product_id: product.id,
            image_url: publicUrl,
            media_type: file.type.startsWith('video/') ? 'video' : 'image',
            display_order: maxOrder + 1 + i
          });
        }
      }

      toast({
        title: "Success",
        description: "Product updated successfully"
      });

      newPreviews.forEach(url => URL.revokeObjectURL(url));
      onSuccess();

    } catch (error: any) {
      console.error('Error updating product:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update product",
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
          <DialogTitle className="text-xl">Edit Food Product</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="edit-title">Product Title *</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>

          {/* Price */}
          <div className="space-y-2">
            <Label htmlFor="edit-price">Price (Minimum $20) *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
              <Input
                id="edit-price"
                type="number"
                min="20"
                step="0.01"
                value={price}
                onChange={(e) => handlePriceChange(e.target.value)}
                className={`bg-gray-700 border-gray-600 text-white pl-7 ${priceError ? 'border-red-500' : ''}`}
              />
            </div>
            {priceError && <p className="text-red-400 text-sm">{priceError}</p>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description & Ingredients *</Label>
            <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30 mb-2">
              <p className="text-xs text-orange-300">
                ⚠️ Please list ALL ingredients for transparency and allergy avoidance.
              </p>
            </div>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white min-h-[120px]"
            />
          </div>

          {/* Existing Images */}
          <div className="space-y-2">
            <Label>Current Photos / Videos</Label>
            {existingImages.length > 0 ? (
              <div className="grid grid-cols-3 gap-3">
                {existingImages.map((image) => (
                  <div key={image.id} className="relative group">
                    {image.media_type === 'video' ? (
                      <video src={image.image_url} className="w-full h-24 object-cover rounded-lg" />
                    ) : (
                      <img src={image.image_url} alt="Product" className="w-full h-24 object-cover rounded-lg" />
                    )}
                    <button
                      type="button"
                      onClick={() => removeExistingImage(image.id)}
                      className="absolute top-1 right-1 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No images remaining</p>
            )}
          </div>

          {/* Add New Media */}
          <div className="space-y-2">
            <Label>Add New Photos / Videos</Label>
            <div className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center">
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="edit-media-upload"
              />
              <label htmlFor="edit-media-upload" className="cursor-pointer">
                <Upload className="w-8 h-8 mx-auto text-gray-400 mb-1" />
                <p className="text-gray-400 text-sm">Click to add more media</p>
              </label>
            </div>

            {newPreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mt-3">
                {newPreviews.map((preview, index) => (
                  <div key={index} className="relative group">
                    {newFiles[index]?.type.startsWith('video/') ? (
                      <video src={preview} className="w-full h-24 object-cover rounded-lg" />
                    ) : (
                      <img src={preview} alt={`New ${index + 1}`} className="w-full h-24 object-cover rounded-lg" />
                    )}
                    <button
                      type="button"
                      onClick={() => removeNewFile(index)}
                      className="absolute top-1 right-1 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditFoodProductModal;
