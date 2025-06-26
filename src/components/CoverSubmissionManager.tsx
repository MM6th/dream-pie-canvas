import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Eye, CheckCircle, XCircle } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import CoverSubmissionDetailModal from "./CoverSubmissionDetailModal";

interface CoverSubmissionWithDetails {
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
  audio_products: {
    title: string;
    artist_name: string | null;
  } | null;
  profiles: {
    display_name: string | null;
  } | null;
}

const CoverSubmissionManager = () => {
  const queryClient = useQueryClient();
  const [selectedSubmission, setSelectedSubmission] = useState<CoverSubmissionWithDetails | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const { data: submissions, isLoading } = useQuery({
    queryKey: ['cover-submissions'],
    queryFn: async () => {
      // Get submissions first
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('song_cover_submissions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (submissionsError) throw submissionsError;

      // Enrich with audio product and profile data
      const enrichedSubmissions = await Promise.all(
        (submissionsData || []).map(async (submission) => {
          // Get audio product details
          const { data: audioData } = await supabase
            .from('audio_products')
            .select('title, artist_name')
            .eq('id', submission.audio_product_id)
            .single();

          // Get profile details
          const { data: profileData } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', submission.merchant_id)
            .single();

          return {
            ...submission,
            audio_products: audioData,
            profiles: profileData
          };
        })
      );

      return enrichedSubmissions;
    }
  });

  const handleStatusUpdate = async (submissionId: string, newStatus: string, adminNotes?: string) => {
    try {
      const { error } = await supabase.rpc('update_cover_submission_status', {
        submission_id: submissionId,
        new_status: newStatus,
        admin_notes_text: adminNotes || null
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Submission ${newStatus} successfully`
      });

      queryClient.invalidateQueries({ queryKey: ['cover-submissions'] });
    } catch (error) {
      console.error('Error updating submission status:', error);
      toast({
        title: "Error",
        description: "Failed to update submission status",
        variant: "destructive"
      });
    }
  };

  const handleSubmissionClick = (submission: CoverSubmissionWithDetails) => {
    // Transform the data to match the modal interface
    const transformedSubmission = {
      ...submission,
      audio_product_title: submission.audio_products?.title || 'Unknown Song',
      audio_product_artist: submission.audio_products?.artist_name || 'Unknown Artist',
      merchant_name: submission.profiles?.display_name || 'Unknown Merchant'
    };
    setSelectedSubmission(transformedSubmission);
    setShowDetailModal(true);
  };

  if (isLoading) {
    return (
      <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
        <CardContent className="p-6">
          <p className="text-gray-400">Loading cover submissions...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <FileText className="w-5 h-5" />
            Cover Submissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {submissions?.length === 0 ? (
            <p className="text-gray-400">No cover submissions found</p>
          ) : (
            <div className="space-y-4">
              {submissions?.map((submission) => (
                <div 
                  key={submission.id} 
                  className="bg-gray-700/50 p-4 rounded-lg cursor-pointer hover:bg-gray-600/50 transition-colors"
                  onClick={() => handleSubmissionClick(submission)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-white font-medium">
                        {submission.audio_products?.title} - {submission.audio_products?.artist_name}
                      </h4>
                      <p className="text-gray-400 text-sm">
                        Submitted by: {submission.profiles?.display_name}
                      </p>
                      <p className="text-gray-400 text-sm">
                        Status: <span className={`capitalize ${
                          submission.status === 'approved' ? 'text-green-400' :
                          submission.status === 'rejected' ? 'text-red-400' :
                          'text-yellow-400'
                        }`}>
                          {submission.status}
                        </span>
                      </p>
                      {submission.submission_notes && (
                        <p className="text-gray-300 text-sm mt-2">
                          Notes: {submission.submission_notes}
                        </p>
                      )}
                      {submission.contract_id && (
                        <p className="text-blue-400 text-sm mt-1">
                          Contract generated
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <img 
                        src={submission.cover_image_url} 
                        alt="Cover submission" 
                        className="w-16 h-16 object-cover rounded"
                      />
                    </div>
                  </div>
                  
                  {submission.status === 'pending' && (
                    <div className="flex gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
                      <Button
                        onClick={() => handleStatusUpdate(submission.id, 'approved')}
                        className="bg-green-600 hover:bg-green-700 text-white"
                        size="sm"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => handleStatusUpdate(submission.id, 'rejected', 'Cover does not meet quality standards')}
                        className="bg-red-600 hover:bg-red-700 text-white"
                        size="sm"
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CoverSubmissionDetailModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedSubmission(null);
        }}
        submission={selectedSubmission}
      />
    </>
  );
};

export default CoverSubmissionManager;
