import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { DollarSign, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface PortfolioImage {
  id: string;
  image_path: string;
  video_url: string | null;
  media_type: string;
  display_order: number;
  is_blurred: boolean;
}

interface Portfolio {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  is_for_sale: boolean;
  price: number | null;
  created_at: string;
  portfolio_images: PortfolioImage[];
}

interface PortfolioCardProps {
  portfolio: Portfolio;
}

const PortfolioCard = ({ portfolio }: PortfolioCardProps) => {
  const { user } = useAuth();
  const [isPurchased, setIsPurchased] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkPurchaseStatus = async () => {
      if (!user || !portfolio.is_for_sale) return;

      const { data } = await supabase
        .from('portfolio_purchases')
        .select('id')
        .eq('user_id', user.id)
        .eq('portfolio_id', portfolio.id)
        .maybeSingle();

      setIsPurchased(!!data);
    };

    checkPurchaseStatus();
  }, [user, portfolio.id, portfolio.is_for_sale]);

  const getMediaUrl = (filePath: string) => {
    const { data } = supabase.storage.from('user-media').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handlePurchase = async () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to purchase portfolios",
        variant: "destructive"
      });
      return;
    }

    if (portfolio.user_id === user.id) {
      toast({
        title: "Cannot Purchase",
        description: "You cannot purchase your own portfolio",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-portfolio-payment', {
        body: { portfolioId: portfolio.id },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) throw error;

      // Redirect to PayPal
      const approvalUrl = data.links.find((link: any) => link.rel === 'approve')?.href;
      if (approvalUrl) {
        window.location.href = approvalUrl;
      } else {
        throw new Error('PayPal approval URL not found');
      }
    } catch (error: any) {
      console.error('Purchase error:', error);
      toast({
        title: "Purchase Failed",
        description: error.message || "Failed to initiate purchase",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const sortedMedia = [...portfolio.portfolio_images].sort((a, b) => a.display_order - b.display_order);
  const isOwner = user?.id === portfolio.user_id;
  const canView = !portfolio.is_for_sale || isPurchased || isOwner;

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-foreground text-xl mb-2">{portfolio.title}</CardTitle>
            {portfolio.description && (
              <p className="text-muted-foreground text-sm">{portfolio.description}</p>
            )}
          </div>
          {portfolio.is_for_sale && portfolio.price && (
            <Badge className="bg-green-600 text-white ml-4">
              <DollarSign className="w-3 h-3 mr-1" />
              ${portfolio.price.toFixed(2)}
            </Badge>
          )}
          {isPurchased && (
            <Badge className="bg-blue-600 text-white ml-4">
              <CheckCircle className="w-3 h-3 mr-1" />
              Purchased
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {sortedMedia.length > 0 && (
          <Carousel className="w-full mb-4">
            <CarouselContent>
              {sortedMedia.map((media) => {
                const shouldBlur = media.is_blurred && !canView;
                
                return (
                  <CarouselItem key={media.id}>
                    <div className="aspect-video relative rounded-lg overflow-hidden bg-muted">
                      {media.media_type === 'video' && media.video_url ? (
                        <video
                          src={getMediaUrl(media.video_url)}
                          controls={canView}
                          className={`w-full h-full object-contain ${shouldBlur ? 'blur-xl' : ''}`}
                          style={shouldBlur ? { filter: 'blur(20px)' } : {}}
                        />
                      ) : (
                        <img
                          src={getMediaUrl(media.image_path)}
                          alt={`Portfolio media ${media.display_order}`}
                          className={`w-full h-full object-contain ${shouldBlur ? 'blur-xl' : ''}`}
                          style={shouldBlur ? { filter: 'blur(20px)' } : {}}
                        />
                      )}
                      {shouldBlur && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <Badge variant="secondary" className="bg-black/70 text-white">
                            Purchase to view
                          </Badge>
                        </div>
                      )}
                    </div>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            {sortedMedia.length > 1 && (
              <>
                <CarouselPrevious className="bg-secondary hover:bg-secondary/80" />
                <CarouselNext className="bg-secondary hover:bg-secondary/80" />
              </>
            )}
          </Carousel>
        )}

        {portfolio.is_for_sale && !isPurchased && !isOwner && (
          <Button
            onClick={handlePurchase}
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={loading}
          >
            {loading ? (
              <>Processing...</>
            ) : (
              <>
                <DollarSign className="w-4 h-4 mr-2" />
                Purchase Portfolio - ${portfolio.price?.toFixed(2)}
              </>
            )}
          </Button>
        )}

        <div className="mt-4 text-xs text-muted-foreground">
          {sortedMedia.length} {sortedMedia.length !== 1 ? 'items' : 'item'}
        </div>
      </CardContent>
    </Card>
  );
};

export default PortfolioCard;
