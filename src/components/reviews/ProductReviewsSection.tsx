
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import ProductReviewCard from "./ProductReviewCard";
import ProductReviewForm from "./ProductReviewForm";
import { useAuth } from "@/hooks/useAuth";

interface ProductReview {
  id: string;
  user_id: string;
  astrology_product_id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  user_profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface ProductReviewsSectionProps {
  productId: string;
}

const ProductReviewsSection = ({ productId }: ProductReviewsSectionProps) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const REVIEWS_PER_PAGE = 10;

  const fetchReviews = async (pageNum: number = 0, reset: boolean = false) => {
    try {
      const from = pageNum * REVIEWS_PER_PAGE;
      const to = from + REVIEWS_PER_PAGE - 1;

      // First get reviews
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('product_reviews')
        .select('*')
        .eq('astrology_product_id', productId)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (reviewsError) throw reviewsError;

      // Then enrich with user profiles
      const enrichedReviews = await Promise.all(
        (reviewsData || []).map(async (review) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('display_name, avatar_url')
            .eq('id', review.user_id)
            .single();

          return {
            ...review,
            user_profile: profileData
          };
        })
      );

      if (reset) {
        setReviews(enrichedReviews);
      } else {
        setReviews(prev => [...prev, ...enrichedReviews]);
      }

      setHasMore(enrichedReviews.length === REVIEWS_PER_PAGE);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews(0, true);
  }, [productId]);

  const handleReviewSubmitted = () => {
    fetchReviews(0, true);
    setPage(0);
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchReviews(nextPage);
  };

  const averageRating = reviews.length > 0 
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
    : 0;

  return (
    <div className="space-y-6">
      <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white">
            Reviews ({reviews.length})
            {reviews.length > 0 && (
              <span className="text-yellow-400 ml-2">
                ★ {averageRating.toFixed(1)}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {user && (
            <div className="mb-6">
              <h3 className="text-white font-medium mb-4">Leave a Review</h3>
              <ProductReviewForm 
                productId={productId} 
                onReviewSubmitted={handleReviewSubmitted}
              />
            </div>
          )}

          <div className="space-y-4">
            {loading && reviews.length === 0 ? (
              <p className="text-gray-400 text-center py-4">Loading reviews...</p>
            ) : reviews.length === 0 ? (
              <p className="text-gray-400 text-center py-4">No reviews yet. Be the first to review!</p>
            ) : (
              <>
                {reviews.map((review) => (
                  <ProductReviewCard key={review.id} review={review} />
                ))}
                
                {hasMore && (
                  <div className="text-center">
                    <button
                      onClick={loadMore}
                      className="text-blue-400 hover:text-blue-300 font-medium"
                    >
                      Load More Reviews
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductReviewsSection;
