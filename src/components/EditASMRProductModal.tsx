import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Shield, AudioLines } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import MultiImagePicker from "@/components/MultiImagePicker";

interface ASMRProduct {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  audio_file_url: string;
  advance_fee_rate: number | null;
  number_of_opportunities: number | null;
  opportunities_exhausted: boolean | null;
  back_end_royalties: boolean | null;
  pie_photo_editing: boolean | null;
  cover_photos: string[] | null;
  access_level: string;
  is_adult_content: boolean | null;
  artist_name: string | null;
  price: number | null;
  is_free: boolean;
}

interface EditASMRProductModalProps {
  product: ASMRProduct;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const EditASMRProductModal = ({ product, open, onOpenChange, onSuccess }: EditASMRProductModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    artistName: "",
    accessLevel: "public" as "public" | "merchant_only" | "paid",
    price: "",
    advanceFeeRate: "",
    numberOfOpportunities: "",
    backEndRoyalties: false,
    piePhotoEditing: false,
    isAdultContent: false,
    thumbnail: null as File | null
  });

  useEffect(() => {
    if (product) {
      setFormData({
        title: product.title || "",
        description: product.description || "",
        artistName: product.artist_name || "",
        accessLevel: product.access_level as "public" | "merchant_only" | "paid",
        price: product.price?.toString() || "",
        advanceFeeRate: product.advance_fee_rate?.toString() || "",
        numberOfOpportunities: product.number_of_opportunities?.toString() || "",
        backEndRoyalties: product.back_end_royalties || false,
        piePhotoEditing: product.pie_photo_editing || false,
        isAdultContent: product.is_adult_content || false,
        thumbnail: null
      });
    }
  }, [product]);

  const uploadFile = async (file: File, bucket: string, folder: string = '') => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file);
    
    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);
    
    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      // Upload new thumbnail if provided
      let thumbnailUrl = product.thumbnail_url;
      if (formData.thumbnail) {
        thumbnailUrl = await uploadFile(formData.thumbnail, 'thumbnails', `${user.id}/`);
      }


      const updateData: any = {
        title: formData.title,
        description: formData.description || null,
        artist_name: formData.artistName || null,
        access_level: formData.accessLevel,
        is_free: formData.accessLevel !== 'paid',
        price: formData.accessLevel === 'paid' ? parseFloat(formData.price) : null,
        advance_fee_rate: formData.advanceFeeRate ? parseFloat(formData.advanceFeeRate) : null,
        number_of_opportunities: formData.numberOfOpportunities ? parseInt(formData.numberOfOpportunities) : null,
        back_end_royalties: formData.backEndRoyalties,
        pie_photo_editing: formData.piePhotoEditing,
        is_adult_content: formData.isAdultContent,
        thumbnail_url: thumbnailUrl,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('audio_products')
        .update(updateData)
        .eq('id', product.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "ASMR product updated successfully!"
      });

      onSuccess();
    } catch (error: any) {
      console.error('Error updating ASMR product:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update ASMR product",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, thumbnail: file }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] bg-gray-800 border-gray-700 text-white overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Edit ASMR Product</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="bg-gray-700 border-gray-600 text-white"
              placeholder="Enter ASMR product title"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="bg-gray-700 border-gray-600 text-white"
              placeholder="Describe the ASMR opportunity"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="artistName">Artist Name</Label>
            <Input
              id="artistName"
              value={formData.artistName}
              onChange={(e) => setFormData(prev => ({ ...prev, artistName: e.target.value }))}
              className="bg-gray-700 border-gray-600 text-white"
              placeholder="Enter artist name"
            />
          </div>

          <div className="space-y-3">
            <Label>Current Thumbnail</Label>
            {product.thumbnail_url ? (
              <div className="flex items-center gap-4">
                <img
                  src={product.thumbnail_url}
                  alt="Current thumbnail"
                  className="w-20 h-20 object-cover rounded-lg border border-gray-600"
                />
                <div className="text-sm text-gray-400">
                  Current thumbnail image
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-gray-700 rounded-lg border border-gray-600 flex items-center justify-center">
                  <AudioLines className="w-8 h-8 text-gray-400" />
                </div>
                <div className="text-sm text-gray-400">
                  No thumbnail currently set
                </div>
              </div>
            )}
            
            <div>
              <Label htmlFor="thumbnail">Upload New Thumbnail (Optional)</Label>
              <Input
                id="thumbnail"
                type="file"
                accept="image/*"
                onChange={handleThumbnailChange}
                className="bg-gray-700 border-gray-600 text-white"
              />
              <p className="text-xs text-gray-400 mt-1">
                Leave empty to keep current thumbnail
              </p>
            </div>
          </div>

          <div>
            <Label>Access Level *</Label>
            <RadioGroup
              value={formData.accessLevel}
              onValueChange={(value) => setFormData(prev => ({ 
                ...prev, 
                accessLevel: value as "public" | "merchant_only" | "paid"
              }))}
              className="mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="public" id="public-edit" className="text-white" />
                <Label htmlFor="public-edit" className="text-white">Free for Everyone</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="merchant_only" id="merchant_only-edit" className="text-white" />
                <Label htmlFor="merchant_only-edit" className="text-white">Merchant Download Only</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="paid" id="paid-edit" className="text-white" />
                <Label htmlFor="paid-edit" className="text-white">Paid Content</Label>
              </div>
            </RadioGroup>
          </div>

          {formData.accessLevel === 'paid' && (
            <div>
              <Label htmlFor="price">Price ($)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="0.00"
              />
            </div>
          )}

          {formData.accessLevel === 'merchant_only' && (
            <div className="space-y-4 p-4 bg-blue-700/20 rounded-lg border border-blue-600">
              <h4 className="text-white font-medium">ASMR Opportunity Settings</h4>
              
              <div>
                <Label htmlFor="advanceFeeRate">Advance Fee Rate ($)</Label>
                <Input
                  id="advanceFeeRate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.advanceFeeRate}
                  onChange={(e) => setFormData(prev => ({ ...prev, advanceFeeRate: e.target.value }))}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="e.g., 50.00"
                />
              </div>

              <div>
                <Label htmlFor="numberOfOpportunities">Number of Opportunities</Label>
                <Input
                  id="numberOfOpportunities"
                  type="number"
                  min="1"
                  value={formData.numberOfOpportunities}
                  onChange={(e) => setFormData(prev => ({ ...prev, numberOfOpportunities: e.target.value }))}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="e.g., 3 (Leave empty for unlimited)"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="backEndRoyalties-edit"
                  checked={formData.backEndRoyalties}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, backEndRoyalties: checked as boolean }))}
                />
                <Label htmlFor="backEndRoyalties-edit" className="text-white">Back-End Royalties</Label>
              </div>

              {formData.backEndRoyalties && (
                <div className="ml-6 space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="piePhotoEditing-edit"
                  checked={formData.piePhotoEditing}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, piePhotoEditing: checked as boolean }))}
                />
                <Label htmlFor="piePhotoEditing-edit" className="text-white">PIE Photo Editing Service Available</Label>
                <p className="text-xs text-gray-400 ml-2">(Merchants can upload photos when applying)</p>
              </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg border border-gray-600">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-orange-400" />
              <div>
                <Label htmlFor="isAdultContent-edit" className="text-white font-medium">
                  Adult/Mature Content
                </Label>
                <p className="text-sm text-gray-400">
                  Mark this if content contains adult or mature themes (18+)
                </p>
              </div>
            </div>
            <Switch
              id="isAdultContent-edit"
              checked={formData.isAdultContent}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isAdultContent: checked }))}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              variant="outline"
              className="border-gray-600 text-white bg-transparent hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? 'Updating...' : 'Update Product'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditASMRProductModal;
