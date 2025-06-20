
import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import ImageZoomModal from './ImageZoomModal';

interface PhotoGalleryProps {
  photos?: string[];
  className?: string;
}

const PhotoGallery = ({ photos: propPhotos, className = "" }: PhotoGalleryProps) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (propPhotos) {
      setPhotos(propPhotos);
      setLoading(false);
    } else {
      fetchPhotos();
    }
  }, [propPhotos]);

  const fetchPhotos = async () => {
    try {
      const { data, error } = await supabase
        .from('user_uploads')
        .select('file_path')
        .eq('file_type', 'image')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching photos:', error);
      } else {
        setPhotos(data?.map(item => item.file_path) || []);
      }
    } catch (error) {
      console.error('Error fetching photos:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center text-gray-400 py-8">
        Loading photos...
      </div>
    );
  }

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
              className="w-full h-48 object-fill"
            />
          </Card>
        ))}
      </div>

      <ImageZoomModal
        submittedImage={selectedImage || ''}
        currentImage={null}
        songTitle="Photo Gallery"
        artistName={null}
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
      />
    </>
  );
};

export default PhotoGallery;
