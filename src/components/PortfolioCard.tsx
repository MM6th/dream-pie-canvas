import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { FolderOpen, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PortfolioImage {
  id: string;
  image_path: string;
  display_order: number;
  is_blurred: boolean;
}

interface Portfolio {
  id: string;
  title: string;
  description?: string;
  is_for_sale: boolean;
  price?: number;
  created_at: string;
  portfolio_images: PortfolioImage[];
}

interface PortfolioCardProps {
  portfolio: Portfolio;
}

const PortfolioCard = ({ portfolio }: PortfolioCardProps) => {
  const getImageUrl = (filePath: string) => {
    const { data } = supabase.storage
      .from('user-media')
      .getPublicUrl(filePath);
    return data.publicUrl;
  };

  // Sort images by display_order
  const sortedImages = [...portfolio.portfolio_images].sort(
    (a, b) => a.display_order - b.display_order
  );

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-blue-400" />
            <CardTitle className="text-white">{portfolio.title}</CardTitle>
          </div>
          {portfolio.is_for_sale && portfolio.price && (
            <Badge className="bg-green-600 text-white">
              <DollarSign className="w-3 h-3 mr-1" />
              ${portfolio.price.toFixed(2)}
            </Badge>
          )}
        </div>
        {portfolio.description && (
          <p className="text-gray-400 text-sm mt-2">{portfolio.description}</p>
        )}
      </CardHeader>
      <CardContent>
        <Carousel
          className="w-full"
          opts={{
            align: "start",
            loop: true,
          }}
        >
          <CarouselContent className="-ml-2 md:-ml-4">
            {sortedImages.map((image) => (
              <CarouselItem key={image.id} className="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/3">
                <div className="relative aspect-square overflow-hidden rounded-lg">
                  <img
                    src={getImageUrl(image.image_path)}
                    alt={`Portfolio image ${image.display_order}`}
                    className={`w-full h-full object-cover ${
                      image.is_blurred ? 'filter blur-lg' : ''
                    }`}
                  />
                  {image.is_blurred && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Badge variant="secondary" className="bg-black/70 text-white">
                        Purchase to view
                      </Badge>
                    </div>
                  )}
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="text-white bg-gray-800 hover:bg-gray-700 border-gray-600" />
          <CarouselNext className="text-white bg-gray-800 hover:bg-gray-700 border-gray-600" />
        </Carousel>
        
        <div className="mt-4 text-xs text-gray-400">
          {sortedImages.length} image{sortedImages.length !== 1 ? 's' : ''}
        </div>
      </CardContent>
    </Card>
  );
};

export default PortfolioCard;
