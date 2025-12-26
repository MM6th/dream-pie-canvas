import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface FilmReviewFormProps {
  filmId: string;
  onReviewSubmitted: () => void;
}

const FilmReviewForm = ({ filmId, onReviewSubmitted }: FilmReviewFormProps) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to leave a review",
        variant: "destructive"
      });
      return;
    }

    if (rating === 0) {
      toast({
        title: "Rating Required",
        description: "Please select a star rating",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from('film_reviews')
        .insert({
          user_id: user.id,
          film_product_id: filmId,
          rating: rating,
          review_text: reviewText.trim() || null
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: "Already Reviewed",
            description: "You have already reviewed this film",
            variant: "destructive"
          });
        } else if (error.message.includes('violates row-level security')) {
          toast({
            title: "Purchase Required",
            description: "You must purchase this film before reviewing it",
            variant: "destructive"
          });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: "Review Submitted",
        description: "Thank you for your review!"
      });

      setRating(0);
      setReviewText("");
      onReviewSubmitted();
    } catch (error) {
      console.error('Error submitting review:', error);
      toast({
        title: "Error",
        description: "Failed to submit review. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-white font-medium mb-2">Your Rating</label>
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }, (_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setRating(index + 1)}
              className="p-1 hover:scale-110 transition-transform"
            >
              <Star
                className={`w-6 h-6 ${
                  index < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-400 hover:text-yellow-400"
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-white font-medium mb-2">Your Review (Optional)</label>
        <Textarea
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          placeholder="Share your thoughts about this film..."
          className="bg-gray-700 border-gray-600 text-white resize-none"
          rows={4}
        />
      </div>

      <Button
        type="submit"
        disabled={isSubmitting || rating === 0}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
      >
        {isSubmitting ? "Submitting..." : "Submit Review"}
      </Button>
    </form>
  );
};

export default FilmReviewForm;
