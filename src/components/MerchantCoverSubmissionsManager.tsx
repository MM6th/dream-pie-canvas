
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Image, Clock, CheckCircle, XCircle, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import CoverSubmissionDetailModal from "./CoverSubmissionDetailModal";

interface CoverSubmission {
  id: string;
  merchant_id: string;
  audio_product_id: string;
  cover_image_url: string;
  status: string;
  submission_notes: string | null;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  contract_id: string | null;
  requires_contract: boolean | null;
  contract_generated_at: string | null;
  audio_product_title?: string;
  audio_product_artist?: string | null;
}

const MerchantCoverSubmissionsManager = () => {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<CoverSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<CoverSubmission | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const fetchSubmissions = async () => {
    if (!user) return;

    try {
      // Get submissions for this merchant
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('song_cover_submissions')
        .select('*')
        .eq('merchant_id', user.id)
        .order('created_at', { ascending: false });

      if (submissionsError) throw submissionsError;

      // Enrich with audio product details
      const enrichedSubmissions = await Promise.all(
        (submissionsData || []).map(async (submission) => {
          const { data: audioData } = await supabase
            .from('audio_products')
            .select('title, artist_name')
            .eq('id', submission.audio_product_id)
            .single();

          return {
            ...submission,
            audio_product_title: audioData?.title || 'Unknown Song',
            audio_product_artist: audioData?.artist_name || 'Unknown Artist'
          };
        })
      );

      setSubmissions(enrichedSubmissions);
    } catch (error: any) {
      console.error('Error fetching cover submissions:', error);
      toast({
        title: "Error",
        description: "Failed to load cover submissions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [user]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-600';
      case 'approved':
        return 'bg-green-600';
      case 'rejected':
        return 'bg-red-600';
      default:
        return 'bg-gray-600';
    }
  };

  const handleSubmissionClick = (submission: CoverSubmission) => {
    setSelectedSubmission(submission);
    setShowDetailModal(true);
  };

  if (loading) {
    return (
      <div className="text-white">Loading your cover submissions...</div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-bold text-white mb-4">Your Cover Submissions</h3>
          <p className="text-gray-400 mb-6">Track the status of your submitted song covers</p>
        </div>

        {submissions.length === 0 ? (
          <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <Image className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-white mb-2">No Cover Submissions</h4>
              <p className="text-gray-400">You haven't submitted any cover art yet. Purchase some merchant-only tracks to get started!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {submissions.map((submission) => (
              <Card 
                key={submission.id} 
                className="bg-gray-800/50 border-gray-700 backdrop-blur-sm cursor-pointer hover:bg-gray-700/50 transition-colors"
                onClick={() => handleSubmissionClick(submission)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <img
                      src={submission.cover_image_url}
                      alt="Submitted cover"
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h5 className="text-white font-medium">
                          {submission.audio_product_title}
                        </h5>
                        <Badge className={`${getStatusColor(submission.status)} text-white`}>
                          <span className="flex items-center gap-1">
                            {getStatusIcon(submission.status)}
                            {submission.status}
                          </span>
                        </Badge>
                      </div>
                      <p className="text-gray-400 text-sm mb-2">
                        by {submission.audio_product_artist}
                      </p>
                      <p className="text-gray-400 text-sm mb-2">
                        Submitted {new Date(submission.created_at).toLocaleDateString()}
                      </p>
                      {submission.submission_notes && (
                        <p className="text-gray-300 text-sm mb-2">
                          <strong>Your notes:</strong> {submission.submission_notes}
                        </p>
                      )}
                      {submission.admin_notes && (
                        <p className="text-gray-300 text-sm">
                          <strong>Admin feedback:</strong> {submission.admin_notes}
                        </p>
                      )}
                      {submission.status === 'approved' && submission.contract_id && (
                        <div className="mt-2 flex items-center gap-2 text-blue-400 text-sm">
                          <FileText className="w-4 h-4" />
                          <span>Contract available for signature</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <CoverSubmissionDetailModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedSubmission(null);
        }}
        submission={selectedSubmission}
        isAdmin={false}
      />
    </>
  );
};

export default MerchantCoverSubmissionsManager;
