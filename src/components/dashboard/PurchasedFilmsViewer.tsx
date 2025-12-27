import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Film, Play, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface FilmProduct {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  full_video_url: string | null;
  genres: string[];
}

interface PurchasedFilm {
  id: string;
  purchase_date: string;
  amount_paid: number;
  film_products: FilmProduct;
}

const PurchasedFilmsViewer = () => {
  const { user } = useAuth();
  const [purchasedFilms, setPurchasedFilms] = useState<PurchasedFilm[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchPurchasedFilms();
    }
  }, [user]);

  const fetchPurchasedFilms = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('film_purchases')
        .select(`
          id,
          purchase_date,
          amount_paid,
          film_products:film_product_id (
            id,
            title,
            description,
            thumbnail_url,
            full_video_url,
            genres
          )
        `)
        .eq('user_id', user.id)
        .order('purchase_date', { ascending: false });

      if (!error && data) {
        setPurchasedFilms(data as unknown as PurchasedFilm[]);
      }
    } catch (error) {
      console.error('Error fetching purchased films:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWatch = (videoUrl: string) => {
    window.open(videoUrl, '_blank');
  };

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Film className="w-5 h-5" />
            My Films
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (!purchasedFilms || purchasedFilms.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Film className="w-5 h-5" />
            My Films
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No purchased films yet. Browse the Films section to discover and get films.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Film className="w-5 h-5" />
          My Films ({purchasedFilms.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {purchasedFilms.map((purchase) => (
            <div 
              key={purchase.id} 
              className="border border-border rounded-lg overflow-hidden bg-secondary/20"
            >
              {/* Thumbnail */}
              <div className="aspect-video relative bg-muted">
                {purchase.film_products.thumbnail_url ? (
                  <img
                    src={purchase.film_products.thumbnail_url}
                    alt={purchase.film_products.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Film className="w-12 h-12 text-muted-foreground" />
                  </div>
                )}
                
                {/* Play overlay */}
                {purchase.film_products.full_video_url && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                      size="lg"
                      className="rounded-full bg-primary hover:bg-primary/90"
                      onClick={() => handleWatch(purchase.film_products.full_video_url!)}
                    >
                      <Play className="w-6 h-6 mr-2" />
                      Watch
                    </Button>
                  </div>
                )}
              </div>
              
              {/* Info */}
              <div className="p-3 space-y-2">
                <h3 className="font-semibold text-foreground truncate">
                  {purchase.film_products.title}
                </h3>
                
                {purchase.film_products.genres?.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {purchase.film_products.genres.slice(0, 2).map((genre) => (
                      <Badge key={genre} variant="secondary" className="text-xs">
                        {genre}
                      </Badge>
                    ))}
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground">
                  Purchased on {new Date(purchase.purchase_date).toLocaleDateString()}
                </p>
                
                {purchase.film_products.full_video_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => handleWatch(purchase.film_products.full_video_url!)}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Watch Film
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default PurchasedFilmsViewer;