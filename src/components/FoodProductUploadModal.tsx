import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Upload, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface FoodProductUploadModalProps {
  onSuccess: () => void;
}

const FoodProductUploadModal = ({ onSuccess }: FoodProductUploadModalProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [priceError, setPriceError] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      return isImage || isVideo;
    });

    if (validFiles.length !== files.length) {
      toast({
        title: "Invalid files",
        description: "Only images and videos are allowed",
        variant: "destructive"
      });
    }

    // Create previews
    const newPreviews = validFiles.map(file => URL.createObjectURL(file));
    
    setMediaFiles(prev => [...prev, ...validFiles]);
    setMediaPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeMedia = (index: number) => {
    URL.revokeObjectURL(mediaPreviews[index]);
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    setMediaPreviews(prev => prev.filter((_, i) => i !== index));
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
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to upload products",
        variant: "destructive"
      });
      return;
    }

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

    if (mediaFiles.length === 0) {
      toast({
        title: "Error",
        description: "Please upload at least one photo or video of your product",
        variant: "destructive"
      });
      return;
    }

    if (!description.trim()) {
      toast({
        title: "Error",
        description: "Please enter a description with all ingredients",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create the food product first
      const { data: productData, error: productError } = await supabase
        .from('food_products')
        .insert({
          merchant_id: user.id,
          title: title.trim(),
          description: description.trim(),
          price: numPrice,
          status: 'published'
        })
        .select()
        .single();

      if (productError) throw productError;

      // Upload media files
      const uploadedUrls: { url: string; type: string }[] = [];
      
      for (let i = 0; i < mediaFiles.length; i++) {
        const file = mediaFiles[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${productData.id}/${Date.now()}-${i}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('food-images')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('food-images')
          .getPublicUrl(fileName);

        uploadedUrls.push({
          url: publicUrl,
          type: file.type.startsWith('video/') ? 'video' : 'image'
        });
      }

      // Insert image records
      const imageRecords = uploadedUrls.map((media, index) => ({
        food_product_id: productData.id,
        image_url: media.url,
        media_type: media.type,
        display_order: index
      }));

      const { error: imagesError } = await supabase
        .from('food_product_images')
        .insert(imageRecords);

      if (imagesError) throw imagesError;

      toast({
        title: "Success",
        description: "Your food product has been published!"
      });

      // Reset form
      setTitle("");
      setDescription("");
      setPrice("");
      setPriceError("");
      mediaPreviews.forEach(url => URL.revokeObjectURL(url));
      setMediaFiles([]);
      setMediaPreviews([]);
      setOpen(false);
      onSuccess();

    } catch (error: any) {
      console.error('Error uploading product:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload product",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-orange-600 hover:bg-orange-700 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Upload New Product
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Upload Food Product</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Product Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Homemade Apple Pie"
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>

          {/* Price */}
          <div className="space-y-2">
            <Label htmlFor="price">Price (Minimum $20) *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
              <Input
                id="price"
                type="number"
                min="20"
                step="0.01"
                value={price}
                onChange={(e) => handlePriceChange(e.target.value)}
                placeholder=""
                className={`bg-gray-700 border-gray-600 text-white pl-7 ${priceError ? 'border-red-500' : ''}`}
              />
            </div>
            {priceError && (
              <p className="text-red-400 text-sm">{priceError}</p>
            )}
          </div>

          {/* Description with ingredients prompt */}
          <div className="space-y-2">
            <Label htmlFor="description">Description & Ingredients *</Label>
            <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30 mb-2">
              <p className="text-xs text-orange-300">
                ⚠️ Please list ALL ingredients used in this product for transparency and to help customers with allergies avoid potential reactions.
              </p>
            </div>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your product and list all ingredients..."
              className="bg-gray-700 border-gray-600 text-white min-h-[120px]"
            />
          </div>

          {/* Media Upload */}
          <div className="space-y-2">
            <Label>Photos / Videos *</Label>
            <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center">
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="media-upload"
              />
              <label htmlFor="media-upload" className="cursor-pointer">
                <Upload className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                <p className="text-gray-400">Click to upload photos or videos</p>
                <p className="text-gray-500 text-sm">Supports images and videos</p>
              </label>
            </div>

            {/* Media Previews */}
            {mediaPreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mt-4">
                {mediaPreviews.map((preview, index) => (
                  <div key={index} className="relative group">
                    {mediaFiles[index]?.type.startsWith('video/') ? (
                      <video 
                        src={preview} 
                        className="w-full h-24 object-cover rounded-lg"
                      />
                    ) : (
                      <img 
                        src={preview} 
                        alt={`Preview ${index + 1}`} 
                        className="w-full h-24 object-cover rounded-lg"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => removeMedia(index)}
                      className="absolute top-1 right-1 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Publishing...
              </>
            ) : (
              "Publish Product"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FoodProductUploadModal;
