import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { X, Upload, Film, Image as ImageIcon, Loader2, Check, AlertCircle, FileVideo, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import * as tus from 'tus-js-client';

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

interface PublishingStatus {
  canPublish: boolean;
  freeFilmsUsed: number;
  currentFilmSales: number;
  activeFilmId: string | null;
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

const FilmUploadModal = ({ isOpen, onClose, onSuccess }: FilmUploadModalProps) => {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [stars, setStars] = useState<string[]>([]);
  const [newStar, setNewStar] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [price, setPrice] = useState("");
  const [isFree, setIsFree] = useState(false);
  const [ownershipConfirmed, setOwnershipConfirmed] = useState(false);
  const [isAdultContent, setIsAdultContent] = useState(false);
  const [publishingStatus, setPublishingStatus] = useState<PublishingStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

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

  useEffect(() => {
    if (isOpen && user) {
      checkPublishingStatus();
      resetForm();
    }
  }, [isOpen, user]);

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
    setTrailerUpload({ isUploading: false, isComplete: false, url: null, error: null });
    setFilmUpload({ isUploading: false, isComplete: false, url: null, error: null });
    setUploadProgress({ trailer: 0, film: 0 });
    setThumbnailUpload({ isUploading: false, url: null });
    setCoverUpload({ isUploading: false, url: null });
  };

  const checkPublishingStatus = async () => {
    if (!user) return;
    setLoadingStatus(true);
    
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('free_films_published, current_film_sales, active_film_id, can_publish_film')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setPublishingStatus({
        canPublish: profile.can_publish_film ?? true,
        freeFilmsUsed: profile.free_films_published ?? 0,
        currentFilmSales: profile.current_film_sales ?? 0,
        activeFilmId: profile.active_film_id
      });
    } catch (error) {
      console.error('Error checking publishing status:', error);
      setPublishingStatus({
        canPublish: true,
        freeFilmsUsed: 0,
        currentFilmSales: 0,
        activeFilmId: null
      });
    } finally {
      setLoadingStatus(false);
    }
  };

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
      const bucketName = type === 'trailer' ? 'film-trailers' : 'film-videos';

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
            toast({
              title: "Resuming Upload",
              description: `Found previous ${type} upload, resuming...`,
            });
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

  // Preflight check for video playability
  const checkVideoPlayability = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      const objectUrl = URL.createObjectURL(file);
      
      video.preload = 'metadata';
      
      const cleanup = () => {
        URL.revokeObjectURL(objectUrl);
        video.remove();
      };
      
      video.onloadedmetadata = () => {
        // Check if video has actual dimensions (indicates playable codec)
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          cleanup();
          resolve(true);
        } else {
          cleanup();
          resolve(false);
        }
      };
      
      video.onerror = () => {
        cleanup();
        resolve(false);
      };
      
      // Timeout after 5 seconds
      setTimeout(() => {
        cleanup();
        resolve(false);
      }, 5000);
      
      video.src = objectUrl;
    });
  };

  // File selection handlers - trigger immediate upload
  const handleTrailerFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check if it's a MOV or non-MP4 file
      const isMov = file.name.toLowerCase().endsWith('.mov');
      const isMp4 = file.type.includes('mp4') || file.name.toLowerCase().endsWith('.mp4');
      
      if (isMov || !isMp4) {
        // Run playability check
        const isPlayable = await checkVideoPlayability(file);
        
        if (!isPlayable) {
          toast({
            title: "Video codec not supported",
            description: "This video uses a codec (likely HEVC/H.265) that most browsers cannot play. Please export as H.264 MP4 for universal compatibility.",
            variant: "destructive"
          });
          e.target.value = '';
          return;
        }
      }
      
      startImmediateUpload(file, 'trailer');
    }
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

  // Check if can publish (has required fields)
  const canPublish = () => {
    const hasTitle = title.trim().length > 0;
    const hasGenres = selectedGenres.length > 0;
    const hasPrice = isFree || (price && parseFloat(price) > 0);
    const hasThumbnail = thumbnailUpload.url !== null;
    const hasTrailer = trailerUpload.url !== null;
    const hasFilm = filmUpload.url !== null;
    const hasOwnership = ownershipConfirmed;
    return hasTitle && hasGenres && hasPrice && hasThumbnail && hasTrailer && hasFilm && hasOwnership;
  };

  const isAnyUploading = trailerUpload.isUploading || filmUpload.isUploading || thumbnailUpload.isUploading || coverUpload.isUploading;

  // Unified save function
  const handleSave = async (publish: boolean) => {
    if (!user) return;
    
    if (!title.trim()) {
      toast({ title: "Error", description: "Please enter a film title.", variant: "destructive" });
      return;
    }

    if (publish) {
      if (!ownershipConfirmed) {
        toast({ title: "Error", description: "Please confirm you own or have rights to this film.", variant: "destructive" });
        return;
      }

      if (!thumbnailUpload.url) {
        toast({ title: "Error", description: "Please upload a thumbnail image.", variant: "destructive" });
        return;
      }

      if (!trailerUpload.url) {
        toast({ title: "Error", description: "Please upload a trailer.", variant: "destructive" });
        return;
      }

      if (!filmUpload.url) {
        toast({ title: "Error", description: "Please upload the full film.", variant: "destructive" });
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
    }

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('film_products')
        .insert({
          merchant_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          stars,
          genres: selectedGenres,
          price: isFree ? null : (price ? parseFloat(price) : null),
          is_free: isFree,
          thumbnail_url: thumbnailUpload.url,
          cover_photo_url: coverUpload.url,
          trailer_url: trailerUpload.url,
          full_video_url: filmUpload.url,
          ownership_confirmed: ownershipConfirmed,
          is_adult_content: isAdultContent,
          status: publish ? 'published' : 'draft'
        });

      if (error) throw error;

      toast({ 
        title: "Success", 
        description: publish ? "Your film has been published!" : "Your film has been saved as a draft!" 
      });
      onSuccess();
      onClose();
      resetForm();
    } catch (error: any) {
      console.error('Error saving film:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save film.",
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
    return { text: 'No trailer uploaded', showProgress: false };
  };

  const getFilmDisplayInfo = () => {
    if (filmUpload.isUploading) return { text: 'Uploading...', showProgress: true };
    if (filmUpload.isComplete && filmUpload.url) return { text: 'Upload complete', showProgress: false };
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
            Upload New Film
          </DialogTitle>
          <DialogDescription>
            Upload your film content below. Files upload immediately when selected.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-4">
            {/* Publishing Status Warning - hidden if bypass is enabled */}

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
              <Label>Thumbnail Image *</Label>
              <div className="p-3 rounded-lg border border-border bg-muted/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {thumbnailUpload.isUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : thumbnailUpload.url ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <ImageIcon className="w-4 h-4" />
                    )}
                    <span className="truncate max-w-[200px]">
                      {thumbnailUpload.isUploading 
                        ? 'Uploading...' 
                        : thumbnailUpload.url 
                          ? 'Upload complete' 
                          : 'No thumbnail uploaded'}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => thumbnailInputRef.current?.click()}
                    disabled={thumbnailUpload.isUploading}
                  >
                    {thumbnailUpload.url ? 'Replace' : 'Upload'}
                  </Button>
                  <input
                    ref={thumbnailInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleThumbnailSelect}
                  />
                </div>
              </div>
            </div>

            {/* Cover Photo Upload */}
            <div className="space-y-2">
              <Label>Cover Photo (Optional)</Label>
              <div className="p-3 rounded-lg border border-border bg-muted/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {coverUpload.isUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : coverUpload.url ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <ImageIcon className="w-4 h-4" />
                    )}
                    <span className="truncate max-w-[200px]">
                      {coverUpload.isUploading 
                        ? 'Uploading...' 
                        : coverUpload.url 
                          ? 'Upload complete' 
                          : 'No cover photo uploaded'}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => coverInputRef.current?.click()}
                    disabled={coverUpload.isUploading}
                  >
                    {coverUpload.url ? 'Replace' : 'Upload'}
                  </Button>
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCoverSelect}
                  />
                </div>
              </div>
            </div>

            {/* Trailer Upload */}
            <div className="space-y-2">
              <Label>Trailer Video * <span className="text-xs text-muted-foreground font-medium">(MP4 or MOV format)</span></Label>
              <div className="p-3 rounded-lg border border-border bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {trailerUpload.isUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : trailerUpload.isComplete ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : trailerUpload.error ? (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    ) : (
                      <FileVideo className="w-4 h-4" />
                    )}
                    <span className="truncate max-w-[200px]">{trailerInfo.text}</span>
                  </div>
                  <div className="flex gap-2">
                    {trailerUpload.isUploading && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => cancelUpload('trailer')}
                      >
                        Cancel
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => trailerInputRef.current?.click()}
                      disabled={trailerUpload.isUploading}
                    >
                      {trailerUpload.isComplete ? 'Replace' : 'Upload'}
                    </Button>
                  </div>
                  <input
                    ref={trailerInputRef}
                    type="file"
                    accept="video/mp4,video/quicktime,.mp4,.mov"
                    className="hidden"
                    onChange={handleTrailerFileSelect}
                  />
                </div>
                {trailerInfo.showProgress && (
                  <Progress value={uploadProgress.trailer} className="h-2" />
                )}
              </div>
            </div>

            {/* Full Film Upload */}
            <div className="space-y-2">
              <Label>Full Film Video * <span className="text-xs text-muted-foreground font-medium">(MP4 or MOV format)</span></Label>
              <div className="p-3 rounded-lg border border-border bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {filmUpload.isUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : filmUpload.isComplete ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : filmUpload.error ? (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    ) : (
                      <Film className="w-4 h-4" />
                    )}
                    <span className="truncate max-w-[200px]">{filmInfo.text}</span>
                  </div>
                  <div className="flex gap-2">
                    {filmUpload.isUploading && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => cancelUpload('film')}
                      >
                        Cancel
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => filmInputRef.current?.click()}
                      disabled={filmUpload.isUploading}
                    >
                      {filmUpload.isComplete ? 'Replace' : 'Upload'}
                    </Button>
                  </div>
                  <input
                    ref={filmInputRef}
                    type="file"
                    accept="video/mp4,video/quicktime,.mp4,.mov"
                    className="hidden"
                    onChange={handleFilmFileSelect}
                  />
                </div>
                {filmInfo.showProgress && (
                  <Progress value={uploadProgress.film} className="h-2" />
                )}
              </div>
            </div>

            {/* Cast/Stars */}
            <div>
              <Label>Cast (Stars)</Label>
              <div className="flex gap-2">
                <Input
                  value={newStar}
                  onChange={(e) => setNewStar(e.target.value)}
                  onKeyDown={handleStarKeyDown}
                  onBlur={handleStarBlur}
                  placeholder="Enter actor name"
                />
                <Button type="button" onClick={addStar} variant="outline" size="icon">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {stars.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {stars.map((star) => (
                    <Badge key={star} variant="secondary" className="flex items-center gap-1">
                      {star}
                      <X 
                        className="w-3 h-3 cursor-pointer" 
                        onClick={() => removeStar(star)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Genres */}
            <div>
              <Label>Genres * (Select up to 3)</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {GENRE_OPTIONS.map((genre) => (
                  <Badge
                    key={genre}
                    variant={selectedGenres.includes(genre) ? "default" : "outline"}
                    className="cursor-pointer"
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
                  <label htmlFor="free" className="text-sm text-muted-foreground cursor-pointer">
                    Free to watch
                  </label>
                </div>
                {!isFree && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">$</span>
                    <Input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="9.99"
                      className="w-24"
                      step="0.01"
                      min="0"
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
              <label htmlFor="adult" className="text-sm text-muted-foreground cursor-pointer">
                This film contains adult content (18+)
              </label>
            </div>

            {/* Ownership Confirmation */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="ownership"
                checked={ownershipConfirmed}
                onCheckedChange={(checked) => setOwnershipConfirmed(checked as boolean)}
              />
              <label htmlFor="ownership" className="text-sm text-muted-foreground cursor-pointer">
                I confirm I own or have the rights to distribute this film *
              </label>
            </div>

            {/* Publish Requirements Notice */}
            {!canPublish() && (
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-sm text-muted-foreground">
                  <strong>To publish, you need:</strong> title, at least 1 genre, pricing, thumbnail, trailer, full film, and ownership confirmation.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer Buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleSave(false)}
            disabled={isSaving || isAnyUploading || !title.trim()}
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Save Draft
          </Button>
          <Button
            onClick={() => handleSave(true)}
            disabled={isSaving || isAnyUploading || !canPublish()}
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Publish Film
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FilmUploadModal;
