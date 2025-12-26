import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Star, User, ChevronDown, ChevronUp } from "lucide-react";
import FilmReviewForm from "./FilmReviewForm";

interface FilmReview {
  id: string;
  user_id: string;
  film_product_id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  user_profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface FilmReviewsSectionProps {
  filmId: string;
  compact?: boolean;
}

const FilmReviewsSection = ({ filmId, compact = false }: FilmReviewsSectionProps) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<FilmReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(!compact);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);

  const fetchReviews = async () => {
    try {
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('film_reviews')
        .select('*')
        .eq('film_product_id', filmId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (reviewsError) throw reviewsError;

      // Enrich with user profiles
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

      setReviews(enrichedReviews);
      
      // Check if current user has reviewed
      if (user) {
        const userReview = enrichedReviews.find(r => r.user_id === user.id);
        setHasReviewed(!!userReview);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkPurchaseStatus = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('film_purchases')
        .select('id')
        .eq('user_id', user.id)
        .eq('film_product_id', filmId)
        .maybeSingle();

      if (!error) {
        setHasPurchased(!!data);
      }
    } catch (error) {
      console.error('Error checking purchase status:', error);
    }
  };

  useEffect(() => {
    fetchReviews();
    checkPurchaseStatus();
  }, [filmId, user]);

  const handleReviewSubmitted = () => {
    fetchReviews();
  };

  const averageRating = reviews.length > 0 
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
    : 0;

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={`w-4 h-4 ${
          index < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-400"
        }`}
      />
    ));
  };

  if (compact && !expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
      >
        <div className="flex items-center gap-1">
          {renderStars(Math.round(averageRating))}
        </div>
        <span>({reviews.length} review{reviews.length !== 1 ? 's' : ''})</span>
        <ChevronDown className="w-4 h-4" />
      </button>
    );
  }

  return (
    <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            Reviews ({reviews.length})
            {reviews.length > 0 && (
              <span className="text-yellow-400 flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400" />
                {averageRating.toFixed(1)}
              </span>
            )}
          </CardTitle>
          {compact && (
            <button onClick={() => setExpanded(false)} className="text-gray-400 hover:text-white">
              <ChevronUp className="w-4 h-4" />
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Review Form - only for users who purchased and haven't reviewed */}
        {user && hasPurchased && !hasReviewed && (
          <div className="pb-4 border-b border-gray-700">
            <h4 className="text-white text-sm font-medium mb-3">Leave a Review</h4>
            <FilmReviewForm filmId={filmId} onReviewSubmitted={handleReviewSubmitted} />
          </div>
        )}

        {/* Reviews List */}
        <div className="space-y-3">
          {loading ? (
            <p className="text-gray-400 text-center py-4 text-sm">Loading reviews...</p>
          ) : reviews.length === 0 ? (
            <p className="text-gray-400 text-center py-4 text-sm">No reviews yet.</p>
          ) : (
            reviews.map((review) => (
              <div key={review.id} className="flex items-start gap-3 p-3 bg-gray-700/30 rounded-lg">
                <div className="flex-shrink-0">
                  {review.user_profile?.avatar_url ? (
                    <img
                      src={review.user_profile.avatar_url}
                      alt="User avatar"
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                      <User className="w-4 h-4 text-gray-400" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-white text-sm font-medium truncate">
                      {review.user_profile?.display_name || "Anonymous"}
                    </p>
                    <div className="flex items-center">
                      {renderStars(review.rating)}
                    </div>
                  </div>
                  
                  {review.review_text && (
                    <p className="text-gray-300 text-sm">
                      {review.review_text}
                    </p>
                  )}
                  
                  <p className="text-gray-500 text-xs mt-1">
                    {new Date(review.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FilmReviewsSection;
