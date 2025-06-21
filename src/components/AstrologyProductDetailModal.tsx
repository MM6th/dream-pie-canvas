
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Star } from "lucide-react";

interface AstrologyProduct {
  id: string;
  title: string;
  description: string | null;
  base_price: number;
  thumbnail_url: string | null;
  delivery_type: string | null;
  total_price: number;
  created_at: string;
}

interface AstrologyProductDetailModalProps {
  product: AstrologyProduct;
  isOpen: boolean;
  onClose: () => void;
  onPurchase: (productId: string, price: number) => void;
}

const AstrologyProductDetailModal = ({ product, isOpen, onClose, onPurchase }: AstrologyProductDetailModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-gray-800 border-gray-700 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">{product.title}</DialogTitle>
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

          {/* Product Details */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-white">${product.total_price}</div>
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
                  <span className="font-semibold">${product.total_price}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Method:</span>
                  <span className="capitalize">{product.delivery_type || 'Standard'}</span>
                </div>
              </div>
            </div>

            {/* Book Reading Button */}
            <Button
              onClick={() => onPurchase(product.id, product.total_price)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              Book Reading - ${product.total_price}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AstrologyProductDetailModal;
