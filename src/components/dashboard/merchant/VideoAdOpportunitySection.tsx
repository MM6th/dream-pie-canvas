
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video, Download, Eye, Clock, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import VideoAdSubmissionModal from "@/components/VideoAdSubmissionModal";

interface VideoAdOpportunity {
  id: string;
  title: string;
  description: string | null;
  audio_file_url: string;
  payment_amount: number;
  target_platform: string;
}

interface VideoAdDownload {
  id: string;
  video_ad_opportunity: VideoAdOpportunity;
}

interface VideoAdSubmission {
  id: string;
  status: string;
  created_at: string;
  video_ad_opportunity: VideoAdOpportunity;
}

const VideoAdOpportunitySection = () => {
  const { user } = useAuth();
  const [downloads, setDownloads] = useState<VideoAdDownload[]>([]);
  const [submissions, setSubmissions] = useState<VideoAdSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOpportunity, setSelectedOpportunity] = useState<VideoAdOpportunity | null>(null);
  const [submissionModalOpen, setSubmissionModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadedAudioIds, setDownloadedAudioIds] = useState<Set<string>>(new Set());
  const [downloadedOpportunityAudios, setDownloadedOpportunityAudios] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      fetchData();
      fetchDownloadedAudio();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch downloads with opportunity data
      const { data: downloadsData, error: downloadsError } = await supabase
        .from('video_ad_downloads')
        .select('id, video_ad_opportunity_id')
        .eq('merchant_id', user?.id);

      if (downloadsError) throw downloadsError;

      // Fetch submissions with opportunity data
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('video_ad_submissions')
        .select('id, status, created_at, video_ad_opportunity_id')
        .eq('merchant_id', user?.id);

      if (submissionsError) throw submissionsError;

      // Get unique opportunity IDs
      const opportunityIds = [
        ...(downloadsData?.map(d => d.video_ad_opportunity_id) || []),
        ...(submissionsData?.map(s => s.video_ad_opportunity_id) || [])
      ];

      // Fetch opportunity details
      const { data: opportunitiesData, error: opportunitiesError } = await supabase
        .from('video_ad_opportunities')
        .select('id, title, description, audio_file_url, payment_amount, target_platform')
        .in('id', [...new Set(opportunityIds)]);

      if (opportunitiesError) throw opportunitiesError;

      // Create opportunity lookup
      const opportunityMap = new Map(
        opportunitiesData?.map(opp => [opp.id, opp]) || []
      );

      // Map downloads with opportunity data
      setDownloads(downloadsData?.map(d => ({
        id: d.id,
        video_ad_opportunity: opportunityMap.get(d.video_ad_opportunity_id)!
      })).filter(d => d.video_ad_opportunity) || []);

      // Map submissions with opportunity data
      setSubmissions(submissionsData?.map(s => ({
        id: s.id,
        status: s.status,
        created_at: s.created_at,
        video_ad_opportunity: opportunityMap.get(s.video_ad_opportunity_id)!
      })).filter(s => s.video_ad_opportunity) || []);

    } catch (error: any) {
      console.error('Error fetching video ad data:', error);
      toast({
        title: "Error",
        description: "Failed to load video ad opportunities",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDownloadedAudio = async () => {
    try {
      const { data, error } = await supabase
        .from('user_purchases')
        .select('audio_product_id, audio_products(audio_file_url)')
        .eq('user_id', user?.id);

      if (error) throw error;

      console.log('Fetched user purchases:', data);

      const audioIds = new Set(data?.map(purchase => purchase.audio_product_id) || []);
      setDownloadedAudioIds(audioIds);

      // Track which video ad opportunity audios have been downloaded
      const opportunityAudioUrls = new Set(
        data?.filter(purchase => purchase.audio_products?.audio_file_url)
          .map(purchase => purchase.audio_products!.audio_file_url) || []
      );
      console.log('Downloaded opportunity audio URLs:', opportunityAudioUrls);
      setDownloadedOpportunityAudios(opportunityAudioUrls);
    } catch (error) {
      console.error('Error fetching downloaded audio:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-600 hover:bg-green-700"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-600 hover:bg-red-700"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-600 hover:bg-yellow-700"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  const handleSubmission = (opportunity: VideoAdOpportunity) => {
    if (!downloadedOpportunityAudios.has(opportunity.audio_file_url)) {
      toast({
        title: "Audio Download Required",
        description: "Please download the audio file first by clicking 'Add to Library' before submitting your video.",
        variant: "destructive"
      });
      return;
    }
    setSelectedOpportunity(opportunity);
    setSubmissionModalOpen(true);
  };

  const handleAudioDownload = async (audioUrl: string, title: string, opportunityId: string) => {
    if (isDownloading) return;
    
    setIsDownloading(true);
    
    try {
      console.log('Starting video ad download for opportunity:', opportunityId);
      
      // First, check if this opportunity has already been downloaded
      const { data: existingDownload, error: downloadCheckError } = await supabase
        .from('video_ad_downloads')
        .select('id')
        .eq('video_ad_opportunity_id', opportunityId)
        .eq('merchant_id', user?.id)
        .maybeSingle();

      if (downloadCheckError) throw downloadCheckError;

      if (!existingDownload) {
        // Create a video_ad_download record which will trigger contract creation
        const { data: downloadRecord, error: downloadError } = await supabase
          .from('video_ad_downloads')
          .insert({
            video_ad_opportunity_id: opportunityId,
            merchant_id: user?.id
          })
          .select('*')
          .single();

        if (downloadError) {
          console.error('Error creating video ad download record:', downloadError);
          throw downloadError;
        }

        console.log('Video ad download record created:', downloadRecord.id);
      }

      // Now handle the audio product logic
      const { data: audioProduct, error: audioError } = await supabase
        .from('audio_products')
        .select('id')
        .eq('audio_file_url', audioUrl)
        .maybeSingle();

      let productId = audioProduct?.id;

      if (!audioProduct) {
        // If no existing audio product, create one
        const { data: newAudioProduct, error: createError } = await supabase
          .from('audio_products')
          .insert({
            title: title,
            artist_name: 'Video Ad Opportunity',
            audio_file_url: audioUrl,
            access_level: 'merchant_only',
            audio_type: 'video_ad',
            is_adult_content: false,
            merchant_id: user?.id || ''
          })
          .select('id')
          .single();

        if (createError) throw createError;
        productId = newAudioProduct.id;
        console.log('Audio product created:', productId);
      }

      // Check if already purchased
      const { data: existingPurchase, error: purchaseCheckError } = await supabase
        .from('user_purchases')
        .select('id')
        .eq('user_id', user?.id)
        .eq('audio_product_id', productId)
        .maybeSingle();

      if (purchaseCheckError) throw purchaseCheckError;

      if (!existingPurchase) {
        // Add to user purchases
        const { error: purchaseError } = await supabase
          .from('user_purchases')
          .insert({
            user_id: user?.id,
            audio_product_id: productId,
            is_free_download: true
          });

        if (purchaseError) throw purchaseError;
        console.log('Added to user purchases');
      }
      
      // Update local state
      setDownloadedAudioIds(prev => new Set([...prev, productId!]));
      setDownloadedOpportunityAudios(prev => new Set([...prev, audioUrl]));
      
      // Create a hidden anchor element for actual file download
      const link = document.createElement('a');
      link.style.display = 'none';
      link.href = audioUrl;
      link.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_audio.mp3`;
      
      // Append to body, click it, and then remove it
      document.body.appendChild(link);
      link.click();
      
      // Short delay before removing the element
      setTimeout(() => {
        document.body.removeChild(link);
        setIsDownloading(false);
        
        toast({
          title: "Audio downloaded successfully!",
          description: "The audio has been added to your library and downloaded to your device.",
        });

        // Refresh data to reflect changes
        fetchData();
        fetchDownloadedAudio();
      }, 100);
    } catch (error: any) {
      console.error('Error downloading audio:', error);
      setIsDownloading(false);
      
      toast({
        title: "Download failed",
        description: error.message || "There was an error downloading the audio file.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Loading Video Ad Opportunities...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Video className="w-5 h-5" />
            Video Ad Opportunities
          </CardTitle>
        </CardHeader>
        <CardContent>
          {downloads.length === 0 && submissions.length === 0 ? (
            <p className="text-gray-400 text-center py-8">
              No video ad opportunities downloaded yet. Visit the store to find opportunities!
            </p>
          ) : (
            <div className="space-y-6">
              {/* Downloaded Opportunities */}
              {downloads.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Available Opportunities</h3>
                  <div className="grid gap-4">
                     {downloads.map((download) => {
                       const hasSubmission = submissions.some(s => s.video_ad_opportunity.id === download.video_ad_opportunity.id);
                       const hasDownloadedAudio = downloadedOpportunityAudios.has(download.video_ad_opportunity.audio_file_url);
                       
                       console.log('Checking opportunity:', download.video_ad_opportunity.title, 'Audio URL:', download.video_ad_opportunity.audio_file_url, 'Has downloaded:', hasDownloadedAudio);
                       
                       return (
                        <div key={download.id} className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-white font-medium">{download.video_ad_opportunity.title}</h4>
                            <Badge className="bg-green-600">
                              ${download.video_ad_opportunity.payment_amount}
                            </Badge>
                          </div>
                          <p className="text-gray-400 text-sm mb-3 capitalize">
                            Platform: {download.video_ad_opportunity.target_platform}
                          </p>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAudioDownload(download.video_ad_opportunity.audio_file_url, download.video_ad_opportunity.title, download.video_ad_opportunity.id)}
                              disabled={isDownloading}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              {isDownloading ? "Downloading..." : "Add to Library"}
                            </Button>
                            {!hasSubmission && (
                              <Button
                                size="sm"
                                onClick={() => handleSubmission(download.video_ad_opportunity)}
                                className={hasDownloadedAudio 
                                  ? "bg-blue-600 hover:bg-blue-700" 
                                  : "bg-gray-600 text-gray-300 opacity-60 cursor-not-allowed hover:bg-gray-600"
                                }
                                title={!hasDownloadedAudio ? "Download the audio first to enable submission" : "Submit your video for this opportunity"}
                              >
                                Submit Video
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Submissions */}
              {submissions.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Your Submissions</h3>
                  <div className="grid gap-4">
                    {submissions.map((submission) => (
                      <div key={submission.id} className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-white font-medium">{submission.video_ad_opportunity.title}</h4>
                          {getStatusBadge(submission.status)}
                        </div>
                        <p className="text-gray-400 text-sm">
                          Submitted: {new Date(submission.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedOpportunity && (
        <VideoAdSubmissionModal
          isOpen={submissionModalOpen}
          onClose={() => setSubmissionModalOpen(false)}
          onSuccess={() => {
            setSubmissionModalOpen(false);
            fetchData();
            fetchDownloadedAudio();
          }}
          opportunity={selectedOpportunity}
        />
      )}
    </>
  );
};

export default VideoAdOpportunitySection;
