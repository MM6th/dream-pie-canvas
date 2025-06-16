
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Camera, CheckCircle, XCircle, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ModelingApplication {
  id: string;
  application_photos: string[];
  status: string;
  admin_notes: string | null;
  created_at: string;
  merchant_id: string;
  fashion_products: {
    title: string;
    price: number;
  };
  profiles: {
    display_name: string | null;
    email: string;
  };
}

const ModelingApplicationReview = () => {
  const [applications, setApplications] = useState<ModelingApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<ModelingApplication | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('modeling_applications')
        .select(`
          id,
          application_photos,
          status,
          admin_notes,
          created_at,
          merchant_id,
          fashion_products (
            title,
            price
          ),
          profiles (
            display_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error: any) {
      console.error('Error fetching modeling applications:', error);
      toast({
        title: "Error",
        description: "Failed to load modeling applications",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleReviewApplication = (application: ModelingApplication) => {
    setSelectedApplication(application);
    setAdminNotes(application.admin_notes || "");
  };

  const handleStatusUpdate = async (status: 'approved' | 'rejected') => {
    if (!selectedApplication) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('modeling_applications')
        .update({
          status,
          admin_notes: adminNotes.trim() || null,
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedApplication.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Application ${status} successfully`
      });

      setSelectedApplication(null);
      setAdminNotes("");
      fetchApplications();
    } catch (error: any) {
      console.error('Error updating application status:', error);
      toast({
        title: "Error",
        description: "Failed to update application status",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
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

  const pendingApplications = applications.filter(app => app.status === 'pending');
  const reviewedApplications = applications.filter(app => app.status !== 'pending');

  if (loading) {
    return (
      <div className="text-white">Loading modeling applications...</div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-white mb-4">Modeling Application Review</h3>
        <p className="text-gray-400 mb-6">Review and approve/reject modeling applications from merchants</p>
      </div>

      {/* Pending Applications */}
      <div>
        <h4 className="text-lg font-semibold text-white mb-4">
          Pending Applications ({pendingApplications.length})
        </h4>
        
        {pendingApplications.length === 0 ? (
          <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-white mb-2">No Pending Applications</h4>
              <p className="text-gray-400">All modeling applications have been reviewed</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {pendingApplications.map((application) => (
              <Card key={application.id} className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
                <CardHeader className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-white text-base line-clamp-2">
                        {application.fashion_products.title}
                      </CardTitle>
                      <p className="text-gray-400 text-sm mt-1">
                        By: {application.profiles.display_name || application.profiles.email}
                      </p>
                      <p className="text-gray-400 text-xs">
                        Applied: {new Date(application.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge className={`${getStatusColor(application.status)} text-xs`}>
                      {application.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-white mb-2">
                        Photos ({application.application_photos.length})
                      </p>
                      <div className="grid grid-cols-3 gap-1">
                        {application.application_photos.slice(0, 3).map((photo, index) => (
                          <img
                            key={index}
                            src={photo}
                            alt={`Photo ${index + 1}`}
                            className="w-full h-16 object-cover rounded"
                          />
                        ))}
                        {application.application_photos.length > 3 && (
                          <div className="w-full h-16 bg-gray-700 rounded flex items-center justify-center">
                            <span className="text-xs text-gray-400">
                              +{application.application_photos.length - 3}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleReviewApplication(application)}
                      className="w-full bg-blue-600 text-white"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Review Application
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Recently Reviewed Applications */}
      {reviewedApplications.length > 0 && (
        <div>
          <h4 className="text-lg font-semibold text-white mb-4">
            Recently Reviewed ({reviewedApplications.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reviewedApplications.slice(0, 6).map((application) => (
              <Card key={application.id} className="bg-gray-800/50 border-gray-700 backdrop-blur-sm opacity-75">
                <CardHeader className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-white text-base line-clamp-2">
                        {application.fashion_products.title}
                      </CardTitle>
                      <p className="text-gray-400 text-sm mt-1">
                        By: {application.profiles.display_name || application.profiles.email}
                      </p>
                    </div>
                    <Badge className={`${getStatusColor(application.status)} text-xs`}>
                      {application.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="grid grid-cols-3 gap-1">
                    {application.application_photos.slice(0, 3).map((photo, index) => (
                      <img
                        key={index}
                        src={photo}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-12 object-cover rounded"
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Review Modal */}
      {selectedApplication && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white">
                    Review Modeling Application
                  </h3>
                  <p className="text-gray-400">
                    {selectedApplication.fashion_products.title} - {selectedApplication.profiles.display_name || selectedApplication.profiles.email}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedApplication(null)}
                >
                  ✕
                </Button>
              </div>

              <div className="space-y-6">
                <div>
                  <Label className="text-white font-medium">Application Photos</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
                    {selectedApplication.application_photos.map((photo, index) => (
                      <img
                        key={index}
                        src={photo}
                        alt={`Application photo ${index + 1}`}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="adminNotes" className="text-white font-medium">
                    Admin Notes (Optional)
                  </Label>
                  <Textarea
                    id="adminNotes"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={3}
                    placeholder="Add feedback for the merchant..."
                    className="bg-gray-700 border-gray-600 text-white mt-2"
                  />
                </div>

                <div className="flex gap-4">
                  <Button
                    onClick={() => handleStatusUpdate('approved')}
                    disabled={submitting}
                    className="flex-1 bg-green-600 text-white"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {submitting ? "Processing..." : "Approve"}
                  </Button>
                  <Button
                    onClick={() => handleStatusUpdate('rejected')}
                    disabled={submitting}
                    className="flex-1 bg-red-600 text-white"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    {submitting ? "Processing..." : "Reject"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelingApplicationReview;
