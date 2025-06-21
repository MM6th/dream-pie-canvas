
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Package, AlertTriangle } from "lucide-react";

interface FashionProduct {
  id: string;
  title: string;
  description: string | null;
  materials: string | null;
  price: number;
  shipping_cost: number;
  is_adult_content?: boolean;
  fashion_product_images: Array<{
    id: string;
    image_url: string;
    display_order: number;
  }>;
  fashion_product_variants: Array<{
    id: string;
    size: string;
    color: string;
    stock_quantity: number;
  }>;
}

interface ProductDetailModalProps {
  product: FashionProduct;
  isOpen: boolean;
  onClose: () => void;
  onPurchase: (product: FashionProduct) => void;
}

const ProductDetailModal = ({ product, isOpen, onClose, onPurchase }: ProductDetailModalProps) => {
  const getTotalStock = (variants: FashionProduct['fashion_product_variants']) => {
    return variants.reduce((total, variant) => total + variant.stock_quantity, 0);
  };

  const getVariantSummary = (variants: FashionProduct['fashion_product_variants']) => {
    const sizes = [...new Set(variants.map(v => v.size))].sort();
    const colors = [...new Set(variants.map(v => v.color))];
    return { sizes, colors };
  };

  const totalStock = getTotalStock(product.fashion_product_variants);
  const { sizes, colors } = getVariantSummary(product.fashion_product_variants);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-gray-800 border-gray-700 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            {product.title}
            {product.is_adult_content && (
              <Badge variant="destructive" className="bg-red-600 text-white">
                <AlertTriangle className="w-3 h-3 mr-1" />
                18+
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Product Images */}
          {product.fashion_product_images.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {product.fashion_product_images.slice(0, 4).map((image) => (
                <img
                  key={image.id}
                  src={image.image_url}
                  alt={product.title}
                  className="w-full h-48 object-fill rounded-lg"
                />
              ))}
            </div>
          )}

          {/* Product Details */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-white">${product.price.toFixed(2)}</div>
              <Badge variant={totalStock > 0 ? "default" : "destructive"}>
                <Package className="w-3 h-3 mr-1" />
                {totalStock} in stock
              </Badge>
            </div>

            <div className="text-sm text-gray-400">
              + ${product.shipping_cost.toFixed(2)} shipping
            </div>

            {/* Full Description */}
            {product.description && (
              <div>
                <h4 className="text-lg font-semibold text-white mb-2">Description</h4>
                <p className="text-gray-300">{product.description}</p>
              </div>
            )}

            {/* Materials */}
            {product.materials && (
              <div>
                <h4 className="text-lg font-semibold text-white mb-2">Materials</h4>
                <p className="text-gray-300">{product.materials}</p>
              </div>
            )}

            {/* Variants */}
            <div className="space-y-3">
              <div>
                <h4 className="text-lg font-semibold text-white mb-2">Available Sizes</h4>
                <div className="flex flex-wrap gap-2">
                  {sizes.map(size => (
                    <Badge key={size} variant="outline" className="border-gray-600 text-gray-300">
                      {size}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold text-white mb-2">Available Colors</h4>
                <div className="flex flex-wrap gap-2">
                  {colors.map(color => (
                    <Badge key={color} variant="outline" className="border-gray-600 text-gray-300 capitalize">
                      {color}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Purchase Button */}
            <Button
              onClick={() => onPurchase(product)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={totalStock === 0}
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              {totalStock === 0 ? 'Out of Stock' : 'Buy Now'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductDetailModal;
