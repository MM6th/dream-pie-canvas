
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import AstrologyProductDetailModal from "./AstrologyProductDetailModal";
import AstrologyReadingModal from "./AstrologyReadingModal";
import ProductReviewsSection from "./reviews/ProductReviewsSection";

interface AstrologyProduct {
  id: string;
  title: string;
  description: string | null;
  base_price: number;
  thumbnail_url: string | null;
  delivery_type: string | null;
  total_price: number;
  is_adult_content: boolean | null;
  created_at: string;
  product_type: string;
}

interface ProductReviewCount {
  [productId: string]: number;
}

const AstrologyStoreSection = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<AstrologyProduct[]>([]);
  const [userProfile, setUserProfile] = useState<{ adult_content_restricted: boolean | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailModalProduct, setDetailModalProduct] = useState<AstrologyProduct | null>(null);
  const [readingModalProduct, setReadingModalProduct] = useState<AstrologyProduct | null>(null);
  const [showReviews, setShowReviews] = useState<string | null>(null);
  const [reviewCounts, setReviewCounts] = useState<ProductReviewCount>({});

  useEffect(() => {
    fetchProducts();
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return null;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('adult_content_restricted')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  };

  const fetchReviewCounts = async (productIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from('product_reviews')
        .select('astrology_product_id')
        .in('astrology_product_id', productIds);

      if (error) throw error;

      const counts: ProductReviewCount = {};
      productIds.forEach(id => counts[id] = 0);
      
      data?.forEach(review => {
        counts[review.astrology_product_id] = (counts[review.astrology_product_id] || 0) + 1;
      });

      setReviewCounts(counts);
    } catch (error) {
      console.error('Error fetching review counts:', error);
    }
  };

  const filterAdultContent = (products: AstrologyProduct[], userProfile: { adult_content_restricted: boolean | null } | null): AstrologyProduct[] => {
    if (userProfile?.adult_content_restricted) {
      return products.filter(product => !product.is_adult_content);
    }
    return products;
  };

  const fetchProducts = async () => {
    try {
      const profile = await fetchUserProfile();
      setUserProfile(profile);

      const { data, error } = await supabase
        .from('astrology_products')
        .select('*, is_adult_content')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching astrology products:', error);
      } else {
        const filteredData = filterAdultContent(data || [], profile);
        setProducts(filteredData);
        
        // Fetch review counts for all products
        const productIds = filteredData.map(product => product.id);
        if (productIds.length > 0) {
          await fetchReviewCounts(productIds);
        }
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
          <p className="text-gray-400">
            {userProfile?.adult_content_restricted 
              ? "No astrology services available (adult content filtering enabled)." 
              : "No astrology services available yet. Check back soon!"
            }
          </p>
          
          {/* Adult Content Guidelines for Supporters */}
          {user && (
            <div className="mt-6 p-4 bg-orange-900/20 border border-orange-600/30 rounded-lg">
              <p className="text-orange-300 text-sm">
                <strong>Content Guidelines:</strong> Content that may be sexually suggestive, 
                seductive, reveals excessive skin, or contains wardrobe malfunctions is marked 
                for mature audiences. Use the adult content restriction toggle in your profile 
                to filter such content.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Adult Content Guidelines */}
      {user && (
        <div className="mb-6 p-4 bg-orange-900/20 border border-orange-600/30 rounded-lg">
          <p className="text-orange-300 text-sm">
            <strong>Content Guidelines:</strong> Some content may be marked for mature audiences (18+). 
            Content that is sexually suggestive, seductive, reveals excessive skin, or contains 
            wardrobe malfunctions falls under this category. You can manage your content preferences 
            in your profile settings.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => {
          const reviewCount = reviewCounts[product.id] || 0;
          
          return (
            <Card key={product.id} className="bg-gray-800/50 border-gray-700 backdrop-blur-sm hover:bg-gray-700/50 transition-colors">
              {product.thumbnail_url && (
                <CardHeader className="p-0">
                  <img
                    src={product.thumbnail_url}
                    alt={product.title}
                    className="w-full h-48 object-fill rounded-t-lg"
                  />
                </CardHeader>
              )}
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <CardTitle className="text-white text-lg">{product.title}</CardTitle>
                  {product.is_adult_content && !userProfile?.adult_content_restricted && (
                    <Badge className="bg-orange-600 hover:bg-orange-700 text-xs flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      18+
                    </Badge>
                  )}
                </div>
                
                {product.description && (
                  <div className="mb-4">
                    <p className="text-gray-300 text-sm line-clamp-3">{product.description}</p>
                    <button
                      onClick={() => setDetailModalProduct(product)}
                      className="text-blue-400 hover:text-blue-300 text-sm mt-1"
                    >
                      See More
                    </button>
                  </div>
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
                
                <div className="space-y-2">
                  <Button
                    onClick={() => handlePurchase(product.id, product.total_price)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Book Reading
                  </Button>
                  
                  <Button
                    onClick={() => setReadingModalProduct(product)}
                    variant="outline"
                    className="w-full border-gray-600 text-white bg-transparent hover:bg-gray-700"
                  >
                    Generate Reading
                  </Button>
                  
                  <Button
                    onClick={() => setShowReviews(showReviews === product.id ? null : product.id)}
                    variant="outline"
                    className="w-full border-gray-600 text-white bg-transparent hover:bg-gray-700"
                  >
                    {showReviews === product.id ? "Hide Reviews" : `View Reviews (${reviewCount})`}
                  </Button>
                </div>

                {/* Reviews Section */}
                {showReviews === product.id && (
                  <div className="mt-4">
                    <ProductReviewsSection productId={product.id} />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {detailModalProduct && (
        <AstrologyProductDetailModal
          product={detailModalProduct}
          isOpen={!!detailModalProduct}
          onClose={() => setDetailModalProduct(null)}
          onPurchase={handlePurchase}
        />
      )}

      {readingModalProduct && (
        <AstrologyReadingModal
          product={readingModalProduct}
          isOpen={!!readingModalProduct}
          onClose={() => setReadingModalProduct(null)}
        />
      )}
    </>
  );
};

export default AstrologyStoreSection;
