
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, X, Plus, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import MultiImagePicker from "./MultiImagePicker";

interface FashionProductUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ProductImage {
  url: string;
  order: number;
}

interface SizeVariant {
  size: string;
  colors: {
    [color: string]: number;
  };
}

const SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL'];
const COLORS = ['black', 'white', 'nude', 'red', 'blue', 'pink', 'green'];

const FashionProductUploadModal = ({ isOpen, onClose, onSuccess }: FashionProductUploadModalProps) => {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [materials, setMaterials] = useState("");
  const [price, setPrice] = useState("");
  const [shippingCost, setShippingCost] = useState("");
  const [images, setImages] = useState<ProductImage[]>([]);
  const [variants, setVariants] = useState<SizeVariant[]>(
    SIZES.map(size => ({
      size,
      colors: COLORS.reduce((acc, color) => ({ ...acc, [color]: 0 }), {})
    }))
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImagesSelected = (urls: string[]) => {
    const newImages = urls.map((url, index) => ({
      url,
      order: images.length + index
    }));
    setImages(prev => [...prev, ...newImages]);
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index).map((img, i) => ({ ...img, order: i })));
  };

  const handleStockChange = (sizeIndex: number, color: string, stock: number) => {
    setVariants(prev => prev.map((variant, index) => 
      index === sizeIndex 
        ? { ...variant, colors: { ...variant.colors, [color]: Math.max(0, stock) } }
        : variant
    ));
  };

  const handleSubmit = async () => {
    if (!user || !title.trim() || !price || images.length === 0) {
      toast({
        title: "Error",
        description: "Please fill in all required fields and add at least one image",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create fashion product
      const { data: product, error: productError } = await supabase
        .from('fashion_products')
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          materials: materials.trim() || null,
          price: parseFloat(price),
          shipping_cost: parseFloat(shippingCost) || 0,
          admin_id: user.id
        })
        .select()
        .single();

      if (productError) throw productError;

      // Insert images
      const imageInserts = images.map(img => ({
        fashion_product_id: product.id,
        image_url: img.url,
        display_order: img.order
      }));

      const { error: imagesError } = await supabase
        .from('fashion_product_images')
        .insert(imageInserts);

      if (imagesError) throw imagesError;

      // Insert variants with stock > 0
      const variantInserts = variants.flatMap(variant =>
        Object.entries(variant.colors)
          .filter(([_, stock]) => stock > 0)
          .map(([color, stock]) => ({
            fashion_product_id: product.id,
            size: variant.size as any,
            color: color as any,
            stock_quantity: stock
          }))
      );

      if (variantInserts.length > 0) {
        const { error: variantsError } = await supabase
          .from('fashion_product_variants')
          .insert(variantInserts);

        if (variantsError) throw variantsError;
      }

      toast({
        title: "Success",
        description: "Fashion product uploaded successfully!"
      });

      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Error uploading fashion product:', error);
      toast({
        title: "Error",
        description: "Failed to upload fashion product",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setTitle("");
    setDescription("");
    setMaterials("");
    setPrice("");
    setShippingCost("");
    setImages([]);
    setVariants(SIZES.map(size => ({
      size,
      colors: COLORS.reduce((acc, color) => ({ ...acc, [color]: 0 }), {})
    })));
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl bg-gray-800 border-gray-700 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload Fashion Product
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title" className="text-sm font-medium">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Product title"
                className="mt-1 bg-gray-700 border-gray-600 text-white"
              />
            </div>

            <div>
              <Label htmlFor="materials" className="text-sm font-medium">Materials</Label>
              <Input
                id="materials"
                value={materials}
                onChange={(e) => setMaterials(e.target.value)}
                placeholder="e.g., 100% Cotton, Polyester blend"
                className="mt-1 bg-gray-700 border-gray-600 text-white"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description" className="text-sm font-medium">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Product description"
              className="mt-1 bg-gray-700 border-gray-600 text-white"
              rows={3}
            />
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price" className="text-sm font-medium">Price ($) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="29.99"
                className="mt-1 bg-gray-700 border-gray-600 text-white"
              />
            </div>

            <div>
              <Label htmlFor="shipping" className="text-sm font-medium">Shipping Cost ($)</Label>
              <Input
                id="shipping"
                type="number"
                step="0.01"
                value={shippingCost}
                onChange={(e) => setShippingCost(e.target.value)}
                placeholder="5.99 (depends on location, shipped ground USPS)"
                className="mt-1 bg-gray-700 border-gray-600 text-white"
              />
            </div>
          </div>

          {/* Images */}
          <div>
            <Label className="text-sm font-medium">Product Images * (Max 8)</Label>
            <div className="mt-2 space-y-4">
              <MultiImagePicker
                onImagesSelected={handleImagesSelected}
                maxImages={8}
                currentImageCount={images.length}
              />
              
              {images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {images.map((image, index) => (
                    <div key={index} className="relative">
                      <img
                        src={image.url}
                        alt={`Product ${index + 1}`}
                        className="w-full h-24 object-cover rounded border border-gray-600"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white rounded-full w-6 h-6 p-0"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Size/Color/Stock Matrix */}
          <div>
            <Label className="text-sm font-medium">Size, Color & Stock</Label>
            <div className="mt-2 space-y-4">
              {variants.map((variant, sizeIndex) => (
                <Card key={variant.size} className="bg-gray-700 border-gray-600">
                  <CardContent className="p-4">
                    <h4 className="font-medium text-white mb-3">Size {variant.size}</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                      {COLORS.map(color => (
                        <div key={color} className="space-y-1">
                          <Label className="text-xs capitalize">{color}</Label>
                          <div className="flex items-center space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStockChange(sizeIndex, color, variant.colors[color] - 1)}
                              className="w-6 h-6 p-0 border-gray-500"
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-8 text-center text-sm">{variant.colors[color]}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStockChange(sizeIndex, color, variant.colors[color] + 1)}
                              className="w-6 h-6 p-0 border-gray-500"
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1 border-gray-600 text-white bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmitting ? "Uploading..." : "Upload Product"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FashionProductUploadModal;
