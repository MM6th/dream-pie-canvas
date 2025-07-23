
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Eye, CheckCircle, XCircle, Clock, AlertCircle, ScrollText, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import CoverSubmissionDetailModal from "@/components/CoverSubmissionDetailModal";
import SignedContractsSection from "./SignedContractsSection";
import VideoAdSubmissionsManager from "./VideoAdSubmissionsManager";

interface CoverSubmissionData {
  id: string;
  merchant_id: string;
  audio_product_id: string;
  cover_image_url: string;
  submission_notes: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  contract_id?: string | null;
  requires_contract?: boolean | null;
  contract_generated_at?: string | null;
  merchant_name?: string;
  audio_product_title?: string;
}

const CoverSubmissionsManagement = () => {
  const [submissions, setSubmissions] = useState<CoverSubmissionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<CoverSubmissionData | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState<{ [key: string]: string }>({});

  const fetchSubmissions = async () => {
    try {
      // First get the submissions
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('song_cover_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (submissionsError) throw submissionsError;

      // Then enrich with merchant and audio product data
      const enrichedSubmissions = await Promise.all(
        (submissionsData || []).map(async (submission) => {
          // Get merchant name
          const { data: merchantData } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', submission.merchant_id)
            .single();

          // Get audio product title
          const { data: audioData } = await supabase
            .from('audio_products')
            .select('title')
            .eq('id', submission.audio_product_id)
            .single();

          return {
            ...submission,
            merchant_name: merchantData?.display_name || 'Unknown Merchant',
            audio_product_title: audioData?.title || 'Unknown Track'
          };
        })
      );

      setSubmissions(enrichedSubmissions);
    } catch (error) {
      console.error('Error fetching submissions:', error);
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
  }, []);

  const handleStatusUpdate = async (submissionId: string, newStatus: 'approved' | 'rejected', notes?: string) => {
    try {
      // If approving, create a contract with updated revenue sharing terms
      if (newStatus === 'approved') {
        const contractTerms = `SONG COVER SUBMISSION AGREEMENT

This agreement establishes the terms for the approved song cover submission with dual distribution channels: PIE Platform exclusive distribution and TuneCore widespread distribution.

REVENUE DISTRIBUTION STRUCTURE:

PIE PLATFORM EXCLUSIVE DISTRIBUTION:
This track will first be available exclusively on the PIE platform with premium pricing and higher revenue sharing.

1. PIE PLATFORM: 30% OF TOTAL REVENUE
   - Platform hosting, processing, and exclusive early access management
   - Premium pricing with minimum $2.00 threshold for exclusivity
   - After PayPal processing fees are deducted

2. MAIN ARTIST: 70% OF TOTAL REVENUE
   - Retains full ownership and publishing rights to original composition
   - Direct relationship with PIE platform supporters
   - Responsible for original song licensing and metadata accuracy

3. COVER MODEL (MERCHANT): 21% OF TOTAL REVENUE
   - Receives 30% of Main Artist's 70% share
   - Compensation for cover art modeling and promotional value
   - Higher percentage reflects exclusive distribution value

PIE PLATFORM REVENUE EXAMPLE (per $2.00 purchase):
• PIE Platform: $0.60 (30% after processing fees)
• Main Artist: $1.40 (70% of total)
• Cover Model: $0.42 (21% of total = 30% of artist's share)

TUNECORE WIDESPREAD DISTRIBUTION:
After the exclusive PIE platform period, the track will be distributed globally through TuneCore.

1. TUNECORE DISTRIBUTION FEE: 15%
   - Global distribution to 150+ digital stores and streaming platforms
   - Monthly reporting and royalty collection services
   - Platform processing and metadata management

2. MAIN ARTIST: 70.5% OF TOTAL REVENUE
   - Receives 85% of revenue remaining after TuneCore fees
   - Maintains full ownership and publishing rights
   - Lower percentage reflects widespread distribution model

3. COVER MODEL (MERCHANT): 14.5% OF TOTAL REVENUE
   - Receives 20% of Main Artist's 85% revenue share
   - Lower percentage due to different distribution economics
   - Ongoing compensation for cover art use across all platforms

TUNECORE REVENUE EXAMPLE (per $1.29 purchase/stream):
• TuneCore Fee: $0.19 (15% of $1.29)
• Main Artist: $0.91 (70.5% of total)
• Cover Model: $0.19 (14.5% of total = 20% of artist's post-fee share)

MERCHANT OBLIGATIONS:
- Maintain professional quality standards for all submissions
- Comply with original song licensing requirements and copyright laws
- Provide accurate metadata and contact information for both distributions
- Acknowledge and comply with dual revenue sharing agreement
- Allow use of submitted cover art for promotional purposes on both platforms
- Provide first and last name for TuneCore registration requirements

DISTRIBUTION TIMELINE & PROCESSING:
- Track released exclusively on PIE platform first with premium pricing
- After exclusivity period, contract submitted to TuneCore for widespread distribution
- Merchant receives email confirmation with official publishing dates for both platforms
- Revenue sharing begins immediately upon PIE platform release
- TuneCore distribution revenue sharing begins upon streaming platform availability

LEGAL ACKNOWLEDGMENT:
Both parties acknowledge they have read, understood, and agree to be legally bound by this dual distribution revenue sharing structure, obligations, and terms. This contract remains in effect for the duration of the track's distribution through both PIE platform and TuneCore channels.`;

        // Create contract with updated terms
        const { data: contractData, error: contractError } = await supabase
          .from('contracts')
          .insert({
            merchant_id: submissions.find(s => s.id === submissionId)?.merchant_id,
            cover_submission_id: submissionId,
            contract_type: 'cover_submission',
            contract_terms: contractTerms,
            status: 'pending'
          })
          .select()
          .single();

        if (contractError) throw contractError;

        // Update submission with contract reference
        const { error: updateError } = await supabase
          .from('song_cover_submissions')
          .update({
            status: newStatus,
            admin_notes: notes,
            reviewed_by: (await supabase.auth.getUser()).data.user?.id,
            reviewed_at: new Date().toISOString(),
            contract_id: contractData.id,
            contract_generated_at: new Date().toISOString()
          })
          .eq('id', submissionId);

        if (updateError) throw updateError;
      } else {
        // For rejection, just update the submission
        const { error } = await supabase
          .from('song_cover_submissions')
          .update({
            status: newStatus,
            admin_notes: notes,
            reviewed_by: (await supabase.auth.getUser()).data.user?.id,
            reviewed_at: new Date().toISOString()
          })
          .eq('id', submissionId);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `Submission ${newStatus} successfully${newStatus === 'approved' ? ' and contract generated' : ''}`,
      });

      fetchSubmissions();
    } catch (error) {
      console.error('Error updating submission:', error);
      toast({
        title: "Error",
        description: "Failed to update submission status",
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
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

  if (loading) {
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
            Cover Submissions & Contracts Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="submissions" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-gray-700 border-gray-600">
              <TabsTrigger 
                value="submissions" 
                className="text-white data-[state=active]:bg-gray-600"
              >
                <FileText className="w-4 h-4 mr-2" />
                Cover Submissions
              </TabsTrigger>
              <TabsTrigger 
                value="video-submissions" 
                className="text-white data-[state=active]:bg-gray-600"
              >
                <Video className="w-4 h-4 mr-2" />
                Video Ad Submissions
              </TabsTrigger>
              <TabsTrigger 
                value="contracts" 
                className="text-white data-[state=active]:bg-gray-600"
              >
                <ScrollText className="w-4 h-4 mr-2" />
                Signed Contracts
              </TabsTrigger>
            </TabsList>

            <TabsContent value="submissions" className="mt-6">
          {submissions.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-white mb-2">No Submissions</h4>
              <p className="text-gray-400">Cover submissions will appear here for review.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="flex gap-4 pb-4 min-w-max">
                {submissions.map((submission) => (
                  <div key={submission.id} className="bg-gray-700/50 p-4 rounded-lg min-w-[400px] max-w-[400px] flex-shrink-0">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="text-white font-medium truncate">
                            {submission.audio_product_title}
                          </h4>
                          <Badge className={`${getStatusColor(submission.status)} text-white`}>
                            <span className="flex items-center gap-1">
                              {getStatusIcon(submission.status)}
                              {submission.status}
                            </span>
                          </Badge>
                          {submission.contract_id && (
                            <Badge className="bg-blue-600 text-white">
                              Contract Generated
                            </Badge>
                          )}
                        </div>
                        <p className="text-gray-400 text-sm mb-2">
                          Submitted by: {submission.merchant_name}
                        </p>
                        {submission.submission_notes && (
                          <p className="text-gray-300 text-sm mb-2 line-clamp-2">
                            Notes: {submission.submission_notes}
                          </p>
                        )}
                        {submission.admin_notes && (
                          <p className="text-yellow-300 text-sm mb-2 line-clamp-2">
                            Admin Notes: {submission.admin_notes}
                          </p>
                        )}
                        <p className="text-gray-400 text-xs">
                          Submitted: {new Date(submission.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mb-3">
                      <Button
                        onClick={() => {
                          setSelectedSubmission(submission);
                          setShowDetailModal(true);
                        }}
                        variant="outline"
                        size="sm"
                        className="border-gray-600 text-white bg-gray-700 flex-1"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      
                      {submission.status === 'pending' && (
                        <>
                          <Button
                            onClick={() => handleStatusUpdate(submission.id, 'approved', adminNotes[submission.id])}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            onClick={() => handleStatusUpdate(submission.id, 'rejected', adminNotes[submission.id])}
                            size="sm"
                            variant="destructive"
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                    
                    {submission.status === 'pending' && (
                      <div className="mt-3">
                        <Textarea
                          placeholder="Add admin notes (optional)"
                          value={adminNotes[submission.id] || ''}
                          onChange={(e) => setAdminNotes(prev => ({
                            ...prev,
                            [submission.id]: e.target.value
                          }))}
                          className="bg-gray-600 border-gray-500 text-white text-sm"
                          rows={2}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
            </TabsContent>

            <TabsContent value="video-submissions" className="mt-6">
              <VideoAdSubmissionsManager />
            </TabsContent>

            <TabsContent value="contracts" className="mt-6">
              <SignedContractsSection />
            </TabsContent>
          </Tabs>
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

export default CoverSubmissionsManagement;
