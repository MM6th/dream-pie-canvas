
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Edit, Loader2, Shield, CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import ImagePicker from "./ImagePicker";
import VideoUpload from "./VideoUpload";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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
  is_adult_content?: boolean;
  discount_percentage?: number;
  sale_end_date?: string | null;
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
  { value: 'career_path_reading', label: 'Career Path Reading' },
  { value: 'horoscope_reading', label: 'Horoscope Reading' }
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
    career_path_reading: { telephone: 75, audio_file: 500, video_file: 550 },
    horoscope_reading: { telephone: 75, audio_file: 75, video_file: 100 }
  };
  
  return prices[productType]?.[deliveryType] || 0;
};

const EditAstrologyProductModal = ({ product, isOpen, onClose, onSuccess }: EditAstrologyProductModalProps) => {
  const [loading, setLoading] = useState(false);
  
  // Calculate discount percentage from existing prices if not set
  const calculateExistingDiscount = () => {
    if (product.discount_percentage && product.discount_percentage > 0) {
      return product.discount_percentage.toString();
    }
    // If total_price is less than base_price, calculate the discount
    if (product.total_price < product.base_price) {
      const discount = ((product.base_price - product.total_price) / product.base_price) * 100;
      return Math.round(discount).toString();
    }
    return '';
  };
  
  const [formData, setFormData] = useState({
    product_type: product.product_type,
    description: product.description || '',
    delivery_type: product.delivery_type,
    hours_selected: product.hours_selected,
    discount_percentage: calculateExistingDiscount()
  });
  const [thumbnailUrl, setThumbnailUrl] = useState(product.thumbnail_url || '');
  const [advertisementVideoUrl, setAdvertisementVideoUrl] = useState((product as any).advertisement_video_url || '');
  const [isAdultContent, setIsAdultContent] = useState(product.is_adult_content || false);
  const [saleEndDate, setSaleEndDate] = useState<Date | undefined>(
    product.sale_end_date ? new Date(product.sale_end_date) : undefined
  );

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

    setLoading(true);
    try {
      const totalPrice = calculateTotalPrice();
      const title = getTitle();

      const discountValue = parseFloat(formData.discount_percentage as any) || 0;
      
      const { error } = await supabase
        .from('astrology_products')
        .update({
          product_type: formData.product_type as any,
          title: title,
          description: formData.description,
          delivery_type: formData.delivery_type as any,
          base_price: getBasePrice(formData.product_type, formData.delivery_type),
          hours_selected: formData.delivery_type === 'telephone' ? formData.hours_selected : 1,
          total_price: totalPrice,
          buyer_email: null,
          thumbnail_url: thumbnailUrl || null,
          advertisement_video_url: advertisementVideoUrl || null,
          is_adult_content: isAdultContent,
          discount_percentage: discountValue,
          sale_end_date: saleEndDate ? saleEndDate.toISOString() : null,
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
            <div className="space-y-2">
              <ImagePicker
                onImageSelect={setThumbnailUrl}
                currentImageUrl={thumbnailUrl}
              />
              {thumbnailUrl && (
                <div className="relative w-full h-32 rounded-lg overflow-hidden border border-gray-600 bg-gray-900">
                  <img
                    src={thumbnailUrl}
                    alt="Thumbnail preview"
                    className="w-full h-full object-contain"
                  />
                  <p className="absolute bottom-0 left-0 right-0 bg-green-500/90 text-white text-xs text-center py-1">
                    Image uploaded successfully
                  </p>
                </div>
              )}
            </div>
          </div>

          <div>
            <Label className="text-gray-200">Advertisement Video (Optional)</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Upload a video to showcase your product in the store
            </p>
            <div className="space-y-2">
              <VideoUpload
                onVideoSelect={setAdvertisementVideoUrl}
                currentVideoUrl={advertisementVideoUrl}
              />
              {advertisementVideoUrl && (
                <div className="relative w-full rounded-lg overflow-hidden border border-gray-600 bg-gray-900">
                  <video 
                    src={advertisementVideoUrl} 
                    controls
                    className="w-full h-48 object-contain"
                  />
                  <p className="absolute bottom-0 left-0 right-0 bg-green-500/90 text-white text-xs text-center py-1">
                    Video uploaded successfully
                  </p>
                </div>
              )}
            </div>
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

          {/* Sale End Date Picker */}
          {formData.discount_percentage && parseFloat(formData.discount_percentage) > 0 && (
            <div>
              <Label>Sale End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-gray-700 border-gray-600 text-white hover:bg-gray-600",
                      !saleEndDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {saleEndDate ? format(saleEndDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-gray-800 border-gray-600" align="start">
                  <Calendar
                    mode="single"
                    selected={saleEndDate}
                    onSelect={setSaleEndDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              <p className="text-sm text-gray-400 mt-1">Select when the sale should end (price will revert to base price)</p>
            </div>
          )}

          {/* Adult Content Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg border border-gray-600">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-orange-400" />
              <div>
                <Label htmlFor="adult_content_astrology" className="text-white font-medium">
                  Adult/Mature Content
                </Label>
                <p className="text-sm text-gray-400">
                  Mark this if your product contains adult or mature themes (18+)
                </p>
              </div>
            </div>
            <Switch
              id="adult_content_astrology"
              checked={isAdultContent}
              onCheckedChange={setIsAdultContent}
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
