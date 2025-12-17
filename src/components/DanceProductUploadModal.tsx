import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Plus, Upload, X, Loader2, Image, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import * as tus from "tus-js-client";

interface DanceProductUploadModalProps {
  onSuccess: () => void;
}

interface UserUpload {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  created_at: string;
}

const DanceProductUploadModal = ({ onSuccess }: DanceProductUploadModalProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [isFree, setIsFree] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [blurredIndexes, setBlurredIndexes] = useState<number[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [currentUploadName, setCurrentUploadName] = useState<string>("");

  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryUploads, setGalleryUploads] = useState<UserUpload[]>([]);

  const MAX_FILE_SIZE = 3 * 1024 * 1024 * 1024; // 3GB for Pole Dancers
  const TUS_THRESHOLD = 50 * 1024 * 1024; // 50MB - use TUS for files larger than this

  const addValidFiles = (files: File[]) => {
    if (files.length === 0) return;

    const validFiles = files.filter((file) => {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      
      if (!isImage && !isVideo) {
        return false;
      }
      
      // Check file size limit (3GB)
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds the 3GB limit`,
          variant: "destructive",
        });
        return false;
      }
      
      return true;
    });

    if (validFiles.length === 0) {
      toast({
        title: "Invalid files",
        description: "Only images and videos up to 3GB are allowed",
        variant: "destructive",
      });
      return;
    }

    const newPreviews = validFiles.map((file) => URL.createObjectURL(file));

    setMediaFiles((prev) => [...prev, ...validFiles]);
    setMediaPreviews((prev) => [...prev, ...newPreviews]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    addValidFiles(files);
    e.target.value = "";
  };

  const getUserMediaUrl = (filePath: string) => {
    const { data } = supabase.storage.from("user-media").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const fetchGalleryUploads = async () => {
    if (!user) return;

    setGalleryLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_uploads")
        .select("id, file_name, file_path, file_type, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const onlyMedia = (data || []).filter((u) => u.file_type?.startsWith("image/") || u.file_type?.startsWith("video/"));
      setGalleryUploads(onlyMedia);
    } catch (error: any) {
      console.error("Error fetching gallery uploads:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load your gallery",
        variant: "destructive",
      });
    } finally {
      setGalleryLoading(false);
    }
  };

  useEffect(() => {
    if (galleryOpen && user) {
      fetchGalleryUploads();
    }
  }, [galleryOpen, user]);

  const handleGallerySelect = async (upload: UserUpload) => {
    try {
      const url = getUserMediaUrl(upload.file_path);
      const res = await fetch(url);
      const blob = await res.blob();
      const file = new File([blob], upload.file_name, { type: upload.file_type });
      addValidFiles([file]);

      toast({
        title: "Added",
        description: "Media added from your in-app gallery",
      });
    } catch (error: any) {
      console.error("Error loading media from gallery:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add media from gallery",
        variant: "destructive",
      });
    }
  };

  const removeMedia = (index: number) => {
    URL.revokeObjectURL(mediaPreviews[index]);
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    setMediaPreviews(prev => prev.filter((_, i) => i !== index));
    setBlurredIndexes(prev => prev.filter(i => i !== index).map(i => i > index ? i - 1 : i));
  };

  const toggleBlur = (index: number) => {
    setBlurredIndexes(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to upload products",
        variant: "destructive"
      });
      return;
    }

    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a product title",
        variant: "destructive"
      });
      return;
    }

    if (!isFree) {
      const numPrice = parseFloat(price);
      if (!price || isNaN(numPrice) || numPrice < 2) {
        toast({
          title: "Error",
          description: "Minimum price is $2.00",
          variant: "destructive"
        });
        return;
      }
    }

    if (mediaFiles.length === 0) {
      toast({
        title: "Error",
        description: "Please upload at least one photo or video",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      const numPrice = isFree ? null : parseFloat(price);
      
      // Create the dance product first
      const { data: productData, error: productError } = await supabase
        .from('dance_products')
        .insert({
          merchant_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          price: numPrice,
          is_free: isFree,
          status: 'published'
        })
        .select()
        .single();

      if (productError) throw productError;

      // Get session for TUS uploads
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      // Upload media files
      const uploadedUrls: { url: string; type: string }[] = [];
      const totalFiles = mediaFiles.length;
      
      for (let i = 0; i < mediaFiles.length; i++) {
        const file = mediaFiles[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${productData.id}/${Date.now()}-${i}.${fileExt}`;
        
        setCurrentUploadName(file.name);
        
        // Use TUS for large files, direct upload for small files
        if (file.size > TUS_THRESHOLD) {
          // TUS resumable upload for large files
          await new Promise<void>((resolve, reject) => {
            const upload = new tus.Upload(file, {
              endpoint: `https://veaupehwfsbagzfuvach.supabase.co/storage/v1/upload/resumable`,
              retryDelays: [0, 3000, 5000, 10000, 20000],
              headers: {
                authorization: `Bearer ${accessToken}`,
                'x-upsert': 'true',
              },
              uploadDataDuringCreation: true,
              removeFingerprintOnSuccess: true,
              metadata: {
                bucketName: 'dance-images',
                objectName: fileName,
                contentType: file.type,
                cacheControl: '3600',
              },
              chunkSize: 6 * 1024 * 1024, // 6MB chunks
              onError: (error) => {
                console.error('TUS upload error:', error);
                reject(error);
              },
              onProgress: (bytesUploaded, bytesTotal) => {
                const fileProgress = (bytesUploaded / bytesTotal) * 100;
                const overallProgress = ((i / totalFiles) * 100) + (fileProgress / totalFiles);
                setUploadProgress(Math.round(overallProgress));
              },
              onSuccess: () => {
                resolve();
              },
            });

            upload.findPreviousUploads().then((previousUploads) => {
              if (previousUploads.length) {
                upload.resumeFromPreviousUpload(previousUploads[0]);
              }
              upload.start();
            });
          });
        } else {
          // Direct upload for small files
          const { error: uploadError } = await supabase.storage
            .from('dance-images')
            .upload(fileName, file);

          if (uploadError) throw uploadError;
          
          setUploadProgress(Math.round(((i + 1) / totalFiles) * 100));
        }

        const { data: { publicUrl } } = supabase.storage
          .from('dance-images')
          .getPublicUrl(fileName);

        uploadedUrls.push({
          url: publicUrl,
          type: file.type.startsWith('video/') ? 'video' : 'image'
        });
      }

      // Insert image records
      const imageRecords = uploadedUrls.map((media, index) => ({
        dance_product_id: productData.id,
        image_url: media.url,
        media_type: media.type,
        display_order: index,
        is_blurred: blurredIndexes.includes(index)
      }));

      const { error: imagesError } = await supabase
        .from('dance_product_images')
        .insert(imageRecords);

      if (imagesError) throw imagesError;

      toast({
        title: "Success",
        description: "Your dance content has been published!"
      });

      // Reset form
      setTitle("");
      setDescription("");
      setPrice("");
      setIsFree(false);
      mediaPreviews.forEach(url => URL.revokeObjectURL(url));
      setMediaFiles([]);
      setMediaPreviews([]);
      setBlurredIndexes([]);
      setUploadProgress(0);
      setCurrentUploadName("");
      setOpen(false);
      onSuccess();

    } catch (error: any) {
      console.error('Error uploading product:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload product",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
      setCurrentUploadName("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-pink-600 hover:bg-pink-700 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Publish New Content
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Upload Dance Content</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Pole Dance Routine"
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>

          {/* Free/Paid Toggle */}
          <div className="flex items-center space-x-3">
            <Switch
              id="is-free"
              checked={isFree}
              onCheckedChange={(checked) => {
                setIsFree(checked);
                if (checked) setPrice("");
              }}
            />
            <Label htmlFor="is-free" className="text-white">
              This content is free
            </Label>
          </div>

          {/* Price - only shown when not free */}
          {!isFree && (
            <div className="space-y-2">
              <Label htmlFor="price">Price *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <Input
                  id="price"
                  type="number"
                  min="2.00"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="2.00"
                  className="bg-gray-700 border-gray-600 text-white pl-7"
                />
              </div>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your content..."
              className="bg-gray-700 border-gray-600 text-white min-h-[100px]"
            />
          </div>

          {/* Media Upload */}
          <div className="space-y-2">
            <Label>Photos / Videos *</Label>
            <div className="border-2 border-dashed border-gray-600 rounded-lg p-6">
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="device-upload"
              />

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => setGalleryOpen(true)}
                  className="cursor-pointer flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  <Image className="w-5 h-5 text-pink-400" />
                  <span className="text-gray-200">Choose from In‑App Gallery</span>
                </button>

                <label
                  htmlFor="device-upload"
                  className="cursor-pointer flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  <Upload className="w-5 h-5 text-pink-400" />
                  <span className="text-gray-200">Upload from Device</span>
                </label>
              </div>

              <p className="text-gray-500 text-sm text-center mt-3">
                Upload multiple photos or videos (up to 3GB per file)
              </p>
            </div>

            {/* Upload Progress */}
            {isSubmitting && uploadProgress > 0 && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm text-gray-400">
                  <span className="truncate max-w-[200px]">Uploading: {currentUploadName}</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
              <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-3xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Select from your in-app gallery</DialogTitle>
                </DialogHeader>

                {galleryLoading ? (
                  <div className="py-10 text-center text-gray-400">Loading your gallery...</div>
                ) : galleryUploads.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-gray-300">Your in-app gallery is empty.</p>
                    <p className="text-gray-500 text-sm mt-2">
                      Upload photos/videos in your Content Gallery first, then come back here to select them.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {galleryUploads.map((upload) => {
                      const isImage = upload.file_type.startsWith("image/");
                      const isVideo = upload.file_type.startsWith("video/");
                      const url = getUserMediaUrl(upload.file_path);

                      return (
                        <button
                          key={upload.id}
                          type="button"
                          onClick={() => handleGallerySelect(upload)}
                          className="text-left bg-gray-700 hover:bg-gray-600 rounded-lg overflow-hidden border border-gray-600 transition-colors"
                        >
                          <div className="aspect-video">
                            {isImage ? (
                              <img
                                src={url}
                                alt={`Gallery media: ${upload.file_name}`}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : isVideo ? (
                              <div className="w-full h-full flex items-center justify-center bg-gray-700">
                                <Video className="w-10 h-10 text-gray-400" />
                              </div>
                            ) : null}
                          </div>
                          <div className="p-2">
                            <p className="text-sm text-gray-200 truncate">{upload.file_name}</p>
                            <p className="text-xs text-gray-400">Tap to add</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* Media Previews */}
            {mediaPreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mt-4">
                {mediaPreviews.map((preview, index) => {
                  const isVideo = mediaFiles[index]?.type.startsWith('video/');
                  const isBlurred = blurredIndexes.includes(index);
                  
                  return (
                    <div key={index} className="relative group">
                      {isVideo ? (
                        <video 
                          src={preview} 
                          className="w-full h-24 object-cover rounded-lg"
                        />
                      ) : (
                        <img 
                          src={preview} 
                          alt={`Preview ${index + 1}`} 
                          className={`w-full h-24 object-cover rounded-lg ${isBlurred ? 'blur-md' : ''}`}
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => removeMedia(index)}
                        className="absolute top-1 right-1 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                      
                      {/* Blur checkbox for images only */}
                      {!isVideo && (
                        <div className="mt-1 flex items-center space-x-2">
                          <Checkbox
                            id={`blur-${index}`}
                            checked={isBlurred}
                            onCheckedChange={() => toggleBlur(index)}
                          />
                          <Label htmlFor={`blur-${index}`} className="text-xs text-gray-300 cursor-pointer">
                            Blur
                          </Label>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full bg-pink-600 hover:bg-pink-700 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {uploadProgress > 0 ? `Uploading... ${uploadProgress}%` : 'Publishing...'}
              </>
            ) : (
              'Publish Content'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DanceProductUploadModal;
