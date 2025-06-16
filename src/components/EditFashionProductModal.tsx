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

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const COLORS = ['black', 'white', 'red', 'blue', 'green', 'yellow', 'pink', 'purple', 'gray', 'brown'];

const EditFashionProductModal = ({ isOpen, onClose, product, onSuccess }: EditFashionProductModalProps) => {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [materials, setMaterials] = useState("");
  const [price, setPrice] = useState("");
  const [shippingCost, setShippingCost] = useState("");
  const [variants, setVariants] = useState<Array<{
    id?: string;
    size: string;
    color: string;
    stock_quantity: number;
    isNew?: boolean;
  }>>([]);
  const [newColor, setNewColor] = useState("");

  useEffect(() => {
    if (product && isOpen) {
      setTitle(product.title);
      setDescription(product.description || "");
      setMaterials(product.materials || "");
      setPrice(product.price.toString());
      setShippingCost(product.shipping_cost.toString());
      setVariants(product.fashion_product_variants.map(v => ({
        ...v,
        isNew: false
      })));
    }
  }, [product, isOpen]);

  const handleClose = () => {
    setTitle("");
    setDescription("");
    setMaterials("");
    setPrice("");
    setShippingCost("");
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
    setVariants(prev => prev.filter((_, i) => i !== index));
  };

  const addNewColorVariants = () => {
    if (!newColor.trim()) return;
    
    const newVariants = SIZES.map(size => ({
      size,
      color: newColor.toLowerCase(),
      stock_quantity: 0,
      isNew: true
    }));
    
    setVariants(prev => [...prev, ...newVariants]);
    setNewColor("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    setLoading(true);
    try {
      // Update main product details
      const { error: productError } = await supabase
        .from('fashion_products')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          materials: materials.trim() || null,
          price: parseFloat(price),
          shipping_cost: parseFloat(shippingCost),
          updated_at: new Date().toISOString()
        })
        .eq('id', product.id);

      if (productError) throw productError;

      // Handle variant updates
      for (const variant of variants) {
        if (variant.isNew) {
          // Insert new variant - fix TypeScript error by properly casting types
          const { error } = await supabase
            .from('fashion_product_variants')
            .insert({
              fashion_product_id: product.id,
              size: variant.size as any,
              color: variant.color as any,
              stock_quantity: variant.stock_quantity
            });
          if (error) throw error;
        } else if (variant.id) {
          // Update existing variant
          const { error } = await supabase
            .from('fashion_product_variants')
            .update({
              stock_quantity: variant.stock_quantity,
              updated_at: new Date().toISOString()
            })
            .eq('id', variant.id);
          if (error) throw error;
        }
      }

      // Delete variants that were removed
      const existingIds = product.fashion_product_variants.map(v => v.id);
      const updatedIds = variants.filter(v => v.id).map(v => v.id);
      const deletedIds = existingIds.filter(id => !updatedIds.includes(id));

      if (deletedIds.length > 0) {
        const { error } = await supabase
          .from('fashion_product_variants')
          .delete()
          .in('id', deletedIds);
        if (error) throw error;
      }

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
        description: "Failed to update fashion product",
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
                      const indices = colorVariants.map(v => v.index).sort((a, b) => b - a);
                      setVariants(prev => prev.filter((_, i) => !indices.includes(i)));
                    }}
                    className="border-red-500 text-red-400 hover:bg-red-500 hover:text-white"
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
              <h4 className="font-medium mb-3">Add New Color</h4>
              <div className="flex gap-2">
                <select
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
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
                  className="border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white"
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
