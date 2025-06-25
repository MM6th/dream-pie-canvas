
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import CoverSubmissionManager from "../CoverSubmissionManager";

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
}

const CoverSubmissionsManagement = () => {
  const [submissions, setSubmissions] = useState<CoverSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('song_cover_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) {
      console.error('Error fetching cover submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const pendingSubmissions = submissions.filter(s => s.status === 'pending');
  const approvedSubmissions = submissions.filter(s => s.status === 'approved');
  const rejectedSubmissions = submissions.filter(s => s.status === 'rejected');

  if (loading) {
    return (
      <div className="text-center text-white py-8">
        Loading cover submissions...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Cover Submissions Management</h2>
      
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gray-800 border-gray-700">
          <TabsTrigger 
            value="pending" 
            className="text-white data-[state=active]:bg-gray-700"
          >
            Pending ({pendingSubmissions.length})
          </TabsTrigger>
          <TabsTrigger 
            value="approved" 
            className="text-white data-[state=active]:bg-gray-700"
          >
            Approved ({approvedSubmissions.length})
          </TabsTrigger>
          <TabsTrigger 
            value="rejected" 
            className="text-white data-[state=active]:bg-gray-700"
          >
            Rejected ({rejectedSubmissions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Pending Cover Submissions</CardTitle>
            </CardHeader>
            <CardContent>
              {pendingSubmissions.length === 0 ? (
                <p className="text-gray-400 text-center py-4">No pending submissions.</p>
              ) : (
                <CoverSubmissionManager />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approved">
          <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Approved Cover Submissions</CardTitle>
            </CardHeader>
            <CardContent>
              {approvedSubmissions.length === 0 ? (
                <p className="text-gray-400 text-center py-4">No approved submissions yet.</p>
              ) : (
                <CoverSubmissionManager />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rejected">
          <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Rejected Cover Submissions</CardTitle>
            </CardHeader>
            <CardContent>
              {rejectedSubmissions.length === 0 ? (
                <p className="text-gray-400 text-center py-4">No rejected submissions yet.</p>
              ) : (
                <CoverSubmissionManager />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CoverSubmissionsManagement;
