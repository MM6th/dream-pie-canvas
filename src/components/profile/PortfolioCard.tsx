import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { DollarSign, ShoppingCart } from "lucide-react";
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
  description: string | null;
  is_for_sale: boolean;
  price: number | null;
  created_at: string;
  portfolio_images: PortfolioImage[];
}

interface PortfolioCardProps {
  portfolio: Portfolio;
  onPurchase?: (portfolioId: string) => void;
}

const PortfolioCard = ({ portfolio, onPurchase }: PortfolioCardProps) => {
  const getImageUrl = (filePath: string) => {
    const { data } = supabase.storage.from('user-media').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const sortedImages = [...portfolio.portfolio_images].sort((a, b) => a.display_order - b.display_order);

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-white text-xl mb-2">{portfolio.title}</CardTitle>
            {portfolio.description && (
              <p className="text-gray-400 text-sm">{portfolio.description}</p>
            )}
          </div>
          {portfolio.is_for_sale && portfolio.price && (
            <Badge className="bg-green-600 text-white ml-4">
              <DollarSign className="w-3 h-3 mr-1" />
              ${portfolio.price.toFixed(2)}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {sortedImages.length > 0 && (
          <Carousel className="w-full mb-4">
            <CarouselContent>
              {sortedImages.map((img) => (
                <CarouselItem key={img.id}>
                  <div className="aspect-video relative rounded-lg overflow-hidden bg-gray-900">
                    <img
                      src={getImageUrl(img.image_path)}
                      alt={`Portfolio image ${img.display_order}`}
                      className={`w-full h-full object-contain ${img.is_blurred ? 'blur-md' : ''}`}
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            {sortedImages.length > 1 && (
              <>
                <CarouselPrevious className="text-white bg-gray-800 hover:bg-gray-700 border-gray-600" />
                <CarouselNext className="text-white bg-gray-800 hover:bg-gray-700 border-gray-600" />
              </>
            )}
          </Carousel>
        )}

        {portfolio.is_for_sale && onPurchase && (
          <Button
            onClick={() => onPurchase(portfolio.id)}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Purchase Portfolio - ${portfolio.price?.toFixed(2)}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default PortfolioCard;
