import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus, Trash2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface FashionProduct {
  id: string;
  title: string;
  description: string | null;
  materials: string | null;
  price: number;
  shipping_cost: number;
  access_level?: string | null;
  fashion_product_variants: Array<{
    id: string;
    size: string;
    color: string;
    stock_quantity: number;
  }>;
}

interface EditFashionProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: FashionProduct | null;
  onSuccess: () => void;
}

const SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL'] as const;
const COLORS = ['black', 'white', 'red', 'blue', 'green', 'pink', 'nude'] as const;

type SizeType = typeof SIZES[number];
type ColorType = typeof COLORS[number];

const EditFashionProductModal = ({ isOpen, onClose, product, onSuccess }: EditFashionProductModalProps) => {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [materials, setMaterials] = useState("");
  const [price, setPrice] = useState("");
  const [shippingCost, setShippingCost] = useState("");
  const [accessLevel, setAccessLevel] = useState("public");
  const [variants, setVariants] = useState<Array<{
    id?: string;
    size: SizeType;
    color: ColorType;
    stock_quantity: number;
    isNew?: boolean;
    toDelete?: boolean;
  }>>([]);
  const [newColor, setNewColor] = useState<ColorType | "">("");

  useEffect(() => {
    if (product && isOpen) {
      setTitle(product.title);
      setDescription(product.description || "");
      setMaterials(product.materials || "");
      setPrice(product.price.toString());
      setShippingCost(product.shipping_cost.toString());
      setAccessLevel(product.access_level || "public");
      setVariants(product.fashion_product_variants.map(v => ({
        ...v,
        size: v.size as SizeType,
        color: v.color as ColorType,
        isNew: false,
        toDelete: false
      })));
    }
  }, [product, isOpen]);

  const handleClose = () => {
    setTitle("");
    setDescription("");
    setMaterials("");
    setPrice("");
    setShippingCost("");
    setAccessLevel("public");
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

  const deleteVariant = (index: number) => {
    setVariants(prev => prev.map((variant, i) => 
      i === index 
        ? { ...variant, toDelete: true }
        : variant
    ));
  };

  const addNewColorVariants = () => {
    if (!newColor.trim()) return;
    
    const newVariants = SIZES.map(size => ({
      size,
      color: newColor as ColorType,
      stock_quantity: 0,
      isNew: true,
      toDelete: false
    }));
    
    setVariants(prev => [...prev, ...newVariants]);
    setNewColor("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    setLoading(true);
    try {
      console.log('Starting product update...');

      // Update main product details
      const { error: productError } = await supabase
        .from('fashion_products')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          materials: materials.trim() || null,
          price: parseFloat(price),
          shipping_cost: parseFloat(shippingCost),
          access_level: accessLevel,
          updated_at: new Date().toISOString()
        })
        .eq('id', product.id);

      if (productError) {
        console.error('Product update error:', productError);
        throw productError;
      }

      console.log('Product updated successfully');

      // Handle variant deletions first
      const variantsToDelete = variants.filter(v => v.toDelete && v.id);
      if (variantsToDelete.length > 0) {
        const deleteIds = variantsToDelete.map(v => v.id).filter(Boolean);
        const { error: deleteError } = await supabase
          .from('fashion_product_variants')
          .delete()
          .in('id', deleteIds);
        
        if (deleteError) {
          console.error('Variant deletion error:', deleteError);
          throw deleteError;
        }
        console.log('Deleted variants:', deleteIds.length);
      }

      // Handle new variants
      const newVariants = variants.filter(v => v.isNew && !v.toDelete);
      if (newVariants.length > 0) {
        const variantInserts = newVariants.map(variant => ({
          fashion_product_id: product.id,
          size: variant.size as SizeType,
          color: variant.color as ColorType,
          stock_quantity: variant.stock_quantity
        }));

        const { error: insertError } = await supabase
          .from('fashion_product_variants')
          .insert(variantInserts);
        
        if (insertError) {
          console.error('Variant insertion error:', insertError);
          throw insertError;
        }
        console.log('Inserted new variants:', newVariants.length);
      }

      // Handle existing variant updates
      const existingVariants = variants.filter(v => !v.isNew && !v.toDelete && v.id);
      for (const variant of existingVariants) {
        if (variant.id) {
          const { error: updateError } = await supabase
            .from('fashion_product_variants')
            .update({
              stock_quantity: variant.stock_quantity,
              updated_at: new Date().toISOString()
            })
            .eq('id', variant.id);
          
          if (updateError) {
            console.error('Variant update error:', updateError);
            throw updateError;
          }
        }
      }

      console.log('All variants updated successfully');

      toast({
        title: "Success",
        description: "Fashion product updated successfully"
      });

      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Error updating fashion product:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update fashion product",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const activeVariants = variants.filter(v => !v.toDelete);
  const groupedVariants = activeVariants.reduce((acc, variant, index) => {
    const key = variant.color;
    if (!acc[key]) acc[key] = [];
    acc[key].push({ ...variant, index: variants.indexOf(variant) });
    return acc;
  }, {} as Record<string, Array<any>>);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Edit Fashion Product</DialogTitle>
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
              <Label htmlFor="shipping">Shipping Cost ($) *</Label>
              <Input
                id="shipping"
                type="number"
                step="0.01"
                min="0"
                value={shippingCost}
                onChange={(e) => setShippingCost(e.target.value)}
                required
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

          {/* Access Level Selection */}
          <div className="space-y-2">
            <Label>Access Level</Label>
            <div className="flex gap-4">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  value="public"
                  checked={accessLevel === "public"}
                  onChange={(e) => setAccessLevel(e.target.value)}
                  className="text-blue-600"
                />
                <span className="text-white">Public (All users)</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  value="merchant_only"
                  checked={accessLevel === "merchant_only"}
                  onChange={(e) => setAccessLevel(e.target.value)}
                  className="text-blue-600"
                />
                <span className="text-white">Merchant Only</span>
              </label>
            </div>
            {accessLevel === "merchant_only" && (
              <p className="text-sm text-yellow-400">
                This product will only be visible and purchasable by approved merchants.
              </p>
            )}
          </div>

          {/* Inventory Management */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Inventory Management</h3>
            
            {Object.entries(groupedVariants).map(([color, colorVariants]) => (
              <div key={color} className="border border-gray-600 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium capitalize text-lg">{color}</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const indices = colorVariants.map(v => v.index);
                      indices.forEach(index => deleteVariant(index));
                    }}
                    className="border-red-500 text-red-400 bg-black hover:bg-gray-800"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Remove Color
                  </Button>
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
                          className="w-6 h-6 p-0 bg-black text-white hover:bg-gray-800"
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center text-sm">{stock_quantity}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => updateVariantStock(index, 1)}
                          className="w-6 h-6 p-0 bg-black text-white hover:bg-gray-800"
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
              <h4 className="font-medium mb-3">Add New Color</h4>
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
                  className="border-blue-500 text-blue-400 bg-black hover:bg-gray-800"
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
              className="bg-blue-600 text-white flex-1 hover:bg-blue-700"
            >
              {loading ? "Updating..." : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Update Product
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="bg-black text-white hover:bg-gray-800"
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditFashionProductModal;
