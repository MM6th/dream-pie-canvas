
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Upload, Loader2, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import ImagePicker from "./ImagePicker";

interface AstrologyProductUploadModalProps {
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

const AstrologyProductUploadModal = ({ isOpen, onClose, onSuccess }: AstrologyProductUploadModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    product_type: '',
    description: '',
    delivery_type: '',
    hours_selected: 1,
    is_adult_content: false,
    discount_percentage: ''
  });
  const [thumbnailUrl, setThumbnailUrl] = useState('');

  const calculateTotalPrice = () => {
    if (!formData.product_type || !formData.delivery_type) return 0;
    
    const basePrice = getBasePrice(formData.product_type, formData.delivery_type);
    
    let price = basePrice;
    if (formData.delivery_type === 'telephone') {
      price = basePrice * formData.hours_selected;
    }
    
    // Apply discount if any
    const discountValue = parseFloat(formData.discount_percentage as any) || 0;
    if (discountValue > 0) {
      price = price - (price * (discountValue / 100));
    }
    
    return parseFloat(price.toFixed(2));
  };

  const getTitle = () => {
    const selectedType = productTypes.find(type => type.value === formData.product_type);
    return selectedType ? selectedType.label : '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const totalPrice = calculateTotalPrice();
      const title = getTitle();

      const { error } = await supabase
        .from('astrology_products')
        .insert({
          admin_id: user.id,
          product_type: formData.product_type as any,
          title: title,
          description: formData.description,
          delivery_type: formData.delivery_type as any,
          base_price: getBasePrice(formData.product_type, formData.delivery_type),
          hours_selected: formData.delivery_type === 'telephone' ? formData.hours_selected : 1,
          total_price: totalPrice,
          buyer_email: null,
          thumbnail_url: thumbnailUrl || null,
          is_adult_content: formData.is_adult_content
        });

      if (error) {
        console.error('Error creating astrology product:', error);
        throw error;
      }

      toast({
        title: "Success",
        description: "Astrology product created successfully!"
      });

      onSuccess();
      onClose();
      setFormData({
        product_type: '',
        description: '',
        delivery_type: '',
        hours_selected: 1,
        is_adult_content: false,
        discount_percentage: ''
      });
      setThumbnailUrl('');
    } catch (error: any) {
      console.error('Error creating astrology product:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create astrology product. Please try again.",
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
            <Upload className="w-5 h-5" />
            Create Astrology Product
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
                <SelectValue placeholder="Select product type" className="text-white" />
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

          {formData.product_type && (
            <div className="p-3 bg-gray-700 rounded-lg">
              <p className="text-white font-medium">Product Title: {getTitle()}</p>
              <p className="text-gray-400 text-sm">This will be displayed in the store</p>
            </div>
          )}

          <div>
            <Label htmlFor="description">Description*</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter product description"
              className="bg-gray-700 border-gray-600 text-white"
              rows={3}
              required
            />
          </div>

          <div>
            <Label>Thumbnail Image</Label>
            <ImagePicker
              onImageSelect={setThumbnailUrl}
              currentImageUrl={thumbnailUrl}
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
            <div>
              <Label htmlFor="hours">Hours*</Label>
              <input
                id="hours"
                type="number"
                min="1"
                value={formData.hours_selected}
                onChange={(e) => setFormData(prev => ({ ...prev, hours_selected: parseInt(e.target.value) || 1 }))}
                className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2"
                required
              />
            </div>
          )}

          <div>
            <Label htmlFor="discount">Discount Percentage (Optional)</Label>
            <input
              id="discount"
              type="number"
              min="0"
              max="100"
              value={formData.discount_percentage}
              onChange={(e) => setFormData(prev => ({ ...prev, discount_percentage: e.target.value }))}
              placeholder="0"
              className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2"
            />
            <p className="text-sm text-gray-400 mt-1">Enter a percentage (0-100) to discount the final price</p>
          </div>

          {/* Adult Content Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg border border-gray-600">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-orange-400" />
              <div>
                <Label htmlFor="adult_content" className="text-white font-medium">
                  Adult/Mature Content
                </Label>
                <p className="text-sm text-gray-400">
                  Mark this if your service contains adult or mature themes (18+)
                </p>
              </div>
            </div>
            <Switch
              id="adult_content"
              checked={formData.is_adult_content}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_adult_content: checked }))}
            />
          </div>

          {formData.delivery_type && !formData.delivery_type.includes('telephone') && (
            <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
              <p className="text-blue-300 text-sm">
                📧 <strong>Important:</strong> When a customer purchases this product, they will be prompted to provide their email address during checkout for file delivery.
              </p>
            </div>
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
              disabled={loading || !formData.product_type || !formData.delivery_type || !formData.description}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Create Product
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AstrologyProductUploadModal;
