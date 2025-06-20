
import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import ImageZoomModal from './ImageZoomModal';

interface PhotoGalleryProps {
  photos: string[];
  className?: string;
}

const PhotoGallery = ({ photos, className = "" }: PhotoGalleryProps) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (!photos || photos.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        No photos available
      </div>
    );
  }

  return (
    <>
      <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 ${className}`}>
        {photos.map((photo, index) => (
          <Card 
            key={index} 
            className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow bg-gray-800 border-gray-700"
            onClick={() => setSelectedImage(photo)}
          >
            <img
              src={photo}
              alt={`Photo ${index + 1}`}
              className="w-full h-48 object-cover"
            />
          </Card>
        ))}
      </div>

      <ImageZoomModal
        imageUrl={selectedImage}
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
      />
    </>
  );
};

export default PhotoGallery;
