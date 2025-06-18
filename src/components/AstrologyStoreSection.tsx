
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

const AstrologyStoreSection = () => {
  const { user } = useAuth();

  const { data: astrologyProducts, isLoading } = useQuery({
    queryKey: ['astrology-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('astrology_products')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const handlePurchase = async (productId: string, price: number) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to purchase products.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-astrology-payment', {
        body: { 
          productId, 
          userId: user.id,
          amount: price 
        }
      });

      if (error) throw error;

      if (data?.approvalUrl) {
        window.location.href = data.approvalUrl;
      }
    } catch (error) {
      console.error('Error creating payment:', error);
      toast({
        title: "Error",
        description: "Failed to process payment. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="mb-12">
        <h2 className="text-3xl font-bold text-white mb-6">Astrology Services</h2>
        <div className="text-center text-white">Loading astrology products...</div>
      </div>
    );
  }

  if (!astrologyProducts || astrologyProducts.length === 0) {
    return null;
  }

  return (
    <div className="mb-12">
      <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-2">
        <Star className="w-8 h-8 text-purple-400" />
        Astrology Services
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {astrologyProducts.map((product) => (
          <Card key={product.id} className="bg-gray-800 border-gray-700 hover:border-purple-500 transition-colors">
            {product.thumbnail_url && (
              <CardHeader className="p-0">
                <img
                  src={product.thumbnail_url}
                  alt={product.title}
                  className="w-full h-48 object-cover rounded-t-lg"
                />
              </CardHeader>
            )}
            <CardContent className="p-6">
              <CardTitle className="text-white text-xl mb-2">{product.title}</CardTitle>
              <p className="text-gray-300 text-sm mb-4 line-clamp-3">{product.description}</p>
              
              <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {product.delivery_type === 'telephone' ? 'Phone Call' : 
                   product.delivery_type === 'audio_file' ? 'Audio File' :
                   product.delivery_type === 'video_file' ? 'Video File' : 'Digital Delivery'}
                </div>
                <Badge variant="outline" className="border-purple-400 text-purple-400">
                  ${product.total_price}
                </Badge>
              </div>

              <Button
                onClick={() => handlePurchase(product.id, product.total_price)}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              >
                Purchase Reading - ${product.total_price}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AstrologyStoreSection;
