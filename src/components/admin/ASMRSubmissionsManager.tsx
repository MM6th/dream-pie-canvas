
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Eye, CheckCircle, XCircle, Clock, AlertCircle, Music, PlayCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ASMRSubmissionData {
  id: string;
  merchant_id: string;
  audio_product_id: string;
  submission_audio_url: string;
  cover_photos: string[];
  why_me_text: string | null;
  negotiation_text: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  contract_id?: string | null;
  contract_generated_at?: string | null;
  merchant_name?: string;
  audio_product_title?: string;
}

const ASMRSubmissionsManager = () => {
  const [submissions, setSubmissions] = useState<ASMRSubmissionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminNotes, setAdminNotes] = useState<{ [key: string]: string }>({});

  const fetchSubmissions = async () => {
    try {
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('asmr_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (submissionsError) throw submissionsError;

      // Enrich with merchant and audio product data
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
            audio_product_title: audioData?.title || 'Unknown ASMR Track'
          };
        })
      );

      setSubmissions(enrichedSubmissions);
    } catch (error) {
      console.error('Error fetching ASMR submissions:', error);
      toast({
        title: "Error",
        description: "Failed to load ASMR submissions",
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
      const { error } = await supabase
        .from('asmr_submissions')
        .update({
          status: newStatus,
          admin_notes: notes,
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', submissionId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `ASMR submission ${newStatus} successfully`,
      });

      fetchSubmissions();
    } catch (error) {
      console.error('Error updating ASMR submission:', error);
      toast({
        title: "Error",
        description: "Failed to update ASMR submission status",
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
      <div className="p-6">
        <p className="text-gray-400">Loading ASMR submissions...</p>
      </div>
    );
  }

  return (
    <div>
      {submissions.length === 0 ? (
        <div className="text-center py-8">
          <Music className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-white mb-2">No ASMR Submissions</h4>
          <p className="text-gray-400">ASMR submissions will appear here for review.</p>
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
                    {submission.why_me_text && (
                      <p className="text-gray-300 text-sm mb-2 line-clamp-2">
                        Why Me: {submission.why_me_text}
                      </p>
                    )}
                    {submission.negotiation_text && (
                      <p className="text-gray-300 text-sm mb-2 line-clamp-2">
                        Negotiation: {submission.negotiation_text}
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

                {/* Audio Player */}
                {submission.submission_audio_url && (
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <PlayCircle className="w-4 h-4 text-blue-400" />
                      <span className="text-sm text-gray-300">Submission Audio</span>
                    </div>
                    <audio 
                      controls 
                      className="w-full h-8"
                      src={submission.submission_audio_url}
                    >
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                )}

                {/* Cover Photos */}
                {submission.cover_photos && submission.cover_photos.length > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className="w-4 h-4 text-purple-400" />
                      <span className="text-sm text-gray-300">Cover Photos</span>
                    </div>
                    <div className="flex gap-2 overflow-x-auto">
                      {submission.cover_photos.map((photo, index) => (
                        <img 
                          key={index}
                          src={photo} 
                          alt={`Cover photo ${index + 1}`} 
                          className="w-16 h-16 object-cover rounded flex-shrink-0"
                        />
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex gap-2 mb-3">
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
    </div>
  );
};

export default ASMRSubmissionsManager;
