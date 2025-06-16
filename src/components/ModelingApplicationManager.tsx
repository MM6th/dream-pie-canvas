
import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, Clock, User, Package, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import ImageZoomModal from "./ImageZoomModal";

interface ModelingApplication {
  id: string;
  merchant_id: string;
  fashion_product_id: string;
  application_photos: string[];
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  profiles: {
    display_name: string | null;
    email: string;
  } | null;
  fashion_products: {
    title: string;
  } | null;
}

const ModelingApplicationManager = () => {
  const [applications, setApplications] = useState<ModelingApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('modeling_applications')
        .select(`
          *,
          profiles!modeling_applications_merchant_id_fkey (
            display_name,
            email
          ),
          fashion_products (
            title
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching modeling applications:', error);
        return;
      }

      console.log('Fetched modeling applications:', data);
      // Cast the data to ensure proper typing
      setApplications((data || []) as ModelingApplication[]);
    } catch (error) {
      console.error('Error fetching modeling applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateApplicationStatus = async (applicationId: string, newStatus: 'approved' | 'rejected') => {
    try {
      const notes = adminNotes[applicationId] || '';
      
      const { error } = await supabase
        .from('modeling_applications')
        .update({
          status: newStatus,
          admin_notes: notes || null,
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', applicationId);

      if (error) {
        console.error('Error updating application status:', error);
        throw error;
      }

      toast({
        title: "Success",
        description: `Application ${newStatus} successfully`,
      });

      // Refresh applications
      fetchApplications();
      
      // Clear admin notes for this application
      setAdminNotes(prev => ({ ...prev, [applicationId]: '' }));
    } catch (error: any) {
      console.error('Error updating application status:', error);
      toast({
        title: "Error",
        description: error.message || `Failed to ${newStatus} application`,
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-500';
      case 'rejected':
        return 'bg-red-500';
      default:
        return 'bg-yellow-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="text-white">Loading modeling applications...</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold text-white">Modeling Applications</h3>
        <Badge variant="outline" className="text-white border-gray-600">
          {applications.filter(app => app.status === 'pending').length} Pending
        </Badge>
      </div>

      {applications.length === 0 ? (
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-6 text-center">
            <p className="text-gray-400">No modeling applications submitted yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {applications.map((application) => (
            <Card key={application.id} className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <Badge className={`${getStatusColor(application.status)} text-white`}>
                        {getStatusIcon(application.status)}
                        <span className="ml-1 capitalize">{application.status}</span>
                      </Badge>
                      <span className="text-sm text-gray-400">
                        {new Date(application.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-white">
                      <User className="w-4 h-4" />
                      <span>{application.profiles?.display_name || application.profiles?.email || 'Unknown User'}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-white">
                      <Package className="w-4 h-4" />
                      <span>{application.fashion_products?.title || 'Unknown Product'}</span>
                    </div>
                  </div>
                </div>

                {/* Application Photos */}
                <div className="mb-4">
                  <Label className="text-white mb-2 block">Application Photos ({application.application_photos.length})</Label>
                  <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                    {application.application_photos.map((photoUrl, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImageUrl(photoUrl)}
                        className="aspect-square bg-gray-700 rounded-lg overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all"
                      >
                        <img
                          src={photoUrl}
                          alt={`Application photo ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Admin Notes */}
                {application.status === 'pending' && (
                  <div className="mb-4">
                    <Label htmlFor={`notes-${application.id}`} className="text-white">Admin Notes</Label>
                    <Textarea
                      id={`notes-${application.id}`}
                      value={adminNotes[application.id] || ''}
                      onChange={(e) => setAdminNotes(prev => ({ ...prev, [application.id]: e.target.value }))}
                      placeholder="Add notes about this application..."
                      className="bg-gray-700 border-gray-600 text-white mt-2"
                      rows={3}
                    />
                  </div>
                )}

                {/* Existing Admin Notes */}
                {application.admin_notes && (
                  <div className="mb-4">
                    <Label className="text-white">Previous Admin Notes</Label>
                    <div className="bg-gray-700 border border-gray-600 rounded-md p-3 mt-2">
                      <p className="text-gray-300">{application.admin_notes}</p>
                      {application.reviewed_at && (
                        <p className="text-xs text-gray-500 mt-2">
                          <Calendar className="w-3 h-3 inline mr-1" />
                          Reviewed on {new Date(application.reviewed_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                {application.status === 'pending' && (
                  <div className="flex gap-3">
                    <Button
                      onClick={() => updateApplicationStatus(application.id, 'approved')}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => updateApplicationStatus(application.id, 'rejected')}
                      variant="destructive"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Image Zoom Modal - using proper props for the existing ImageZoomModal */}
      {selectedImageUrl && (
        <ImageZoomModal
          isOpen={!!selectedImageUrl}
          onClose={() => setSelectedImageUrl(null)}
          submittedImage={selectedImageUrl}
          currentImage={null}
          songTitle="Modeling Application Photo"
          artistName={null}
        />
      )}
    </div>
  );
};

export default ModelingApplicationManager;
