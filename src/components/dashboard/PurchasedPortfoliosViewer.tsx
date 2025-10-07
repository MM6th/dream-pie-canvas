import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { FolderOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PortfolioImage {
  id: string;
  image_path: string;
  video_url: string | null;
  media_type: string;
  display_order: number;
}

interface Portfolio {
  id: string;
  title: string;
  description: string | null;
  portfolio_images: PortfolioImage[];
}

interface PurchasedPortfolio {
  id: string;
  purchase_date: string;
  amount_paid: number;
  portfolios: Portfolio;
}

interface PurchasedPortfoliosViewerProps {
  portfolios: PurchasedPortfolio[];
}

const PurchasedPortfoliosViewer = ({ portfolios }: PurchasedPortfoliosViewerProps) => {
  const getMediaUrl = (filePath: string) => {
    const { data } = supabase.storage.from('user-media').getPublicUrl(filePath);
    return data.publicUrl;
  };

  if (!portfolios || portfolios.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            Purchased Portfolios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No purchased portfolios yet. Browse profiles to discover and purchase portfolios.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderOpen className="w-5 h-5" />
          Purchased Portfolios
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {portfolios.map((purchase) => {
          const sortedMedia = [...purchase.portfolios.portfolio_images].sort(
            (a, b) => a.display_order - b.display_order
          );

          return (
            <div key={purchase.id} className="border border-border rounded-lg p-4 bg-secondary/20">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-foreground">{purchase.portfolios.title}</h3>
                {purchase.portfolios.description && (
                  <p className="text-sm text-muted-foreground mt-1">{purchase.portfolios.description}</p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Purchased on {new Date(purchase.purchase_date).toLocaleDateString()}
                </p>
              </div>

              {sortedMedia.length > 0 && (
                <Carousel className="w-full">
                  <CarouselContent>
                    {sortedMedia.map((media) => (
                      <CarouselItem key={media.id} className="md:basis-1/2 lg:basis-1/3">
                        <div className="aspect-square relative rounded-lg overflow-hidden bg-muted">
                          {media.media_type === 'video' && media.video_url ? (
                            <video
                              src={getMediaUrl(media.video_url)}
                              controls
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <img
                              src={getMediaUrl(media.image_path)}
                              alt={`Portfolio media ${media.display_order}`}
                              className="w-full h-full object-contain"
                            />
                          )}
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  {sortedMedia.length > 1 && (
                    <>
                      <CarouselPrevious className="bg-secondary hover:bg-secondary/80" />
                      <CarouselNext className="bg-secondary hover:bg-secondary/80" />
                    </>
                  )}
                </Carousel>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default PurchasedPortfoliosViewer;
