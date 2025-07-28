
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Star, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface Review {
  id: string;
  user_id: string;
  astrology_product_id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  user_profile?: {
    display_name: string | null;
    email: string;
  };
  astrology_product?: {
    title: string;
  };
}

const ReviewsManagement = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReviews = async () => {
    try {
      // First get reviews
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('product_reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (reviewsError) throw reviewsError;

      // Then enrich with user and product data
      const enrichedReviews = await Promise.all(
        (reviewsData || []).map(async (review) => {
          // Get user profile
          const { data: profileData } = await supabase
            .from('profiles')
            .select('display_name, email')
            .eq('id', review.user_id)
            .single();

          // Get astrology product
          const { data: productData } = await supabase
            .from('astrology_products')
            .select('title')
            .eq('id', review.astrology_product_id)
            .single();

          return {
            ...review,
            user_profile: profileData,
            astrology_product: productData
          };
        })
      );

      setReviews(enrichedReviews);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast({
        title: "Error",
        description: "Failed to fetch reviews",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    try {
      const { error } = await supabase
        .from('product_reviews')
        .delete()
        .eq('id', reviewId);

      if (error) throw error;

      setReviews(prev => prev.filter(review => review.id !== reviewId));
      toast({
        title: "Success",
        description: "Review deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting review:', error);
      toast({
        title: "Error",
        description: "Failed to delete review",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

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

  if (loading) {
    return (
      <div className="text-center text-white py-8">
        Loading reviews...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Reviews Management</h2>
        <Badge variant="secondary" className="bg-gray-700 text-white">
          {reviews.length} Total Reviews
        </Badge>
      </div>

      {reviews.length === 0 ? (
        <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
          <CardContent className="p-8 text-center">
            <p className="text-gray-400">No reviews found.</p>
          </CardContent>
        </Card>
      ) : (
        <Carousel
          className="w-full"
          opts={{
            align: "start",
            loop: true,
          }}
        >
          <CarouselContent className="-ml-2 md:-ml-4">
            {reviews.map((review) => (
              <CarouselItem key={review.id} className="pl-2 md:pl-4 basis-full md:basis-1/2 lg:basis-1/3">
                <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-white text-lg">
                          {review.astrology_product?.title || "Unknown Product"}
                        </CardTitle>
                        <p className="text-gray-400 text-sm">
                          by {review.user_profile?.display_name || "Anonymous"} 
                          ({review.user_profile?.email || "Unknown"})
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          {renderStars(review.rating)}
                        </div>
                        <Button
                          onClick={() => handleDeleteReview(review.id)}
                          variant="destructive"
                          size="sm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    {review.review_text && (
                      <p className="text-gray-300 mb-3">{review.review_text}</p>
                    )}
                    <p className="text-gray-500 text-sm">
                      Submitted on {new Date(review.created_at).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="text-white bg-gray-800 hover:bg-gray-700 border-gray-600" />
          <CarouselNext className="text-white bg-gray-800 hover:bg-gray-700 border-gray-600" />
        </Carousel>
      )}
    </div>
  );
};

export default ReviewsManagement;
