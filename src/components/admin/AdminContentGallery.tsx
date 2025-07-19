import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Image, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import ContentGallery from "@/components/ContentGallery";

interface ApprovedCover {
  id: string;
  cover_image_url: string;
  audio_product_title?: string;
  merchant_name?: string;
  approved_date: string;
  type: 'audio' | 'modeling';
}

const AdminContentGallery = () => {
  const { user } = useAuth();
  const [approvedAudioCovers, setApprovedAudioCovers] = useState<ApprovedCover[]>([]);
  const [approvedModelingPhotos, setApprovedModelingPhotos] = useState<ApprovedCover[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());

  const fetchApprovedCovers = async () => {
    try {
      // Fetch approved audio cover submissions
      const { data: audioCovers, error: audioError } = await supabase
        .from('song_cover_submissions')
        .select(`
          id,
          cover_image_url,
          reviewed_at,
          audio_product_id,
          merchant_id
        `)
        .eq('status', 'approved')
        .order('reviewed_at', { ascending: false });

      if (audioError) throw audioError;

      // Enrich audio covers with product and merchant details
      const enrichedAudioCovers = await Promise.all(
        (audioCovers || []).map(async (cover) => {
          const [audioData, merchantData] = await Promise.all([
            supabase.from('audio_products').select('title').eq('id', cover.audio_product_id).single(),
            supabase.from('profiles').select('display_name').eq('id', cover.merchant_id).single()
          ]);

          return {
            id: cover.id,
            cover_image_url: cover.cover_image_url,
            audio_product_title: audioData.data?.title || 'Unknown Track',
            merchant_name: merchantData.data?.display_name || 'Unknown Merchant',
            approved_date: cover.reviewed_at || '',
            type: 'audio' as const
          };
        })
      );

      // Fetch approved modeling applications
      const { data: modelingApps, error: modelingError } = await supabase
        .from('modeling_applications')
        .select(`
          id,
          application_photos,
          reviewed_at,
          merchant_id,
          fashion_product_id
        `)
        .eq('status', 'approved')
        .order('reviewed_at', { ascending: false });

      if (modelingError) throw modelingError;

      // Enrich modeling photos with merchant details
      const enrichedModelingPhotos = await Promise.all(
        (modelingApps || []).map(async (app) => {
          const [merchantData, fashionData] = await Promise.all([
            supabase.from('profiles').select('display_name').eq('id', app.merchant_id).single(),
            supabase.from('fashion_products').select('title').eq('id', app.fashion_product_id).single()
          ]);

          return {
            id: app.id,
            cover_image_url: app.application_photos[0] || '',
            audio_product_title: fashionData.data?.title || 'Fashion Product',
            merchant_name: merchantData.data?.display_name || 'Unknown Merchant',
            approved_date: app.reviewed_at || '',
            type: 'modeling' as const
          };
        })
      );

      setApprovedAudioCovers(enrichedAudioCovers);
      setApprovedModelingPhotos(enrichedModelingPhotos);
    } catch (error) {
      console.error('Error fetching approved covers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovedCovers();
  }, []);

  const handleDownloadCover = async (cover: ApprovedCover) => {
    if (!user) return;

    setDownloadingIds(prev => new Set(prev).add(cover.id));

    try {
      // Download the image
      const response = await fetch(cover.cover_image_url);
      const blob = await response.blob();
      
      // Create download link
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${cover.type}_cover_${cover.audio_product_title?.replace(/\s+/g, '-')}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      // Save to admin's gallery by uploading to user-media bucket
      const fileName = `admin_gallery_${cover.type}_${Date.now()}.jpg`;
      const filePath = `${user.id}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('user-media')
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Add to user_uploads table
      const { error: dbError } = await supabase
        .from('user_uploads')
        .insert({
          user_id: user.id,
          file_name: fileName,
          file_path: filePath,
          file_type: 'image/jpeg',
          file_size: blob.size,
          storage_bucket: 'user-media'
        });

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: `Cover downloaded and saved to your photo gallery!`,
      });

    } catch (error) {
      console.error('Error downloading and saving cover:', error);
      toast({
        title: "Error",
        description: "Failed to download and save cover. Please try again.",
        variant: "destructive"
      });
    } finally {
      setDownloadingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(cover.id);
        return newSet;
      });
    }
  };

  if (loading) {
    return (
      <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
        <CardContent className="p-6">
          <p className="text-gray-400">Loading photo gallery...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Image className="w-5 h-5" />
          Admin Content Gallery
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="my-uploads" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-gray-700 border-gray-600">
            <TabsTrigger 
              value="my-uploads" 
              className="text-white data-[state=active]:bg-gray-600"
            >
              My Uploads
            </TabsTrigger>
            <TabsTrigger 
              value="approved-audio" 
              className="text-white data-[state=active]:bg-gray-600"
            >
              Approved Audio Covers
              {approvedAudioCovers.length > 0 && (
                <Badge className="ml-2 bg-blue-600 text-white">
                  {approvedAudioCovers.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="approved-modeling" 
              className="text-white data-[state=active]:bg-gray-600"
            >
              Approved Modeling
              {approvedModelingPhotos.length > 0 && (
                <Badge className="ml-2 bg-purple-600 text-white">
                  {approvedModelingPhotos.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-uploads" className="mt-6">
            <ContentGallery />
          </TabsContent>

          <TabsContent value="approved-audio" className="mt-6">
            {approvedAudioCovers.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No approved audio covers yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {approvedAudioCovers.map((cover) => (
                  <div key={cover.id} className="bg-gray-700/50 rounded-lg p-4">
                    <img 
                      src={cover.cover_image_url} 
                      alt={cover.audio_product_title}
                      className="w-full h-32 object-cover rounded mb-3"
                    />
                    <h4 className="text-white font-medium text-sm mb-1">
                      {cover.audio_product_title}
                    </h4>
                    <p className="text-gray-400 text-xs mb-2">
                      by {cover.merchant_name}
                    </p>
                    <p className="text-gray-400 text-xs mb-3">
                      Approved: {new Date(cover.approved_date).toLocaleDateString()}
                    </p>
                    <Button
                      onClick={() => handleDownloadCover(cover)}
                      disabled={downloadingIds.has(cover.id)}
                      size="sm"
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {downloadingIds.has(cover.id) ? (
                        <>
                          <Check className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          Download & Save
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="approved-modeling" className="mt-6">
            {approvedModelingPhotos.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No approved modeling photos yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {approvedModelingPhotos.map((photo) => (
                  <div key={photo.id} className="bg-gray-700/50 rounded-lg p-4">
                    <img 
                      src={photo.cover_image_url} 
                      alt={photo.audio_product_title}
                      className="w-full h-32 object-cover rounded mb-3"
                    />
                    <h4 className="text-white font-medium text-sm mb-1">
                      {photo.audio_product_title}
                    </h4>
                    <p className="text-gray-400 text-xs mb-2">
                      by {photo.merchant_name}
                    </p>
                    <p className="text-gray-400 text-xs mb-3">
                      Approved: {new Date(photo.approved_date).toLocaleDateString()}
                    </p>
                    <Button
                      onClick={() => handleDownloadCover(photo)}
                      disabled={downloadingIds.has(photo.id)}
                      size="sm"
                      className="w-full bg-purple-600 hover:bg-purple-700"
                    >
                      {downloadingIds.has(photo.id) ? (
                        <>
                          <Check className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          Download & Save
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AdminContentGallery;
