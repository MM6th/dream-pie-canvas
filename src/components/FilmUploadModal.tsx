import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { X, Upload, Film, Image, Play, Plus } from "lucide-react";
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

interface PendingUpload {
  title: string;
  description: string;
  stars: string[];
  selectedGenres: string[];
  price: string;
  isFree: boolean;
  ownershipConfirmed: boolean;
  isAdultContent: boolean;
  trailerProgress: number;
  filmProgress: number;
  startedAt: number;
  isDraft: boolean;
}

const PENDING_UPLOAD_KEY = 'film_upload_pending';

const FilmUploadModal = ({ isOpen, onClose, onSuccess }: FilmUploadModalProps) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<'draft' | 'publish' | null>(null);
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
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({ trailer: 0, film: 0 });
  const [isUploading, setIsUploading] = useState(false);
  const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(null);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const submitLockRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const trailerUploadRef = useRef<tus.Upload | null>(null);
  const filmUploadRef = useRef<tus.Upload | null>(null);
  
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [trailerFile, setTrailerFile] = useState<File | null>(null);
  const [fullVideoFile, setFullVideoFile] = useState<File | null>(null);

  // Check for pending uploads when modal opens
  useEffect(() => {
    if (isOpen && user) {
      checkPublishingStatus();
      checkForPendingUpload();
    }
  }, [isOpen, user]);

  const checkForPendingUpload = () => {
    try {
      const saved = localStorage.getItem(PENDING_UPLOAD_KEY);
      if (saved) {
        const pending = JSON.parse(saved) as PendingUpload;
        // Only show resume prompt if upload was started in last 24 hours
        const ageHours = (Date.now() - pending.startedAt) / (1000 * 60 * 60);
        if (ageHours < 24) {
          setPendingUpload(pending);
          setShowResumePrompt(true);
        } else {
          // Clear old pending uploads
          localStorage.removeItem(PENDING_UPLOAD_KEY);
        }
      }
    } catch (e) {
      console.error('Error checking pending upload:', e);
      localStorage.removeItem(PENDING_UPLOAD_KEY);
    }
  };

  const savePendingUpload = (isDraft: boolean) => {
    const pending: PendingUpload = {
      title,
      description,
      stars,
      selectedGenres,
      price,
      isFree,
      ownershipConfirmed,
      isAdultContent,
      trailerProgress: uploadProgress.trailer,
      filmProgress: uploadProgress.film,
      startedAt: Date.now(),
      isDraft,
    };
    localStorage.setItem(PENDING_UPLOAD_KEY, JSON.stringify(pending));
  };

  const clearPendingUpload = () => {
    localStorage.removeItem(PENDING_UPLOAD_KEY);
    setPendingUpload(null);
    setShowResumePrompt(false);
  };

  const restorePendingUpload = () => {
    if (!pendingUpload) return;
    setTitle(pendingUpload.title);
    setDescription(pendingUpload.description);
    setStars(pendingUpload.stars);
    setSelectedGenres(pendingUpload.selectedGenres);
    setPrice(pendingUpload.price);
    setIsFree(pendingUpload.isFree);
    setOwnershipConfirmed(pendingUpload.ownershipConfirmed);
    setIsAdultContent(pendingUpload.isAdultContent);
    setShowResumePrompt(false);
    toast({
      title: "Form Restored",
      description: "Your previous form data has been restored. Please re-select your video files to continue uploading.",
    });
  };

  const discardPendingUpload = () => {
    clearPendingUpload();
    toast({
      title: "Discarded",
      description: "Previous upload session has been discarded.",
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
    setIsLoading(false);
    setUploadProgress({ trailer: 0, film: 0 });
    setActiveAction(null);
    submitLockRef.current = false;
    clearPendingUpload();
    toast({
      title: "Upload Cancelled",
      description: "Your upload has been cancelled.",
    });
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
      // Default to allowing publishing if we can't check
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

  const uploadVideoWithProgress = async (
    file: File, 
    bucket: string, 
    folder: string, 
    progressKey: 'trailer' | 'film'
  ): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('No session found');
      return null;
    }

    const fileExt = file.name.split('.').pop();
    const filePath = `${user?.id}/${folder}/${Date.now()}.${fileExt}`;
    const projectId = 'veaupehwfsbagzfuvach';

    return new Promise((resolve, reject) => {
      const upload = new tus.Upload(file, {
        endpoint: `https://${projectId}.supabase.co/storage/v1/upload/resumable`,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        headers: {
          authorization: `Bearer ${session.access_token}`,
          'x-upsert': 'false',
        },
        uploadDataDuringCreation: true,
        removeFingerprintOnSuccess: true,
        metadata: {
          bucketName: bucket,
          objectName: filePath,
          contentType: file.type,
          cacheControl: '3600',
        },
        chunkSize: 6 * 1024 * 1024, // 6MB chunks
        onError: (error) => {
          console.error('TUS upload error:', error);
          // Clear ref on error
          if (progressKey === 'trailer') trailerUploadRef.current = null;
          if (progressKey === 'film') filmUploadRef.current = null;
          reject(error);
        },
        onProgress: (bytesUploaded, bytesTotal) => {
          const progress = Math.round((bytesUploaded / bytesTotal) * 100);
          setUploadProgress(prev => {
            const newProgress = { ...prev, [progressKey]: progress };
            // Update pending upload progress in localStorage
            const saved = localStorage.getItem(PENDING_UPLOAD_KEY);
            if (saved) {
              try {
                const pending = JSON.parse(saved);
                pending.trailerProgress = newProgress.trailer;
                pending.filmProgress = newProgress.film;
                localStorage.setItem(PENDING_UPLOAD_KEY, JSON.stringify(pending));
              } catch (e) {
                // Ignore
              }
            }
            return newProgress;
          });
        },
        onSuccess: () => {
          // Clear ref on success
          if (progressKey === 'trailer') trailerUploadRef.current = null;
          if (progressKey === 'film') filmUploadRef.current = null;
          const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);
          resolve(publicUrl);
        },
      });

      // Store ref for potential cancellation
      if (progressKey === 'trailer') trailerUploadRef.current = upload;
      if (progressKey === 'film') filmUploadRef.current = upload;

      upload.findPreviousUploads().then((previousUploads) => {
        if (previousUploads.length) {
          upload.resumeFromPreviousUpload(previousUploads[0]);
          toast({
            title: "Resuming Upload",
            description: `Found previous ${progressKey} upload, resuming...`,
          });
        }
        upload.start();
      });
    });
  };

  const handleSaveDraft = async () => {
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setActiveAction('draft');
    await submitFilm(true);
    submitLockRef.current = false;
    setActiveAction(null);
  };

  const handlePublish = async () => {
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setActiveAction('publish');
    await submitFilm(false);
    submitLockRef.current = false;
    setActiveAction(null);
  };

  const submitFilm = async (isDraft: boolean) => {
    if (!user) return;

    if (!title.trim()) {
      toast({ title: "Error", description: "Please enter a film title.", variant: "destructive" });
      return;
    }

    // For drafts, we only require title and at least one file
    if (!isDraft) {
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
    }

    setIsLoading(true);
    setIsUploading(true);
    setUploadProgress({ trailer: 0, film: 0 });
    
    // Save pending upload state to localStorage
    savePendingUpload(isDraft);

    try {
      // Upload image files (small, no progress needed)
      const [thumbnailUrl, coverUrl] = await Promise.all([
        thumbnailFile ? uploadFile(thumbnailFile, 'film-thumbnails', 'thumbnails') : Promise.resolve(null),
        coverFile ? uploadFile(coverFile, 'film-covers', 'covers') : Promise.resolve(null),
      ]);

      // Upload video files with progress tracking (sequential for better UX)
      let trailerUrl: string | null = null;
      let fullVideoUrl: string | null = null;

      if (trailerFile) {
        trailerUrl = await uploadVideoWithProgress(trailerFile, 'film-trailers', 'trailers', 'trailer');
      }

      if (fullVideoFile) {
        fullVideoUrl = await uploadVideoWithProgress(fullVideoFile, 'film-videos', 'films', 'film');
      }

      if (!isDraft && (!thumbnailUrl || !fullVideoUrl)) {
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
          price: isFree ? null : (price ? parseFloat(price) : null),
          is_free: isFree,
          thumbnail_url: thumbnailUrl,
          cover_photo_url: coverUrl,
          trailer_url: trailerUrl,
          full_video_url: fullVideoUrl,
          ownership_confirmed: ownershipConfirmed,
          is_adult_content: isAdultContent,
          status: isDraft ? 'draft' : 'published'
        });

      if (error) throw error;

      // Clear pending upload on success
      clearPendingUpload();

      toast({ 
        title: "Success", 
        description: isDraft ? "Your film has been saved as a draft!" : "Your film has been published!" 
      });
      onSuccess();
      onClose();
      resetForm();
    } catch (error: any) {
      console.error('Error uploading film:', error);
      toast({
        title: "Upload Interrupted",
        description: "Your upload was interrupted. Reopen this modal to resume where you left off.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setIsUploading(false);
      setUploadProgress({ trailer: 0, film: 0 });
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
            {/* Resume Upload Prompt */}
            {showResumePrompt && pendingUpload && (
              <div className="p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                <p className="text-blue-400 text-sm font-medium mb-2">📥 Incomplete Upload Found</p>
                <p className="text-blue-300/80 text-xs mb-3">
                  You have an unfinished upload for "{pendingUpload.title}" started {new Date(pendingUpload.startedAt).toLocaleString()}.
                  Would you like to restore your form data and continue?
                </p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={restorePendingUpload}>
                    Restore & Continue
                  </Button>
                  <Button size="sm" variant="outline" onClick={discardPendingUpload}>
                    Discard
                  </Button>
                </div>
              </div>
            )}

            {/* Publishing Status Warning */}
            {loadingStatus ? (
              <div className="p-3 bg-gray-700/50 rounded text-gray-400 text-sm">
                Checking publishing status...
              </div>
            ) : publishingStatus && !publishingStatus.canPublish && publishingStatus.activeFilmId ? (
              <div className="p-3 bg-yellow-500/20 border border-yellow-500/30 rounded">
                <p className="text-yellow-400 text-sm font-medium">Publishing Locked</p>
                <p className="text-yellow-300/80 text-xs mt-1">
                  You must sell 30 copies of your current film before publishing another.
                  Current sales: {publishingStatus.currentFilmSales}/30
                </p>
              </div>
            ) : publishingStatus && publishingStatus.freeFilmsUsed >= 1 ? (
              <div className="p-3 bg-blue-500/20 border border-blue-500/30 rounded">
                <p className="text-blue-400 text-sm font-medium">Free Film Limit Reached</p>
                <p className="text-blue-300/80 text-xs mt-1">
                  You've already published 1 free film. All additional films must have a price.
                </p>
              </div>
            ) : null}
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
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Play className="w-3 h-3" /> {trailerFile.name}
                      </Badge>
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        className="w-6 h-6"
                        onClick={() => setTrailerFile(null)}
                        disabled={isUploading}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    {isUploading && (
                      <div className="space-y-1">
                        <Progress value={uploadProgress.trailer} className="h-2" />
                        <p className="text-xs text-gray-400">
                          {uploadProgress.trailer === 0 ? "Preparing trailer upload..." : `Uploading trailer: ${uploadProgress.trailer}%`}
                        </p>
                      </div>
                    )}
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
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Film className="w-3 h-3" /> {fullVideoFile.name}
                      </Badge>
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        className="w-6 h-6"
                        onClick={() => setFullVideoFile(null)}
                        disabled={isUploading}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    {isUploading && (
                      <div className="space-y-1">
                        <Progress value={uploadProgress.film} className="h-2" />
                        <p className="text-xs text-gray-400">
                          {uploadProgress.film === 0 ? "Preparing film upload..." : `Uploading film: ${uploadProgress.film}%`}
                        </p>
                      </div>
                    )}
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

            {/* Final Warning */}
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded">
              <p className="text-red-400 text-sm font-medium">⚠️ Important Notice</p>
              <p className="text-red-300/80 text-xs mt-1">
                Once your film is published, you cannot remove it yourself. You will need to contact an admin to have it taken down. Please make sure all content is correct before publishing.
              </p>
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              {isUploading ? (
                <Button type="button" variant="destructive" onClick={cancelUpload}>
                  Cancel Upload
                </Button>
              ) : (
                <>
                  <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                    Cancel
                  </Button>
                  <Button 
                    type="button"
                    variant="secondary" 
                    onClick={handleSaveDraft} 
                    disabled={isLoading}
                  >
                    {activeAction === 'draft' ? "Saving..." : "Save Draft"}
                  </Button>
                  <Button type="button" onClick={handlePublish} disabled={isLoading}>
                    {activeAction === 'publish' ? "Publishing..." : "Publish Film"}
                  </Button>
                </>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default FilmUploadModal;
