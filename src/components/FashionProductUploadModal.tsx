
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Minus, Save, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import MultiImagePicker from "./MultiImagePicker";

interface FashionProductUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL'] as const;
const COLORS = ['black', 'white', 'red', 'blue', 'green', 'pink', 'nude'] as const;

type SizeType = typeof SIZES[number];
type ColorType = typeof COLORS[number];

const FashionProductUploadModal = ({ isOpen, onClose, onSuccess }: FashionProductUploadModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [materials, setMaterials] = useState("");
  const [price, setPrice] = useState("");
  const [shippingCost, setShippingCost] = useState("0");
  const [isAdultContent, setIsAdultContent] = useState(false);
  const [accessLevel, setAccessLevel] = useState<"public" | "merchant_only">("public");
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [variants, setVariants] = useState<Array<{
    size: SizeType;
    color: ColorType;
    stock_quantity: number;
  }>>([]);
  const [newColor, setNewColor] = useState<ColorType | "">("");

  const handleClose = () => {
    setTitle("");
    setDescription("");
    setMaterials("");
    setPrice("");
    setShippingCost("0");
    setIsAdultContent(false);
    setAccessLevel("public");
    setSelectedImages([]);
    setVariants([]);
    setNewColor("");
    onClose();
  };

  const updateVariantStock = (index: number, delta: number) => {
    setVariants(prev => prev.map((variant, i) => 
      i === index 
        ? { ...variant, stock_quantity: Math.max(0, variant.stock_quantity + delta) }
        : variant
    ));
  };

  const addNewColorVariants = () => {
    if (!newColor.trim()) return;
    
    const newVariants = SIZES.map(size => ({
      size,
      color: newColor as ColorType,
      stock_quantity: 0
    }));
    
    setVariants(prev => [...prev, ...newVariants]);
    setNewColor("");
  };

  const uploadImages = async (): Promise<string[]> => {
    const imageUrls: string[] = [];
    
    for (const image of selectedImages) {
      const fileExt = image.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `fashion-products/${fileName}`;

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
        description: "You must be logged in to upload products",
        variant: "destructive"
      });
      return;
    }

    if (selectedImages.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one product image",
        variant: "destructive"
      });
      return;
    }

    if (variants.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one size/color variant",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      console.log('Starting fashion product upload...');
      
      // Upload images first
      console.log('Uploading images...');
      const imageUrls = await uploadImages();
      console.log('Images uploaded successfully:', imageUrls.length);

      // Create fashion product
      console.log('Creating fashion product...');
      const { data: product, error: productError } = await supabase
        .from('fashion_products')
        .insert({
          admin_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          materials: materials.trim() || null,
          price: parseFloat(price),
          shipping_cost: parseFloat(shippingCost),
          is_adult_content: isAdultContent,
          access_level: accessLevel
        })
        .select()
        .single();

      if (productError) {
        console.error('Product creation error:', productError);
        throw productError;
      }

      console.log('Fashion product created successfully:', product.id);

      // Create product images
      console.log('Creating product images...');
      const imageInserts = imageUrls.map((url, index) => ({
        fashion_product_id: product.id,
        image_url: url,
        display_order: index
      }));

      const { error: imageError } = await supabase
        .from('fashion_product_images')
        .insert(imageInserts);

      if (imageError) {
        console.error('Image creation error:', imageError);
        throw imageError;
      }

      console.log('Product images created successfully');

      // Create variants with proper type casting
      console.log('Creating product variants...');
      const variantInserts = variants.map(variant => ({
        fashion_product_id: product.id,
        size: variant.size as SizeType,
        color: variant.color as ColorType,
        stock_quantity: variant.stock_quantity
      }));

      const { error: variantError } = await supabase
        .from('fashion_product_variants')
        .insert(variantInserts);

      if (variantError) {
        console.error('Variant creation error:', variantError);
        throw variantError;
      }

      console.log('Product variants created successfully');

      // Success! Show success toast
      toast({
        title: "Success",
        description: `Fashion product "${title}" uploaded successfully with ${variants.length} variants`,
      });

      // Clean up and close
      handleClose();
      onSuccess();

    } catch (error: any) {
      console.error('Error uploading fashion product:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload fashion product. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const groupedVariants = variants.reduce((acc, variant, index) => {
    const key = variant.color;
    if (!acc[key]) acc[key] = [];
    acc[key].push({ ...variant, index });
    return acc;
  }, {} as Record<string, Array<any>>);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Upload Fashion Product</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Product Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>

            <div>
              <Label htmlFor="materials">Materials</Label>
              <Input
                id="materials"
                value={materials}
                onChange={(e) => setMaterials(e.target.value)}
                placeholder="e.g., 100% Cotton"
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>

            <div>
              <Label htmlFor="price">Price ($) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>

            <div>
              <Label htmlFor="shipping">Shipping Cost ($)</Label>
              <Input
                id="shipping"
                type="number"
                step="0.01"
                min="0"
                value={shippingCost}
                onChange={(e) => setShippingCost(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>

          {/* Access Level Selector */}
          <div>
            <Label htmlFor="access_level">Access Level *</Label>
            <select
              id="access_level"
              value={accessLevel}
              onChange={(e) => setAccessLevel(e.target.value as "public" | "merchant_only")}
              className="w-full bg-gray-700 border-gray-600 text-white rounded px-3 py-2"
            >
              <option value="public">Public (Everyone can purchase)</option>
              <option value="merchant_only">Merchants Only</option>
            </select>
            <p className="text-sm text-gray-400 mt-1">
              Merchants Only products are only visible and purchasable by approved merchants
            </p>
          </div>

          {/* Adult Content Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg border border-gray-600">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-orange-400" />
              <div>
                <Label htmlFor="adult_content_fashion" className="text-white font-medium">
                  Adult/Mature Content
                </Label>
                <p className="text-sm text-gray-400">
                  Mark this if your fashion item is intended for adult/mature audiences (18+)
                </p>
              </div>
            </div>
            <Switch
              id="adult_content_fashion"
              checked={isAdultContent}
              onCheckedChange={setIsAdultContent}
            />
          </div>

          {/* Product Images */}
          <div className="space-y-2">
            <Label>Product Images *</Label>
            <MultiImagePicker
              selectedImages={selectedImages}
              onImagesChange={setSelectedImages}
              maxImages={8}
            />
          </div>

          {/* Inventory Management */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Inventory Management</h3>
            
            {Object.entries(groupedVariants).map(([color, colorVariants]) => (
              <div key={color} className="border border-gray-600 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium capitalize text-lg">{color}</h4>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {colorVariants.map(({ size, stock_quantity, index }) => (
                    <div key={`${color}-${size}`} className="flex items-center justify-between bg-gray-700 p-2 rounded">
                      <span className="text-sm font-medium">{size}</span>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => updateVariantStock(index, -1)}
                          className="w-6 h-6 p-0"
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center text-sm">{stock_quantity}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => updateVariantStock(index, 1)}
                          className="w-6 h-6 p-0"
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Add New Color */}
            <div className="border border-gray-600 rounded-lg p-4">
              <h4 className="font-medium mb-3">Add Color Variants</h4>
              <div className="flex gap-2">
                <select
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value as ColorType)}
                  className="bg-gray-700 border-gray-600 text-white rounded px-3 py-2 flex-1"
                >
                  <option value="">Select a color</option>
                  {COLORS.filter(color => !Object.keys(groupedVariants).includes(color)).map(color => (
                    <option key={color} value={color}>{color}</option>
                  ))}
                </select>
                <Button
                  type="button"
                  onClick={addNewColorVariants}
                  disabled={!newColor}
                  variant="outline"
                  className="border-blue-500 text-blue-400"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Color
                </Button>
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
            >
              {loading ? "Uploading..." : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Upload Product
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

export default FashionProductUploadModal;
