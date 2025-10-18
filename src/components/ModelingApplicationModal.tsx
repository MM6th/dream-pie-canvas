
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Camera, Upload, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import MultiImagePicker from "./MultiImagePicker";

interface FashionProduct {
  id: string;
  title: string;
  price: number;
  access_level: "public" | "merchant_only" | "paid" | null;
  fashion_product_images: Array<{
    image_url: string;
  }>;
}

interface ModelingApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ModelingApplicationModal = ({ isOpen, onClose, onSuccess }: ModelingApplicationModalProps) => {
  const { user } = useAuth();
  const [step, setStep] = useState<'products' | 'photos'>('products');
  const [purchasedProducts, setPurchasedProducts] = useState<FashionProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<FashionProduct | null>(null);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [userType, setUserType] = useState<string>('');

  useEffect(() => {
    if (isOpen && user) {
      fetchPurchasedProducts();
    }
  }, [isOpen, user]);

  const fetchPurchasedProducts = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch user type first
      const { data: profileData } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', user.id)
        .single();
      
      setUserType(profileData?.user_type || '');

      const { data, error } = await supabase
        .from('fashion_purchases')
        .select(`
          fashion_product_id,
          fashion_products (
            id,
            title,
            price,
            access_level,
            fashion_product_images (
              image_url
            )
          )
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching purchased products:', error);
        return;
      }

      // Extract unique fashion products
      const uniqueProducts = new Map<string, FashionProduct>();
      data?.forEach(purchase => {
        if (purchase.fashion_products) {
          const product = purchase.fashion_products as any;
          uniqueProducts.set(product.id, product);
        }
      });

      let filteredProducts = Array.from(uniqueProducts.values());
      
      // Filter out merchant-only products for supporters
      if (profileData?.user_type === 'supporter') {
        filteredProducts = filteredProducts.filter(product => {
          const accessLevel = product.access_level || 'public';
          return accessLevel === 'public';
        });
      }

      setPurchasedProducts(filteredProducts);
    } catch (error) {
      console.error('Error fetching purchased products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelect = (product: FashionProduct) => {
    setSelectedProduct(product);
    setStep('photos');
  };

  const uploadImagesAndGetUrls = async (images: File[]): Promise<string[]> => {
    const uploadPromises = images.map(async (image) => {
      const fileExt = image.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
      const filePath = `modeling-photos/${user!.id}/${fileName}`;

      const { data, error } = await supabase.storage
        .from('user-media')
        .upload(filePath, image);

      if (error) {
        console.error('Error uploading image:', error);
        throw error;
      }

      const { data: publicUrlData } = supabase.storage
        .from('user-media')
        .getPublicUrl(filePath);

      return publicUrlData.publicUrl;
    });

    return Promise.all(uploadPromises);
  };

  const handleSubmitApplication = async () => {
    if (!user || !selectedProduct || selectedImages.length === 0) return;

    setSubmitting(true);
    try {
      // Upload images and get URLs
      const imageUrls = await uploadImagesAndGetUrls(selectedImages);

      const { error } = await supabase
        .from('modeling_applications')
        .insert({
          merchant_id: user.id,
          fashion_product_id: selectedProduct.id,
          application_photos: imageUrls,
          status: 'pending'
        });

      if (error) {
        console.error('Error submitting application:', error);
        toast({
          title: "Error",
          description: "Failed to submit modeling application. Please try again.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success",
        description: "Your modeling application has been submitted successfully!"
      });

      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error submitting application:', error);
      toast({
        title: "Error",
        description: "Failed to submit modeling application. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep('products');
    setSelectedProduct(null);
    setSelectedImages([]);
    onClose();
  };

  const handleBrowseStore = () => {
    handleClose();
    // This will trigger the parent component to switch to store view
    window.dispatchEvent(new CustomEvent('navigateToStore'));
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl bg-gray-800 border-gray-700 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Apply for Modeling
          </DialogTitle>
        </DialogHeader>

        {step === 'products' && (
          <div className="space-y-4">
            <p className="text-gray-400">
              Select a fashion product you've purchased to apply for modeling:
            </p>

            {loading ? (
              <div className="text-center py-8">
                <div className="text-gray-400">Loading your purchased products...</div>
              </div>
            ) : purchasedProducts.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Fashion Purchases Found</h3>
                <p className="text-gray-400 mb-4">
                  You need to purchase fashion products before applying for modeling opportunities.
                </p>
                <Button
                  onClick={handleBrowseStore}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Browse Store
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {purchasedProducts.map((product) => (
                  <Card key={product.id} className="bg-gray-700 border-gray-600 cursor-pointer hover:bg-gray-600 transition-colors">
                    <CardContent className="p-4">
                      {product.fashion_product_images?.[0] && (
                        <img
                          src={product.fashion_product_images[0].image_url}
                          alt={product.title}
                          className="w-full h-48 object-cover rounded-lg mb-3"
                        />
                      )}
                      <h3 className="text-white font-medium mb-2 line-clamp-2">{product.title}</h3>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="border-green-500 text-green-400">
                          <Check className="w-3 h-3 mr-1" />
                          Purchased
                        </Badge>
                        <Button
                          size="sm"
                          onClick={() => handleProductSelect(product)}
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          Select
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 'photos' && selectedProduct && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Upload Modeling Photos</h3>
                <p className="text-gray-400">
                  Upload photos of yourself modeling: {selectedProduct.title}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setStep('products')}
                className="border-gray-600 text-white"
              >
                Back
              </Button>
            </div>

            <MultiImagePicker
              selectedImages={selectedImages}
              onImagesChange={setSelectedImages}
              maxImages={10}
            />

            {selectedImages.length > 0 && (
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="border-gray-600 text-white"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitApplication}
                  disabled={submitting}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {submitting ? "Submitting..." : "Submit Application"}
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ModelingApplicationModal;
