
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Music, Download, ShoppingCart, DollarSign } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import FashionStoreSection from "./FashionStoreSection";
import AstrologyStoreSection from "./AstrologyStoreSection";

interface AudioProduct {
  id: string;
  title: string;
  artist_name: string | null;
  audio_file_url: string;
  thumbnail_url: string | null;
  is_free: boolean;
  price: number | null;
  access_level: "public" | "merchant_only" | "paid" | null;
  audio_type: string;
}

const StorePage = () => {
  const { user } = useAuth();
  const [audioProducts, setAudioProducts] = useState<AudioProduct[]>([]);
  const [loadingAudio, setLoadingAudio] = useState(true);

  useEffect(() => {
    fetchAudioProducts();
  }, []);

  const fetchAudioProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('audio_products')
        .select('*')
        .in('access_level', ['public', 'paid'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching audio products:', error);
      } else {
        setAudioProducts(data || []);
      }
    } catch (error) {
      console.error('Error fetching audio products:', error);
    } finally {
      setLoadingAudio(false);
    }
  };

  const handlePurchase = async (product: AudioProduct) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to make purchases.",
        variant: "destructive"
      });
      return;
    }

    if (product.is_free) {
      // Handle free download
      try {
        const { error } = await supabase
          .from('user_purchases')
          .insert({
            user_id: user.id,
            audio_product_id: product.id,
            amount_paid: 0,
            is_free_download: true
          });

        if (error) throw error;

        toast({
          title: "Success!",
          description: "Free track added to your collection!"
        });
      } catch (error) {
        console.error('Error adding free track:', error);
        toast({
          title: "Error",
          description: "Failed to add track to your collection.",
          variant: "destructive"
        });
      }
    } else {
      // Handle paid purchase
      try {
        const response = await fetch('/api/create-paypal-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            productId: product.id,
            userId: user.id,
            amount: product.price
          }),
        });

        const data = await response.json();
        
        if (data.approval_url) {
          window.location.href = data.approval_url;
        }
      } catch (error) {
        console.error('Error creating payment:', error);
        toast({
          title: "Error",
          description: "Failed to create payment. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  return (
    <div className="space-y-12">
      {/* Audio Products Section */}
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-2">
            <Music className="w-8 h-8 text-blue-400" />
            Music Collection
          </h2>
          <p className="text-gray-300">Discover amazing tracks from our artists</p>
        </div>

        {loadingAudio ? (
          <div className="text-center text-white">Loading music...</div>
        ) : audioProducts.length === 0 ? (
          <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
            <CardContent className="text-center py-8">
              <Music className="w-12 h-12 text-blue-400 mx-auto mb-4" />
              <p className="text-gray-400">No music available at the moment.</p>
            </CardContent>
          </Card>
        ) : (
          <Carousel
            opts={{
              align: "start",
              loop: audioProducts.length > 3,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {audioProducts.map((product) => (
                <CarouselItem key={product.id} className="pl-4 md:basis-1/3 lg:basis-1/4">
                  <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm h-full flex flex-col">
                    {product.thumbnail_url && (
                      <div className="relative h-56 overflow-hidden rounded-t-lg">
                        <img
                          src={product.thumbnail_url}
                          alt={product.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-4 right-4">
                          {product.is_free ? (
                            <Badge className="bg-green-600 text-white">Free</Badge>
                          ) : (
                            <Badge className="bg-blue-600 text-white">
                              ${product.price}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <CardHeader className="flex-grow">
                      <div className="flex items-center gap-2 mb-2">
                        <Music className="w-4 h-4 text-blue-400" />
                        <Badge variant="outline" className="text-blue-300 border-blue-300">
                          {product.audio_type}
                        </Badge>
                      </div>
                      <CardTitle className="text-white text-lg">{product.title}</CardTitle>
                      {product.artist_name && (
                        <p className="text-gray-400 text-sm">by {product.artist_name}</p>
                      )}
                    </CardHeader>

                    <CardContent className="pt-0">
                      <Button
                        onClick={() => handlePurchase(product)}
                        className={`w-full ${
                          product.is_free
                            ? "bg-green-600 hover:bg-green-700"
                            : "bg-blue-600 hover:bg-blue-700"
                        } text-white flex items-center gap-2`}
                        disabled={!user}
                      >
                        {!user ? (
                          "Login to Access"
                        ) : product.is_free ? (
                          <>
                            <Download className="w-4 h-4" />
                            Free Download
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="w-4 h-4" />
                            Buy ${product.price}
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="text-white bg-gray-800 hover:bg-gray-700 border-gray-600" />
            <CarouselNext className="text-white bg-gray-800 hover:bg-gray-700 border-gray-600" />
          </Carousel>
        )}
      </div>

      {/* Fashion Products Section */}
      <FashionStoreSection />

      {/* Astrology Services Section */}
      <AstrologyStoreSection />
    </div>
  );
};

export default StorePage;
