
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Image, 
  Clock, 
  CheckCircle, 
  XCircle, 
  User,
  MessageSquare,
  Calendar
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface CoverSubmission {
  id: string;
  merchant_id: string;
  audio_product_id: string;
  cover_image_url: string;
  submission_notes: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  audio_products?: {
    title: string;
    artist_name: string | null;
    thumbnail_url: string | null;
  };
  profiles?: {
    display_name: string | null;
    email: string;
  };
}

const CoverSubmissionManager = () => {
  const [submissions, setSubmissions] = useState<CoverSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  const fetchSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('song_cover_submissions')
        .select(`
          id,
          merchant_id,
          audio_product_id,
          cover_image_url,
          submission_notes,
          status,
          admin_notes,
          created_at,
          audio_products (
            title,
            artist_name,
            thumbnail_url
          ),
          profiles (
            display_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
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
  }, []);

  const handleUpdateStatus = async (submissionId: string, newStatus: string) => {
    setProcessingIds(prev => new Set(prev).add(submissionId));

    try {
      const { error } = await supabase.rpc('update_cover_submission_status', {
        submission_id: submissionId,
        new_status: newStatus,
        admin_notes_text: adminNotes[submissionId] || null
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Cover submission ${newStatus} successfully`
      });

      fetchSubmissions();
      setAdminNotes(prev => {
        const updated = { ...prev };
        delete updated[submissionId];
        return updated;
      });
    } catch (error: any) {
      console.error('Error updating submission:', error);
      toast({
        title: "Error",
        description: "Failed to update submission status",
        variant: "destructive"
      });
    } finally {
      setProcessingIds(prev => {
        const updated = new Set(prev);
        updated.delete(submissionId);
        return updated;
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

  const pendingSubmissions = submissions.filter(s => s.status === 'pending');
  const reviewedSubmissions = submissions.filter(s => s.status !== 'pending');

  if (loading) {
    return <div className="text-white">Loading cover submissions...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-2xl font-bold text-white mb-2">Cover Submissions Management</h3>
        <p className="text-gray-300">Review and approve song cover submissions from merchants</p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold text-white">{pendingSubmissions.length}</p>
                <p className="text-gray-400 text-sm">Pending Review</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-white">
                  {submissions.filter(s => s.status === 'approved').length}
                </p>
                <p className="text-gray-400 text-sm">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <XCircle className="w-8 h-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold text-white">
                  {submissions.filter(s => s.status === 'rejected').length}
                </p>
                <p className="text-gray-400 text-sm">Rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Submissions */}
      <div>
        <h4 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-yellow-500" />
          Pending Submissions ({pendingSubmissions.length})
        </h4>

        {pendingSubmissions.length === 0 ? (
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-6 text-center">
              <p className="text-gray-400">No pending cover submissions</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {pendingSubmissions.map((submission) => (
              <Card key={submission.id} className="bg-gray-800/50 border-gray-700">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left side - Submission details */}
                    <div className="space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="relative">
                          <img
                            src={submission.cover_image_url}
                            alt="Submitted cover"
                            className="w-20 h-20 object-cover rounded-lg"
                          />
                          <Badge className={`absolute -top-2 -right-2 ${getStatusColor(submission.status)} text-white`}>
                            {getStatusIcon(submission.status)}
                          </Badge>
                        </div>
                        <div className="flex-1">
                          <h5 className="text-lg font-semibold text-white mb-1">
                            {submission.audio_products?.title || 'Unknown Song'}
                          </h5>
                          <p className="text-gray-400 text-sm mb-2">
                            by {submission.audio_products?.artist_name || 'Unknown Artist'}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {submission.profiles?.display_name || submission.profiles?.email}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(submission.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Current cover comparison */}
                      {submission.audio_products?.thumbnail_url && (
                        <div>
                          <Label className="text-sm text-gray-400">Current Cover:</Label>
                          <img
                            src={submission.audio_products.thumbnail_url}
                            alt="Current cover"
                            className="w-16 h-16 object-cover rounded mt-1"
                          />
                        </div>
                      )}

                      {submission.submission_notes && (
                        <div>
                          <Label className="text-sm text-gray-400 flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            Merchant Notes:
                          </Label>
                          <p className="text-gray-300 text-sm bg-gray-700/50 p-2 rounded mt-1">
                            {submission.submission_notes}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Right side - Admin actions */}
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor={`admin-notes-${submission.id}`} className="text-sm font-medium text-white">
                          Admin Notes (Optional)
                        </Label>
                        <Textarea
                          id={`admin-notes-${submission.id}`}
                          value={adminNotes[submission.id] || ''}
                          onChange={(e) => setAdminNotes(prev => ({
                            ...prev,
                            [submission.id]: e.target.value
                          }))}
                          placeholder="Add feedback or notes for the merchant..."
                          className="mt-2 bg-gray-700 border-gray-600 text-white"
                          rows={3}
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleUpdateStatus(submission.id, 'approved')}
                          disabled={processingIds.has(submission.id)}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => handleUpdateStatus(submission.id, 'rejected')}
                          disabled={processingIds.has(submission.id)}
                          variant="outline"
                          className="flex-1 border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Reviewed Submissions */}
      {reviewedSubmissions.length > 0 && (
        <div>
          <h4 className="text-xl font-bold text-white mb-4">Recent Reviews</h4>
          <div className="space-y-3">
            {reviewedSubmissions.slice(0, 5).map((submission) => (
              <Card key={submission.id} className="bg-gray-800/50 border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <img
                      src={submission.cover_image_url}
                      alt="Reviewed cover"
                      className="w-12 h-12 object-cover rounded"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h6 className="text-white font-medium">
                          {submission.audio_products?.title || 'Unknown Song'}
                        </h6>
                        <Badge className={`${getStatusColor(submission.status)} text-white`}>
                          <span className="flex items-center gap-1">
                            {getStatusIcon(submission.status)}
                            {submission.status}
                          </span>
                        </Badge>
                      </div>
                      <p className="text-gray-400 text-sm">
                        by {submission.profiles?.display_name || submission.profiles?.email}
                      </p>
                      {submission.admin_notes && (
                        <p className="text-gray-300 text-xs mt-1">
                          <strong>Admin notes:</strong> {submission.admin_notes}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CoverSubmissionManager;
