import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { X, Upload, Film, Image, Play, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";


const GENRE_OPTIONS = [
  'Action', 'Comedy', 'Drama', 'Horror', 'Romance', 'Sci-Fi', 
  'Documentary', 'Thriller', 'Animation', 'Family', 'Fantasy', 
  'Mystery', 'Adventure', 'Crime', 'Musical'
];

interface FilmUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const FilmUploadModal = ({ isOpen, onClose, onSuccess }: FilmUploadModalProps) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [stars, setStars] = useState<string[]>([]);
  const [newStar, setNewStar] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [price, setPrice] = useState("");
  const [isFree, setIsFree] = useState(false);
  const [ownershipConfirmed, setOwnershipConfirmed] = useState(false);
  const [isAdultContent, setIsAdultContent] = useState(false);
  
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [trailerFile, setTrailerFile] = useState<File | null>(null);
  const [fullVideoFile, setFullVideoFile] = useState<File | null>(null);

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnailFile(file);
      setThumbnailPreview(URL.createObjectURL(file));
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleTrailerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTrailerFile(file);
    }
  };

  const handleFullVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFullVideoFile(file);
    }
  };

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

  const uploadFile = async (file: File, bucket: string, folder: string): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${user?.id}/${folder}/${Date.now()}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file);

    if (error) {
      console.error('Upload error:', error);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleSubmit = async () => {
    if (!user) return;

    if (!title.trim()) {
      toast({ title: "Error", description: "Please enter a film title.", variant: "destructive" });
      return;
    }

    if (!ownershipConfirmed) {
      toast({ title: "Error", description: "Please confirm you own or have rights to this film.", variant: "destructive" });
      return;
    }

    if (!thumbnailFile) {
      toast({ title: "Error", description: "Please upload a thumbnail image.", variant: "destructive" });
      return;
    }

    if (!fullVideoFile) {
      toast({ title: "Error", description: "Please upload the full film video.", variant: "destructive" });
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
      // Upload files
      const [thumbnailUrl, coverUrl, trailerUrl, fullVideoUrl] = await Promise.all([
        uploadFile(thumbnailFile, 'film-thumbnails', 'thumbnails'),
        coverFile ? uploadFile(coverFile, 'film-covers', 'covers') : Promise.resolve(null),
        trailerFile ? uploadFile(trailerFile, 'film-trailers', 'trailers') : Promise.resolve(null),
        uploadFile(fullVideoFile, 'film-videos', 'films')
      ]);

      if (!thumbnailUrl || !fullVideoUrl) {
        throw new Error("Failed to upload required files");
      }

      // Insert film product
      const { error } = await supabase
        .from('film_products')
        .insert({
          merchant_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          stars,
          genres: selectedGenres,
          price: isFree ? null : parseFloat(price),
          is_free: isFree,
          thumbnail_url: thumbnailUrl,
          cover_photo_url: coverUrl,
          trailer_url: trailerUrl,
          full_video_url: fullVideoUrl,
          ownership_confirmed: ownershipConfirmed,
          is_adult_content: isAdultContent,
          status: 'published'
        });

      if (error) throw error;

      toast({ title: "Success", description: "Your film has been published!" });
      onSuccess();
      onClose();
      resetForm();
    } catch (error: any) {
      console.error('Error uploading film:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload film. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStars([]);
    setNewStar("");
    setSelectedGenres([]);
    setPrice("");
    setIsFree(false);
    setOwnershipConfirmed(false);
    setIsAdultContent(false);
    setThumbnailFile(null);
    setThumbnailPreview(null);
    setCoverFile(null);
    setCoverPreview(null);
    setTrailerFile(null);
    setFullVideoFile(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Film className="w-5 h-5" />
            Upload New Film
          </DialogTitle>
          <DialogDescription>
            Fill in the details below to publish your film to the store.
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

            {/* Thumbnail Upload */}
            <div>
              <Label className="text-white">Thumbnail (Store Card) *</Label>
              <div className="mt-2">
                {thumbnailPreview ? (
                  <div className="relative w-40 h-24">
                    <img src={thumbnailPreview} alt="Thumbnail" className="w-full h-full object-cover rounded" />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute -top-2 -right-2 w-6 h-6"
                      onClick={() => { setThumbnailFile(null); setThumbnailPreview(null); }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-40 h-24 border-2 border-dashed border-gray-600 rounded cursor-pointer hover:border-gray-500">
                    <Image className="w-6 h-6 text-gray-400" />
                    <span className="text-xs text-gray-400 mt-1">Upload thumbnail</span>
                    <input type="file" accept="image/*" onChange={handleThumbnailChange} className="hidden" />
                  </label>
                )}
              </div>
            </div>

            {/* Cover Photo Upload */}
            <div>
              <Label className="text-white">Cover Photo (Carousel - Optional)</Label>
              <div className="mt-2">
                {coverPreview ? (
                  <div className="relative w-full h-32">
                    <img src={coverPreview} alt="Cover" className="w-full h-full object-cover rounded" />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute -top-2 -right-2 w-6 h-6"
                      onClick={() => { setCoverFile(null); setCoverPreview(null); }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-600 rounded cursor-pointer hover:border-gray-500">
                    <Image className="w-8 h-8 text-gray-400" />
                    <span className="text-sm text-gray-400 mt-1">Upload cover photo for carousel</span>
                    <input type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
                  </label>
                )}
              </div>
            </div>

            {/* Trailer Upload */}
            <div>
              <Label className="text-white">Trailer (Optional)</Label>
              <div className="mt-2">
                {trailerFile ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Play className="w-3 h-3" /> {trailerFile.name}
                    </Badge>
                    <Button
                      size="icon"
                      variant="destructive"
                      className="w-6 h-6"
                      onClick={() => setTrailerFile(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-gray-600 rounded cursor-pointer hover:border-gray-500">
                    <Play className="w-6 h-6 text-gray-400" />
                    <span className="text-sm text-gray-400 mt-1">Upload trailer video</span>
                    <input type="file" accept="video/*" onChange={handleTrailerChange} className="hidden" />
                  </label>
                )}
              </div>
            </div>

            {/* Full Video Upload */}
            <div>
              <Label className="text-white">Full Film Video *</Label>
              <div className="mt-2">
                {fullVideoFile ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Film className="w-3 h-3" /> {fullVideoFile.name}
                    </Badge>
                    <Button
                      size="icon"
                      variant="destructive"
                      className="w-6 h-6"
                      onClick={() => setFullVideoFile(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-600 rounded cursor-pointer hover:border-gray-500">
                    <Upload className="w-8 h-8 text-gray-400" />
                    <span className="text-sm text-gray-400 mt-1">Upload full film video</span>
                    <input type="file" accept="video/*" onChange={handleFullVideoChange} className="hidden" />
                  </label>
                )}
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

            {/* Ownership Confirmation */}
            <div className="flex items-center space-x-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded">
              <Checkbox
                id="ownership"
                checked={ownershipConfirmed}
                onCheckedChange={(checked) => setOwnershipConfirmed(checked as boolean)}
              />
              <Label htmlFor="ownership" className="text-yellow-300">
                I confirm I own or have the rights to distribute this film *
              </Label>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isLoading}>
                {isLoading ? "Publishing..." : "Publish Film"}
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default FilmUploadModal;
