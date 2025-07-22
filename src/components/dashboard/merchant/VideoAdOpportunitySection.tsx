
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

  useEffect(() => {
    if (user) {
      fetchData();
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
    setSelectedOpportunity(opportunity);
    setSubmissionModalOpen(true);
  };

  const handleAudioDownload = async (audioUrl: string, title: string) => {
    if (isDownloading) return;
    
    setIsDownloading(true);
    
    try {
      console.log('Starting download from URL:', audioUrl);
      
      // Create a hidden anchor element
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
          description: "The audio has been downloaded to your device.",
        });
      }, 100);
    } catch (error) {
      console.error('Error downloading audio:', error);
      setIsDownloading(false);
      
      toast({
        title: "Download failed",
        description: "There was an error downloading the audio file.",
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
                              onClick={() => handleAudioDownload(download.video_ad_opportunity.audio_file_url, download.video_ad_opportunity.title)}
                              disabled={isDownloading}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              {isDownloading ? "Downloading..." : "Download Audio"}
                            </Button>
                            {!hasSubmission && (
                              <Button
                                size="sm"
                                onClick={() => handleSubmission(download.video_ad_opportunity)}
                                className="bg-blue-600 hover:bg-blue-700"
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
          }}
          opportunity={selectedOpportunity}
        />
      )}
    </>
  );
};

export default VideoAdOpportunitySection;
