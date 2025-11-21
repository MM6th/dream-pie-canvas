
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Clock, Shield, Lock, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import AstrologyProductDetailModal from "./AstrologyProductDetailModal";
import AstrologyVideoPlayerModal from "./AstrologyVideoPlayerModal";
import ProductReviewsSection from "./reviews/ProductReviewsSection";
import ProductInstructionalText from "./ui/ProductInstructionalText";

interface AstrologyProduct {
  id: string;
  title: string;
  description: string | null;
  base_price: number;
  thumbnail_url: string | null;
  advertisement_video_url?: string | null;
  delivery_type: string | null;
  total_price: number;
  is_adult_content: boolean | null;
  access_level: "public" | "merchant_only" | "paid" | null;
  created_at: string;
  discount_percentage?: number;
  sale_end_date?: string | null;
}

interface ProductReviewCount {
  [productId: string]: number;
}

const AstrologyStoreSection = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<AstrologyProduct[]>([]);
  const [userProfile, setUserProfile] = useState<{ adult_content_restricted: boolean | null; user_type: string; approval_status: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailModalProduct, setDetailModalProduct] = useState<AstrologyProduct | null>(null);
  const [videoModalProduct, setVideoModalProduct] = useState<AstrologyProduct | null>(null);
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
        .select('adult_content_restricted, user_type, approval_status')
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

  const filterAdultContent = (products: AstrologyProduct[], userProfile: { adult_content_restricted: boolean | null; user_type: string; approval_status: string | null } | null): AstrologyProduct[] => {
    if (userProfile?.adult_content_restricted) {
      return products.filter(product => !product.is_adult_content);
    }
    return products;
  };

  const filterAccessLevel = (products: AstrologyProduct[], userProfile: { adult_content_restricted: boolean | null; user_type: string; approval_status: string | null } | null): AstrologyProduct[] => {
    if (!userProfile) return products;
    
    // Supporters can only see public products
    if (userProfile.user_type === 'supporter') {
      return products.filter(product => {
        const accessLevel = product.access_level || 'public';
        return accessLevel === 'public';
      });
    }
    
    // Merchants and admins can see all products
    return products;
  };

  const fetchProducts = async () => {
    try {
      const profile = await fetchUserProfile();
      setUserProfile(profile);

      const { data, error } = await supabase
        .from('astrology_products')
        .select('*, is_adult_content, access_level, discount_percentage, sale_end_date')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching astrology products:', error);
      } else {
        const filteredData = filterAccessLevel(filterAdultContent(data || [], profile), profile);
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

    // Find the product to get delivery type
    const product = products.find(p => p.id === productId);
    if (!product) {
      toast({
        title: "Error",
        description: "Product not found",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-astrology-payment', {
        body: {
          astrologyProductId: productId,
          totalPrice: price,
          deliveryType: product.delivery_type || 'audio_file'
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
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Carousel
        className="w-full"
        opts={{
          align: "start",
          loop: true,
        }}
      >
        <CarouselContent className="-ml-2 md:-ml-4">
          {products.map((product) => {
            const reviewCount = reviewCounts[product.id] || 0;
            
            // Check if sale has expired
            const isSaleExpired = product.sale_end_date && new Date(product.sale_end_date) < new Date();
            const hasDiscount = product.discount_percentage && product.discount_percentage > 0 && !isSaleExpired;
            const displayPrice = isSaleExpired ? product.base_price : product.total_price;
            
            return (
              <CarouselItem key={product.id} className="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/3">
                <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm hover:bg-gray-700/50 transition-colors h-full">
                  {product.thumbnail_url && (
                    <CardHeader className="p-0 relative">
                      <div className="relative aspect-video group">
                        <img
                          src={product.thumbnail_url}
                          alt={product.title}
                          className="w-full h-48 object-fill rounded-t-lg"
                        />
                        {product.advertisement_video_url && (
                          <div 
                            className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-t-lg cursor-pointer transition-opacity hover:bg-black/60"
                            onClick={() => setVideoModalProduct(product)}
                          >
                            <div className="bg-primary rounded-full p-4 shadow-lg transform transition-transform group-hover:scale-110">
                              <Play className="w-8 h-8 text-primary-foreground fill-current" />
                            </div>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                  )}
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <CardTitle className="text-white text-lg">{product.title}</CardTitle>
                      <div className="flex items-center gap-1 flex-wrap">
                        {hasDiscount && (
                          <Badge className="bg-green-600 hover:bg-green-700 text-xs">
                            On Sale
                          </Badge>
                        )}
                        {product.is_adult_content && !userProfile?.adult_content_restricted && (
                          <Badge className="bg-orange-600 hover:bg-orange-700 text-xs flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            18+
                          </Badge>
                        )}
                        {product.access_level === "merchant_only" && (
                          <Badge className="bg-orange-600 hover:bg-orange-700 flex items-center gap-1 text-xs">
                            <Lock className="w-3 h-3" />
                            Merchants Only
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <ProductInstructionalText productType="astrology" />
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
                      <div className="flex flex-col">
                        {hasDiscount ? (
                          <>
                            <span className="text-lg text-gray-400 line-through">${product.base_price}</span>
                            <span className="text-2xl font-bold text-green-400">${displayPrice}</span>
                            <span className="text-xs text-green-400">{product.discount_percentage}% OFF</span>
                            {product.sale_end_date && (
                              <span className="text-xs text-green-400 mt-1">
                                Sale ends: {new Date(product.sale_end_date).toLocaleDateString()}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-2xl font-bold text-white">${displayPrice}</span>
                        )}
                      </div>
                      {product.delivery_type && (
                        <div className="flex items-center gap-1 text-gray-400">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm capitalize">{product.delivery_type}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Button
                        onClick={() => handlePurchase(product.id, displayPrice)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Book Reading
                      </Button>
                      
                      <Button
                        onClick={() => setShowReviews(showReviews === product.id ? null : product.id)}
                        variant="outline"
                        className="w-full border-gray-600 text-white bg-transparent hover:bg-gray-700"
                      >
                        {showReviews === product.id 
                          ? "Hide Reviews" 
                          : reviewCount > 0 
                            ? `View Reviews (${reviewCount})` 
                            : "View Reviews"
                        }
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
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <CarouselPrevious className="text-white bg-gray-800 hover:bg-gray-700 border-gray-600" />
        <CarouselNext className="text-white bg-gray-800 hover:bg-gray-700 border-gray-600" />
      </Carousel>

      {detailModalProduct && (
        <AstrologyProductDetailModal
          product={detailModalProduct}
          isOpen={!!detailModalProduct}
          onClose={() => setDetailModalProduct(null)}
          onPurchase={handlePurchase}
        />
      )}

      {videoModalProduct && videoModalProduct.advertisement_video_url && (
        <AstrologyVideoPlayerModal
          isOpen={!!videoModalProduct}
          onClose={() => setVideoModalProduct(null)}
          videoUrl={videoModalProduct.advertisement_video_url}
          productTitle={videoModalProduct.title}
        />
      )}
    </>
  );
};

export default AstrologyStoreSection;
