import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Video, CheckCircle, XCircle, Eye, Clock, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { VideoReviewPlayer } from "./VideoReviewPlayer";

interface VideoAdSubmission {
  id: string;
  video_file_url: string;
  why_me_text: string | null;
  negotiation_text: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  merchant_id: string;
  background_audio_volume: number;
  video_audio_volume: number;
  audio_sync_offset: number;
  video_ad_opportunity: {
    title: string;
    payment_amount: number;
    target_platform: string;
    audio_file_url: string;
  };
  profiles: {
    display_name: string | null;
    email: string;
    business_name: string | null;
  };
}

const VideoAdSubmissionsManager = () => {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<VideoAdSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<VideoAdSubmission | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('video_ad_submissions')
        .select(`
          id,
          video_file_url,
          why_me_text,
          negotiation_text,
          status,
          admin_notes,
          created_at,
          merchant_id,
          video_ad_opportunity_id,
          background_audio_volume,
          video_audio_volume,
          audio_sync_offset
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch merchant profiles separately
      const merchantIds = data?.map(s => s.merchant_id) || [];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, email, business_name')
        .in('id', merchantIds);

      if (error) throw error;

      // Fetch video ad opportunities separately to get the details including audio file URL
      const opportunityIds = data?.map(s => s.video_ad_opportunity_id) || [];
      const { data: opportunities, error: oppError } = await supabase
        .from('video_ad_opportunities')
        .select('id, title, payment_amount, target_platform, audio_file_url')
        .in('id', opportunityIds);

      if (oppError) throw oppError;
      if (profilesError) throw profilesError;

      // Transform the data to match our interface
      const transformedData = data?.map(submission => ({
        ...submission,
        video_ad_opportunity: opportunities?.find(opp => opp.id === submission.video_ad_opportunity_id) || {
          title: 'Unknown',
          payment_amount: 0,
          target_platform: 'unknown',
          audio_file_url: ''
        },
        profiles: profiles?.find(profile => profile.id === submission.merchant_id) || {
          display_name: null,
          email: 'Unknown',
          business_name: null
        }
      })) as VideoAdSubmission[];

      setSubmissions(transformedData || []);
    } catch (error: any) {
      console.error('Error fetching video ad submissions:', error);
      toast({
        title: "Error",
        description: "Failed to load video ad submissions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const handleReview = (submission: VideoAdSubmission) => {
    setSelectedSubmission(submission);
    setAdminNotes(submission.admin_notes || '');
    setReviewModalOpen(true);
  };

  const handleStatusUpdate = async (submissionId: string, newStatus: 'approved' | 'rejected') => {
    if (!user) return;

    setProcessing(submissionId);
    try {
      const { error } = await supabase
        .from('video_ad_submissions')
        .update({
          status: newStatus,
          admin_notes: adminNotes || null,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', submissionId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Submission ${newStatus} successfully!`
      });

      setReviewModalOpen(false);
      fetchSubmissions();
    } catch (error: any) {
      console.error('Error updating submission:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update submission",
        variant: "destructive"
      });
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-600 hover:bg-green-700">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-600 hover:bg-red-700">Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-600 hover:bg-yellow-700">Pending</Badge>;
    }
  };

  const pendingCount = submissions.filter(s => s.status === 'pending').length;

  if (loading) {
    return (
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Loading Video Ad Submissions...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Video className="w-5 h-5" />
            Video Ad Submissions
            {pendingCount > 0 && (
              <Badge className="bg-red-600 text-white animate-pulse">
                {pendingCount} Pending
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No video ad submissions yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {submissions.map((submission) => (
                <div
                  key={submission.id}
                  className="p-4 bg-gray-700/50 rounded-lg border border-gray-600 max-w-sm"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-white font-medium">
                        {submission.video_ad_opportunity.title}
                      </h3>
                      <p className="text-gray-400 text-sm">
                        by {submission.profiles.display_name || submission.profiles.business_name || submission.profiles.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(submission.status)}
                      <Badge variant="outline" className="text-green-400 border-green-400">
                        <DollarSign className="w-3 h-3 mr-1" />
                        {submission.video_ad_opportunity.payment_amount}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Platform:</p>
                      <p className="text-white capitalize">{submission.video_ad_opportunity.target_platform}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Submitted:</p>
                      <p className="text-white">{new Date(submission.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {submission.why_me_text && (
                    <div className="mb-3">
                      <p className="text-sm text-gray-400 mb-1">Why Me:</p>
                      <p className="text-white text-sm bg-gray-600/50 p-2 rounded">
                        {submission.why_me_text}
                      </p>
                    </div>
                  )}

                  {submission.negotiation_text && (
                    <div className="mb-3">
                      <p className="text-sm text-gray-400 mb-1">Payment Negotiation:</p>
                      <p className="text-white text-sm bg-gray-600/50 p-2 rounded">
                        {submission.negotiation_text}
                      </p>
                    </div>
                  )}

                  {submission.admin_notes && (
                    <div className="mb-3">
                      <p className="text-sm text-gray-400 mb-1">Admin Notes:</p>
                      <p className="text-white text-sm bg-blue-900/20 p-2 rounded border border-blue-500/30">
                        {submission.admin_notes}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <a
                      href={submission.video_file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      View Video
                    </a>
                    
                    {submission.status === 'pending' && (
                      <Button
                        onClick={() => handleReview(submission)}
                        variant="outline"
                        size="sm"
                        className="border-gray-600 text-white bg-transparent hover:bg-gray-700"
                      >
                        Review
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="sm:max-w-lg bg-gray-800 border-gray-700 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="w-5 h-5" />
              Review Video Ad Submission
            </DialogTitle>
          </DialogHeader>

          {selectedSubmission && (
            <div className="space-y-4">
              <div>
                <h3 className="text-white font-medium mb-2">
                  {selectedSubmission.video_ad_opportunity.title}
                </h3>
                <p className="text-gray-400">
                  Submitted by: {selectedSubmission.profiles.display_name || selectedSubmission.profiles.business_name || selectedSubmission.profiles.email}
                </p>
              </div>

              {selectedSubmission.video_ad_opportunity.audio_file_url ? (
                <VideoReviewPlayer
                  videoUrl={selectedSubmission.video_file_url}
                  backgroundAudioUrl={selectedSubmission.video_ad_opportunity.audio_file_url}
                  mixingPreferences={{
                    background_audio_volume: selectedSubmission.background_audio_volume || 0.5,
                    video_audio_volume: selectedSubmission.video_audio_volume || 0.5,
                    audio_sync_offset: selectedSubmission.audio_sync_offset || 0
                  }}
                  title={selectedSubmission.video_ad_opportunity.title}
                />
              ) : (
                <div className="p-4 bg-gray-700/50 rounded-lg">
                  <a
                    href={selectedSubmission.video_file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    View Submitted Video (No Background Audio Available)
                  </a>
                </div>
              )}

              <div>
                <label className="block text-sm text-gray-400 mb-2">Admin Notes</label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Add notes for the merchant..."
                  rows={4}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  onClick={() => setReviewModalOpen(false)}
                  variant="outline"
                  className="border-gray-600 text-white bg-transparent"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleStatusUpdate(selectedSubmission.id, 'rejected')}
                  disabled={processing === selectedSubmission.id}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={() => handleStatusUpdate(selectedSubmission.id, 'approved')}
                  disabled={processing === selectedSubmission.id}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default VideoAdSubmissionsManager;