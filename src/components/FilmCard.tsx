import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Film, Play, Star, ShoppingCart, Eye, Lock,
  ChevronDown, ChevronUp
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import FilmReviewsSection from "@/components/reviews/FilmReviewsSection";
import TransitMeter from "@/components/TransitMeter";

interface FilmProduct {
  id: string;
  merchant_id: string;
  title: string;
  description: string | null;
  stars: string[];
  genres: string[];
  price: number | null;
  is_free: boolean;
  thumbnail_url: string | null;
  trailer_url: string | null;
  full_video_url: string | null;
  status: string;
  is_adult_content: boolean;
  sales_count: number;
  created_at: string;
}

interface FilmCardProps {
  film: FilmProduct;
  onPurchase?: () => void;
}

const FilmCard = ({ film, onPurchase }: FilmCardProps) => {
  const { user } = useAuth();
  const [showReviews, setShowReviews] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [playingTrailer, setPlayingTrailer] = useState(false);

  const isOwner = user?.id === film.merchant_id;

  useEffect(() => {
    checkPurchaseStatus();
    fetchReviewStats();
  }, [film.id, user]);

  const checkPurchaseStatus = async () => {
    if (!user || isOwner) return;
    
    try {
      const { data } = await supabase
        .from('film_purchases')
        .select('id')
        .eq('user_id', user.id)
        .eq('film_product_id', film.id)
        .maybeSingle();

      setHasPurchased(!!data);
    } catch (error) {
      console.error('Error checking purchase status:', error);
    }
  };

  const fetchReviewStats = async () => {
    try {
      const { data } = await supabase
        .from('film_reviews')
        .select('rating')
        .eq('film_product_id', film.id);

      if (data && data.length > 0) {
        const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
        setAverageRating(avg);
        setReviewCount(data.length);
      }
    } catch (error) {
      console.error('Error fetching review stats:', error);
    }
  };

  const handlePurchase = async () => {
    if (!user) {
      toast({
        title: "Sign In Required",
        description: "Please sign in to purchase this film.",
        variant: "destructive"
      });
      return;
    }

    if (film.is_free) {
      // Free film - just create purchase record
      setIsProcessing(true);
      try {
        const { error } = await supabase
          .from('film_purchases')
          .insert({
            user_id: user.id,
            film_product_id: film.id,
            amount_paid: 0
          });

        if (error) throw error;

        setHasPurchased(true);
        toast({
          title: "Success",
          description: "Film added to your library!"
        });
        onPurchase?.();
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to get film.",
          variant: "destructive"
        });
      } finally {
        setIsProcessing(false);
      }
    } else {
      // TODO: Implement PayPal payment flow
      toast({
        title: "Coming Soon",
        description: "Film purchases will be available soon!",
      });
    }
  };

  const handleWatch = () => {
    if (film.full_video_url) {
      window.open(film.full_video_url, '_blank');
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={`w-3 h-3 ${
          index < Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-500"
        }`}
      />
    ));
  };

  return (
    <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm overflow-hidden group">
      {/* Thumbnail / Video Preview */}
      <div className="relative aspect-video bg-black">
        {playingTrailer && film.trailer_url ? (
          <video
            key={film.trailer_url}
            className="w-full h-full object-contain"
            controls
            autoPlay
            playsInline
            muted={false}
            onEnded={() => setPlayingTrailer(false)}
            onError={(e) => {
              console.error('Video error:', e);
              // Fallback: open in new tab if video fails to play
              window.open(film.trailer_url!, '_blank');
              setPlayingTrailer(false);
            }}
          >
            <source src={film.trailer_url} type="video/mp4" />
            <source src={film.trailer_url} type="video/quicktime" />
            Your browser does not support this video format.
          </video>
        ) : (
          <>
            {film.thumbnail_url ? (
              <img
                src={film.thumbnail_url}
                alt={film.title}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                <Film className="w-16 h-16 text-gray-500" />
              </div>
            )}
            
            {/* Overlay with play button for trailer */}
            {film.trailer_url && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button
                  size="lg"
                  variant="secondary"
                  className="rounded-full"
                  onClick={() => setPlayingTrailer(true)}
                >
                  <Play className="w-6 h-6 mr-2" />
                  Watch Trailer
                </Button>
              </div>
            )}
          </>
        )}
        
        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
          {film.genres.slice(0, 2).map((genre) => (
            <Badge key={genre} variant="secondary" className="text-xs bg-black/60">
              {genre}
            </Badge>
          ))}
        </div>
        
        {film.is_adult_content && (
          <Badge variant="destructive" className="absolute top-2 right-2 text-xs">
            18+
          </Badge>
        )}
        
        {/* Price badge */}
        <div className="absolute bottom-2 right-2">
          <Badge className={film.is_free ? "bg-green-600" : "bg-blue-600"}>
            {film.is_free ? "FREE" : `$${film.price?.toFixed(2)}`}
          </Badge>
        </div>
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Title & Rating */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-white font-semibold truncate flex-1">{film.title}</h3>
          {reviewCount > 0 && (
            <div className="flex items-center gap-1 shrink-0">
              {renderStars(averageRating)}
              <span className="text-gray-400 text-xs">({reviewCount})</span>
            </div>
          )}
        </div>

        {/* Description */}
        {film.description && (
          <p className="text-gray-400 text-sm line-clamp-2">{film.description}</p>
        )}

        {/* Cast */}
        {film.stars && film.stars.length > 0 && (
          <p className="text-gray-500 text-xs truncate">
            Starring: {film.stars.slice(0, 3).join(', ')}
            {film.stars.length > 3 && ` +${film.stars.length - 3} more`}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {isOwner ? (
            <Button variant="outline" className="flex-1" disabled>
              <Eye className="w-4 h-4 mr-2" />
              Your Film
            </Button>
          ) : hasPurchased ? (
            <Button onClick={handleWatch} className="flex-1 bg-green-600 hover:bg-green-700">
              <Play className="w-4 h-4 mr-2" />
              Watch Now
            </Button>
          ) : (
            <Button 
              onClick={handlePurchase} 
              className="flex-1"
              disabled={isProcessing}
            >
              {isProcessing ? (
                "Processing..."
              ) : film.is_free ? (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Get Free
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Purchase
                </>
              )}
            </Button>
          )}
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowReviews(!showReviews)}
            className="shrink-0"
          >
            {showReviews ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Reviews Section */}
        {showReviews && (
          <div className="pt-3 border-t border-gray-700">
            <FilmReviewsSection filmId={film.id} compact />
          </div>
        )}

        {/* Transit Meter - Only visible to film owner */}
        {isOwner && (
          <div className="pt-3 border-t border-gray-700">
            <TransitMeter currentSales={film.sales_count || 0} size="sm" />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FilmCard;
