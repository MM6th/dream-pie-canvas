
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Shirt, Lock, Camera } from "lucide-react";
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
  access_level: string | null;
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

interface UserProfile {
  user_type: string;
  approval_status: string | null;
  is_admin: boolean | null;
}

const FashionStoreSection = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<FashionProduct[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<FashionProduct | null>(null);

  const fetchUserProfile = async () => {
    if (!user) return null;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_type, approval_status, is_admin')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  };

  const fetchProducts = async () => {
    try {
      // Fetch user profile first
      const profile = await fetchUserProfile();
      setUserProfile(profile);

      // Determine what products to fetch based on user type
      let query = supabase
        .from('fashion_products')
        .select(`
          id,
          title,
          description,
          materials,
          price,
          shipping_cost,
          access_level,
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

      // Filter products based on access level and user type
      if (!profile || profile.user_type !== 'merchant' || profile.approval_status !== 'approved') {
        // Show only public products to supporters and non-approved users
        query = query.eq('access_level', 'public');
      }
      // For approved merchants, show all products (public and merchant_only)

      const { data, error } = await query;

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

  const canPurchase = (product: FashionProduct) => {
    if (!user) return false;
    
    const accessLevel = product.access_level || 'public';
    
    if (accessLevel === 'public') return true;
    if (accessLevel === 'merchant_only') {
      return userProfile?.user_type === 'merchant' && userProfile?.approval_status === 'approved';
    }
    
    return false;
  };

  const getAccessLevelBadge = (product: FashionProduct) => {
    const accessLevel = product.access_level || 'public';
    
    if (accessLevel === 'merchant_only') {
      return (
        <Badge className="bg-orange-600 flex items-center gap-1">
          <Lock className="w-3 h-3" />
          Merchants Only
        </Badge>
      );
    }
    
    return null;
  };

  const handleApplyForModeling = (product: FashionProduct) => {
    // TODO: Open modeling application modal
    toast({
      title: "Modeling Application",
      description: "Modeling application feature coming soon! This will allow merchants to apply for modeling opportunities.",
    });
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

    if (!canPurchase(product)) {
      toast({
        title: "Access Restricted",
        description: "This product is only available to approved merchants",
        variant: "destructive"
      });
      return;
    }

    // TODO: Implement fashion product purchase flow
    toast({
      title: "Purchase Feature",
      description: "Fashion product purchases will be implemented soon!",
    });
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
                    className="w-full h-48 object-cover rounded-lg mb-3 cursor-pointer"
                    onClick={() => setSelectedProduct(product)}
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-700 rounded-lg mb-3 flex items-center justify-center">
                    <Shirt className="w-12 h-12 text-gray-400" />
                  </div>
                )}
                <CardTitle className="text-white text-lg line-clamp-2">{product.title}</CardTitle>
                {product.description && (
                  <p className="text-gray-400 text-sm line-clamp-2">{product.description}</p>
                )}
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-white font-semibold">
                      ${product.price.toFixed(2)}
                    </div>
                    {getAccessLevelBadge(product)}
                  </div>
                  
                  {product.materials && (
                    <p className="text-gray-400 text-xs">
                      Materials: {product.materials}
                    </p>
                  )}
                  
                  <div className="flex gap-2">
                    {product.access_level === 'merchant_only' && userProfile?.user_type === 'merchant' && userProfile?.approval_status === 'approved' && !userProfile?.is_admin ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleApplyForModeling(product)}
                          className="flex-1 bg-purple-600 text-white"
                        >
                          <Camera className="w-4 h-4 mr-1" />
                          Apply to Model
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handlePurchase(product)}
                          disabled={!canPurchase(product)}
                          className="flex-1 bg-blue-600 text-white"
                        >
                          <ShoppingCart className="w-4 h-4 mr-1" />
                          Buy
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handlePurchase(product)}
                        disabled={!canPurchase(product)}
                        className="w-full bg-blue-600 text-white"
                      >
                        <ShoppingCart className="w-4 h-4 mr-1" />
                        {canPurchase(product) ? "Buy Now" : "Restricted"}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedProduct && (
        <FashionProductSlideshow
          product={selectedProduct}
          isOpen={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </>
  );
};

export default FashionStoreSection;
