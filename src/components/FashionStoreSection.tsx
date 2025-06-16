
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shirt, ShoppingCart, Package, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import FashionProductSlideshow from "./FashionProductSlideshow";

interface FashionProduct {
  id: string;
  title: string;
  description: string | null;
  materials: string | null;
  price: number;
  shipping_cost: number;
  tax_rate: number;
  created_at: string;
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
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [selectedVariants, setSelectedVariants] = useState<{[key: string]: string}>({});

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('fashion_products')
        .select(`
          *,
          fashion_product_images (*),
          fashion_product_variants (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
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
  }, []);

  const getAvailableVariants = (product: FashionProduct) => {
    return product.fashion_product_variants.filter(v => v.stock_quantity > 0);
  };

  const getTotalStock = (product: FashionProduct) => {
    return product.fashion_product_variants.reduce((total, v) => total + v.stock_quantity, 0);
  };

  const calculateTotal = (product: FashionProduct) => {
    const subtotal = product.price;
    const tax = subtotal * product.tax_rate;
    const total = subtotal + product.shipping_cost + tax;
    return { subtotal, tax, total };
  };

  const handleVariantChange = (productId: string, variantId: string) => {
    setSelectedVariants(prev => ({ ...prev, [productId]: variantId }));
  };

  const handlePurchase = async (product: FashionProduct) => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be logged in to make a purchase",
        variant: "destructive"
      });
      return;
    }

    const selectedVariantId = selectedVariants[product.id];
    if (!selectedVariantId) {
      toast({
        title: "Select size and color",
        description: "Please select a size and color before purchasing",
        variant: "destructive"
      });
      return;
    }

    setPurchasingId(product.id);

    try {
      console.log('Starting fashion payment process for product:', product.id);
      
      const { data, error } = await supabase.functions.invoke('create-fashion-payment', {
        body: { 
          fashionProductId: product.id,
          variantId: selectedVariantId,
          quantity: 1
        },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      console.log('Fashion payment response:', data, 'Error:', error);

      if (error) {
        console.error('Fashion payment creation error:', error);
        throw error;
      }

      if (data?.approvalUrl) {
        console.log('Redirecting to PayPal:', data.approvalUrl);
        window.location.href = data.approvalUrl;
      } else {
        throw new Error('No approval URL received from PayPal');
      }
    } catch (error: any) {
      console.error('Error creating fashion payment:', error);
      toast({
        title: "Payment Error",
        description: error.message || "Failed to initiate payment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setPurchasingId(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-white text-xl">Loading fashion products...</div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
        <CardContent className="p-8 text-center">
          <Shirt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Fashion Products Available</h3>
          <p className="text-gray-400">Check back soon for amazing fashion items!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((product) => {
        const availableVariants = getAvailableVariants(product);
        const totalStock = getTotalStock(product);
        const { subtotal, tax, total } = calculateTotal(product);
        const selectedVariant = selectedVariants[product.id] 
          ? availableVariants.find(v => v.id === selectedVariants[product.id])
          : null;

        return (
          <Card key={product.id} className="bg-gray-800/50 border-gray-700 backdrop-blur-sm hover:bg-gray-800/70 transition-colors">
            <CardHeader className="p-4">
              <FashionProductSlideshow 
                images={product.fashion_product_images}
                productTitle={product.title}
              />
              <CardTitle className="text-white text-lg line-clamp-2">{product.title}</CardTitle>
              {product.description && (
                <p className="text-gray-400 text-sm line-clamp-2">{product.description}</p>
              )}
            </CardHeader>
            
            <CardContent className="p-4 pt-0">
              <div className="space-y-4">
                {/* Materials */}
                {product.materials && (
                  <div className="text-xs text-gray-300">
                    <span className="font-medium">Materials:</span> {product.materials}
                  </div>
                )}

                {/* Price */}
                <div className="space-y-1">
                  <div className="text-xl font-bold text-white">${product.price.toFixed(2)}</div>
                  <div className="text-xs text-gray-400 space-y-1">
                    <div>+ ${product.shipping_cost.toFixed(2)} shipping (Ground USPS, location dependent)</div>
                    <div>+ ${tax.toFixed(2)} tax (NY-based: {(product.tax_rate * 100).toFixed(2)}%)</div>
                    <div className="font-medium text-white">Total: ${total.toFixed(2)}</div>
                  </div>
                </div>

                {/* Stock Status */}
                <div className="flex items-center gap-2">
                  <Badge variant={totalStock > 0 ? "default" : "destructive"}>
                    <Package className="w-3 h-3 mr-1" />
                    {totalStock > 0 ? `${totalStock} in stock` : "Out of stock"}
                  </Badge>
                </div>

                {/* Size/Color Selection */}
                {availableVariants.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white">Size & Color:</label>
                    <Select
                      value={selectedVariants[product.id] || ""}
                      onValueChange={(value) => handleVariantChange(product.id, value)}
                    >
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue placeholder="Select size and color" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        {availableVariants.map((variant) => (
                          <SelectItem 
                            key={variant.id} 
                            value={variant.id}
                            className="text-white hover:bg-gray-600"
                          >
                            {variant.size} - {variant.color} ({variant.stock_quantity} available)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Purchase Button */}
                <Button
                  onClick={() => handlePurchase(product)}
                  disabled={purchasingId === product.id || totalStock === 0 || !selectedVariants[product.id]}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {purchasingId === product.id ? (
                    "Processing..."
                  ) : totalStock === 0 ? (
                    "Out of Stock"
                  ) : !selectedVariants[product.id] ? (
                    "Select Size & Color"
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Buy Now - ${total.toFixed(2)}
                    </>
                  )}
                </Button>

                {/* Shipping Info */}
                <div className="text-xs text-gray-400 text-center">
                  <Truck className="w-3 h-3 inline mr-1" />
                  Ships via USPS Ground
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default FashionStoreSection;
