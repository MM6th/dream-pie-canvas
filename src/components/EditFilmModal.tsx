import React, { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { X, Film, Upload, FileVideo, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import * as tus from "tus-js-client";

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
  trailer_url: string | null;
  full_video_url: string | null;
  status: string;
  is_adult_content: boolean;
}

interface EditFilmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  film: FilmProduct;
}

interface UploadProgress {
  trailer: number;
  film: number;
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

  // Video upload state
  const [trailerFile, setTrailerFile] = useState<File | null>(null);
  const [filmFile, setFilmFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({ trailer: 0, film: 0 });
  const [isUploading, setIsUploading] = useState(false);
  
  const trailerInputRef = useRef<HTMLInputElement>(null);
  const filmInputRef = useRef<HTMLInputElement>(null);
  const trailerUploadRef = useRef<tus.Upload | null>(null);
  const filmUploadRef = useRef<tus.Upload | null>(null);

  // Reset state when film prop changes
  useEffect(() => {
    setTitle(film.title);
    setDescription(film.description || "");
    setStars(film.stars || []);
    setSelectedGenres(film.genres || []);
    setPrice(film.price?.toString() || "");
    setIsFree(film.is_free);
    setIsAdultContent(film.is_adult_content);
    setStatus(film.status);
    setTrailerFile(null);
    setFilmFile(null);
    setUploadProgress({ trailer: 0, film: 0 });
  }, [film]);

  const addStar = () => {
    const trimmed = newStar.trim();
    if (trimmed && !stars.includes(trimmed)) {
      setStars([...stars, trimmed]);
      setNewStar("");
    }
  };

  const handleStarKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addStar();
    }
  };

  const handleStarBlur = () => {
    addStar();
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

  const getFileNameFromUrl = (url: string | null): string => {
    if (!url) return "No file";
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      return pathParts[pathParts.length - 1] || "Unknown file";
    } catch {
      return url.split('/').pop() || "Unknown file";
    }
  };

  const uploadVideoWithProgress = async (
    file: File,
    type: 'trailer' | 'film'
  ): Promise<string> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${type}.${fileExt}`;
    const filePath = `${session.user.id}/${fileName}`;
    const bucketName = 'film-videos';

    return new Promise((resolve, reject) => {
      const upload = new tus.Upload(file, {
        endpoint: `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/upload/resumable`,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        headers: {
          authorization: `Bearer ${session.access_token}`,
          'x-upsert': 'true',
        },
        uploadDataDuringCreation: true,
        removeFingerprintOnSuccess: true,
        metadata: {
          bucketName,
          objectName: filePath,
          contentType: file.type,
          cacheControl: '3600',
        },
        chunkSize: 6 * 1024 * 1024,
        onError: (error) => {
          console.error(`${type} upload error:`, error);
          reject(error);
        },
        onProgress: (bytesUploaded, bytesTotal) => {
          const percentage = Math.round((bytesUploaded / bytesTotal) * 100);
          setUploadProgress(prev => ({ ...prev, [type]: percentage }));
        },
        onSuccess: () => {
          const publicUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/${bucketName}/${filePath}`;
          resolve(publicUrl);
        },
      });

      if (type === 'trailer') {
        trailerUploadRef.current = upload;
      } else {
        filmUploadRef.current = upload;
      }

      upload.findPreviousUploads().then((previousUploads) => {
        if (previousUploads.length) {
          upload.resumeFromPreviousUpload(previousUploads[0]);
        }
        upload.start();
      });
    });
  };

  const cancelUpload = () => {
    if (trailerUploadRef.current) {
      trailerUploadRef.current.abort();
      trailerUploadRef.current = null;
    }
    if (filmUploadRef.current) {
      filmUploadRef.current.abort();
      filmUploadRef.current = null;
    }
    setIsUploading(false);
    setUploadProgress({ trailer: 0, film: 0 });
    setTrailerFile(null);
    setFilmFile(null);
    toast({ title: "Upload cancelled" });
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
    setIsUploading(trailerFile !== null || filmFile !== null);

    try {
      let trailerUrl = film.trailer_url;
      let fullVideoUrl = film.full_video_url;

      // Upload new trailer if selected
      if (trailerFile) {
        trailerUrl = await uploadVideoWithProgress(trailerFile, 'trailer');
      }

      // Upload new film if selected
      if (filmFile) {
        fullVideoUrl = await uploadVideoWithProgress(filmFile, 'film');
      }

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
          status,
          trailer_url: trailerUrl,
          full_video_url: fullVideoUrl
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
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
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
              <Label htmlFor="title">Film Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter film title"
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description/Blurb</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter film description..."
                className="min-h-[100px]"
              />
            </div>

            {/* Trailer Upload */}
            <div className="space-y-2">
              <Label>Trailer Video</Label>
              <div className="p-3 rounded-lg border border-border bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileVideo className="w-4 h-4" />
                    <span className="truncate max-w-[200px]">
                      {trailerFile ? trailerFile.name : getFileNameFromUrl(film.trailer_url)}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => trailerInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    <Upload className="w-4 h-4 mr-1" />
                    Replace
                  </Button>
                  <input
                    ref={trailerInputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setTrailerFile(file);
                    }}
                  />
                </div>
                {trailerFile && uploadProgress.trailer > 0 && (
                  <Progress value={uploadProgress.trailer} className="h-2" />
                )}
              </div>
            </div>

            {/* Full Film Upload */}
            <div className="space-y-2">
              <Label>Full Film Video</Label>
              <div className="p-3 rounded-lg border border-border bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileVideo className="w-4 h-4" />
                    <span className="truncate max-w-[200px]">
                      {filmFile ? filmFile.name : getFileNameFromUrl(film.full_video_url)}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => filmInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    <Upload className="w-4 h-4 mr-1" />
                    Replace
                  </Button>
                  <input
                    ref={filmInputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setFilmFile(file);
                    }}
                  />
                </div>
                {filmFile && uploadProgress.film > 0 && (
                  <Progress value={uploadProgress.film} className="h-2" />
                )}
              </div>
            </div>

            {/* Stars/Cast - Improved UX */}
            <div>
              <Label>Stars/Cast</Label>
              <Input
                value={newStar}
                onChange={(e) => setNewStar(e.target.value)}
                placeholder="Type name, press Enter to add"
                onKeyDown={handleStarKeyDown}
                onBlur={handleStarBlur}
                className="mb-2"
              />
              {stars.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {stars.map((star) => (
                    <Badge key={star} variant="secondary" className="flex items-center gap-1">
                      {star}
                      <X className="w-3 h-3 cursor-pointer hover:text-destructive" onClick={() => removeStar(star)} />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Genres */}
            <div>
              <Label>Genres (select up to 3) *</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {GENRE_OPTIONS.map((genre) => (
                  <Badge
                    key={genre}
                    variant={selectedGenres.includes(genre) ? "default" : "outline"}
                    className={`cursor-pointer ${selectedGenres.includes(genre) ? 'bg-primary' : 'hover:bg-muted'}`}
                    onClick={() => toggleGenre(genre)}
                  >
                    {genre}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Pricing */}
            <div className="space-y-2">
              <Label>Pricing</Label>
              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="free"
                    checked={isFree}
                    onCheckedChange={(checked) => setIsFree(checked as boolean)}
                  />
                  <Label htmlFor="free">Publish for Free</Label>
                </div>
                {!isFree && (
                  <div className="flex items-center gap-2">
                    <span>$</span>
                    <Input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder=""
                      className="w-24"
                      min="0.01"
                      step="0.01"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="published"
                    checked={status === 'published'}
                    onChange={() => setStatus('published')}
                  />
                  <Label htmlFor="published">Published</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="draft"
                    checked={status === 'draft'}
                    onChange={() => setStatus('draft')}
                  />
                  <Label htmlFor="draft">Draft</Label>
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
              <Label htmlFor="adult">This film contains adult content</Label>
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              {isUploading ? (
                <Button variant="destructive" onClick={cancelUpload}>
                  Cancel Upload
                </Button>
              ) : (
                <Button variant="outline" onClick={onClose} disabled={isLoading}>
                  Cancel
                </Button>
              )}
              <Button onClick={handleSubmit} disabled={isLoading || isUploading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isUploading ? "Uploading..." : "Saving..."}
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default EditFilmModal;
