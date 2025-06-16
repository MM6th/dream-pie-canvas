
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface FashionProductSlideshowProps {
  images: Array<{
    id: string;
    image_url: string;
    display_order: number;
  }>;
  productTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

const FashionProductSlideshow = ({ images, productTitle, isOpen, onClose }: FashionProductSlideshowProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  const sortedImages = images.sort((a, b) => a.display_order - b.display_order);

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % sortedImages.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + sortedImages.length) % sortedImages.length);
  };

  const goToImage = (index: number) => {
    setCurrentIndex(index);
  };

  if (sortedImages.length === 0) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-gray-800 border-gray-700">
        <div className="relative">
          <img
            src={sortedImages[currentIndex].image_url}
            alt={`${productTitle} - Image ${currentIndex + 1}`}
            className="w-full h-auto max-h-[80vh] object-contain"
          />
          
          {/* Navigation arrows */}
          {sortedImages.length > 1 && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={prevImage}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={nextImage}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </>
          )}

          {/* Image counter */}
          <div className="absolute bottom-4 right-4 bg-black/50 text-white text-sm px-2 py-1 rounded">
            {currentIndex + 1} / {sortedImages.length}
          </div>
        </div>

        {/* Thumbnail navigation */}
        {sortedImages.length > 1 && (
          <div className="flex gap-2 mt-4 overflow-x-auto justify-center">
            {sortedImages.map((image, index) => (
              <button
                key={image.id}
                onClick={() => goToImage(index)}
                className={`flex-shrink-0 w-12 h-12 rounded border-2 overflow-hidden ${
                  index === currentIndex ? "border-blue-500" : "border-gray-600"
                }`}
              >
                <img
                  src={image.image_url}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FashionProductSlideshow;
