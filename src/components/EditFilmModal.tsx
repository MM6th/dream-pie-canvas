import React, { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { X, Film, Upload, FileVideo, Loader2, Check, AlertCircle, Image as ImageIcon } from "lucide-react";
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
  cover_photo_url: string | null;
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

interface UploadState {
  isUploading: boolean;
  isComplete: boolean;
  url: string | null;
  error: string | null;
}

interface ImageUploadState {
  isUploading: boolean;
  url: string | null;
}

const EditFilmModal = ({ isOpen, onClose, onSuccess, film }: EditFilmModalProps) => {
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState(film.title);
  const [description, setDescription] = useState(film.description || "");
  const [stars, setStars] = useState<string[]>(film.stars || []);
  const [newStar, setNewStar] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>(film.genres || []);
  const [price, setPrice] = useState(film.price?.toString() || "");
  const [isFree, setIsFree] = useState(film.is_free);
  const [isAdultContent, setIsAdultContent] = useState(film.is_adult_content);

  // Immediate upload state - separate for trailer and film
  const [trailerUpload, setTrailerUpload] = useState<UploadState>({
    isUploading: false,
    isComplete: false,
    url: null,
    error: null
  });
  const [filmUpload, setFilmUpload] = useState<UploadState>({
    isUploading: false,
    isComplete: false,
    url: null,
    error: null
  });
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({ trailer: 0, film: 0 });
  
  // Image upload state
  const [thumbnailUpload, setThumbnailUpload] = useState<ImageUploadState>({ isUploading: false, url: null });
  const [coverUpload, setCoverUpload] = useState<ImageUploadState>({ isUploading: false, url: null });
  
  const trailerInputRef = useRef<HTMLInputElement>(null);
  const filmInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
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
    setTrailerUpload({ isUploading: false, isComplete: false, url: null, error: null });
    setFilmUpload({ isUploading: false, isComplete: false, url: null, error: null });
    setUploadProgress({ trailer: 0, film: 0 });
    setThumbnailUpload({ isUploading: false, url: null });
    setCoverUpload({ isUploading: false, url: null });
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

  // Immediate upload function - starts as soon as file is selected
  const startImmediateUpload = async (file: File, type: 'trailer' | 'film') => {
    const setUploadState = type === 'trailer' ? setTrailerUpload : setFilmUpload;
    
    // Reset and start uploading
    setUploadState({ isUploading: true, isComplete: false, url: null, error: null });
    setUploadProgress(prev => ({ ...prev, [type]: 0 }));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${type}.${fileExt}`;
      const filePath = `${session.user.id}/${fileName}`;
      const bucketName = 'film-videos';

      const uploadedUrl = await new Promise<string>((resolve, reject) => {
        const upload = new tus.Upload(file, {
          endpoint: `https://veaupehwfsbagzfuvach.supabase.co/storage/v1/upload/resumable`,
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
            const publicUrl = `https://veaupehwfsbagzfuvach.supabase.co/storage/v1/object/public/${bucketName}/${filePath}`;
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

      setUploadState({ isUploading: false, isComplete: true, url: uploadedUrl, error: null });
      toast({ title: `${type === 'trailer' ? 'Trailer' : 'Film'} uploaded successfully!` });
    } catch (error: any) {
      console.error(`Error uploading ${type}:`, error);
      setUploadState({ isUploading: false, isComplete: false, url: null, error: error.message });
      toast({
        title: "Upload failed",
        description: error.message || `Failed to upload ${type}`,
        variant: "destructive"
      });
    }
  };

  const cancelUpload = (type: 'trailer' | 'film') => {
    if (type === 'trailer' && trailerUploadRef.current) {
      trailerUploadRef.current.abort();
      trailerUploadRef.current = null;
      setTrailerUpload({ isUploading: false, isComplete: false, url: null, error: null });
      setUploadProgress(prev => ({ ...prev, trailer: 0 }));
    }
    if (type === 'film' && filmUploadRef.current) {
      filmUploadRef.current.abort();
      filmUploadRef.current = null;
      setFilmUpload({ isUploading: false, isComplete: false, url: null, error: null });
      setUploadProgress(prev => ({ ...prev, film: 0 }));
    }
    toast({ title: "Upload cancelled" });
  };

  // File selection handlers - trigger immediate upload
  const handleTrailerFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      startImmediateUpload(file, 'trailer');
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleFilmFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      startImmediateUpload(file, 'film');
    }
    e.target.value = '';
  };

  // Image upload handler (immediate upload using regular storage)
  const handleImageUpload = async (file: File, type: 'thumbnail' | 'cover') => {
    const setUploadState = type === 'thumbnail' ? setThumbnailUpload : setCoverUpload;
    const bucketName = type === 'thumbnail' ? 'film-thumbnails' : 'film-covers';
    
    setUploadState({ isUploading: true, url: null });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}/${Date.now()}_${type}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      setUploadState({ isUploading: false, url: publicUrl });
      toast({ title: `${type === 'thumbnail' ? 'Thumbnail' : 'Cover photo'} uploaded!` });
    } catch (error: any) {
      console.error(`Error uploading ${type}:`, error);
      setUploadState({ isUploading: false, url: null });
      toast({
        title: "Upload failed",
        description: error.message || `Failed to upload ${type}`,
        variant: "destructive"
      });
    }
  };

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file, 'thumbnail');
    e.target.value = '';
  };

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file, 'cover');
    e.target.value = '';
  };

  // Get the final URLs to save (prioritize newly uploaded, fall back to existing)
  const getFinalTrailerUrl = () => trailerUpload.url || film.trailer_url;
  const getFinalFilmUrl = () => filmUpload.url || film.full_video_url;
  const getFinalThumbnailUrl = () => thumbnailUpload.url || film.thumbnail_url;
  const getFinalCoverUrl = () => coverUpload.url || film.cover_photo_url;

  // Check if can publish (has required fields)
  const canPublish = () => {
    const hasTitle = title.trim().length > 0;
    const hasGenres = selectedGenres.length > 0;
    const hasPrice = isFree || (price && parseFloat(price) > 0);
    const hasTrailer = getFinalTrailerUrl() !== null;
    const hasFilm = getFinalFilmUrl() !== null;
    return hasTitle && hasGenres && hasPrice && hasTrailer && hasFilm;
  };

  const isAnyUploading = trailerUpload.isUploading || filmUpload.isUploading || thumbnailUpload.isUploading || coverUpload.isUploading;

  // Unified save function
  const handleSave = async (publish: boolean) => {
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

    if (publish) {
      if (!getFinalTrailerUrl()) {
        toast({ title: "Error", description: "Please upload a trailer before publishing.", variant: "destructive" });
        return;
      }
      if (!getFinalFilmUrl()) {
        toast({ title: "Error", description: "Please upload the full film before publishing.", variant: "destructive" });
        return;
      }
    }

    setIsSaving(true);

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
          status: publish ? 'published' : 'draft',
          trailer_url: getFinalTrailerUrl(),
          full_video_url: getFinalFilmUrl(),
          thumbnail_url: getFinalThumbnailUrl(),
          cover_photo_url: getFinalCoverUrl()
        })
        .eq('id', film.id);

      if (error) throw error;

      toast({ 
        title: "Success", 
        description: publish ? "Film published successfully!" : "Draft saved successfully!" 
      });
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
      setIsSaving(false);
    }
  };

  // Get display info for upload sections
  const getTrailerDisplayInfo = () => {
    if (trailerUpload.isUploading) return { text: 'Uploading...', showProgress: true };
    if (trailerUpload.isComplete && trailerUpload.url) return { text: 'Upload complete', showProgress: false };
    if (film.trailer_url) return { text: getFileNameFromUrl(film.trailer_url), showProgress: false };
    return { text: 'No trailer uploaded', showProgress: false };
  };

  const getFilmDisplayInfo = () => {
    if (filmUpload.isUploading) return { text: 'Uploading...', showProgress: true };
    if (filmUpload.isComplete && filmUpload.url) return { text: 'Upload complete', showProgress: false };
    if (film.full_video_url) return { text: getFileNameFromUrl(film.full_video_url), showProgress: false };
    return { text: 'No film uploaded', showProgress: false };
  };

  const trailerInfo = getTrailerDisplayInfo();
  const filmInfo = getFilmDisplayInfo();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Film className="w-5 h-5" />
            Edit Film
          </DialogTitle>
          <DialogDescription>
            Update your film details below. Files upload immediately when selected.
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

            {/* Thumbnail Upload */}
            <div className="space-y-2">
              <Label>Thumbnail Image</Label>
              <div className="p-3 rounded-lg border border-border bg-muted/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {thumbnailUpload.isUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : thumbnailUpload.url || film.thumbnail_url ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <ImageIcon className="w-4 h-4" />
                    )}
                    <span className="truncate max-w-[200px]">
                      {thumbnailUpload.isUploading 
                        ? 'Uploading...' 
                        : thumbnailUpload.url 
                          ? 'Upload complete' 
                          : film.thumbnail_url 
                            ? 'Thumbnail uploaded' 
                            : 'No thumbnail'}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => thumbnailInputRef.current?.click()}
                    disabled={isSaving || thumbnailUpload.isUploading}
                  >
                    {thumbnailUpload.isUploading ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-1" />
                    )}
                    {getFinalThumbnailUrl() ? 'Replace' : 'Upload'}
                  </Button>
                  <input
                    ref={thumbnailInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleThumbnailSelect}
                  />
                </div>
                {(thumbnailUpload.url || film.thumbnail_url) && (
                  <img 
                    src={getFinalThumbnailUrl() || ''} 
                    alt="Thumbnail preview" 
                    className="mt-2 w-24 h-16 object-cover rounded border border-border"
                  />
                )}
              </div>
            </div>

            {/* Cover Photo Upload */}
            <div className="space-y-2">
              <Label>Cover Photo</Label>
              <div className="p-3 rounded-lg border border-border bg-muted/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {coverUpload.isUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : coverUpload.url || film.cover_photo_url ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <ImageIcon className="w-4 h-4" />
                    )}
                    <span className="truncate max-w-[200px]">
                      {coverUpload.isUploading 
                        ? 'Uploading...' 
                        : coverUpload.url 
                          ? 'Upload complete' 
                          : film.cover_photo_url 
                            ? 'Cover uploaded' 
                            : 'No cover photo'}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => coverInputRef.current?.click()}
                    disabled={isSaving || coverUpload.isUploading}
                  >
                    {coverUpload.isUploading ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-1" />
                    )}
                    {getFinalCoverUrl() ? 'Replace' : 'Upload'}
                  </Button>
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCoverSelect}
                  />
                </div>
                {(coverUpload.url || film.cover_photo_url) && (
                  <img 
                    src={getFinalCoverUrl() || ''} 
                    alt="Cover preview" 
                    className="mt-2 w-24 h-36 object-cover rounded border border-border"
                  />
                )}
              </div>
            </div>

            {/* Trailer Upload */}
            <div className="space-y-2">
              <Label>Trailer Video <span className="text-xs text-muted-foreground font-medium">(MP4 or MOV format)</span></Label>
              <div className="p-3 rounded-lg border border-border bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {trailerUpload.isComplete ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : trailerUpload.isUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <FileVideo className="w-4 h-4" />
                    )}
                    <span className="truncate max-w-[200px]">
                      {trailerInfo.text}
                    </span>
                  </div>
                  {trailerUpload.isUploading ? (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => cancelUpload('trailer')}
                    >
                      Cancel
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => trailerInputRef.current?.click()}
                      disabled={isSaving}
                    >
                      <Upload className="w-4 h-4 mr-1" />
                      {getFinalTrailerUrl() ? 'Replace' : 'Upload'}
                    </Button>
                  )}
                  <input
                    ref={trailerInputRef}
                    type="file"
                    accept="video/mp4,video/quicktime,.mp4,.mov"
                    className="hidden"
                    onChange={handleTrailerFileSelect}
                  />
                </div>
                {trailerUpload.isUploading && (
                  <Progress value={uploadProgress.trailer} className="h-2" />
                )}
              </div>
            </div>

            {/* Full Film Upload */}
            <div className="space-y-2">
              <Label>Full Film Video <span className="text-xs text-muted-foreground font-medium">(MP4 or MOV format)</span></Label>
              <div className="p-3 rounded-lg border border-border bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {filmUpload.isComplete ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : filmUpload.isUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <FileVideo className="w-4 h-4" />
                    )}
                    <span className="truncate max-w-[200px]">
                      {filmInfo.text}
                    </span>
                  </div>
                  {filmUpload.isUploading ? (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => cancelUpload('film')}
                    >
                      Cancel
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => filmInputRef.current?.click()}
                      disabled={isSaving}
                    >
                      <Upload className="w-4 h-4 mr-1" />
                      {getFinalFilmUrl() ? 'Replace' : 'Upload'}
                    </Button>
                  )}
                  <input
                    ref={filmInputRef}
                    type="file"
                    accept="video/mp4,video/quicktime,.mp4,.mov"
                    className="hidden"
                    onChange={handleFilmFileSelect}
                  />
                </div>
                {filmUpload.isUploading && (
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

            {/* Adult Content */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="adult"
                checked={isAdultContent}
                onCheckedChange={(checked) => setIsAdultContent(checked as boolean)}
              />
              <Label htmlFor="adult">This film contains adult content</Label>
            </div>

            {/* Publish Requirements Notice */}
            {!canPublish() && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-muted border border-border text-sm text-muted-foreground">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">To publish, you need:</p>
                  <ul className="list-disc list-inside mt-1 space-y-0.5">
                    {!title.trim() && <li>Film title</li>}
                    {selectedGenres.length === 0 && <li>At least one genre</li>}
                    {!isFree && (!price || parseFloat(price) <= 0) && <li>Valid price (or mark as free)</li>}
                    {!getFinalTrailerUrl() && <li>Trailer video</li>}
                    {!getFinalFilmUrl() && <li>Full film video</li>}
                  </ul>
                </div>
              </div>
            )}

            {/* Action Buttons - Save Draft and Publish are separate */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={onClose} disabled={isSaving || isAnyUploading}>
                Cancel
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => handleSave(false)} 
                disabled={isSaving || isAnyUploading}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Draft"
                )}
              </Button>
              <Button 
                onClick={() => handleSave(true)} 
                disabled={isSaving || isAnyUploading || !canPublish()}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  "Publish"
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
