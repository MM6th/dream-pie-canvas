import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Film, Plus, Edit, Trash2, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import FilmUploadModal from "@/components/FilmUploadModal";
import EditFilmModal from "@/components/EditFilmModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface FilmProduct {
  id: string;
  title: string;
  description: string | null;
  stars: string[];
  genres: string[];
  price: number | null;
  is_free: boolean;
  thumbnail_url: string | null;
  trailer_url: string | null;
  status: string;
  is_adult_content: boolean;
  created_at: string;
}

const FilmProductManager = () => {
  const { user } = useAuth();
  const [films, setFilms] = useState<FilmProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingFilm, setEditingFilm] = useState<FilmProduct | null>(null);
  const [deletingFilmId, setDeletingFilmId] = useState<string | null>(null);

  const fetchFilms = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('film_products')
        .select('*')
        .eq('merchant_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFilms(data || []);
    } catch (error) {
      console.error('Error fetching films:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFilms();
  }, [user]);

  const handleDelete = async () => {
    if (!deletingFilmId) return;

    try {
      const { error } = await supabase
        .from('film_products')
        .delete()
        .eq('id', deletingFilmId);

      if (error) throw error;

      toast({ title: "Success", description: "Film deleted successfully." });
      fetchFilms();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete film.",
        variant: "destructive"
      });
    } finally {
      setDeletingFilmId(null);
    }
  };

  return (
    <>
      <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm" data-tutorial="film-products">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Film className="w-5 h-5 text-purple-500" />
              My Films
            </div>
            <Button onClick={() => setShowUploadModal(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Upload Film
            </Button>
          </CardTitle>
          <p className="text-gray-400 text-sm mt-1">
            PIE receives a 10% platform fee on all film sales. You receive 90%. Payouts available at $100 threshold.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-gray-400 text-center py-4">Loading films...</p>
          ) : films.length === 0 ? (
            <div className="text-center py-8">
              <Film className="w-12 h-12 text-gray-500 mx-auto mb-3" />
              <p className="text-gray-400 mb-4">You haven't uploaded any films yet.</p>
              <Button onClick={() => setShowUploadModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Upload Your First Film
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {films.map((film) => (
                <Card key={film.id} className="bg-gray-700/50 border-gray-600 overflow-hidden">
                  <div className="relative aspect-video">
                    {film.thumbnail_url ? (
                      <img
                        src={film.thumbnail_url}
                        alt={film.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-600 flex items-center justify-center">
                        <Film className="w-12 h-12 text-gray-500" />
                      </div>
                    )}
                    {film.trailer_url && (
                      <div className="absolute top-2 right-2">
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Play className="w-3 h-3" /> Trailer
                        </Badge>
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2 flex gap-1 flex-wrap">
                      {film.genres.slice(0, 2).map((genre) => (
                        <Badge key={genre} variant="secondary" className="text-xs">
                          {genre}
                        </Badge>
                      ))}
                      {film.genres.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{film.genres.length - 2}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <CardContent className="p-3">
                    <h3 className="text-white font-medium truncate">{film.title}</h3>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={film.status === 'published' ? 'default' : 'secondary'}>
                          {film.status}
                        </Badge>
                        {film.is_adult_content && (
                          <Badge variant="destructive" className="text-xs">18+</Badge>
                        )}
                      </div>
                      <span className="text-green-400 font-medium">
                        {film.is_free ? 'Free' : `$${film.price?.toFixed(2)}`}
                      </span>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setEditingFilm(film)}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeletingFilmId(film.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <FilmUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={fetchFilms}
      />

      {editingFilm && (
        <EditFilmModal
          isOpen={!!editingFilm}
          onClose={() => setEditingFilm(null)}
          onSuccess={fetchFilms}
          film={editingFilm}
        />
      )}

      <AlertDialog open={!!deletingFilmId} onOpenChange={() => setDeletingFilmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Film</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this film? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default FilmProductManager;
