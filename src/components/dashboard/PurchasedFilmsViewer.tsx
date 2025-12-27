import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import FilmPlayer from "@/components/FilmPlayer";

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

interface FilmTrack {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  full_video_url: string | null;
  genres: string[];
  amount_paid: number;
  purchase_date: string;
}

const PurchasedFilmsViewer = () => {
  const { user } = useAuth();
  const [filmTracks, setFilmTracks] = useState<FilmTrack[]>([]);
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
        // Transform to FilmTrack format
        const tracks: FilmTrack[] = (data as unknown as PurchasedFilm[]).map((purchase) => ({
          id: purchase.film_products.id,
          title: purchase.film_products.title,
          description: purchase.film_products.description,
          thumbnail_url: purchase.film_products.thumbnail_url,
          full_video_url: purchase.film_products.full_video_url,
          genres: purchase.film_products.genres || [],
          amount_paid: purchase.amount_paid,
          purchase_date: purchase.purchase_date,
        }));
        setFilmTracks(tracks);
      }
    } catch (error) {
      console.error('Error fetching purchased films:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <FilmPlayer films={[]} />;
  }

  return <FilmPlayer films={filmTracks} />;
};

export default PurchasedFilmsViewer;