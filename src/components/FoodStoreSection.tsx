import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { ChefHat, DollarSign, ShoppingCart, ChevronLeft, ChevronRight } from "lucide-react";
import SixthPriceTag from "./SixthPriceTag";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import ExpandableDescription from "@/components/ui/ExpandableDescription";

interface FoodProductImage {
  id: string;
  image_url: string;
  media_type: string;
  display_order: number;
}

interface FoodProduct {
  id: string;
  title: string;
  description: string | null;
  price: number;
  created_at: string;
  merchant_id: string;
  food_product_images: FoodProductImage[];
  profiles?: {
    display_name: string | null;
    business_name: string | null;
  };
}

const FoodStoreSection = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<FoodProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageIndexes, setImageIndexes] = useState<Record<string, number>>({});

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('food_products')
        .select(`
          id,
          title,
          description,
          price,
          created_at,
          merchant_id,
          food_product_images (
            id,
            image_url,
            media_type,
            display_order
          ),
          profiles:merchant_id (
            display_name,
            business_name
          )
        `)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching food products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handlePurchase = async (product: FoodProduct) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to purchase products",
        variant: "destructive"
      });
      return;
    }

    // For now, just show a toast - PayPal integration can be added later
    toast({
      title: "Coming Soon",
      description: "Food product purchases will be available soon!"
    });
  };

  const getSortedImages = (images: FoodProductImage[]) => {
    return [...images].sort((a, b) => a.display_order - b.display_order);
  };

  const nextImage = (productId: string, totalImages: number) => {
    setImageIndexes(prev => ({
      ...prev,
      [productId]: ((prev[productId] || 0) + 1) % totalImages
    }));
  };

  const prevImage = (productId: string, totalImages: number) => {
    setImageIndexes(prev => ({
      ...prev,
      [productId]: ((prev[productId] || 0) - 1 + totalImages) % totalImages
    }));
  };

  const getSellerName = (product: FoodProduct) => {
    return product.profiles?.display_name || product.profiles?.business_name || 'Unknown Seller';
  };

  if (loading) {
    return (
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <ChefHat className="w-6 h-6 text-orange-500" />
          Food Products
        </h2>
        <div className="text-gray-400">Loading food products...</div>
      </div>
    );
  }

  if (products.length === 0) {
    return null; // Don't show section if no products
  }

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
        <ChefHat className="w-6 h-6 text-orange-500" />
        Food Products
      </h2>
      
      <Carousel
        className="w-full"
        opts={{
          align: "start",
          loop: true,
        }}
      >
        <CarouselContent className="-ml-2 md:-ml-4">
          {products.map((product) => {
            const sortedImages = getSortedImages(product.food_product_images);
            const currentIndex = imageIndexes[product.id] || 0;
            const currentImage = sortedImages[currentIndex];
            
            return (
              <CarouselItem key={product.id} className="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm hover:bg-gray-800/70 transition-colors h-full">
                  <CardHeader className="p-4">
                    {/* Image/Video Carousel */}
                    <div className="relative w-full h-48 mb-3 rounded-lg overflow-hidden">
                      {currentImage ? (
                        currentImage.media_type === 'video' ? (
                          <video
                            src={currentImage.image_url}
                            className="w-full h-full object-cover"
                            controls
                          />
                        ) : (
                          <img
                            src={currentImage.image_url}
                            alt={product.title}
                            className="w-full h-full object-cover"
                          />
                        )
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-orange-600 to-red-600 flex items-center justify-center">
                          <ChefHat className="w-12 h-12 text-white" />
                        </div>
                      )}
                      
                      {/* Image navigation buttons */}
                      {sortedImages.length > 1 && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              prevImage(product.id, sortedImages.length);
                            }}
                            className="absolute left-2 top-1/2 -translate-y-1/2 p-1 bg-black/50 rounded-full hover:bg-black/70"
                          >
                            <ChevronLeft className="w-4 h-4 text-white" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              nextImage(product.id, sortedImages.length);
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 bg-black/50 rounded-full hover:bg-black/70"
                          >
                            <ChevronRight className="w-4 h-4 text-white" />
                          </button>
                          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                            {sortedImages.map((_, idx) => (
                              <div
                                key={idx}
                                className={`w-2 h-2 rounded-full ${idx === currentIndex ? 'bg-white' : 'bg-white/50'}`}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                    
                    <CardTitle className="text-white text-lg line-clamp-2">{product.title}</CardTitle>
                    <p className="text-gray-400 text-sm">by {getSellerName(product)}</p>
                    <ExpandableDescription 
                      description={product.description || ""}
                      maxLength={100}
                      className="mt-2"
                    />
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="flex items-center justify-between">
                      <Badge className="bg-green-600 hover:bg-green-700 flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        {product.price.toFixed(2)}
                      </Badge>
                      <SixthPriceTag usdPrice={product.price} />
                      <Button
                        size="sm"
                        onClick={() => handlePurchase(product)}
                        className="bg-orange-600 hover:bg-orange-700"
                      >
                        <ShoppingCart className="w-4 h-4 mr-1" />
                        Purchase
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <CarouselPrevious className="text-white bg-gray-800 hover:bg-gray-700 border-gray-600 -left-4" />
        <CarouselNext className="text-white bg-gray-800 hover:bg-gray-700 border-gray-600 -right-4" />
      </Carousel>
    </div>
  );
};

export default FoodStoreSection;
