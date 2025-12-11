import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Trash2, Download, Eye, Calendar, Play, Image, Video, FolderOpen, Upload, ExternalLink, ChevronDown, Plus, Pencil } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PhotoUpload from "./PhotoUpload";
import VideoUpload from "./VideoUpload";
import PortfolioModal from "./profile/PortfolioModal";
import PortfolioEditModal from "./profile/PortfolioEditModal";
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

interface Portfolio {
  id: string;
  title: string;
  description: string | null;
  is_for_sale: boolean;
  price: number | null;
  created_at: string;
  portfolio_images: { count: number }[];
}

interface PortfolioUsage {
  portfolio_id: string;
  portfolios: { title: string } | null;
}

const ContentGallery = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [uploads, setUploads] = useState<UserUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [storageUsage, setStorageUsage] = useState<number>(0);
  const [portfolioModalOpen, setPortfolioModalOpen] = useState(false);
  const [portfolioEditModalOpen, setPortfolioEditModalOpen] = useState(false);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null);
  const [userType, setUserType] = useState<string>('');
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);

  useEffect(() => {
    if (user) {
      fetchUploads();
      fetchStorageUsage();
      fetchUserType();
      fetchPortfolios();
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

  const fetchPortfolios = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('portfolios')
        .select(`
          *,
          portfolio_images(count)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching portfolios:', error);
        return;
      }

      setPortfolios(data || []);
    } catch (error) {
      console.error('Error fetching portfolios:', error);
    }
  };

  const handleDelete = async (upload: UserUpload) => {
    try {
      // Check if media is used in any portfolio
      const { data: portfolioUsage, error: usageError } = await supabase
        .from('portfolio_images')
        .select('portfolio_id, portfolios(title)')
        .or(`image_path.eq.${upload.file_path},video_url.eq.${upload.file_path}`);

      if (usageError) {
        console.error('Error checking portfolio usage:', usageError);
      }

      if (portfolioUsage && portfolioUsage.length > 0) {
        const portfolioTitles = portfolioUsage
          .map((p: any) => p.portfolios?.title)
          .filter(Boolean)
          .join(', ');
        
        toast({
          title: "Cannot Delete Media",
          description: `This media is used in portfolio(s): ${portfolioTitles}. Please edit the portfolio(s) to remove this media first.`,
          variant: "destructive"
        });
        return;
      }

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
      fetchPortfolios();
    } catch (error: any) {
      console.error('Error deleting file:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete content",
        variant: "destructive"
      });
    }
  };

  const handlePortfolioDelete = async (portfolioId: string, title: string) => {
    try {
      // Delete all portfolio images first
      const { error: imagesError } = await supabase
        .from('portfolio_images')
        .delete()
        .eq('portfolio_id', portfolioId);

      if (imagesError) throw imagesError;

      // Delete the portfolio
      const { error: portfolioError } = await supabase
        .from('portfolios')
        .delete()
        .eq('id', portfolioId);

      if (portfolioError) throw portfolioError;

      toast({
        title: "Success",
        description: `Portfolio "${title}" deleted successfully!`
      });

      fetchPortfolios();
    } catch (error: any) {
      console.error('Error deleting portfolio:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete portfolio",
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                disabled={uploads.filter(u => u.file_type.startsWith('image/') || u.file_type.startsWith('video/')).length === 0 && portfolios.length === 0}
              >
                <FolderOpen className="w-4 h-4 mr-2" />
                Portfolio
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-gray-800 border-gray-600">
              {portfolios.length > 0 && (
                <>
                  <DropdownMenuLabel className="text-gray-400">Your Portfolios</DropdownMenuLabel>
                  {portfolios.map((portfolio) => (
                    <DropdownMenuItem
                      key={portfolio.id}
                      onClick={() => {
                        setSelectedPortfolioId(portfolio.id);
                        setPortfolioEditModalOpen(true);
                      }}
                      className="flex items-center justify-between cursor-pointer text-white hover:bg-gray-700"
                    >
                      <div className="flex items-center gap-2">
                        <Pencil className="w-3 h-3 text-gray-400" />
                        <span className="truncate max-w-[150px]">{portfolio.title}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs bg-gray-700">
                        {portfolio.portfolio_images?.[0]?.count || 0}
                      </Badge>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator className="bg-gray-600" />
                </>
              )}
              <DropdownMenuItem
                onClick={() => setPortfolioModalOpen(true)}
                disabled={uploads.filter(u => u.file_type.startsWith('image/') || u.file_type.startsWith('video/')).length === 0}
                className="flex items-center gap-2 cursor-pointer text-white hover:bg-gray-700"
              >
                <Plus className="w-4 h-4 text-blue-400" />
                <span>Create New Portfolio</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
          fetchUploads();
          fetchPortfolios();
        }}
        userType={userType}
        availableImages={uploads.filter(upload => 
          upload.file_type.startsWith('image/') || upload.file_type.startsWith('video/')
        )}
      />

      <PortfolioEditModal
        open={portfolioEditModalOpen}
        onOpenChange={setPortfolioEditModalOpen}
        portfolioId={selectedPortfolioId}
        onSuccess={() => {
          fetchPortfolios();
          setSelectedPortfolioId(null);
        }}
        userType={userType}
        availableMedia={uploads.filter(upload => 
          upload.file_type.startsWith('image/') || upload.file_type.startsWith('video/')
        )}
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
          <TabsList className={`grid w-full ${isMobile ? 'grid-cols-2 gap-2 h-auto' : 'grid-cols-4'} bg-gray-700`}>
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
              {isMobile ? `Img (${imageUploads.length})` : `Images (${imageUploads.length})`}
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
                Vid ({videoUploads.length})
              </TabsTrigger>
            )}
            <TabsTrigger 
              value="portfolios" 
              className={`flex items-center gap-2 ${isMobile ? 'text-xs px-2 py-2 h-auto flex-col gap-1' : ''}`}
            >
              <FolderOpen className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
              {isMobile ? `Port (${portfolios.length})` : `Portfolios (${portfolios.length})`}
            </TabsTrigger>
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
                    <ContentCard 
                      upload={upload} 
                      onDelete={handleDelete} 
                      getContentUrl={getContentUrl} 
                      formatBytes={formatBytes}
                      userId={user?.id}
                    />
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
                    <ContentCard 
                      upload={upload} 
                      onDelete={handleDelete} 
                      getContentUrl={getContentUrl} 
                      formatBytes={formatBytes}
                      userId={user?.id}
                    />
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
                    <ContentCard 
                      upload={upload} 
                      onDelete={handleDelete} 
                      getContentUrl={getContentUrl} 
                      formatBytes={formatBytes}
                      userId={user?.id}
                    />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="text-white bg-gray-800 hover:bg-gray-700 border-gray-600" />
              <CarouselNext className="text-white bg-gray-800 hover:bg-gray-700 border-gray-600" />
            </Carousel>
          </TabsContent>

          <TabsContent value="portfolios" className="mt-4">
            {portfolios.length === 0 ? (
              <Card className="bg-gray-700/50 border-gray-600">
                <CardContent className="p-6 text-center">
                  <p className="text-gray-400 mb-4">No portfolios created yet</p>
                  <Button
                    onClick={() => setPortfolioModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={imageUploads.length === 0}
                  >
                    <FolderOpen className="w-4 h-4 mr-2" />
                    Create Portfolio
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Carousel
                className="w-full"
                opts={{
                  align: "start",
                  loop: true,
                }}
              >
                <CarouselContent className="-ml-2 md:-ml-4">
                  {portfolios.map((portfolio) => (
                    <CarouselItem key={portfolio.id} className="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                      <PortfolioCard 
                        portfolio={portfolio} 
                        onDelete={handlePortfolioDelete}
                        onEdit={(portfolioId) => {
                          setSelectedPortfolioId(portfolioId);
                          setPortfolioEditModalOpen(true);
                        }}
                        userId={user?.id}
                      />
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="text-white bg-gray-800 hover:bg-gray-700 border-gray-600" />
                <CarouselNext className="text-white bg-gray-800 hover:bg-gray-700 border-gray-600" />
              </Carousel>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

// Portfolio Card Component
interface PortfolioCardProps {
  portfolio: Portfolio;
  onDelete: (portfolioId: string, title: string) => void;
  onEdit: (portfolioId: string) => void;
  userId: string | undefined;
}

const PortfolioCard = ({ portfolio, onDelete, onEdit, userId }: PortfolioCardProps) => {
  const [firstImage, setFirstImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchFirstImage = async () => {
      const { data } = await supabase
        .from('portfolio_images')
        .select('image_path, video_url')
        .eq('portfolio_id', portfolio.id)
        .order('display_order', { ascending: true })
        .limit(1)
        .single();

      if (data) {
        const filePath = data.image_path || data.video_url;
        if (filePath) {
          const { data: urlData } = supabase.storage
            .from('user-media')
            .getPublicUrl(filePath);
          setFirstImage(urlData.publicUrl);
        }
      }
    };

    fetchFirstImage();
  }, [portfolio.id]);

  const mediaCount = portfolio.portfolio_images?.[0]?.count || 0;

  return (
    <Card className="bg-gray-700/50 border-gray-600 overflow-hidden h-full">
      <div className="aspect-video relative">
        {firstImage ? (
          <img
            src={firstImage}
            alt={portfolio.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-600 flex items-center justify-center">
            <FolderOpen className="w-8 h-8 text-gray-400" />
          </div>
        )}
        {portfolio.is_for_sale && (
          <div className="absolute top-2 left-2">
            <Badge className="bg-green-600 text-white">For Sale: ${portfolio.price}</Badge>
          </div>
        )}
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className="bg-black/50 text-white">
            {mediaCount} items
          </Badge>
        </div>
      </div>
      <CardContent className="p-4">
        <h4 className="text-white font-medium truncate mb-1">{portfolio.title}</h4>
        {portfolio.description && (
          <p className="text-gray-400 text-sm line-clamp-2 mb-3">{portfolio.description}</p>
        )}
        <div className="flex items-center text-sm text-gray-400 mb-3">
          <Calendar className="w-3 h-3 mr-1" />
          {new Date(portfolio.created_at).toLocaleDateString()}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 border-gray-600 text-white bg-gray-700"
            onClick={() => onEdit(portfolio.id)}
          >
            <Eye className="w-3 h-3 mr-1" />
            Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 border-gray-600 text-white bg-gray-700"
            onClick={() => window.open(`/profile/${userId}`, '_blank')}
          >
            <ExternalLink className="w-3 h-3 mr-1" />
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
                  ⚠️ WARNING: Delete Portfolio
                </AlertDialogTitle>
                <AlertDialogDescription className="text-gray-400 space-y-2">
                  <p>This will permanently remove "{portfolio.title}" from your profile page and the site entirely.</p>
                  {portfolio.is_for_sale && (
                    <p className="text-yellow-400 font-semibold">
                      If this portfolio has been purchased by others, they will lose access.
                    </p>
                  )}
                  <p className="font-semibold">This action cannot be undone.</p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-gray-600 text-white bg-transparent">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(portfolio.id, portfolio.title)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete Portfolio
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
};

// Content Card Component
interface ContentCardProps {
  upload: UserUpload;
  onDelete: (upload: UserUpload) => void;
  getContentUrl: (filePath: string) => string;
  formatBytes: (bytes: number) => string;
  userId: string | undefined;
}

const ContentCard = ({ upload, onDelete, getContentUrl, formatBytes, userId }: ContentCardProps) => {
  const isImage = upload.file_type.startsWith('image/');
  const isVideo = upload.file_type.startsWith('video/');
  const [portfolioUsage, setPortfolioUsage] = useState<PortfolioUsage[]>([]);
  const [checkingUsage, setCheckingUsage] = useState(false);
  const [deleteAttempted, setDeleteAttempted] = useState(false);

  const checkPortfolioUsage = async () => {
    setCheckingUsage(true);
    setDeleteAttempted(true);
    try {
      const { data, error } = await supabase
        .from('portfolio_images')
        .select('portfolio_id, portfolios(title)')
        .or(`image_path.eq.${upload.file_path},video_url.eq.${upload.file_path}`);

      if (!error && data) {
        setPortfolioUsage(data as PortfolioUsage[]);
      }
    } catch (error) {
      console.error('Error checking portfolio usage:', error);
    } finally {
      setCheckingUsage(false);
    }
  };

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
                onClick={checkPortfolioUsage}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-gray-800 border-gray-700">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white">
                  {portfolioUsage.length > 0 ? '⚠️ Media Used in Portfolio' : `Delete ${isImage ? 'Image' : isVideo ? 'Video' : 'Content'}`}
                </AlertDialogTitle>
                <AlertDialogDescription className="text-gray-400 space-y-3">
                  {portfolioUsage.length > 0 ? (
                    <>
                      <p className="text-yellow-400 font-semibold">This {isImage ? 'image' : isVideo ? 'video' : 'media'} is currently used in the following portfolio(s):</p>
                      <ul className="list-disc list-inside text-white">
                        {portfolioUsage.map((usage, idx) => (
                          <li key={idx}>"{usage.portfolios?.title}"</li>
                        ))}
                      </ul>
                      <div className="bg-yellow-900/30 border border-yellow-600 rounded p-3 text-yellow-200">
                        <p className="font-semibold mb-2">To manage this media:</p>
                        <p className="text-sm">Go to the <span className="font-semibold">Portfolios tab</span> and click <span className="font-semibold">Edit</span> on the portfolio to remove this media, then return here to delete it from your gallery.</p>
                      </div>
                      <p className="text-red-400 font-semibold">
                        Deletion from this gallery is blocked to protect portfolio integrity.
                      </p>
                    </>
                  ) : (
                    <p>Are you sure you want to delete "{upload.file_name}"? This action cannot be undone.</p>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-gray-600 text-white bg-transparent">
                  {portfolioUsage.length > 0 ? 'Close' : 'Cancel'}
                </AlertDialogCancel>
                {portfolioUsage.length === 0 && (
                  <AlertDialogAction
                    onClick={() => onDelete(upload)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </AlertDialogAction>
                )}
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
};

export default ContentGallery;