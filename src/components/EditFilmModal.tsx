import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { X, Film, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

const GENRE_OPTIONS = [
  'Action', 'Comedy', 'Drama', 'Horror', 'Romance', 'Sci-Fi', 
  'Documentary', 'Thriller', 'Animation', 'Family', 'Fantasy', 
  'Mystery', 'Adventure', 'Crime', 'Musical'
];

interface FilmProduct {
  id: string;
  title: string;
  description: string | null;
  stars: string[];
  genres: string[];
  price: number | null;
  is_free: boolean;
  thumbnail_url: string | null;
  status: string;
  is_adult_content: boolean;
}

interface EditFilmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  film: FilmProduct;
}

const EditFilmModal = ({ isOpen, onClose, onSuccess, film }: EditFilmModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState(film.title);
  const [description, setDescription] = useState(film.description || "");
  const [stars, setStars] = useState<string[]>(film.stars || []);
  const [newStar, setNewStar] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>(film.genres || []);
  const [price, setPrice] = useState(film.price?.toString() || "");
  const [isFree, setIsFree] = useState(film.is_free);
  const [isAdultContent, setIsAdultContent] = useState(film.is_adult_content);
  const [status, setStatus] = useState(film.status);

  const addStar = () => {
    if (newStar.trim() && !stars.includes(newStar.trim())) {
      setStars([...stars, newStar.trim()]);
      setNewStar("");
    }
  };

  const removeStar = (star: string) => {
    setStars(stars.filter(s => s !== star));
  };

  const toggleGenre = (genre: string) => {
    if (selectedGenres.includes(genre)) {
      setSelectedGenres(selectedGenres.filter(g => g !== genre));
    } else if (selectedGenres.length < 3) {
      setSelectedGenres([...selectedGenres, genre]);
    } else {
      toast({
        title: "Maximum 3 genres",
        description: "You can only select up to 3 genres for your film.",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({ title: "Error", description: "Please enter a film title.", variant: "destructive" });
      return;
    }

    if (selectedGenres.length === 0) {
      toast({ title: "Error", description: "Please select at least one genre.", variant: "destructive" });
      return;
    }

    if (!isFree && (!price || parseFloat(price) <= 0)) {
      toast({ title: "Error", description: "Please enter a valid price or mark as free.", variant: "destructive" });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('film_products')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          stars,
          genres: selectedGenres,
          price: isFree ? null : parseFloat(price),
          is_free: isFree,
          is_adult_content: isAdultContent,
          status
        })
        .eq('id', film.id);

      if (error) throw error;

      toast({ title: "Success", description: "Film updated successfully!" });
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error updating film:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update film.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Film className="w-5 h-5" />
            Edit Film
          </DialogTitle>
          <DialogDescription>
            Update your film details below.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-4">
            {/* Title */}
            <div>
              <Label htmlFor="title" className="text-white">Film Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter film title"
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description" className="text-white">Description/Blurb</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter film description..."
                className="bg-gray-700 border-gray-600 text-white min-h-[100px]"
              />
            </div>

            {/* Stars/Cast */}
            <div>
              <Label className="text-white">Stars/Cast</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newStar}
                  onChange={(e) => setNewStar(e.target.value)}
                  placeholder="Add cast member"
                  className="bg-gray-700 border-gray-600 text-white"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addStar())}
                />
                <Button type="button" onClick={addStar} size="icon" variant="secondary">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {stars.map((star) => (
                  <Badge key={star} variant="secondary" className="flex items-center gap-1">
                    {star}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => removeStar(star)} />
                  </Badge>
                ))}
              </div>
            </div>

            {/* Genres */}
            <div>
              <Label className="text-white">Genres (select up to 3) *</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {GENRE_OPTIONS.map((genre) => (
                  <Badge
                    key={genre}
                    variant={selectedGenres.includes(genre) ? "default" : "outline"}
                    className={`cursor-pointer ${selectedGenres.includes(genre) ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
                    onClick={() => toggleGenre(genre)}
                  >
                    {genre}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Pricing */}
            <div className="space-y-2">
              <Label className="text-white">Pricing</Label>
              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="free"
                    checked={isFree}
                    onCheckedChange={(checked) => setIsFree(checked as boolean)}
                  />
                  <Label htmlFor="free" className="text-white">Publish for Free</Label>
                </div>
                {!isFree && (
                  <div className="flex items-center gap-2">
                    <span className="text-white">$</span>
                    <Input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder=""
                      className="bg-gray-700 border-gray-600 text-white w-24"
                      min="0.01"
                      step="0.01"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label className="text-white">Status</Label>
              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="published"
                    checked={status === 'published'}
                    onChange={() => setStatus('published')}
                    className="text-blue-600"
                  />
                  <Label htmlFor="published" className="text-white">Published</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="draft"
                    checked={status === 'draft'}
                    onChange={() => setStatus('draft')}
                    className="text-blue-600"
                  />
                  <Label htmlFor="draft" className="text-white">Draft</Label>
                </div>
              </div>
            </div>

            {/* Adult Content */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="adult"
                checked={isAdultContent}
                onCheckedChange={(checked) => setIsAdultContent(checked as boolean)}
              />
              <Label htmlFor="adult" className="text-white">This film contains adult content</Label>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default EditFilmModal;
