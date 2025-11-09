
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Star, AlertTriangle } from "lucide-react";

interface AstrologyProduct {
  id: string;
  title: string;
  description: string | null;
  base_price: number;
  thumbnail_url: string | null;
  delivery_type: string | null;
  total_price: number;
  created_at: string;
  is_adult_content?: boolean;
  discount_percentage?: number;
  sale_end_date?: string | null;
}

interface AstrologyProductDetailModalProps {
  product: AstrologyProduct;
  isOpen: boolean;
  onClose: () => void;
  onPurchase: (productId: string, price: number) => void;
}

const AstrologyProductDetailModal = ({ product, isOpen, onClose, onPurchase }: AstrologyProductDetailModalProps) => {
  // Check if sale has expired
  const isSaleExpired = product.sale_end_date && new Date(product.sale_end_date) < new Date();
  const hasDiscount = product.discount_percentage && product.discount_percentage > 0 && !isSaleExpired;
  const displayPrice = isSaleExpired ? product.base_price : product.total_price;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-gray-800 border-gray-700 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            {product.title}
            {hasDiscount && (
              <Badge className="bg-green-600 text-white">
                {product.discount_percentage}% OFF
              </Badge>
            )}
            {product.is_adult_content && (
              <Badge variant="destructive" className="bg-red-600 text-white">
                <AlertTriangle className="w-3 h-3 mr-1" />
                18+
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Product Image */}
          {product.thumbnail_url && (
            <img
              src={product.thumbnail_url}
              alt={product.title}
              className="w-full h-64 object-fill rounded-lg"
            />
          )}

          {/* Adult Content Warning */}
          {product.is_adult_content && (
            <div className="p-3 bg-red-900/20 border border-red-600/30 rounded-lg">
              <p className="text-red-300 text-sm">
                <strong>Mature Content:</strong> This content is marked for mature audiences (18+) 
                as it may contain sexually suggestive material, seductive content, excessive skin exposure, 
                or wardrobe malfunctions.
              </p>
            </div>
          )}

          {/* Product Details */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                {hasDiscount ? (
                  <>
                    <span className="text-lg text-gray-400 line-through">${product.base_price}</span>
                    <span className="text-2xl font-bold text-green-400">${displayPrice}</span>
                  </>
                ) : (
                  <span className="text-2xl font-bold text-white">${displayPrice}</span>
                )}
              </div>
              {product.delivery_type && (
                <div className="flex items-center gap-2 text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm capitalize">{product.delivery_type}</span>
                </div>
              )}
            </div>

            {/* Full Description */}
            {product.description && (
              <div>
                <h4 className="text-lg font-semibold text-white mb-2">About This Reading</h4>
                <p className="text-gray-300 leading-relaxed">{product.description}</p>
              </div>
            )}

            {/* Service Details */}
            <div className="bg-gray-700/50 p-4 rounded-lg">
              <h4 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                <Star className="w-5 h-5" />
                Service Details
              </h4>
              <div className="space-y-2 text-sm text-gray-300">
                <div className="flex justify-between">
                  <span>Base Price:</span>
                  <span>${product.base_price}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Price:</span>
                  <span className="font-semibold">${displayPrice}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Method:</span>
                  <span className="capitalize">{product.delivery_type || 'Standard'}</span>
                </div>
              </div>
            </div>

            {/* Book Reading Button */}
            <Button
              onClick={() => onPurchase(product.id, displayPrice)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              Book Reading - ${displayPrice}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AstrologyProductDetailModal;
