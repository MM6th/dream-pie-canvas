
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Star, User } from "lucide-react";

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

interface ProductReviewCardProps {
  review: ProductReview;
}

const ProductReviewCard = ({ review }: ProductReviewCardProps) => {
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

  return (
    <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            {review.user_profile?.avatar_url ? (
              <img
                src={review.user_profile.avatar_url}
                alt="User avatar"
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
                <User className="w-5 h-5 text-gray-400" />
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <p className="text-white font-medium truncate">
                {review.user_profile?.display_name || "Anonymous User"}
              </p>
              <div className="flex items-center gap-1">
                {renderStars(review.rating)}
              </div>
            </div>
            
            {review.review_text && (
              <p className="text-gray-300 text-sm leading-relaxed">
                {review.review_text}
              </p>
            )}
            
            <p className="text-gray-500 text-xs mt-2">
              {new Date(review.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductReviewCard;
