
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import MultiImagePicker from "./MultiImagePicker";

interface ModelingApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface PurchasedProduct {
  id: string;
  title: string;
}

const ModelingApplicationModal = ({ isOpen, onClose, onSuccess }: ModelingApplicationModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [notes, setNotes] = useState("");
  const [purchasedProducts, setPurchasedProducts] = useState<PurchasedProduct[]>([]);

  useEffect(() => {
    if (isOpen && user) {
      fetchPurchasedProducts();
    }
  }, [isOpen, user]);

  const fetchPurchasedProducts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('fashion_purchases')
        .select(`
          fashion_product_id,
          fashion_products (
            id,
            title
          )
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching purchased products:', error);
        return;
      }

      const products = data
        ?.filter(purchase => purchase.fashion_products)
        .map(purchase => ({
          id: purchase.fashion_products.id,
          title: purchase.fashion_products.title
        })) || [];

      // Remove duplicates
      const uniqueProducts = products.filter((product, index, self) => 
        index === self.findIndex(p => p.id === product.id)
      );

      setPurchasedProducts(uniqueProducts);
    } catch (error) {
      console.error('Error fetching purchased products:', error);
    }
  };

  const handleClose = () => {
    setSelectedImages([]);
    setSelectedProductId("");
    setNotes("");
    onClose();
  };

  const uploadImages = async (): Promise<string[]> => {
    const imageUrls: string[] = [];
    
    for (const image of selectedImages) {
      const fileExt = image.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `modeling-applications/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('fashion-images')
        .upload(filePath, image);

      if (uploadError) {
        console.error('Image upload error:', uploadError);
        throw new Error(`Failed to upload image: ${image.name}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('fashion-images')
        .getPublicUrl(filePath);

      imageUrls.push(publicUrl);
    }

    return imageUrls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to submit an application",
        variant: "destructive"
      });
      return;
    }

    if (selectedImages.length === 0) {
      toast({
        title: "Error",
        description: "Please upload at least one photo for your modeling application",
        variant: "destructive"
      });
      return;
    }

    if (!selectedProductId) {
      toast({
        title: "Error",
        description: "Please select a fashion product you've purchased",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      console.log('Starting modeling application submission...');
      
      // Upload images first
      console.log('Uploading images...');
      const imageUrls = await uploadImages();
      console.log('Images uploaded successfully:', imageUrls.length);

      // Create modeling application
      console.log('Creating modeling application...');
      const { error: applicationError } = await supabase
        .from('modeling_applications')
        .insert({
          merchant_id: user.id,
          fashion_product_id: selectedProductId,
          application_photos: imageUrls,
          status: 'pending'
        });

      if (applicationError) {
        console.error('Application creation error:', applicationError);
        throw applicationError;
      }

      console.log('Modeling application submitted successfully');

      toast({
        title: "Success",
        description: "Your modeling application has been submitted successfully! We'll review it soon.",
      });

      handleClose();
      onSuccess();

    } catch (error: any) {
      console.error('Error submitting modeling application:', error);
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit modeling application. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (purchasedProducts.length === 0 && isOpen) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Modeling Application</DialogTitle>
          </DialogHeader>
          
          <div className="text-center py-8">
            <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Fashion Products Purchased</h3>
            <p className="text-gray-400 mb-6">
              You need to purchase fashion products from our store before you can apply for modeling opportunities.
            </p>
            <Button
              onClick={handleClose}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Browse Fashion Store
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Submit Modeling Application</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="product">Select Fashion Product *</Label>
            <Select value={selectedProductId} onValueChange={setSelectedProductId} required>
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Choose a product you've purchased" />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                {purchasedProducts.map((product) => (
                  <SelectItem key={product.id} value={product.id} className="text-white">
                    {product.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Application Photos * (Max 8 photos)</Label>
            <MultiImagePicker
              selectedImages={selectedImages}
              onImagesChange={setSelectedImages}
              maxImages={8}
            />
            <p className="text-sm text-gray-400">
              Upload high-quality photos showcasing the selected fashion product
            </p>
          </div>

          <div>
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Tell us why you'd be perfect for modeling this product..."
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
            >
              {loading ? "Submitting..." : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Application
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ModelingApplicationModal;
