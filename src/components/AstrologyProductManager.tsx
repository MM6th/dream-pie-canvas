import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  CarouselNext, 
  CarouselPrevious 
} from "@/components/ui/carousel";
import { Edit, Trash2, Star, Clock, FileAudio, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import EditAstrologyProductModal from "./EditAstrologyProductModal";

interface AstrologyProduct {
  id: string;
  product_type: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  delivery_type: string;
  base_price: number;
  hours_selected: number;
  total_price: number;
  buyer_email: string | null;
  created_at: string;
  discount_percentage?: number;
  sale_end_date?: string | null;
}

const AstrologyProductManager = () => {
  const [products, setProducts] = useState<AstrologyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<AstrologyProduct | null>(null);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('astrology_products')
        .select('*, discount_percentage, sale_end_date')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching astrology products:', error);
        return;
      }

      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching astrology products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this astrology product?')) return;

    try {
      const { error } = await supabase
        .from('astrology_products')
        .delete()
        .eq('id', productId);

      if (error) {
        console.error('Error deleting product:', error);
        throw error;
      }

      toast({
        title: "Success",
        description: "Astrology product deleted successfully!"
      });

      fetchProducts();
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast({
        title: "Error",
        description: "Failed to delete product. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getProductTypeLabel = (type: string) => {
    const labels = {
      natal_chart_reading: 'Natal Chart Reading',
      solar_return_reading: 'Solar Return Reading',
      north_node_reading: 'North Node Reading',
      career_path_reading: 'Career Path Reading'
    };
    return labels[type] || type;
  };

  const getDeliveryTypeIcon = (type: string) => {
    switch (type) {
      case 'telephone':
        return <Clock className="w-4 h-4" />;
      case 'audio_file':
        return <FileAudio className="w-4 h-4" />;
      case 'video_file':
        return <Video className="w-4 h-4" />;
      default:
        return <Star className="w-4 h-4" />;
    }
  };

  const getDeliveryTypeLabel = (type: string) => {
    const labels = {
      telephone: 'Telephone',
      audio_file: 'Audio File',
      video_file: 'Video File'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="text-white">Loading astrology products...</div>
    );
  }

  return (
    <>
      <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Star className="w-5 h-5" />
            Astrology Products Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No astrology products created yet.</p>
          ) : (
            <div className="relative">
              <Carousel className="w-full">
                <CarouselContent className="-ml-2 md:-ml-4">
                  {products.map((product) => {
                    // Check if sale has expired
                    const isSaleExpired = product.sale_end_date && new Date(product.sale_end_date) < new Date();
                    const hasDiscount = !!(product.discount_percentage && product.discount_percentage > 0 && !isSaleExpired);
                    const displayPrice = isSaleExpired ? product.base_price : product.total_price;
                    
                    return (
                    <CarouselItem key={product.id} className="pl-2 md:pl-4 basis-full md:basis-1/2 lg:basis-1/4">
                      <Card className="bg-gray-700/50 border-gray-600 h-full">
                        <CardContent className="p-4">
                          {product.thumbnail_url && (
                            <img
                              src={product.thumbnail_url}
                              alt={product.title}
                              className="w-full h-40 object-fill rounded-lg mb-3"
                            />
                          )}
                          
                          <div className="space-y-3">
                            <div>
                              <h3 className="text-white font-medium line-clamp-2 text-sm">{product.title}</h3>
                              <Badge variant="outline" className="mt-1 text-xs">
                                {getProductTypeLabel(product.product_type)}
                              </Badge>
                            </div>

                            {product.description && (
                              <p className="text-gray-400 text-xs line-clamp-3">{product.description}</p>
                            )}

                            <div className="flex flex-col gap-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1">
                                  {getDeliveryTypeIcon(product.delivery_type)}
                                  <span className="text-gray-300 text-xs">
                                    {getDeliveryTypeLabel(product.delivery_type)}
                                  </span>
                                </div>
                                <div className="flex flex-col items-end">
                                  {hasDiscount && (
                                    <span className="text-xs text-gray-400 line-through">${product.base_price}</span>
                                  )}
                                  <Badge className={hasDiscount ? "bg-green-600 text-xs" : "bg-green-600 text-xs"}>
                                    ${displayPrice}
                                    {product.delivery_type === 'telephone' && product.hours_selected > 1 && (
                                      <span className="text-xs ml-1">({product.hours_selected}h)</span>
                                    )}
                                  </Badge>
                                </div>
                              </div>
                              {hasDiscount && (
                                <Badge className="bg-green-600 text-xs w-fit">
                                  {product.discount_percentage}% OFF - On Sale
                                </Badge>
                              )}
                              {isSaleExpired && product.discount_percentage && product.discount_percentage > 0 && (
                                <Badge variant="outline" className="text-xs w-fit border-gray-500 text-gray-400">
                                  Sale Ended
                                </Badge>
                              )}
                            </div>

                            <div className="flex justify-between gap-2 pt-2">
                              <Button
                                size="sm"
                                onClick={() => setEditingProduct(product)}
                                className="bg-black text-white border-0 hover:bg-black text-xs px-2 py-1"
                              >
                                <Edit className="w-3 h-3 mr-1" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleDelete(product.id)}
                                className="bg-black text-white border-0 hover:bg-black text-xs px-2 py-1"
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                Delete
                              </Button>
                            </div>
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
          )}
        </CardContent>
      </Card>

      {editingProduct && (
        <EditAstrologyProductModal
          product={editingProduct}
          isOpen={!!editingProduct}
          onClose={() => setEditingProduct(null)}
          onSuccess={() => {
            setEditingProduct(null);
            fetchProducts();
          }}
        />
      )}
    </>
  );
};

export default AstrologyProductManager;
