
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface AstrologyProduct {
  id: string;
  title: string;
  description: string | null;
  price: number;
  thumbnail_url: string | null;
  delivery_type: string | null;
  total_price: number;
  created_at: string;
}

const AstrologyStoreSection = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<AstrologyProduct[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handlePurchase = async (productId: string, price: number) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to make a purchase",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-astrology-payment', {
        body: {
          productId: productId,
          amount: price,
          currency: 'USD'
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
        description: "Failed to create payment. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="text-center text-white">Loading astrology services...</div>
    );
  }

  if (products.length === 0) {
    return (
      <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
        <CardContent className="p-8 text-center">
          <p className="text-gray-400">No astrology services available yet. Check back soon!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Astrology Services</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <Card key={product.id} className="bg-gray-800/50 border-gray-700 backdrop-blur-sm hover:bg-gray-700/50 transition-colors">
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
              <div className="flex items-start justify-between mb-3">
                <CardTitle className="text-white text-lg">{product.title}</CardTitle>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  <Badge variant="outline" className="border-yellow-500 text-yellow-500">
                    New
                  </Badge>
                </div>
              </div>
              
              {product.description && (
                <p className="text-gray-300 text-sm mb-4 line-clamp-3">{product.description}</p>
              )}
              
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl font-bold text-white">${product.total_price}</span>
                {product.delivery_type && (
                  <div className="flex items-center gap-1 text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm capitalize">{product.delivery_type}</span>
                  </div>
                )}
              </div>
              
              <Button
                onClick={() => handlePurchase(product.id, product.total_price)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                Book Reading
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AstrologyStoreSection;
