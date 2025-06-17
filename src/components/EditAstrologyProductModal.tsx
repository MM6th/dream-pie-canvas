
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Edit, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import ImagePicker from "./ImagePicker";

interface AstrologyProduct {
  id: string;
  product_type: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  delivery_type: string;
  base_price: number;
  hours_selected: number;
  total_price: number;
  buyer_email: string | null;
}

interface EditAstrologyProductModalProps {
  product: AstrologyProduct;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const productTypes = [
  { value: 'natal_chart_reading', label: 'Natal Chart Reading' },
  { value: 'solar_return_reading', label: 'Solar Return Reading' },
  { value: 'north_node_reading', label: 'North Node Reading' },
  { value: 'career_path_reading', label: 'Career Path Reading' }
];

const deliveryTypes = [
  { value: 'telephone', label: 'Telephone Consultation' },
  { value: 'audio_file', label: 'Audio File' },
  { value: 'video_file', label: 'Video File' }
];

const getBasePrice = (productType: string, deliveryType: string): number => {
  const prices = {
    natal_chart_reading: { telephone: 75, audio_file: 250, video_file: 300 },
    solar_return_reading: { telephone: 75, audio_file: 350, video_file: 400 },
    north_node_reading: { telephone: 75, audio_file: 400, video_file: 450 },
    career_path_reading: { telephone: 75, audio_file: 500, video_file: 550 }
  };
  
  return prices[productType]?.[deliveryType] || 0;
};

const EditAstrologyProductModal = ({ product, isOpen, onClose, onSuccess }: EditAstrologyProductModalProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    product_type: product.product_type,
    title: product.title,
    description: product.description || '',
    delivery_type: product.delivery_type,
    hours_selected: product.hours_selected,
    buyer_email: product.buyer_email || ''
  });
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);

  const calculateTotalPrice = () => {
    if (!formData.product_type || !formData.delivery_type) return 0;
    
    const basePrice = getBasePrice(formData.product_type, formData.delivery_type);
    
    if (formData.delivery_type === 'telephone') {
      return basePrice * formData.hours_selected;
    }
    
    return basePrice;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    try {
      let thumbnailUrl = product.thumbnail_url;

      if (thumbnailFile) {
        const fileExt = thumbnailFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
        const filePath = `astrology-products/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('user-media')
          .upload(filePath, thumbnailFile);

        if (uploadError) {
          console.error('Error uploading thumbnail:', uploadError);
          throw uploadError;
        }

        const { data: urlData } = supabase.storage
          .from('user-media')
          .getPublicUrl(filePath);

        thumbnailUrl = urlData.publicUrl;
      }

      const totalPrice = calculateTotalPrice();

      const { error } = await supabase
        .from('astrology_products')
        .update({
          product_type: formData.product_type,
          title: formData.title,
          description: formData.description,
          delivery_type: formData.delivery_type,
          base_price: getBasePrice(formData.product_type, formData.delivery_type),
          hours_selected: formData.delivery_type === 'telephone' ? formData.hours_selected : 1,
          total_price: totalPrice,
          buyer_email: formData.delivery_type === 'telephone' ? formData.buyer_email : null,
          thumbnail_url: thumbnailUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', product.id);

      if (error) {
        console.error('Error updating astrology product:', error);
        throw error;
      }

      toast({
        title: "Success",
        description: "Astrology product updated successfully!"
      });

      onSuccess();
    } catch (error: any) {
      console.error('Error updating astrology product:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update astrology product. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-gray-800 border-gray-700 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5" />
            Edit Astrology Product
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="product_type">Product Type*</Label>
            <Select 
              value={formData.product_type} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, product_type: value }))}
            >
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Select product type" />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                {productTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value} className="text-white">
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="title">Title*</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter product title"
              className="bg-gray-700 border-gray-600 text-white"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter product description"
              className="bg-gray-700 border-gray-600 text-white"
              rows={3}
            />
          </div>

          <div>
            <Label>Thumbnail Image</Label>
            <ImagePicker
              onImageSelected={setThumbnailFile}
              currentImage={thumbnailFile}
              existingImageUrl={product.thumbnail_url}
            />
          </div>

          <div>
            <Label htmlFor="delivery_type">Delivery Type*</Label>
            <Select 
              value={formData.delivery_type} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, delivery_type: value }))}
            >
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Select delivery type" />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                {deliveryTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value} className="text-white">
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.delivery_type === 'telephone' && (
            <>
              <div>
                <Label htmlFor="hours">Hours*</Label>
                <Input
                  id="hours"
                  type="number"
                  min="1"
                  value={formData.hours_selected}
                  onChange={(e) => setFormData(prev => ({ ...prev, hours_selected: parseInt(e.target.value) || 1 }))}
                  className="bg-gray-700 border-gray-600 text-white"
                  required
                />
              </div>
              <div>
                <Label htmlFor="buyer_email">Buyer Email (for contact)*</Label>
                <Input
                  id="buyer_email"
                  type="email"
                  value={formData.buyer_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, buyer_email: e.target.value }))}
                  placeholder="Enter buyer's email for contact"
                  className="bg-gray-700 border-gray-600 text-white"
                  required
                />
              </div>
            </>
          )}

          {formData.product_type && formData.delivery_type && (
            <div className="p-4 bg-gray-700 rounded-lg">
              <p className="text-white font-medium">
                Total Price: ${calculateTotalPrice()}
                {formData.delivery_type === 'telephone' && (
                  <span className="text-gray-400 text-sm ml-2">
                    (${getBasePrice(formData.product_type, formData.delivery_type)} × {formData.hours_selected} hour{formData.hours_selected > 1 ? 's' : ''})
                  </span>
                )}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-gray-600 text-white bg-transparent"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.product_type || !formData.title || !formData.delivery_type}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Edit className="w-4 h-4 mr-2" />
                  Update Product
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditAstrologyProductModal;
