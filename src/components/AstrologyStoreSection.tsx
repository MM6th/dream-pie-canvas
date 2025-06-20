
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Sparkles, Clock, Mail, Calendar, ExternalLink } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

interface AstrologyProduct {
  id: string;
  title: string;
  description: string | null;
  product_type: string;
  delivery_type: string;
  base_price: number;
  hours_selected: number | null;
  total_price: number;
  thumbnail_url: string | null;
  admin_id: string;
}

interface AstrologyStoreSectionProps {
  isDashboard?: boolean;
}

const AstrologyStoreSection = ({ isDashboard = false }: AstrologyStoreSectionProps) => {
  const { user } = useAuth();
  const [products, setProducts] = useState<AstrologyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<AstrologyProduct | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('astrology_products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching astrology products:', error);
      } else {
        setProducts(data || []);
      }
    } catch (error) {
      console.error('Error fetching astrology products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (product: AstrologyProduct) => {
    if (!user) {
      alert('Please log in to make a purchase');
      return;
    }

    try {
      const response = await fetch('/api/create-astrology-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: product.id,
          userId: user.id,
          amount: product.total_price,
          productType: product.product_type,
          deliveryType: product.delivery_type,
          hoursSelected: product.hours_selected
        }),
      });

      const data = await response.json();
      
      if (data.approval_url) {
        window.location.href = data.approval_url;
      }
    } catch (error) {
      console.error('Error creating payment:', error);
      alert('Failed to create payment. Please try again.');
    }
  };

  const getDeliveryIcon = (deliveryType: string) => {
    switch (deliveryType) {
      case 'email':
        return <Mail className="w-4 h-4" />;
      case 'video_call':
        return <ExternalLink className="w-4 h-4" />;
      default:
        return <Calendar className="w-4 h-4" />;
    }
  };

  const truncateDescription = (description: string | null, maxLength: number = 100) => {
    if (!description) return null;
    if (description.length <= maxLength) return description;
    return description.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div className="text-center text-white">
        <Sparkles className="w-8 h-8 animate-spin mx-auto mb-2" />
        Loading astrology services...
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
        <CardContent className="text-center py-8">
          <Sparkles className="w-12 h-12 text-purple-400 mx-auto mb-4" />
          <p className="text-gray-400">No astrology services available at the moment.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {!isDashboard && (
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-2">
            <Sparkles className="w-8 h-8 text-purple-400" />
            Astrology Services
          </h2>
          <p className="text-gray-300">Discover your cosmic journey with personalized readings</p>
        </div>
      )}

      <Carousel
        opts={{
          align: "start",
          loop: products.length > 3,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-4">
          {products.map((product) => (
            <CarouselItem key={product.id} className={`pl-4 ${isDashboard ? 'md:basis-1/4 lg:basis-1/5' : 'md:basis-1/3 lg:basis-1/4'}`}>
              <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm h-full flex flex-col">
                {product.thumbnail_url && (
                  <div className={`relative overflow-hidden rounded-t-lg ${isDashboard ? 'h-80' : 'h-56'}`}>
                    <img
                      src={product.thumbnail_url}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-4 right-4">
                      <Badge className="bg-purple-600 text-white">
                        ${product.total_price}
                      </Badge>
                    </div>
                  </div>
                )}
                
                <CardHeader className="flex-grow">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    <Badge variant="outline" className="text-purple-300 border-purple-300">
                      {product.product_type.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                  <CardTitle className="text-white text-lg">{product.title}</CardTitle>
                  {product.description && (
                    <div>
                      <p className="text-gray-400 text-sm line-clamp-3">
                        {truncateDescription(product.description, isDashboard ? 80 : 100)}
                      </p>
                      {product.description.length > (isDashboard ? 80 : 100) && (
                        <button
                          onClick={() => setSelectedProduct(product)}
                          className="text-purple-400 text-sm hover:text-purple-300 mt-1"
                        >
                          See more
                        </button>
                      )}
                    </div>
                  )}
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="flex items-center justify-between text-sm text-gray-400 mb-4">
                    <div className="flex items-center gap-1">
                      {getDeliveryIcon(product.delivery_type)}
                      <span>{product.delivery_type.replace('_', ' ')}</span>
                    </div>
                    {product.hours_selected && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{product.hours_selected}h</span>
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={() => handlePurchase(product)}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                    disabled={!user}
                  >
                    {!user ? 'Login to Purchase' : `Purchase - $${product.total_price}`}
                  </Button>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="text-white bg-gray-800 hover:bg-gray-700 border-gray-600" />
        <CarouselNext className="text-white bg-gray-800 hover:bg-gray-700 border-gray-600" />
      </Carousel>

      {/* Product Details Modal */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl text-purple-400 flex items-center gap-2">
              <Sparkles className="w-6 h-6" />
              {selectedProduct?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              {selectedProduct.thumbnail_url && (
                <img
                  src={selectedProduct.thumbnail_url}
                  alt={selectedProduct.title}
                  className="w-full h-64 object-cover rounded-lg"
                />
              )}
              <div className="flex items-center gap-2">
                <Badge className="bg-purple-600 text-white">
                  ${selectedProduct.total_price}
                </Badge>
                <Badge variant="outline" className="text-purple-300 border-purple-300">
                  {selectedProduct.product_type.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
              {selectedProduct.description && (
                <p className="text-gray-300">{selectedProduct.description}</p>
              )}
              <div className="flex items-center justify-between text-sm text-gray-400">
                <div className="flex items-center gap-1">
                  {getDeliveryIcon(selectedProduct.delivery_type)}
                  <span>{selectedProduct.delivery_type.replace('_', ' ')}</span>
                </div>
                {selectedProduct.hours_selected && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{selectedProduct.hours_selected}h</span>
                  </div>
                )}
              </div>
              <Button
                onClick={() => handlePurchase(selectedProduct)}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                disabled={!user}
              >
                {!user ? 'Login to Purchase' : `Purchase - $${selectedProduct.total_price}`}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AstrologyStoreSection;
