import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Trash2, Download, Eye, Calendar, Play, Image, Video, FolderOpen, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PhotoUpload from "./PhotoUpload";
import VideoUpload from "./VideoUpload";
import PortfolioModal from "./profile/PortfolioModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface UserUpload {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  created_at: string;
}

const ContentGallery = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [uploads, setUploads] = useState<UserUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [storageUsage, setStorageUsage] = useState<number>(0);
  const [portfolioModalOpen, setPortfolioModalOpen] = useState(false);
  const [userType, setUserType] = useState<string>('');

  useEffect(() => {
    if (user) {
      fetchUploads();
      fetchStorageUsage();
      fetchUserType();
    }
  }, [user]);

  const fetchUserType = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', user.id)
        .single();
      
      if (!error && data) {
        setUserType(data.user_type);
      }
    } catch (error) {
      console.error('Error fetching user type:', error);
    }
  };

  const fetchUploads = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_uploads')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching uploads:', error);
        return;
      }

      setUploads(data || []);
    } catch (error) {
      console.error('Error fetching uploads:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStorageUsage = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('get_user_storage_usage', {
        user_uuid: user.id
      });

      if (error) {
        console.error('Error fetching storage usage:', error);
        return;
      }

      setStorageUsage(data || 0);
    } catch (error) {
      console.error('Error fetching storage usage:', error);
    }
  };

  const handleDelete = async (upload: UserUpload) => {
    try {
      // Check if this image is used as background
      if (upload.file_type.startsWith('image/') && user) {
        const imageUrl = getContentUrl(upload.file_path);
        const { data: profile } = await supabase
          .from('profiles')
          .select('background_image_url')
          .eq('id', user.id)
          .single();

        if (profile?.background_image_url === imageUrl) {
          // Remove background image from profile
          await supabase
            .from('profiles')
            .update({ background_image_url: null })
            .eq('id', user.id);
        }
      }

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('user-media')
        .remove([upload.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('user_uploads')
        .delete()
        .eq('id', upload.id);

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: `Content deleted successfully!`
      });

      fetchUploads();
      fetchStorageUsage();
    } catch (error: any) {
      console.error('Error deleting file:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete content",
        variant: "destructive"
      });
    }
  };

  const getContentUrl = (filePath: string) => {
    const { data } = supabase.storage
      .from('user-media')
      .getPublicUrl(filePath);
    return data.publicUrl;
  };

  const isImage = (fileType: string) => fileType.startsWith('image/');
  const isVideo = (fileType: string) => fileType.startsWith('video/');

  const imageUploads = uploads.filter(upload => isImage(upload.file_type));
  const videoUploads = uploads.filter(upload => isVideo(upload.file_type));

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const storagePercentage = (storageUsage / (2 * 1024 * 1024 * 1024)) * 100;

  if (loading) {
    return (
      <Card className="bg-gray-700/50 border-gray-600">
        <CardContent className="p-6 text-center">
          <p className="text-gray-400">Loading your content...</p>
        </CardContent>
      </Card>
    );
  }

  const availableImageUploads = imageUploads.map(upload => ({
    id: upload.id,
    file_path: upload.file_path,
    file_name: upload.file_name
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-gray-400">Manage your uploaded images and videos</p>
        <div className="flex gap-2">
          <Button
            onClick={() => setPortfolioModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700"
            disabled={imageUploads.length === 0}
          >
            <FolderOpen className="w-4 h-4 mr-2" />
            Portfolio
          </Button>
          <PhotoUpload onSuccess={() => { fetchUploads(); fetchStorageUsage(); }} />
          <VideoUpload onVideoSelect={() => { fetchUploads(); fetchStorageUsage(); }} />
        </div>
      </div>

      <PortfolioModal
        open={portfolioModalOpen}
        onOpenChange={setPortfolioModalOpen}
        onSuccess={() => {
          toast({
            title: "Success",
            description: "Portfolio will appear on your profile page"
          });
        }}
        userType={userType}
        availableImages={availableImageUploads}
      />

      {/* Storage Usage */}
      <Card className="bg-gray-700/50 border-gray-600">
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-white font-medium">Storage Usage</span>
            <span className="text-gray-300">
              {formatBytes(storageUsage)} / 2GB ({Math.round(storagePercentage)}%)
            </span>
          </div>
          <div className="w-full bg-gray-600 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all ${
                storagePercentage > 90 ? 'bg-red-500' : 
                storagePercentage > 70 ? 'bg-yellow-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(storagePercentage, 100)}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Content Tabs */}
      {uploads.length === 0 ? (
        <Card className="bg-gray-700/50 border-gray-600">
          <CardContent className="p-6 text-center">
            <p className="text-gray-400">No content uploaded yet. Upload your first image or video!</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="all" className="w-full">
          <TabsList className={`grid w-full ${isMobile ? 'grid-cols-2 gap-2 h-auto' : 'grid-cols-3'} bg-gray-700`}>
            <TabsTrigger 
              value="all" 
              className={`${isMobile ? 'text-xs px-2 py-2 h-auto' : ''}`}
            >
              {isMobile ? `All (${uploads.length})` : `All Content (${uploads.length})`}
            </TabsTrigger>
            <TabsTrigger 
              value="images" 
              className={`flex items-center gap-2 ${isMobile ? 'text-xs px-2 py-2 h-auto flex-col gap-1' : ''}`}
            >
              <Image className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
              {isMobile ? `Images (${imageUploads.length})` : `Images (${imageUploads.length})`}
            </TabsTrigger>
            {!isMobile && (
              <TabsTrigger value="videos" className="flex items-center gap-2">
                <Video className="w-4 h-4" />
                Videos ({videoUploads.length})
              </TabsTrigger>
            )}
            {isMobile && (
              <TabsTrigger 
                value="videos" 
                className="flex items-center gap-2 text-xs px-2 py-2 h-auto flex-col gap-1"
              >
                <Video className="w-3 h-3" />
                Videos ({videoUploads.length})
              </TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="all" className="mt-4">
            <Carousel
              className="w-full"
              opts={{
                align: "start",
                loop: true,
              }}
            >
              <CarouselContent className="-ml-2 md:-ml-4">
                {uploads.map((upload) => (
                  <CarouselItem key={upload.id} className="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                    <ContentCard upload={upload} onDelete={handleDelete} getContentUrl={getContentUrl} formatBytes={formatBytes} />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="text-white bg-gray-800 hover:bg-gray-700 border-gray-600" />
              <CarouselNext className="text-white bg-gray-800 hover:bg-gray-700 border-gray-600" />
            </Carousel>
          </TabsContent>
          
          <TabsContent value="images" className="mt-4">
            <Carousel
              className="w-full"
              opts={{
                align: "start",
                loop: true,
              }}
            >
              <CarouselContent className="-ml-2 md:-ml-4">
                {imageUploads.map((upload) => (
                  <CarouselItem key={upload.id} className="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                    <ContentCard upload={upload} onDelete={handleDelete} getContentUrl={getContentUrl} formatBytes={formatBytes} />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="text-white bg-gray-800 hover:bg-gray-700 border-gray-600" />
              <CarouselNext className="text-white bg-gray-800 hover:bg-gray-700 border-gray-600" />
            </Carousel>
          </TabsContent>
          
          <TabsContent value="videos" className="mt-4">
            <Carousel
              className="w-full"
              opts={{
                align: "start",
                loop: true,
              }}
            >
              <CarouselContent className="-ml-2 md:-ml-4">
                {videoUploads.map((upload) => (
                  <CarouselItem key={upload.id} className="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                    <ContentCard upload={upload} onDelete={handleDelete} getContentUrl={getContentUrl} formatBytes={formatBytes} />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="text-white bg-gray-800 hover:bg-gray-700 border-gray-600" />
              <CarouselNext className="text-white bg-gray-800 hover:bg-gray-700 border-gray-600" />
            </Carousel>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

// Content Card Component
interface ContentCardProps {
  upload: UserUpload;
  onDelete: (upload: UserUpload) => void;
  getContentUrl: (filePath: string) => string;
  formatBytes: (bytes: number) => string;
}

const ContentCard = ({ upload, onDelete, getContentUrl, formatBytes }: ContentCardProps) => {
  const isImage = upload.file_type.startsWith('image/');
  const isVideo = upload.file_type.startsWith('video/');

  return (
    <Card className="bg-gray-700/50 border-gray-600 overflow-hidden h-full">
      <div className="aspect-video relative">
        {isImage ? (
          <img
            src={getContentUrl(upload.file_path)}
            alt={upload.file_name}
            className="w-full h-full object-cover"
          />
        ) : isVideo ? (
          <div className="w-full h-full bg-gray-600 relative">
            <video
              src={getContentUrl(upload.file_path)}
              className="w-full h-full object-cover"
              muted
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <Play className="w-8 h-8 text-white" />
            </div>
          </div>
        ) : (
          <div className="w-full h-full bg-gray-600 flex items-center justify-center">
            <Eye className="w-8 h-8 text-gray-400" />
          </div>
        )}
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className="bg-black/50 text-white">
            {isImage ? 'IMG' : isVideo ? 'VID' : upload.file_type.split('/')[1].toUpperCase()}
          </Badge>
        </div>
      </div>
      <CardContent className="p-4">
        <h4 className="text-white font-medium truncate mb-2">{upload.file_name}</h4>
        <div className="flex items-center justify-between text-sm text-gray-400 mb-3">
          <span>{formatBytes(upload.file_size)}</span>
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {new Date(upload.created_at).toLocaleDateString()}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 border-gray-600 text-white bg-gray-700"
            onClick={() => window.open(getContentUrl(upload.file_path), '_blank')}
          >
            <Eye className="w-3 h-3 mr-1" />
            View
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="border-red-600 text-red-400 bg-gray-700"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-gray-800 border-gray-700">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white">
                  Delete {isImage ? 'Image' : isVideo ? 'Video' : 'Content'}
                </AlertDialogTitle>
                <AlertDialogDescription className="text-gray-400">
                  Are you sure you want to delete "{upload.file_name}"? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-gray-600 text-white bg-transparent">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(upload)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
};

export default ContentGallery;