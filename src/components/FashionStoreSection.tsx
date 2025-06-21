import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Shirt } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import FashionProductSlideshow from "./FashionProductSlideshow";
import ProductDetailModal from "./ProductDetailModal";

interface FashionProduct {
  id: string;
  title: string;
  description: string | null;
  materials: string | null;
  price: number;
  shipping_cost: number;
  fashion_product_images: Array<{
    id: string;
    image_url: string;
    display_order: number;
  }>;
  fashion_product_variants: Array<{
    id: string;
    size: string;
    color: string;
    stock_quantity: number;
  }>;
}

const FashionStoreSection = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<FashionProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<FashionProduct | null>(null);
  const [detailModalProduct, setDetailModalProduct] = useState<FashionProduct | null>(null);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('fashion_products')
        .select(`
          id,
          title,
          description,
          materials,
          price,
          shipping_cost,
          fashion_product_images (
            id,
            image_url,
            display_order
          ),
          fashion_product_variants (
            id,
            size,
            color,
            stock_quantity
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Sort images by display_order
      const productsWithSortedImages = (data || []).map(product => ({
        ...product,
        fashion_product_images: product.fashion_product_images.sort((a, b) => a.display_order - b.display_order)
      }));

      setProducts(productsWithSortedImages);
    } catch (error: any) {
      console.error('Error fetching fashion products:', error);
      toast({
        title: "Error",
        description: "Failed to load fashion products",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [user]);

  const handlePurchase = async (product: FashionProduct) => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be logged in to make a purchase",
        variant: "destructive"
      });
      return;
    }

    // Get available variants
    const availableVariants = product.fashion_product_variants.filter(v => v.stock_quantity > 0);
    
    if (availableVariants.length === 0) {
      toast({
        title: "Out of Stock",
        description: "This product is currently out of stock",
        variant: "destructive"
      });
      return;
    }

    // For now, use the first available variant
    const selectedVariant = availableVariants[0];

    try {
      const { data, error } = await supabase.functions.invoke('create-fashion-payment', {
        body: {
          fashionProductId: product.id,
          variantId: selectedVariant.id,
          quantity: 1
        }
      });

      if (error) throw error;

      if (data.approvalUrl) {
        // Open PayPal checkout in a new tab
        window.open(data.approvalUrl, '_blank');
        
        toast({
          title: "Redirecting to PayPal",
          description: "Complete your payment in the new tab",
        });
      } else {
        throw new Error('No approval URL received');
      }
    } catch (error: any) {
      console.error('Error creating fashion payment:', error);
      toast({
        title: "Payment Error",
        description: error.message || "Failed to create payment. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="text-white text-center py-8">Loading fashion products...</div>
    );
  }

  return (
    <>
      {products.length === 0 ? (
        <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
          <CardContent className="p-8 text-center">
            <Shirt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Fashion Products Available</h3>
            <p className="text-gray-400">Check back soon for new fashion items!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <Card key={product.id} className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
              <CardHeader className="p-4">
                {product.fashion_product_images.length > 0 ? (
                  <img
                    src={product.fashion_product_images[0].image_url}
                    alt={product.title}
                    className="w-full h-48 object-fill rounded-lg mb-3 cursor-pointer"
                    onClick={() => setSelectedProduct(product)}
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-700 rounded-lg mb-3 flex items-center justify-center">
                    <Shirt className="w-12 h-12 text-gray-400" />
                  </div>
                )}
                <CardTitle className="text-white text-lg line-clamp-2">{product.title}</CardTitle>
                {product.description && (
                  <div>
                    <p className="text-gray-400 text-sm line-clamp-2">{product.description}</p>
                    <button
                      onClick={() => setDetailModalProduct(product)}
                      className="text-blue-400 hover:text-blue-300 text-sm mt-1 underline"
                    >
                      See More
                    </button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-white font-semibold">
                      ${product.price.toFixed(2)}
                    </div>
                  </div>
                  
                  {product.materials && (
                    <p className="text-gray-400 text-xs">
                      Materials: {product.materials}
                    </p>
                  )}
                  
                  <Button
                    size="sm"
                    onClick={() => handlePurchase(product)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <ShoppingCart className="w-4 h-4 mr-1" />
                    Buy Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedProduct && (
        <FashionProductSlideshow
          images={selectedProduct.fashion_product_images}
          productTitle={selectedProduct.title}
          isOpen={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      {detailModalProduct && (
        <ProductDetailModal
          product={detailModalProduct}
          isOpen={!!detailModalProduct}
          onClose={() => setDetailModalProduct(null)}
          onPurchase={handlePurchase}
        />
      )}
    </>
  );
};

export default FashionStoreSection;
